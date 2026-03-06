import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/audit
router.get('/', (req, res) => {
  const { entity_type, entity_id, user_id, start_date, end_date, limit = 50, offset = 0 } = req.query;
  let query = `
    SELECT a.*, u.display_name as user_name
    FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (entity_type) { query += ' AND a.entity_type = ?'; params.push(entity_type); }
  if (entity_id) { query += ' AND a.entity_id = ?'; params.push(entity_id); }
  if (user_id) { query += ' AND a.user_id = ?'; params.push(user_id); }
  if (start_date) { query += ' AND a.timestamp >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND a.timestamp <= ?'; params.push(end_date); }
  query += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  const entries = db.prepare(query).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as count FROM audit_log`).get().count;
  res.json({ entries, total });
});

// GET /api/audit/entity/:type/:id
router.get('/entity/:type/:id', (req, res) => {
  const entries = db.prepare(`
    SELECT a.*, u.display_name as user_name
    FROM audit_log a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.entity_type = ? AND a.entity_id = ?
    ORDER BY a.timestamp DESC
    LIMIT 100
  `).all(req.params.type, req.params.id);
  res.json(entries);
});

export default router;
