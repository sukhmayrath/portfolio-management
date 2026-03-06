import db from '../db/database.js';

const ENTITY_TABLE_MAP = {
  project: 'projects',
  task: 'tasks',
  risk: 'risks',
  milestone: 'milestones',
  resource: 'resources',
  facility_cost: 'facility_costs',
  request: 'project_requests',
};

export function evaluateAutomations(entityType, entityId, changes) {
  const rules = db.prepare(
    'SELECT * FROM automation_rules WHERE trigger_entity = ? AND is_active = 1'
  ).all(entityType);

  let actionsExecuted = 0;

  for (const rule of rules) {
    // Check if any change matches the trigger
    const matched = changes.some(
      change => change.field === rule.trigger_field && String(change.newValue) === String(rule.trigger_value)
    );

    if (!matched) continue;

    const config = JSON.parse(rule.action_config || '{}');

    if (rule.action_type === 'notification') {
      db.prepare(
        'INSERT INTO notifications (entity_type, entity_id, message, severity) VALUES (?, ?, ?, ?)'
      ).run(
        entityType,
        entityId,
        config.message || `Automation triggered: ${rule.name}`,
        config.severity || 'info'
      );
      actionsExecuted++;
    } else if (rule.action_type === 'field_update') {
      const tableName = ENTITY_TABLE_MAP[entityType];
      if (tableName && config.field && config.value !== undefined) {
        db.prepare(
          `UPDATE ${tableName} SET ${config.field} = ?, updated_at = datetime('now') WHERE id = ?`
        ).run(config.value, entityId);
        actionsExecuted++;
      }
    }
  }

  return actionsExecuted;
}
