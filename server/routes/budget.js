import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/budget
router.get('/', (req, res) => {
  const { project_id, year } = req.query;
  let query = `
    SELECT b.*, p.name as project_name
    FROM budget_entries b
    JOIN projects p ON b.project_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (project_id) { query += ' AND b.project_id = ?'; params.push(project_id); }
  if (year) { query += ' AND b.month LIKE ?'; params.push(`${year}%`); }
  query += ' ORDER BY b.month ASC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/budget
router.post('/', (req, res) => {
  const { project_id, month, planned_resource_cost, planned_facility_cost, planned_overhead_cost, planned_revenue, notes } = req.body;
  if (!project_id || !month) return res.status(400).json({ error: { message: 'project_id and month required' } });
  
  const result = db.prepare(
    'INSERT INTO budget_entries (project_id, month, planned_resource_cost, planned_facility_cost, planned_overhead_cost, planned_revenue, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(project_id, month, planned_resource_cost || 0, planned_facility_cost || 0, planned_overhead_cost || 0, planned_revenue || 0, notes || '');
  
  res.status(201).json(db.prepare('SELECT * FROM budget_entries WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/budget/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM budget_entries WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Budget entry not found' } });
  
  const { planned_resource_cost, planned_facility_cost, planned_overhead_cost, planned_revenue, notes } = req.body;
  db.prepare(`UPDATE budget_entries SET planned_resource_cost=?, planned_facility_cost=?, planned_overhead_cost=?, planned_revenue=?, notes=?, updated_at=datetime('now') WHERE id=?`)
    .run(
      planned_resource_cost ?? existing.planned_resource_cost,
      planned_facility_cost ?? existing.planned_facility_cost,
      planned_overhead_cost ?? existing.planned_overhead_cost,
      planned_revenue ?? existing.planned_revenue,
      notes ?? existing.notes,
      req.params.id
    );
  res.json(db.prepare('SELECT * FROM budget_entries WHERE id = ?').get(req.params.id));
});

// DELETE /api/budget/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM budget_entries WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Not found' } });
  res.json({ message: 'Deleted' });
});

// GET /api/budget/comparison
router.get('/comparison', (req, res) => {
  const { project_id, year } = req.query;
  let budgetQuery = 'SELECT * FROM budget_entries WHERE 1=1';
  const params = [];
  if (project_id) { budgetQuery += ' AND project_id = ?'; params.push(project_id); }
  if (year) { budgetQuery += ' AND month LIKE ?'; params.push(`${year}%`); }
  budgetQuery += ' ORDER BY month';
  
  const entries = db.prepare(budgetQuery).all(...params);
  
  // Calculate actual costs for each project
  const comparison = entries.map(e => {
    const p = db.prepare('SELECT * FROM projects WHERE id = ?').get(e.project_id);
    const rc = db.prepare(`
      SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as cost,
        COALESCE(SUM(ra.allocated_hours_per_month), 0) as hours
      FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = ?
    `).get(e.project_id);
    
    const actualResourceCost = rc.cost;
    const actualFacilityCost = p.fixed_facility_cost_monthly + db.prepare('SELECT COALESCE(SUM(monthly_cost), 0) as c FROM facility_costs WHERE project_id = ?').get(e.project_id).c;
    const actualOverhead = actualResourceCost * (p.overhead_percentage / 100);
    const actualRevenue = rc.hours * p.client_billing_rate_per_hour;
    const plannedTotal = e.planned_resource_cost + e.planned_facility_cost + e.planned_overhead_cost;
    const actualTotal = actualResourceCost + actualFacilityCost + actualOverhead;
    
    return {
      ...e,
      project_name: p.name,
      actual_resource_cost: actualResourceCost,
      actual_facility_cost: actualFacilityCost,
      actual_overhead_cost: actualOverhead,
      actual_revenue: actualRevenue,
      planned_total: plannedTotal,
      actual_total: actualTotal,
      cost_variance: actualTotal - plannedTotal,
      revenue_variance: actualRevenue - e.planned_revenue,
    };
  });
  
  res.json(comparison);
});

// GET /api/budget/forecast
router.get('/forecast', (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, t.name as theme_name, t.total_budget,
      COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as monthly_resource_cost,
      COALESCE((SELECT SUM(fc.monthly_cost) FROM facility_costs fc WHERE fc.project_id = p.id), 0) as monthly_facility_items
    FROM projects p JOIN investment_themes t ON p.theme_id = t.id
    WHERE p.status = 'Active'
    ORDER BY t.name, p.name
  `).all();
  
  const forecasts = projects.map(p => {
    const monthlyCost = p.monthly_resource_cost + p.fixed_facility_cost_monthly + p.monthly_facility_items + (p.monthly_resource_cost * p.overhead_percentage / 100);
    const monthsRemaining = p.end_date ? Math.max(0, Math.ceil((new Date(p.end_date) - new Date()) / (30 * 86400000))) : 12;
    const projectedTotal = monthlyCost * monthsRemaining;
    
    return {
      id: p.id,
      name: p.name,
      theme_name: p.theme_name,
      monthly_burn: monthlyCost,
      months_remaining: monthsRemaining,
      projected_total: projectedTotal,
      end_date: p.end_date,
    };
  });
  
  res.json(forecasts);
});

export default router;
