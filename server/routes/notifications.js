import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/notifications
router.get('/', (req, res) => {
  const { is_read, severity, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params = [];
  if (is_read !== undefined) { query += ' AND is_read = ?'; params.push(Number(is_read)); }
  if (severity) { query += ' AND severity = ?'; params.push(severity); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));
  
  const notifications = db.prepare(query).all(...params);
  const unread_count = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE is_read = 0').get().count;
  res.json({ notifications, unread_count });
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Marked as read' });
});

// PUT /api/notifications/read-all
router.put('/read-all', (req, res) => {
  const result = db.prepare('UPDATE notifications SET is_read = 1 WHERE is_read = 0').run();
  res.json({ message: `${result.changes} notifications marked as read` });
});

// GET /api/notifications/alert-rules
router.get('/alert-rules', (req, res) => {
  const rules = db.prepare(`
    SELECT ar.*, u.display_name as created_by_name
    FROM alert_rules ar
    LEFT JOIN users u ON ar.created_by = u.id
    ORDER BY ar.created_at DESC
  `).all();
  res.json(rules);
});

// POST /api/notifications/alert-rules
router.post('/alert-rules', (req, res) => {
  const { name, rule_type, threshold_value, is_active } = req.body;
  if (!name || !rule_type) return res.status(400).json({ error: { message: 'Name and rule_type required' } });
  
  const result = db.prepare(
    'INSERT INTO alert_rules (name, rule_type, threshold_value, is_active, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(name, rule_type, threshold_value || null, is_active !== undefined ? is_active : 1, req.user?.id || null);
  
  const rule = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(rule);
});

// PUT /api/notifications/alert-rules/:id
router.put('/alert-rules/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Rule not found' } });
  
  const { name, rule_type, threshold_value, is_active } = req.body;
  db.prepare('UPDATE alert_rules SET name=?, rule_type=?, threshold_value=?, is_active=? WHERE id=?')
    .run(name ?? existing.name, rule_type ?? existing.rule_type, threshold_value !== undefined ? threshold_value : existing.threshold_value, is_active !== undefined ? is_active : existing.is_active, req.params.id);
  
  res.json(db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(req.params.id));
});

// DELETE /api/notifications/alert-rules/:id
router.delete('/alert-rules/:id', (req, res) => {
  const result = db.prepare('DELETE FROM alert_rules WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Rule not found' } });
  res.json({ message: 'Rule deleted' });
});

// POST /api/notifications/evaluate - evaluate all active rules
router.post('/evaluate', (req, res) => {
  const rules = db.prepare('SELECT * FROM alert_rules WHERE is_active = 1').all();
  const insert = db.prepare('INSERT INTO notifications (alert_rule_id, entity_type, entity_id, message, severity) VALUES (?, ?, ?, ?, ?)');
  let generated = 0;
  
  const evaluate = db.transaction(() => {
    for (const rule of rules) {
      if (rule.rule_type === 'margin_below') {
        const threshold = rule.threshold_value || 10;
        const projects = db.prepare(`
          SELECT p.id, p.name,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as resource_cost,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as total_hours
          FROM projects p WHERE p.status = 'Active'
        `).all();
        for (const p of projects) {
          const revenue = p.total_hours * (db.prepare('SELECT client_billing_rate_per_hour FROM projects WHERE id = ?').get(p.id)?.client_billing_rate_per_hour || 0);
          const margin = revenue > 0 ? ((revenue - p.resource_cost) / revenue) * 100 : 0;
          if (margin < threshold) {
            insert.run(rule.id, 'project', p.id, `Project "${p.name}" margin (${margin.toFixed(1)}%) is below ${threshold}% threshold`, 'warning');
            generated++;
          }
        }
      } else if (rule.rule_type === 'over_allocation') {
        const resources = db.prepare(`
          SELECT r.id, r.name, COALESCE(SUM(ra.allocation_percentage), 0) as total_alloc
          FROM resources r
          LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
          GROUP BY r.id HAVING total_alloc > 100
        `).all();
        for (const r of resources) {
          insert.run(rule.id, 'resource', r.id, `Resource "${r.name}" is over-allocated at ${r.total_alloc.toFixed(0)}%`, 'critical');
          generated++;
        }
      } else if (rule.rule_type === 'health_red') {
        const projects = db.prepare("SELECT id, name FROM projects WHERE health_status = 'Red' AND status = 'Active'").all();
        for (const p of projects) {
          insert.run(rule.id, 'project', p.id, `Project "${p.name}" has Red health status`, 'critical');
          generated++;
        }
      } else if (rule.rule_type === 'milestone_overdue') {
        const milestones = db.prepare(`
          SELECT m.id, m.title, p.name as project_name
          FROM milestones m JOIN projects p ON m.project_id = p.id
          WHERE m.status IN ('Pending', 'In Progress') AND m.due_date < date('now')
        `).all();
        for (const m of milestones) {
          insert.run(rule.id, 'milestone', m.id, `Milestone "${m.title}" in "${m.project_name}" is overdue`, 'warning');
          generated++;
        }
      } else if (rule.rule_type === 'risk_critical') {
        const risks = db.prepare(`
          SELECT ri.id, ri.title, p.name as project_name
          FROM risks ri JOIN projects p ON ri.project_id = p.id
          WHERE ri.status = 'Open' AND (ri.likelihood = 'Critical' OR ri.impact = 'Critical')
        `).all();
        for (const r of risks) {
          insert.run(rule.id, 'risk', r.id, `Critical risk "${r.title}" in "${r.project_name}" is open`, 'critical');
          generated++;
        }
      }
    }
  });
  
  evaluate();
  res.json({ message: `Evaluation complete. ${generated} notifications generated.`, generated });
});

export default router;
