import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';

const router = Router();

// GET /api/templates
router.get('/', (req, res) => {
  const templates = db.prepare(`
    SELECT pt.*, u.display_name as created_by_name
    FROM project_templates pt
    LEFT JOIN users u ON pt.created_by = u.id
    ORDER BY pt.created_at DESC
  `).all();
  res.json(templates);
});

// GET /api/templates/:id
router.get('/:id', (req, res) => {
  const template = db.prepare(`
    SELECT pt.*, u.display_name as created_by_name
    FROM project_templates pt
    LEFT JOIN users u ON pt.created_by = u.id
    WHERE pt.id = ?
  `).get(req.params.id);
  if (!template) return res.status(404).json({ error: { message: 'Template not found' } });
  res.json(template);
});

// POST /api/templates
router.post('/', (req, res) => {
  const { name, description, default_tasks, default_risks, default_milestones, default_facility_costs } = req.body;
  if (!name) return res.status(400).json({ error: { message: 'Name is required' } });

  const result = db.prepare(`
    INSERT INTO project_templates (name, description, default_tasks, default_risks, default_milestones, default_facility_costs, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    description || '',
    JSON.stringify(default_tasks || []),
    JSON.stringify(default_risks || []),
    JSON.stringify(default_milestones || []),
    JSON.stringify(default_facility_costs || []),
    req.user?.id || null
  );

  logChange({ userId: req.user?.id, entityType: 'template', entityId: result.lastInsertRowid, action: 'CREATE' });

  const template = db.prepare('SELECT * FROM project_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

// DELETE /api/templates/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM project_templates WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Template not found' } });
  logChange({ userId: req.user?.id, entityType: 'template', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Template deleted' });
});

// POST /api/templates/:id/apply — Apply template to create a project
router.post('/:id/apply', (req, res) => {
  const template = db.prepare('SELECT * FROM project_templates WHERE id = ?').get(req.params.id);
  if (!template) return res.status(404).json({ error: { message: 'Template not found' } });

  const { theme_id, name, description, status, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage } = req.body;
  if (!theme_id || !name) return res.status(400).json({ error: { message: 'theme_id and name are required' } });

  const applyTransaction = db.transaction(() => {
    // Create the project
    const projectResult = db.prepare(`
      INSERT INTO projects (theme_id, name, description, status, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      theme_id,
      name,
      description || '',
      status || 'Planning',
      start_date || null,
      end_date || null,
      client_billing_rate_per_hour || 0,
      fixed_facility_cost_monthly || 0,
      overhead_percentage || 0
    );
    const projectId = projectResult.lastInsertRowid;

    // Insert default tasks
    const tasks = JSON.parse(template.default_tasks || '[]');
    const insertTask = db.prepare(
      'INSERT INTO tasks (project_id, title, description, status, estimated_hours) VALUES (?, ?, ?, ?, ?)'
    );
    for (const task of tasks) {
      insertTask.run(projectId, task.title, task.description || '', task.status || 'To Do', task.estimated_hours || 0);
    }

    // Insert default risks
    const risks = JSON.parse(template.default_risks || '[]');
    const insertRisk = db.prepare(
      'INSERT INTO risks (project_id, title, description, category, likelihood, impact, status, mitigation_plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const risk of risks) {
      insertRisk.run(projectId, risk.title, risk.description || '', risk.category || 'Technical', risk.likelihood || 'Medium', risk.impact || 'Medium', risk.status || 'Open', risk.mitigation_plan || '');
    }

    // Insert default milestones
    const milestones = JSON.parse(template.default_milestones || '[]');
    const insertMilestone = db.prepare(
      'INSERT INTO milestones (project_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)'
    );
    for (const ms of milestones) {
      insertMilestone.run(projectId, ms.title, ms.description || '', ms.due_date || null, ms.status || 'Pending');
    }

    // Insert default facility costs
    const facilityCosts = JSON.parse(template.default_facility_costs || '[]');
    const insertFacilityCost = db.prepare(
      'INSERT INTO facility_costs (project_id, description, monthly_cost, cost_type) VALUES (?, ?, ?, ?)'
    );
    for (const fc of facilityCosts) {
      insertFacilityCost.run(projectId, fc.description, fc.monthly_cost || 0, fc.cost_type || 'Fixed');
    }

    logChange({ userId: req.user?.id, entityType: 'project', entityId: projectId, action: 'CREATE' });

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?').get(projectId).count;
    const riskCount = db.prepare('SELECT COUNT(*) as count FROM risks WHERE project_id = ?').get(projectId).count;
    const milestoneCount = db.prepare('SELECT COUNT(*) as count FROM milestones WHERE project_id = ?').get(projectId).count;
    const facilityCostCount = db.prepare('SELECT COUNT(*) as count FROM facility_costs WHERE project_id = ?').get(projectId).count;

    return {
      ...project,
      tasks_count: taskCount,
      risks_count: riskCount,
      milestones_count: milestoneCount,
      facility_costs_count: facilityCostCount
    };
  });

  const result = applyTransaction();
  res.status(201).json(result);
});

export default router;
