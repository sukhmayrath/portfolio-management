import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/facility-costs
router.get('/', (req, res) => {
  const { project_id } = req.query;
  let query = 'SELECT fc.*, p.name as project_name FROM facility_costs fc JOIN projects p ON fc.project_id = p.id';
  const params = [];
  if (project_id) {
    query += ' WHERE fc.project_id = ?';
    params.push(project_id);
  }
  query += ' ORDER BY fc.description';
  res.json(db.prepare(query).all(...params));
});

// POST /api/facility-costs
router.post('/', (req, res) => {
  const { project_id, description, monthly_cost, cost_type } = req.body;
  if (!project_id || !description) return res.status(400).json({ error: { message: 'project_id and description are required' } });
  const result = db.prepare(
    'INSERT INTO facility_costs (project_id, description, monthly_cost, cost_type) VALUES (?, ?, ?, ?)'
  ).run(project_id, description, monthly_cost || 0, cost_type || 'Fixed');
  const fc = db.prepare('SELECT * FROM facility_costs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(fc);
});

// PUT /api/facility-costs/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM facility_costs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Facility cost not found' } });
  const { description, monthly_cost, cost_type } = req.body;
  db.prepare(
    `UPDATE facility_costs SET description = ?, monthly_cost = ?, cost_type = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(description ?? existing.description, monthly_cost ?? existing.monthly_cost, cost_type ?? existing.cost_type, req.params.id);
  const fc = db.prepare('SELECT * FROM facility_costs WHERE id = ?').get(req.params.id);
  res.json(fc);
});

// DELETE /api/facility-costs/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM facility_costs WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Facility cost not found' } });
  res.json({ message: 'Facility cost deleted' });
});

export default router;
