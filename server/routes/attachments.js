import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = join(__dirname, '..', 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const router = Router();

// GET /api/attachments
router.get('/', (req, res) => {
  const { entity_type, entity_id } = req.query;
  let query = `
    SELECT a.*, u.display_name as uploaded_by_name
    FROM attachments a
    LEFT JOIN users u ON a.uploaded_by = u.id
    WHERE 1=1
  `;
  const params = [];
  if (entity_type) { query += ' AND a.entity_type = ?'; params.push(entity_type); }
  if (entity_id) { query += ' AND a.entity_id = ?'; params.push(entity_id); }
  query += ' ORDER BY a.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/attachments/:id/download
router.get('/:id/download', (req, res) => {
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!attachment) return res.status(404).json({ error: { message: 'Attachment not found' } });

  const filePath = join(UPLOAD_DIR, attachment.filename);
  if (!existsSync(filePath)) return res.status(404).json({ error: { message: 'File not found on disk' } });

  res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
  res.sendFile(filePath);
});

// POST /api/attachments — Accept JSON with base64 encoded file data
router.post('/', (req, res) => {
  const { entity_type, entity_id, filename, data } = req.body;
  if (!entity_type || !entity_id || !filename || !data) {
    return res.status(400).json({ error: { message: 'entity_type, entity_id, filename, and data (base64) are required' } });
  }

  // Decode base64 data
  const buffer = Buffer.from(data, 'base64');
  const storedFilename = `${randomUUID()}-${filename}`;
  const filePath = join(UPLOAD_DIR, storedFilename);

  writeFileSync(filePath, buffer);

  // Determine mime type from extension
  const ext = filename.split('.').pop().toLowerCase();
  const mimeTypes = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
    txt: 'text/plain',
    zip: 'application/zip',
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  const result = db.prepare(`
    INSERT INTO attachments (entity_type, entity_id, filename, original_name, mime_type, size_bytes, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(entity_type, entity_id, storedFilename, filename, mimeType, buffer.length, req.user?.id || null);

  logChange({ userId: req.user?.id, entityType: 'attachment', entityId: result.lastInsertRowid, action: 'CREATE' });

  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(attachment);
});

// DELETE /api/attachments/:id
router.delete('/:id', (req, res) => {
  const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!attachment) return res.status(404).json({ error: { message: 'Attachment not found' } });

  // Delete file from disk
  const filePath = join(UPLOAD_DIR, attachment.filename);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }

  db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.id);
  logChange({ userId: req.user?.id, entityType: 'attachment', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Attachment deleted' });
});

export default router;
