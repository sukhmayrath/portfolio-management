import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/timeline/projects
router.get('/projects', (req, res) => {
  const projects = db.prepare(`
    SELECT p.id, p.name, p.status, p.health_status, p.start_date, p.end_date, p.theme_id, t.name as theme_name
    FROM projects p
    JOIN investment_themes t ON p.theme_id = t.id
    WHERE p.start_date IS NOT NULL AND p.end_date IS NOT NULL
    ORDER BY t.name, p.start_date
  `).all();
  
  // Attach milestones for each project
  const getMilestones = db.prepare('SELECT id, title, due_date, status, completed_date FROM milestones WHERE project_id = ? ORDER BY due_date');
  for (const p of projects) {
    p.milestones = getMilestones.all(p.id);
  }
  
  res.json(projects);
});

// GET /api/timeline/roadmap
router.get('/roadmap', (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  
  const projects = db.prepare(`
    SELECT p.id, p.name, p.status, p.health_status, p.priority_score, p.start_date, p.end_date, t.name as theme_name
    FROM projects p
    JOIN investment_themes t ON p.theme_id = t.id
    WHERE p.start_date IS NOT NULL
    ORDER BY p.start_date
  `).all();
  
  const getMilestones = db.prepare('SELECT id, title, due_date, status FROM milestones WHERE project_id = ?');
  
  const quarters = { [`Q1 ${year}`]: [], [`Q2 ${year}`]: [], [`Q3 ${year}`]: [], [`Q4 ${year}`]: [] };
  
  for (const p of projects) {
    p.milestones = getMilestones.all(p.id);
    const completedMs = p.milestones.filter(m => m.status === 'Completed').length;
    p.milestone_progress = p.milestones.length > 0 ? Math.round((completedMs / p.milestones.length) * 100) : 0;
    
    const start = new Date(p.start_date);
    const end = p.end_date ? new Date(p.end_date) : new Date(start.getTime() + 90 * 86400000);
    
    for (let q = 1; q <= 4; q++) {
      const qStart = new Date(year, (q - 1) * 3, 1);
      const qEnd = new Date(year, q * 3, 0);
      if (start <= qEnd && end >= qStart) {
        quarters[`Q${q} ${year}`].push(p);
      }
    }
  }
  
  res.json({ year, quarters });
});

export default router;
