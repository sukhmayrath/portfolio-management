import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/allocations
router.get('/', (req, res) => {
  const { resource_id, project_id } = req.query;
  let query = `
    SELECT ra.*, r.name as resource_name, r.role, r.hourly_rate,
      p.name as project_name, t.name as theme_name,
      (ra.allocated_hours_per_month * r.hourly_rate) as monthly_cost
    FROM resource_allocations ra
    JOIN resources r ON ra.resource_id = r.id
    JOIN projects p ON ra.project_id = p.id
    JOIN investment_themes t ON p.theme_id = t.id
  `;
  const conditions = [];
  const params = [];
  if (resource_id) { conditions.push('ra.resource_id = ?'); params.push(resource_id); }
  if (project_id) { conditions.push('ra.project_id = ?'); params.push(project_id); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY r.name, p.name';
  res.json(db.prepare(query).all(...params));
});

// POST /api/allocations
router.post('/', (req, res) => {
  const { resource_id, project_id, allocation_percentage, allocated_hours_per_month, start_date, end_date } = req.body;
  if (!resource_id || !project_id) return res.status(400).json({ error: { message: 'resource_id and project_id are required' } });

  // Validate total allocation doesn't exceed 100%
  const currentTotal = db.prepare(
    'SELECT COALESCE(SUM(allocation_percentage), 0) as total FROM resource_allocations WHERE resource_id = ?'
  ).get(resource_id).total;

  if (currentTotal + (allocation_percentage || 0) > 100) {
    return res.status(400).json({
      error: { message: `Allocation would exceed 100%. Current: ${currentTotal}%, Requested: ${allocation_percentage}%, Available: ${100 - currentTotal}%` }
    });
  }

  const result = db.prepare(
    `INSERT INTO resource_allocations (resource_id, project_id, allocation_percentage, allocated_hours_per_month, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(resource_id, project_id, allocation_percentage || 0, allocated_hours_per_month || 0, start_date || null, end_date || null);

  const allocation = db.prepare(`
    SELECT ra.*, r.name as resource_name, r.role, r.hourly_rate,
      p.name as project_name, (ra.allocated_hours_per_month * r.hourly_rate) as monthly_cost
    FROM resource_allocations ra
    JOIN resources r ON ra.resource_id = r.id
    JOIN projects p ON ra.project_id = p.id
    WHERE ra.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(allocation);
});

// PUT /api/allocations/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM resource_allocations WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Allocation not found' } });

  const newPct = req.body.allocation_percentage ?? existing.allocation_percentage;
  const currentTotal = db.prepare(
    'SELECT COALESCE(SUM(allocation_percentage), 0) as total FROM resource_allocations WHERE resource_id = ? AND id != ?'
  ).get(existing.resource_id, req.params.id).total;

  if (currentTotal + newPct > 100) {
    return res.status(400).json({
      error: { message: `Allocation would exceed 100%. Other allocations: ${currentTotal}%, Requested: ${newPct}%, Available: ${100 - currentTotal}%` }
    });
  }

  db.prepare(
    `UPDATE resource_allocations SET allocation_percentage = ?, allocated_hours_per_month = ?, start_date = ?, end_date = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    newPct,
    req.body.allocated_hours_per_month ?? existing.allocated_hours_per_month,
    req.body.start_date ?? existing.start_date,
    req.body.end_date ?? existing.end_date,
    req.params.id
  );

  const allocation = db.prepare(`
    SELECT ra.*, r.name as resource_name, r.role, r.hourly_rate,
      p.name as project_name, (ra.allocated_hours_per_month * r.hourly_rate) as monthly_cost
    FROM resource_allocations ra
    JOIN resources r ON ra.resource_id = r.id
    JOIN projects p ON ra.project_id = p.id
    WHERE ra.id = ?
  `).get(req.params.id);
  res.json(allocation);
});

// DELETE /api/allocations/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM resource_allocations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Allocation not found' } });
  res.json({ message: 'Allocation deleted' });
});

export default router;
