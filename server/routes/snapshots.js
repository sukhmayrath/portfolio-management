import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// POST /api/snapshots/capture
router.post('/capture', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const insert = db.prepare('INSERT INTO snapshots (snapshot_date, snapshot_type, data_type, entity_id, metrics_json) VALUES (?, ?, ?, ?, ?)');
  
  // Portfolio summary snapshot
  const costs = db.prepare(`
    SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total_resource_cost,
      COALESCE(SUM(ra.allocated_hours_per_month), 0) as total_hours
    FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id
  `).get();
  
  const facilityCosts = db.prepare('SELECT COALESCE(SUM(monthly_cost), 0) as total FROM facility_costs').get().total;
  const fixedFacility = db.prepare('SELECT COALESCE(SUM(fixed_facility_cost_monthly), 0) as total FROM projects').get().total;
  const totalFacility = facilityCosts + fixedFacility;
  
  const projects = db.prepare('SELECT overhead_percentage, client_billing_rate_per_hour FROM projects').all();
  let totalOverhead = 0;
  const perProjCosts = db.prepare(`
    SELECT p.id, p.overhead_percentage, p.client_billing_rate_per_hour,
      COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as rc,
      COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as hrs
    FROM projects p
  `).all();
  
  let totalRevenue = 0;
  for (const p of perProjCosts) {
    totalOverhead += p.rc * (p.overhead_percentage / 100);
    totalRevenue += p.hrs * p.client_billing_rate_per_hour;
  }
  const totalCost = costs.total_resource_cost + totalFacility + totalOverhead;
  const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0;
  
  const portfolioMetrics = {
    total_resource_cost: costs.total_resource_cost,
    total_facility_cost: totalFacility,
    total_overhead_cost: totalOverhead,
    total_cost: totalCost,
    total_revenue: totalRevenue,
    margin_percentage: margin,
    project_count: db.prepare('SELECT COUNT(*) as c FROM projects').get().c,
    active_projects: db.prepare("SELECT COUNT(*) as c FROM projects WHERE status = 'Active'").get().c,
    resource_count: db.prepare('SELECT COUNT(*) as c FROM resources').get().c,
  };
  
  insert.run(today, 'daily', 'portfolio_summary', null, JSON.stringify(portfolioMetrics));
  
  res.json({ message: 'Snapshot captured', date: today, metrics: portfolioMetrics });
});

// GET /api/snapshots
router.get('/', (req, res) => {
  const { data_type, start_date, end_date, limit = 100 } = req.query;
  let query = 'SELECT * FROM snapshots WHERE 1=1';
  const params = [];
  if (data_type) { query += ' AND data_type = ?'; params.push(data_type); }
  if (start_date) { query += ' AND snapshot_date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND snapshot_date <= ?'; params.push(end_date); }
  query += ' ORDER BY snapshot_date DESC LIMIT ?';
  params.push(Number(limit));
  res.json(db.prepare(query).all(...params));
});

// GET /api/snapshots/trends
router.get('/trends', (req, res) => {
  const { metric, period = 90 } = req.query;
  const startDate = new Date(Date.now() - Number(period) * 86400000).toISOString().split('T')[0];
  const snapshots = db.prepare(`
    SELECT snapshot_date, metrics_json FROM snapshots
    WHERE data_type = 'portfolio_summary' AND snapshot_date >= ?
    ORDER BY snapshot_date ASC
  `).all(startDate);
  
  const trends = snapshots.map(s => {
    const m = JSON.parse(s.metrics_json);
    return { date: s.snapshot_date, ...m };
  });
  res.json(trends);
});

export default router;
