import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/tags
router.get('/', (req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY name').all();
  res.json(tags);
});

// POST /api/tags
router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: { message: 'Tag name required' } });
  try {
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color || '#64748b');
    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: { message: 'Tag already exists' } });
    throw e;
  }
});

// DELETE /api/tags/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Tag not found' } });
  res.json({ message: 'Tag deleted' });
});

// GET /api/tags/project/:projectId
router.get('/project/:projectId', (req, res) => {
  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN project_tags pt ON t.id = pt.tag_id
    WHERE pt.project_id = ?
    ORDER BY t.name
  `).all(req.params.projectId);
  res.json(tags);
});

// POST /api/tags/project/:projectId - add tags to project
router.post('/project/:projectId', (req, res) => {
  const { tag_ids } = req.body;
  if (!tag_ids || !Array.isArray(tag_ids)) return res.status(400).json({ error: { message: 'tag_ids array required' } });
  
  const insert = db.prepare('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)');
  const addTags = db.transaction((ids) => {
    for (const tagId of ids) {
      insert.run(req.params.projectId, tagId);
    }
  });
  addTags(tag_ids);
  
  const tags = db.prepare(`
    SELECT t.* FROM tags t
    JOIN project_tags pt ON t.id = pt.tag_id
    WHERE pt.project_id = ?
    ORDER BY t.name
  `).all(req.params.projectId);
  res.json(tags);
});

// DELETE /api/tags/project/:projectId/:tagId - remove tag from project
router.delete('/project/:projectId/:tagId', (req, res) => {
  db.prepare('DELETE FROM project_tags WHERE project_id = ? AND tag_id = ?').run(req.params.projectId, req.params.tagId);
  res.json({ message: 'Tag removed' });
});

export default router;
