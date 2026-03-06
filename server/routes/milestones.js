import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';
import { evaluateAutomations } from '../utils/automationEngine.js';

const router = Router();

// GET /api/milestones
router.get('/', (req, res) => {
  const { project_id, status, start_date, end_date } = req.query;
  let query = `
    SELECT m.*, p.name as project_name
    FROM milestones m
    JOIN projects p ON m.project_id = p.id
    WHERE 1=1
  `;
  const params = [];
  if (project_id) { query += ' AND m.project_id = ?'; params.push(project_id); }
  if (status) { query += ' AND m.status = ?'; params.push(status); }
  if (start_date) { query += ' AND m.due_date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND m.due_date <= ?'; params.push(end_date); }
  query += ' ORDER BY m.due_date ASC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/milestones
router.post('/', (req, res) => {
  const { project_id, title, description, due_date, status } = req.body;
  if (!project_id || !title || !due_date) return res.status(400).json({ error: { message: 'Project, title, and due date required' } });
  
  const result = db.prepare(
    'INSERT INTO milestones (project_id, title, description, due_date, status) VALUES (?, ?, ?, ?, ?)'
  ).run(project_id, title, description || '', due_date, status || 'Pending');
  
  logChange({ userId: req.user?.id, entityType: 'milestone', entityId: result.lastInsertRowid, action: 'CREATE' });
  
  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(milestone);
});

// PUT /api/milestones/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Milestone not found' } });
  
  const { title, description, due_date, status, completed_date } = req.body;
  const updated = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    due_date: due_date ?? existing.due_date,
    status: status ?? existing.status,
    completed_date: completed_date !== undefined ? completed_date : existing.completed_date,
  };
  
  // Auto-set completed_date when status changes to Completed
  if (updated.status === 'Completed' && !updated.completed_date) {
    updated.completed_date = new Date().toISOString().split('T')[0];
  }
  
  const changes = diffChanges(existing, updated, ['title', 'due_date', 'status', 'completed_date']);
  
  db.prepare(`
    UPDATE milestones SET title=?, description=?, due_date=?, status=?, completed_date=?, updated_at=datetime('now') WHERE id=?
  `).run(updated.title, updated.description, updated.due_date, updated.status, updated.completed_date, req.params.id);
  
  if (changes.length) {
    logChange({ userId: req.user?.id, entityType: 'milestone', entityId: Number(req.params.id), action: 'UPDATE', changes });
    evaluateAutomations('milestone', Number(req.params.id), changes);
  }

  const milestone = db.prepare('SELECT * FROM milestones WHERE id = ?').get(req.params.id);
  res.json(milestone);
});

// DELETE /api/milestones/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM milestones WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Milestone not found' } });
  logChange({ userId: req.user?.id, entityType: 'milestone', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Milestone deleted' });
});

export default router;
