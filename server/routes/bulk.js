import { Router } from 'express';
import db from '../db/database.js';
import { logChange } from '../utils/auditLogger.js';

const router = Router();

// PUT /api/bulk/projects/status
router.put('/projects/status', (req, res) => {
  const { project_ids, status } = req.body;
  if (!project_ids?.length || !status) return res.status(400).json({ error: { message: 'project_ids and status required' } });
  
  const update = db.prepare("UPDATE projects SET status = ?, updated_at = datetime('now') WHERE id = ?");
  const bulkUpdate = db.transaction((ids) => {
    let count = 0;
    for (const id of ids) {
      const result = update.run(status, id);
      if (result.changes > 0) {
        logChange({ userId: req.user?.id, entityType: 'project', entityId: id, action: 'UPDATE', changes: [{ field: 'status', oldValue: null, newValue: status }] });
        count++;
      }
    }
    return count;
  });
  
  const updated = bulkUpdate(project_ids);
  res.json({ message: `${updated} projects updated`, updated });
});

// PUT /api/bulk/projects/health
router.put('/projects/health', (req, res) => {
  const { project_ids, health_status, health_note } = req.body;
  if (!project_ids?.length || !health_status) return res.status(400).json({ error: { message: 'project_ids and health_status required' } });
  
  const update = db.prepare("UPDATE projects SET health_status = ?, health_note = ?, updated_at = datetime('now') WHERE id = ?");
  const bulkUpdate = db.transaction((ids) => {
    let count = 0;
    for (const id of ids) {
      const result = update.run(health_status, health_note || '', id);
      if (result.changes > 0) {
        logChange({ userId: req.user?.id, entityType: 'project', entityId: id, action: 'UPDATE', changes: [{ field: 'health_status', oldValue: null, newValue: health_status }] });
        count++;
      }
    }
    return count;
  });
  
  const updated = bulkUpdate(project_ids);
  res.json({ message: `${updated} projects updated`, updated });
});

// PUT /api/bulk/tasks/status
router.put('/tasks/status', (req, res) => {
  const { task_ids, status } = req.body;
  if (!task_ids?.length || !status) return res.status(400).json({ error: { message: 'task_ids and status required' } });
  
  const update = db.prepare("UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?");
  const bulkUpdate = db.transaction((ids) => {
    let count = 0;
    for (const id of ids) {
      const result = update.run(status, id);
      if (result.changes > 0) count++;
    }
    return count;
  });
  
  const updated = bulkUpdate(task_ids);
  res.json({ message: `${updated} tasks updated`, updated });
});

export default router;
