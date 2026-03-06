import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';

const router = Router();

// GET /api/scenarios/compare — must be before /:id to avoid conflict
router.get('/compare', (req, res) => {
  const { ids } = req.query;
  if (!ids) return res.status(400).json({ error: { message: 'ids query parameter is required (comma-separated)' } });

  const idList = ids.split(',').map(id => id.trim()).filter(Boolean);
  if (idList.length === 0) return res.json([]);

  const placeholders = idList.map(() => '?').join(',');
  const scenarios = db.prepare(`
    SELECT s.*, u.display_name as created_by_name
    FROM scenarios s
    LEFT JOIN users u ON s.created_by = u.id
    WHERE s.id IN (${placeholders})
    ORDER BY s.created_at DESC
  `).all(...idList);

  res.json(scenarios);
});

// GET /api/scenarios
router.get('/', (req, res) => {
  const { created_by } = req.query;
  let query = `
    SELECT s.*, u.display_name as created_by_name
    FROM scenarios s
    LEFT JOIN users u ON s.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (created_by) { query += ' AND s.created_by = ?'; params.push(created_by); }
  query += ' ORDER BY s.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/scenarios/:id
router.get('/:id', (req, res) => {
  const scenario = db.prepare(`
    SELECT s.*, u.display_name as created_by_name
    FROM scenarios s
    LEFT JOIN users u ON s.created_by = u.id
    WHERE s.id = ?
  `).get(req.params.id);
  if (!scenario) return res.status(404).json({ error: { message: 'Scenario not found' } });
  res.json(scenario);
});

// POST /api/scenarios
router.post('/', (req, res) => {
  const { name, description, base_data, adjustments, results } = req.body;
  if (!name) return res.status(400).json({ error: { message: 'Name is required' } });

  const result = db.prepare(`
    INSERT INTO scenarios (name, description, base_data, adjustments, results, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name,
    description || '',
    base_data || '{}',
    adjustments || '{}',
    results || '{}',
    req.user?.id || null
  );

  logChange({ userId: req.user?.id, entityType: 'scenario', entityId: result.lastInsertRowid, action: 'CREATE' });

  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(scenario);
});

// PUT /api/scenarios/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Scenario not found' } });

  const { name, description, base_data, adjustments, results } = req.body;

  const updated = {
    name: name ?? existing.name,
    description: description ?? existing.description,
    base_data: base_data ?? existing.base_data,
    adjustments: adjustments ?? existing.adjustments,
    results: results ?? existing.results,
  };

  const changes = diffChanges(existing, updated, ['name', 'description']);

  db.prepare(`
    UPDATE scenarios SET name=?, description=?, base_data=?, adjustments=?, results=?, updated_at=datetime('now')
    WHERE id=?
  `).run(updated.name, updated.description, updated.base_data, updated.adjustments, updated.results, req.params.id);

  if (changes.length) logChange({ userId: req.user?.id, entityType: 'scenario', entityId: Number(req.params.id), action: 'UPDATE', changes });

  const scenario = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(req.params.id);
  res.json(scenario);
});

// DELETE /api/scenarios/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM scenarios WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Scenario not found' } });
  logChange({ userId: req.user?.id, entityType: 'scenario', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Scenario deleted' });
});

export default router;
