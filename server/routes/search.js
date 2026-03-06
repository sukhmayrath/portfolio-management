import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/search?q=term
router.get('/', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  
  const term = `%${q}%`;
  
  const clients = db.prepare(`
    SELECT id, name, description, 'client' as type FROM investment_themes WHERE name LIKE ? OR description LIKE ? LIMIT 10
  `).all(term, term);
  
  const projects = db.prepare(`
    SELECT p.id, p.name, t.name as theme_name, 'project' as type
    FROM projects p JOIN investment_themes t ON p.theme_id = t.id
    WHERE p.name LIKE ? OR p.description LIKE ? LIMIT 10
  `).all(term, term);
  
  const resources = db.prepare(`
    SELECT id, name, role, department, 'resource' as type FROM resources WHERE name LIKE ? OR role LIKE ? OR department LIKE ? LIMIT 10
  `).all(term, term, term);
  
  const tasks = db.prepare(`
    SELECT t.id, t.title as name, p.name as project_name, 'task' as type
    FROM tasks t JOIN projects p ON t.project_id = p.id
    WHERE t.title LIKE ? OR t.description LIKE ? LIMIT 10
  `).all(term, term);
  
  const risks = db.prepare(`
    SELECT r.id, r.title as name, p.name as project_name, 'risk' as type
    FROM risks r JOIN projects p ON r.project_id = p.id
    WHERE r.title LIKE ? OR r.description LIKE ? LIMIT 10
  `).all(term, term);
  
  res.json({ results: [...clients, ...projects, ...resources, ...tasks, ...risks] });
});

export default router;
