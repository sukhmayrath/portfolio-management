import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';

const router = Router();

function calculateTotalScore(strategic_alignment, financial_impact, risk_level, resource_availability) {
  return (
    (strategic_alignment * 0.35) +
    (financial_impact * 0.25) +
    ((6 - risk_level) * 0.20) +
    (resource_availability * 0.20)
  ) * 20;
}

// GET /api/requests
router.get('/', (req, res) => {
  const { status, priority } = req.query;
  let query = `
    SELECT r.*, u.display_name as requester_name, t.name as theme_name
    FROM project_requests r
    LEFT JOIN users u ON r.requested_by = u.id
    LEFT JOIN investment_themes t ON r.theme_id = t.id
    WHERE 1=1
  `;
  const params = [];
  if (status) { query += ' AND r.status = ?'; params.push(status); }
  if (priority) { query += ' AND r.priority = ?'; params.push(priority); }
  query += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

// GET /api/requests/:id
router.get('/:id', (req, res) => {
  const request = db.prepare(`
    SELECT r.*, u.display_name as requester_name, rv.display_name as reviewer_name
    FROM project_requests r
    LEFT JOIN users u ON r.requested_by = u.id
    LEFT JOIN users rv ON r.reviewer_id = rv.id
    WHERE r.id = ?
  `).get(req.params.id);
  if (!request) return res.status(404).json({ error: { message: 'Request not found' } });
  res.json(request);
});

// POST /api/requests
router.post('/', (req, res) => {
  const {
    title, description, business_justification, estimated_budget, estimated_timeline,
    priority, strategic_alignment, financial_impact, risk_level, resource_availability, theme_id
  } = req.body;
  if (!title) return res.status(400).json({ error: { message: 'Title is required' } });

  const sa = strategic_alignment || 3;
  const fi = financial_impact || 3;
  const rl = risk_level || 3;
  const ra = resource_availability || 3;
  const total_score = calculateTotalScore(sa, fi, rl, ra);

  const result = db.prepare(`
    INSERT INTO project_requests (title, description, business_justification, estimated_budget, estimated_timeline,
      priority, strategic_alignment, financial_impact, risk_level, resource_availability, total_score, requested_by, theme_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    description || '',
    business_justification || '',
    estimated_budget || 0,
    estimated_timeline || '',
    priority || 'Medium',
    sa, fi, rl, ra,
    total_score,
    req.user?.id || null,
    theme_id || null
  );

  logChange({ userId: req.user?.id, entityType: 'request', entityId: result.lastInsertRowid, action: 'CREATE' });

  const request = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(request);
});

// PUT /api/requests/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Request not found' } });

  const {
    title, description, business_justification, estimated_budget, estimated_timeline,
    priority, strategic_alignment, financial_impact, risk_level, resource_availability, theme_id,
    status, review_notes
  } = req.body;

  const updated = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    business_justification: business_justification ?? existing.business_justification,
    estimated_budget: estimated_budget ?? existing.estimated_budget,
    estimated_timeline: estimated_timeline ?? existing.estimated_timeline,
    priority: priority ?? existing.priority,
    strategic_alignment: strategic_alignment ?? existing.strategic_alignment,
    financial_impact: financial_impact ?? existing.financial_impact,
    risk_level: risk_level ?? existing.risk_level,
    resource_availability: resource_availability ?? existing.resource_availability,
    theme_id: theme_id !== undefined ? theme_id : existing.theme_id,
    status: status ?? existing.status,
    review_notes: review_notes ?? existing.review_notes,
  };

  // Recalculate total_score if scoring fields change
  const scoringChanged = strategic_alignment !== undefined || financial_impact !== undefined ||
    risk_level !== undefined || resource_availability !== undefined;
  updated.total_score = scoringChanged
    ? calculateTotalScore(updated.strategic_alignment, updated.financial_impact, updated.risk_level, updated.resource_availability)
    : existing.total_score;

  const changes = diffChanges(existing, updated, ['title', 'description', 'priority', 'status', 'strategic_alignment', 'financial_impact', 'risk_level', 'resource_availability', 'total_score']);

  db.prepare(`
    UPDATE project_requests SET title=?, description=?, business_justification=?, estimated_budget=?, estimated_timeline=?,
      priority=?, strategic_alignment=?, financial_impact=?, risk_level=?, resource_availability=?, total_score=?, theme_id=?,
      status=?, review_notes=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    updated.title, updated.description, updated.business_justification, updated.estimated_budget,
    updated.estimated_timeline, updated.priority, updated.strategic_alignment, updated.financial_impact,
    updated.risk_level, updated.resource_availability, updated.total_score, updated.theme_id,
    updated.status, updated.review_notes, req.params.id
  );

  if (changes.length) logChange({ userId: req.user?.id, entityType: 'request', entityId: Number(req.params.id), action: 'UPDATE', changes });

  const request = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(req.params.id);
  res.json(request);
});

// PUT /api/requests/:id/submit
router.put('/:id/submit', (req, res) => {
  const existing = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Request not found' } });
  if (existing.status !== 'Draft') return res.status(400).json({ error: { message: 'Only Draft requests can be submitted' } });

  db.prepare("UPDATE project_requests SET status = 'Submitted', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  logChange({ userId: req.user?.id, entityType: 'request', entityId: Number(req.params.id), action: 'UPDATE', changes: [{ field: 'status', oldValue: 'Draft', newValue: 'Submitted' }] });

  const request = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(req.params.id);
  res.json(request);
});

// PUT /api/requests/:id/review
router.put('/:id/review', (req, res) => {
  const existing = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Request not found' } });

  const { decision, review_notes } = req.body;
  if (!decision || !['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: { message: "Decision must be 'Approved' or 'Rejected'" } });
  }

  db.prepare(`
    UPDATE project_requests SET status = ?, reviewer_id = ?, review_notes = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `).run(decision, req.user?.id || null, review_notes || '', req.params.id);

  logChange({ userId: req.user?.id, entityType: 'request', entityId: Number(req.params.id), action: 'UPDATE', changes: [{ field: 'status', oldValue: existing.status, newValue: decision }] });

  const request = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(req.params.id);
  res.json(request);
});

// POST /api/requests/:id/convert
router.post('/:id/convert', (req, res) => {
  const existing = db.prepare('SELECT * FROM project_requests WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Request not found' } });
  if (existing.status !== 'Approved') return res.status(400).json({ error: { message: 'Only Approved requests can be converted' } });

  const { theme_id, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage } = req.body;
  const resolvedThemeId = theme_id || existing.theme_id;
  if (!resolvedThemeId) return res.status(400).json({ error: { message: 'theme_id is required' } });

  const convertTransaction = db.transaction(() => {
    // Create project from request data
    const projectResult = db.prepare(`
      INSERT INTO projects (theme_id, name, description, status, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      resolvedThemeId,
      existing.title,
      existing.description,
      'Planning',
      start_date || null,
      end_date || null,
      client_billing_rate_per_hour || 0,
      fixed_facility_cost_monthly || 0,
      overhead_percentage || 0
    );
    const projectId = projectResult.lastInsertRowid;

    // Update request status to Converted
    db.prepare(`
      UPDATE project_requests SET status = 'Converted', converted_project_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(projectId, existing.id);

    logChange({ userId: req.user?.id, entityType: 'project', entityId: projectId, action: 'CREATE' });
    logChange({ userId: req.user?.id, entityType: 'request', entityId: existing.id, action: 'UPDATE', changes: [{ field: 'status', oldValue: 'Approved', newValue: 'Converted' }] });

    return db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  });

  const project = convertTransaction();
  res.status(201).json(project);
});

// DELETE /api/requests/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM project_requests WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: { message: 'Request not found' } });
  logChange({ userId: req.user?.id, entityType: 'request', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Request deleted' });
});

export default router;
