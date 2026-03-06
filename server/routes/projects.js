import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';
import { evaluateAutomations } from '../utils/automationEngine.js';

const router = Router();

// GET /api/projects
router.get('/', (req, res) => {
  const { theme_id } = req.query;
  let query = `
    SELECT p.*, t.name as theme_name, p.health_status, p.health_note, p.priority_score,
      COALESCE((
        SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate)
        FROM resource_allocations ra
        JOIN resources r ON ra.resource_id = r.id
        WHERE ra.project_id = p.id
      ), 0) as resource_cost_monthly,
      COALESCE((
        SELECT SUM(fc.monthly_cost)
        FROM facility_costs fc
        WHERE fc.project_id = p.id
      ), 0) as facility_line_items_cost_monthly,
      COALESCE((
        SELECT SUM(ra.allocated_hours_per_month)
        FROM resource_allocations ra
        WHERE ra.project_id = p.id
      ), 0) as total_allocated_hours
    FROM projects p
    JOIN investment_themes t ON p.theme_id = t.id
  `;
  const params = [];
  if (theme_id) {
    query += ' WHERE p.theme_id = ?';
    params.push(theme_id);
  }
  query += ' ORDER BY p.created_at DESC';

  const projects = db.prepare(query).all(...params);
  projects.forEach(p => {
    p.total_facility_monthly = p.fixed_facility_cost_monthly + p.facility_line_items_cost_monthly;
    p.overhead_cost_monthly = p.resource_cost_monthly * (p.overhead_percentage / 100);
    p.total_company_cost_monthly = p.resource_cost_monthly + p.total_facility_monthly + p.overhead_cost_monthly;
    p.client_revenue_monthly = p.total_allocated_hours * p.client_billing_rate_per_hour;
    p.margin_monthly = p.client_revenue_monthly - p.total_company_cost_monthly;
    p.margin_percentage = p.client_revenue_monthly > 0 ? (p.margin_monthly / p.client_revenue_monthly) * 100 : 0;
  });

  res.json(projects);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = db.prepare(`
    SELECT p.*, t.name as theme_name, p.health_status, p.health_note, p.priority_score
    FROM projects p
    JOIN investment_themes t ON p.theme_id = t.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!project) return res.status(404).json({ error: { message: 'Project not found' } });

  const allocations = db.prepare(`
    SELECT ra.*, r.name as resource_name, r.role, r.hourly_rate, r.department,
      (ra.allocated_hours_per_month * r.hourly_rate) as monthly_cost
    FROM resource_allocations ra
    JOIN resources r ON ra.resource_id = r.id
    WHERE ra.project_id = ?
    ORDER BY r.name
  `).all(req.params.id);

  const tasks = db.prepare(`
    SELECT t.*, r.name as assigned_resource_name
    FROM tasks t
    LEFT JOIN resources r ON t.assigned_resource_id = r.id
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.id);

  const facilityCosts = db.prepare(
    'SELECT * FROM facility_costs WHERE project_id = ? ORDER BY description'
  ).all(req.params.id);

  const risks = db.prepare(
    'SELECT r.*, res.name as owner_name FROM risks r LEFT JOIN resources res ON r.owner_resource_id = res.id WHERE r.project_id = ? ORDER BY r.created_at DESC'
  ).all(req.params.id);

  const milestones = db.prepare(
    'SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC'
  ).all(req.params.id);

  const tags = db.prepare(
    'SELECT t.* FROM tags t JOIN project_tags pt ON t.id = pt.tag_id WHERE pt.project_id = ? ORDER BY t.name'
  ).all(req.params.id);

  const comments = db.prepare(
    "SELECT c.*, u.display_name as user_name FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.entity_type = 'project' AND c.entity_id = ? ORDER BY c.created_at ASC"
  ).all(req.params.id);

  const resourceCost = allocations.reduce((sum, a) => sum + a.monthly_cost, 0);
  const facilityLineItemsCost = facilityCosts.reduce((sum, f) => sum + f.monthly_cost, 0);
  const totalFacility = project.fixed_facility_cost_monthly + facilityLineItemsCost;
  const overheadCost = resourceCost * (project.overhead_percentage / 100);
  const totalAllocatedHours = allocations.reduce((sum, a) => sum + a.allocated_hours_per_month, 0);
  const clientRevenue = totalAllocatedHours * project.client_billing_rate_per_hour;
  const totalCompanyCost = resourceCost + totalFacility + overheadCost;

  project.allocations = allocations;
  project.tasks = tasks;
  project.facility_costs = facilityCosts;
  project.risks = risks;
  project.milestones = milestones;
  project.tags = tags;
  project.comments = comments;
  project.computed = {
    resource_cost_monthly: resourceCost,
    facility_line_items_monthly: facilityLineItemsCost,
    total_facility_monthly: totalFacility,
    overhead_cost_monthly: overheadCost,
    total_company_cost_monthly: totalCompanyCost,
    total_allocated_hours: totalAllocatedHours,
    client_revenue_monthly: clientRevenue,
    margin_monthly: clientRevenue - totalCompanyCost,
    margin_percentage: clientRevenue > 0 ? ((clientRevenue - totalCompanyCost) / clientRevenue) * 100 : 0
  };

  res.json(project);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { theme_id, name, description, status, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage } = req.body;
  if (!theme_id || !name) return res.status(400).json({ error: { message: 'theme_id and name are required' } });
  const result = db.prepare(
    `INSERT INTO projects (theme_id, name, description, status, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(theme_id, name, description || '', status || 'Planning', start_date || null, end_date || null, client_billing_rate_per_hour || 0, fixed_facility_cost_monthly || 0, overhead_percentage || 0);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Project not found' } });
  const { name, description, status, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage, theme_id, health_status, health_note, priority_score } = req.body;
  db.prepare(
    `UPDATE projects SET theme_id = ?, name = ?, description = ?, status = ?, start_date = ?, end_date = ?,
     client_billing_rate_per_hour = ?, fixed_facility_cost_monthly = ?, overhead_percentage = ?,
     health_status = ?, health_note = ?, priority_score = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    theme_id ?? existing.theme_id, name ?? existing.name, description ?? existing.description,
    status ?? existing.status, start_date ?? existing.start_date, end_date ?? existing.end_date,
    client_billing_rate_per_hour ?? existing.client_billing_rate_per_hour,
    fixed_facility_cost_monthly ?? existing.fixed_facility_cost_monthly,
    overhead_percentage ?? existing.overhead_percentage,
    health_status ?? existing.health_status, health_note ?? existing.health_note,
    priority_score ?? existing.priority_score, req.params.id
  );
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

  // Evaluate automation rules on changes
  const changes = diffChanges(existing, project, ['status', 'health_status', 'priority_score']);
  if (changes.length) {
    logChange({ userId: req.user?.id, entityType: 'project', entityId: Number(req.params.id), action: 'UPDATE', changes });
    evaluateAutomations('project', Number(req.params.id), changes);
  }

  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Project not found' } });
  res.json({ message: 'Project deleted' });
});

export default router;
