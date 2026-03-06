import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/resources
router.get('/', (req, res) => {
  const resources = db.prepare(`
    SELECT r.*,
      COALESCE(SUM(ra.allocation_percentage), 0) as total_allocation_percentage,
      (100 - COALESCE(SUM(ra.allocation_percentage), 0)) as unallocated_percentage
    FROM resources r
    LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
    GROUP BY r.id
    ORDER BY r.name
  `).all();
  res.json(resources);
});

// GET /api/resources/:id
router.get('/:id', (req, res) => {
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!resource) return res.status(404).json({ error: { message: 'Resource not found' } });

  const allocations = db.prepare(`
    SELECT ra.*, p.name as project_name, t.name as theme_name,
      (ra.allocated_hours_per_month * r.hourly_rate) as monthly_cost
    FROM resource_allocations ra
    JOIN projects p ON ra.project_id = p.id
    JOIN investment_themes t ON p.theme_id = t.id
    JOIN resources r ON ra.resource_id = r.id
    WHERE ra.resource_id = ?
    ORDER BY p.name
  `).all(req.params.id);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.allocation_percentage, 0);
  resource.allocations = allocations;
  resource.total_allocation_percentage = totalAllocated;
  resource.unallocated_percentage = 100 - totalAllocated;
  res.json(resource);
});

// POST /api/resources
router.post('/', (req, res) => {
  const { name, role, department, hourly_rate, available_hours_per_month } = req.body;
  if (!name) return res.status(400).json({ error: { message: 'Name is required' } });
  const result = db.prepare(
    'INSERT INTO resources (name, role, department, hourly_rate, available_hours_per_month) VALUES (?, ?, ?, ?, ?)'
  ).run(name, role || '', department || '', hourly_rate || 0, available_hours_per_month || 160);
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(resource);
});

// PUT /api/resources/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Resource not found' } });
  const { name, role, department, hourly_rate, available_hours_per_month } = req.body;
  db.prepare(
    `UPDATE resources SET name = ?, role = ?, department = ?, hourly_rate = ?, available_hours_per_month = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    name ?? existing.name, role ?? existing.role, department ?? existing.department,
    hourly_rate ?? existing.hourly_rate, available_hours_per_month ?? existing.available_hours_per_month,
    req.params.id
  );
  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id);
  res.json(resource);
});

// DELETE /api/resources/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM resources WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Resource not found' } });
  res.json({ message: 'Resource deleted' });
});

export default router;
