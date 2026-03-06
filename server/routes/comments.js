import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/comments
router.get('/', (req, res) => {
  const { entity_type, entity_id } = req.query;
  if (!entity_type || !entity_id) return res.status(400).json({ error: { message: 'entity_type and entity_id required' } });
  
  const comments = db.prepare(`
    SELECT c.*, u.display_name as user_name
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.entity_type = ? AND c.entity_id = ?
    ORDER BY c.created_at ASC
  `).all(entity_type, entity_id);
  res.json(comments);
});

// POST /api/comments
router.post('/', (req, res) => {
  const { entity_type, entity_id, content } = req.body;
  if (!entity_type || !entity_id || !content) return res.status(400).json({ error: { message: 'entity_type, entity_id, and content required' } });
  
  const result = db.prepare(
    'INSERT INTO comments (entity_type, entity_id, user_id, content) VALUES (?, ?, ?, ?)'
  ).run(entity_type, entity_id, req.user?.id || null, content);
  
  const comment = db.prepare(`
    SELECT c.*, u.display_name as user_name
    FROM comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(comment);
});

// PUT /api/comments/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Comment not found' } });
  
  const { content } = req.body;
  db.prepare("UPDATE comments SET content = ?, updated_at = datetime('now') WHERE id = ?").run(content, req.params.id);
  
  const comment = db.prepare(`
    SELECT c.*, u.display_name as user_name
    FROM comments c LEFT JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  res.json(comment);
});

// DELETE /api/comments/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Comment not found' } });
  res.json({ message: 'Comment deleted' });
});

export default router;
