import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/themes
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT t.*,
      COUNT(DISTINCT p.id) as project_count,
      COALESCE(SUM(
        (SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0)
         FROM resource_allocations ra
         JOIN resources r ON ra.resource_id = r.id
         WHERE ra.project_id = p.id)
      ), 0) as total_resource_cost
    FROM investment_themes t
    LEFT JOIN projects p ON t.id = p.theme_id
  `;
  const params = [];
  if (status) {
    query += ' WHERE t.status = ?';
    params.push(status);
  }
  query += ' GROUP BY t.id ORDER BY t.created_at DESC';
  const themes = db.prepare(query).all(...params);
  res.json(themes);
});

// GET /api/themes/:id
router.get('/:id', (req, res) => {
  const theme = db.prepare('SELECT * FROM investment_themes WHERE id = ?').get(req.params.id);
  if (!theme) return res.status(404).json({ error: { message: 'Theme not found' } });

  const projects = db.prepare(`
    SELECT p.*,
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
      ), 0) as facility_line_items_cost_monthly
    FROM projects p
    WHERE p.theme_id = ?
    ORDER BY p.created_at DESC
  `).all(req.params.id);

  projects.forEach(p => {
    p.total_facility_monthly = p.fixed_facility_cost_monthly + p.facility_line_items_cost_monthly;
    p.overhead_cost_monthly = p.resource_cost_monthly * (p.overhead_percentage / 100);
    p.total_company_cost_monthly = p.resource_cost_monthly + p.total_facility_monthly + p.overhead_cost_monthly;
  });

  theme.projects = projects;
  res.json(theme);
});

// POST /api/themes
router.post('/', (req, res) => {
  const { name, description, status, total_budget } = req.body;
  if (!name) return res.status(400).json({ error: { message: 'Name is required' } });
  const result = db.prepare(
    'INSERT INTO investment_themes (name, description, status, total_budget) VALUES (?, ?, ?, ?)'
  ).run(name, description || '', status || 'Planning', total_budget || 0);
  const theme = db.prepare('SELECT * FROM investment_themes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(theme);
});

// PUT /api/themes/:id
router.put('/:id', (req, res) => {
  const { name, description, status, total_budget } = req.body;
  const existing = db.prepare('SELECT * FROM investment_themes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Theme not found' } });
  db.prepare(
    `UPDATE investment_themes SET name = ?, description = ?, status = ?, total_budget = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    name ?? existing.name,
    description ?? existing.description,
    status ?? existing.status,
    total_budget ?? existing.total_budget,
    req.params.id
  );
  const theme = db.prepare('SELECT * FROM investment_themes WHERE id = ?').get(req.params.id);
  res.json(theme);
});

// DELETE /api/themes/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM investment_themes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Theme not found' } });
  res.json({ message: 'Theme deleted' });
});

export default router;
