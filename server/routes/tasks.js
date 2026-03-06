import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';
import { evaluateAutomations } from '../utils/automationEngine.js';

const router = Router();

// GET /api/tasks
router.get('/', (req, res) => {
  const { project_id, assigned_resource_id } = req.query;
  let query = `
    SELECT t.*, r.name as assigned_resource_name, p.name as project_name,
      COALESCE((SELECT COUNT(*) FROM task_dependencies WHERE task_id = t.id), 0) as dependency_count
    FROM tasks t
    LEFT JOIN resources r ON t.assigned_resource_id = r.id
    JOIN projects p ON t.project_id = p.id
  `;
  const conditions = [];
  const params = [];
  if (project_id) { conditions.push('t.project_id = ?'); params.push(project_id); }
  if (assigned_resource_id) { conditions.push('t.assigned_resource_id = ?'); params.push(assigned_resource_id); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY t.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/tasks/critical-path
router.get('/critical-path', (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: { message: 'project_id required' } });

  const tasks = db.prepare('SELECT id, title, status, estimated_hours FROM tasks WHERE project_id = ?').all(project_id);
  const deps = db.prepare(`
    SELECT td.task_id, td.depends_on_task_id
    FROM task_dependencies td
    JOIN tasks t ON td.task_id = t.id
    WHERE t.project_id = ?
  `).all(project_id);

  // Build adjacency list and compute longest path (critical path)
  const taskMap = {};
  tasks.forEach(t => { taskMap[t.id] = { ...t, duration: t.estimated_hours || 1, dependsOn: [], dependedBy: [] }; });
  deps.forEach(d => {
    if (taskMap[d.task_id]) taskMap[d.task_id].dependsOn.push(d.depends_on_task_id);
    if (taskMap[d.depends_on_task_id]) taskMap[d.depends_on_task_id].dependedBy.push(d.task_id);
  });

  // Topological sort + longest path
  const visited = new Set();
  const order = [];
  const visit = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    (taskMap[id]?.dependedBy || []).forEach(visit);
    order.push(id);
  };
  Object.keys(taskMap).forEach(id => visit(Number(id)));
  order.reverse();

  const dist = {};
  const prev = {};
  Object.keys(taskMap).forEach(id => { dist[id] = 0; prev[id] = null; });

  for (const id of order) {
    const task = taskMap[id];
    if (!task) continue;
    for (const depId of task.dependedBy) {
      const newDist = dist[id] + task.duration;
      if (newDist > dist[depId]) {
        dist[depId] = newDist;
        prev[depId] = id;
      }
    }
  }

  // Find the endpoint with maximum distance
  let maxDist = 0, endId = null;
  Object.entries(dist).forEach(([id, d]) => { if (d >= maxDist) { maxDist = d; endId = Number(id); } });

  // Trace back the critical path
  const criticalPath = [];
  let current = endId;
  while (current != null) {
    criticalPath.unshift(current);
    current = prev[current];
  }

  res.json({ critical_path: criticalPath, total_duration: maxDist + (taskMap[endId]?.duration || 0), tasks: tasks.map(t => ({ ...t, is_critical: criticalPath.includes(t.id) })) });
});

// POST /api/tasks
router.post('/', (req, res) => {
  const { project_id, assigned_resource_id, title, description, status, estimated_hours, actual_hours } = req.body;
  if (!project_id || !title) return res.status(400).json({ error: { message: 'project_id and title are required' } });
  const result = db.prepare(
    `INSERT INTO tasks (project_id, assigned_resource_id, title, description, status, estimated_hours, actual_hours)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(project_id, assigned_resource_id || null, title, description || '', status || 'To Do', estimated_hours || 0, actual_hours || 0);
  const task = db.prepare(`
    SELECT t.*, r.name as assigned_resource_name
    FROM tasks t LEFT JOIN resources r ON t.assigned_resource_id = r.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Task not found' } });
  const { title, description, status, assigned_resource_id, estimated_hours, actual_hours } = req.body;
  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, status = ?, assigned_resource_id = ?, estimated_hours = ?, actual_hours = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    title ?? existing.title, description ?? existing.description, status ?? existing.status,
    assigned_resource_id !== undefined ? assigned_resource_id : existing.assigned_resource_id,
    estimated_hours ?? existing.estimated_hours, actual_hours ?? existing.actual_hours, req.params.id
  );
  const task = db.prepare(`
    SELECT t.*, r.name as assigned_resource_name
    FROM tasks t LEFT JOIN resources r ON t.assigned_resource_id = r.id
    WHERE t.id = ?
  `).get(req.params.id);

  const changes = diffChanges(existing, task, ['title', 'status', 'assigned_resource_id']);
  if (changes.length) {
    logChange({ userId: req.user?.id, entityType: 'task', entityId: Number(req.params.id), action: 'UPDATE', changes });
    evaluateAutomations('task', Number(req.params.id), changes);
  }

  res.json(task);
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Task not found' } });
  res.json({ message: 'Task deleted' });
});

// GET /api/tasks/:id/dependencies
router.get('/:id/dependencies', (req, res) => {
  const deps = db.prepare(`
    SELECT td.*, t.title as depends_on_title, t.status as depends_on_status
    FROM task_dependencies td
    JOIN tasks t ON td.depends_on_task_id = t.id
    WHERE td.task_id = ?
  `).all(req.params.id);
  res.json(deps);
});

// POST /api/tasks/:id/dependencies
router.post('/:id/dependencies', (req, res) => {
  const { depends_on_task_id } = req.body;
  if (!depends_on_task_id) return res.status(400).json({ error: { message: 'depends_on_task_id required' } });
  if (Number(req.params.id) === Number(depends_on_task_id)) return res.status(400).json({ error: { message: 'Task cannot depend on itself' } });

  try {
    const result = db.prepare('INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)').run(req.params.id, depends_on_task_id);
    const dep = db.prepare('SELECT td.*, t.title as depends_on_title FROM task_dependencies td JOIN tasks t ON td.depends_on_task_id = t.id WHERE td.id = ?').get(result.lastInsertRowid);
    res.status(201).json(dep);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: { message: 'Dependency already exists' } });
    throw e;
  }
});

// DELETE /api/tasks/:id/dependencies/:depId
router.delete('/:id/dependencies/:depId', (req, res) => {
  const result = db.prepare('DELETE FROM task_dependencies WHERE id = ? AND task_id = ?').run(req.params.depId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Dependency not found' } });
  res.json({ message: 'Dependency removed' });
});

export default router;
