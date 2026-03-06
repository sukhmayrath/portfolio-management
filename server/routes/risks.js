import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';
import { evaluateAutomations } from '../utils/automationEngine.js';

const router = Router();

// GET /api/risks
router.get('/', (req, res) => {
  const { project_id, status, category } = req.query;
  let query = `
    SELECT r.*, p.name as project_name, res.name as owner_name
    FROM risks r
    JOIN projects p ON r.project_id = p.id
    LEFT JOIN resources res ON r.owner_resource_id = res.id
    WHERE 1=1
  `;
  const params = [];
  if (project_id) { query += ' AND r.project_id = ?'; params.push(project_id); }
  if (status) { query += ' AND r.status = ?'; params.push(status); }
  if (category) { query += ' AND r.category = ?'; params.push(category); }
  query += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/risks/:id
router.get('/:id', (req, res) => {
  const risk = db.prepare(`
    SELECT r.*, p.name as project_name, res.name as owner_name
    FROM risks r
    JOIN projects p ON r.project_id = p.id
    LEFT JOIN resources res ON r.owner_resource_id = res.id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!risk) return res.status(404).json({ error: { message: 'Risk not found' } });
  res.json(risk);
});

// POST /api/risks
router.post('/', (req, res) => {
  const { project_id, title, description, category, likelihood, impact, status, owner_resource_id, mitigation_plan } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: { message: 'Project and title required' } });
  
  const result = db.prepare(`
    INSERT INTO risks (project_id, title, description, category, likelihood, impact, status, owner_resource_id, mitigation_plan)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(project_id, title, description || '', category || 'Technical', likelihood || 'Medium', impact || 'Medium', status || 'Open', owner_resource_id || null, mitigation_plan || '');
  
  logChange({ userId: req.user?.id, entityType: 'risk', entityId: result.lastInsertRowid, action: 'CREATE' });
  
  const risk = db.prepare('SELECT * FROM risks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(risk);
});

// PUT /api/risks/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM risks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Risk not found' } });
  
  const { title, description, category, likelihood, impact, status, owner_resource_id, mitigation_plan } = req.body;
  const updated = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    category: category ?? existing.category,
    likelihood: likelihood ?? existing.likelihood,
    impact: impact ?? existing.impact,
    status: status ?? existing.status,
    owner_resource_id: owner_resource_id !== undefined ? owner_resource_id : existing.owner_resource_id,
    mitigation_plan: mitigation_plan ?? existing.mitigation_plan,
  };
  
  const changes = diffChanges(existing, updated, ['title', 'description', 'category', 'likelihood', 'impact', 'status', 'mitigation_plan']);
  
  db.prepare(`
    UPDATE risks SET title=?, description=?, category=?, likelihood=?, impact=?, status=?, owner_resource_id=?, mitigation_plan=?, updated_at=datetime('now') WHERE id=?
  `).run(updated.title, updated.description, updated.category, updated.likelihood, updated.impact, updated.status, updated.owner_resource_id, updated.mitigation_plan, req.params.id);
  
  if (changes.length) {
    logChange({ userId: req.user?.id, entityType: 'risk', entityId: Number(req.params.id), action: 'UPDATE', changes });
    evaluateAutomations('risk', Number(req.params.id), changes);
  }

  const risk = db.prepare('SELECT * FROM risks WHERE id = ?').get(req.params.id);
  res.json(risk);
});

// DELETE /api/risks/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM risks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Risk not found' } });
  logChange({ userId: req.user?.id, entityType: 'risk', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Risk deleted' });
});

export default router;
