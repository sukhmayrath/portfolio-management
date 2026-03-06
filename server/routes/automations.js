import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';

const router = Router();

// GET /api/automations
router.get('/', (req, res) => {
  const { trigger_entity, is_active } = req.query;
  let query = `
    SELECT ar.*, u.display_name as created_by_name
    FROM automation_rules ar
    LEFT JOIN users u ON ar.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (trigger_entity) { query += ' AND ar.trigger_entity = ?'; params.push(trigger_entity); }
  if (is_active !== undefined) { query += ' AND ar.is_active = ?'; params.push(Number(is_active)); }
  query += ' ORDER BY ar.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/automations
router.post('/', (req, res) => {
  const { name, trigger_entity, trigger_field, trigger_value, action_type, action_config, is_active } = req.body;
  if (!name || !trigger_entity || !trigger_field || !trigger_value || !action_type) {
    return res.status(400).json({ error: { message: 'name, trigger_entity, trigger_field, trigger_value, and action_type are required' } });
  }

  const result = db.prepare(`
    INSERT INTO automation_rules (name, trigger_entity, trigger_field, trigger_value, action_type, action_config, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    trigger_entity,
    trigger_field,
    trigger_value,
    action_type,
    action_config || '{}',
    is_active !== undefined ? is_active : 1,
    req.user?.id || null
  );

  logChange({ userId: req.user?.id, entityType: 'automation_rule', entityId: result.lastInsertRowid, action: 'CREATE' });

  const rule = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(rule);
});

// PUT /api/automations/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Automation rule not found' } });

  const { name, trigger_entity, trigger_field, trigger_value, action_type, action_config, is_active } = req.body;

  const updated = {
    name: name ?? existing.name,
    trigger_entity: trigger_entity ?? existing.trigger_entity,
    trigger_field: trigger_field ?? existing.trigger_field,
    trigger_value: trigger_value ?? existing.trigger_value,
    action_type: action_type ?? existing.action_type,
    action_config: action_config ?? existing.action_config,
    is_active: is_active !== undefined ? is_active : existing.is_active,
  };

  const changes = diffChanges(existing, updated, ['name', 'trigger_entity', 'trigger_field', 'trigger_value', 'action_type', 'is_active']);

  db.prepare(`
    UPDATE automation_rules SET name=?, trigger_entity=?, trigger_field=?, trigger_value=?, action_type=?, action_config=?, is_active=?
    WHERE id=?
  `).run(updated.name, updated.trigger_entity, updated.trigger_field, updated.trigger_value, updated.action_type, updated.action_config, updated.is_active, req.params.id);

  if (changes.length) logChange({ userId: req.user?.id, entityType: 'automation_rule', entityId: Number(req.params.id), action: 'UPDATE', changes });

  const rule = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(req.params.id);
  res.json(rule);
});

// DELETE /api/automations/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM automation_rules WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Automation rule not found' } });
  logChange({ userId: req.user?.id, entityType: 'automation_rule', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Automation rule deleted' });
});

export default router;
