import db from '../db/database.js';

const insertAudit = db.prepare(`
  INSERT INTO audit_log (user_id, entity_type, entity_id, action, field_name, old_value, new_value)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

export function logChange({ userId, entityType, entityId, action, changes = [] }) {
  if (changes.length === 0) {
    insertAudit.run(userId, entityType, entityId, action, null, null, null);
    return;
  }
  for (const { field, oldValue, newValue } of changes) {
    insertAudit.run(
      userId, entityType, entityId, action,
      field,
      oldValue != null ? String(oldValue) : null,
      newValue != null ? String(newValue) : null
    );
  }
}

export function diffChanges(existing, updated, fields) {
  const changes = [];
  for (const field of fields) {
    if (updated[field] !== undefined && String(existing[field]) !== String(updated[field])) {
      changes.push({ field, oldValue: existing[field], newValue: updated[field] });
    }
  }
  return changes;
}
