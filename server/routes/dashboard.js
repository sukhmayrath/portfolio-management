import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', (req, res) => {
  const themeCount = db.prepare('SELECT COUNT(*) as count FROM investment_themes').get().count;
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get().count;

  const costs = db.prepare(`
    SELECT
      COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total_resource_cost,
      COALESCE(SUM(ra.allocated_hours_per_month), 0) as total_allocated_hours
    FROM resource_allocations ra
    JOIN resources r ON ra.resource_id = r.id
  `).get();

  const facilityFixed = db.prepare(`
    SELECT COALESCE(SUM(p.fixed_facility_cost_monthly), 0) as total
    FROM projects p
  `).get().total;

  const facilityLineItems = db.prepare(`
    SELECT COALESCE(SUM(fc.monthly_cost), 0) as total
    FROM facility_costs fc
  `).get().total;

  const overheadData = db.prepare(`
    SELECT p.id, p.overhead_percentage,
      COALESCE((
        SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate)
        FROM resource_allocations ra
        JOIN resources r ON ra.resource_id = r.id
        WHERE ra.project_id = p.id
      ), 0) as resource_cost
    FROM projects p
  `).all();

  const totalOverhead = overheadData.reduce((sum, p) => sum + (p.resource_cost * p.overhead_percentage / 100), 0);

  const revenueData = db.prepare(`
    SELECT p.client_billing_rate_per_hour,
      COALESCE((
        SELECT SUM(ra.allocated_hours_per_month)
        FROM resource_allocations ra
        WHERE ra.project_id = p.id
      ), 0) as allocated_hours
    FROM projects p
  `).all();

  const totalRevenue = revenueData.reduce((sum, p) => sum + (p.allocated_hours * p.client_billing_rate_per_hour), 0);
  const totalFacility = facilityFixed + facilityLineItems;
  const totalCompanyCost = costs.total_resource_cost + totalFacility + totalOverhead;
  const totalBudget = db.prepare('SELECT COALESCE(SUM(total_budget), 0) as total FROM investment_themes').get().total;

  res.json({
    theme_count: themeCount,
    project_count: projectCount,
    resource_count: resourceCount,
    total_budget: totalBudget,
    total_resource_cost: costs.total_resource_cost,
    total_facility_cost: totalFacility,
    total_overhead_cost: totalOverhead,
    total_company_cost: totalCompanyCost,
    total_client_revenue: totalRevenue,
    total_margin: totalRevenue - totalCompanyCost,
    margin_percentage: totalRevenue > 0 ? ((totalRevenue - totalCompanyCost) / totalRevenue) * 100 : 0
  });
});

// GET /api/dashboard/cost-breakdown
router.get('/cost-breakdown', (req, res) => {
  const themes = db.prepare('SELECT * FROM investment_themes ORDER BY name').all();

  const result = themes.map(theme => {
    const projects = db.prepare('SELECT * FROM projects WHERE theme_id = ? ORDER BY name').all(theme.id);

    const projectDetails = projects.map(p => {
      const resourceCost = db.prepare(`
        SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total
        FROM resource_allocations ra
        JOIN resources r ON ra.resource_id = r.id
        WHERE ra.project_id = ?
      `).get(p.id).total;

      const facilityLineItems = db.prepare(
        'SELECT COALESCE(SUM(monthly_cost), 0) as total FROM facility_costs WHERE project_id = ?'
      ).get(p.id).total;

      const allocatedHours = db.prepare(
        'SELECT COALESCE(SUM(allocated_hours_per_month), 0) as total FROM resource_allocations WHERE project_id = ?'
      ).get(p.id).total;

      const totalFacility = p.fixed_facility_cost_monthly + facilityLineItems;
      const overheadCost = resourceCost * (p.overhead_percentage / 100);
      const totalCompanyCost = resourceCost + totalFacility + overheadCost;
      const clientRevenue = allocatedHours * p.client_billing_rate_per_hour;

      return {
        id: p.id,
        name: p.name,
        status: p.status,
        health_status: p.health_status,
        resource_cost: resourceCost,
        fixed_facility_cost: p.fixed_facility_cost_monthly,
        facility_line_items: facilityLineItems,
        total_facility_cost: totalFacility,
        overhead_cost: overheadCost,
        total_company_cost: totalCompanyCost,
        client_revenue: clientRevenue,
        margin: clientRevenue - totalCompanyCost,
        margin_percentage: clientRevenue > 0 ? ((clientRevenue - totalCompanyCost) / clientRevenue) * 100 : 0
      };
    });

    const themeResourceCost = projectDetails.reduce((s, p) => s + p.resource_cost, 0);
    const themeFacilityCost = projectDetails.reduce((s, p) => s + p.total_facility_cost, 0);
    const themeOverhead = projectDetails.reduce((s, p) => s + p.overhead_cost, 0);
    const themeCompanyCost = projectDetails.reduce((s, p) => s + p.total_company_cost, 0);
    const themeRevenue = projectDetails.reduce((s, p) => s + p.client_revenue, 0);

    return {
      id: theme.id,
      name: theme.name,
      status: theme.status,
      total_budget: theme.total_budget,
      resource_cost: themeResourceCost,
      facility_cost: themeFacilityCost,
      overhead_cost: themeOverhead,
      total_company_cost: themeCompanyCost,
      client_revenue: themeRevenue,
      margin: themeRevenue - themeCompanyCost,
      margin_percentage: themeRevenue > 0 ? ((themeRevenue - themeCompanyCost) / themeRevenue) * 100 : 0,
      projects: projectDetails
    };
  });

  res.json(result);
});

// GET /api/dashboard/resource-utilization
router.get('/resource-utilization', (req, res) => {
  const resources = db.prepare(`
    SELECT r.*,
      COALESCE(SUM(ra.allocation_percentage), 0) as total_allocated_pct
    FROM resources r
    LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
    GROUP BY r.id
    ORDER BY r.name
  `).all();

  const projects = db.prepare('SELECT id, name FROM projects ORDER BY name').all();

  const allocations = db.prepare(`
    SELECT ra.resource_id, ra.project_id, ra.allocation_percentage, ra.allocated_hours_per_month
    FROM resource_allocations ra
  `).all();

  const allocMap = {};
  allocations.forEach(a => {
    if (!allocMap[a.resource_id]) allocMap[a.resource_id] = {};
    allocMap[a.resource_id][a.project_id] = {
      percentage: a.allocation_percentage,
      hours: a.allocated_hours_per_month
    };
  });

  const matrix = resources.map(r => ({
    id: r.id,
    name: r.name,
    role: r.role,
    department: r.department,
    hourly_rate: r.hourly_rate,
    available_hours: r.available_hours_per_month,
    total_allocated_pct: r.total_allocated_pct,
    unallocated_pct: 100 - r.total_allocated_pct,
    allocations: allocMap[r.id] || {}
  }));

  res.json({ resources: matrix, projects });
});

// GET /api/dashboard/margin-analysis
router.get('/margin-analysis', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();

  const analysis = projects.map(p => {
    const resourceCost = db.prepare(`
      SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total
      FROM resource_allocations ra
      JOIN resources r ON ra.resource_id = r.id
      WHERE ra.project_id = ?
    `).get(p.id).total;

    const facilityLineItems = db.prepare(
      'SELECT COALESCE(SUM(monthly_cost), 0) as total FROM facility_costs WHERE project_id = ?'
    ).get(p.id).total;

    const allocatedHours = db.prepare(
      'SELECT COALESCE(SUM(allocated_hours_per_month), 0) as total FROM resource_allocations WHERE project_id = ?'
    ).get(p.id).total;

    const totalFacility = p.fixed_facility_cost_monthly + facilityLineItems;
    const overheadCost = resourceCost * (p.overhead_percentage / 100);
    const totalCompanyCost = resourceCost + totalFacility + overheadCost;
    const clientRevenue = allocatedHours * p.client_billing_rate_per_hour;

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      resource_cost: resourceCost,
      facility_cost: totalFacility,
      overhead_cost: overheadCost,
      total_company_cost: totalCompanyCost,
      client_revenue: clientRevenue,
      margin: clientRevenue - totalCompanyCost,
      margin_percentage: clientRevenue > 0 ? ((clientRevenue - totalCompanyCost) / clientRevenue) * 100 : 0
    };
  });

  res.json(analysis);
});

// GET /api/dashboard/resource-costs
router.get('/resource-costs', (req, res) => {
  const resources = db.prepare(`
    SELECT r.id, r.name, r.role, r.department, r.hourly_rate, r.available_hours_per_month,
      COALESCE(SUM(ra.allocated_hours_per_month), 0) as total_allocated_hours,
      COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total_monthly_cost
    FROM resources r
    LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
    GROUP BY r.id
    ORDER BY total_monthly_cost DESC
  `).all();

  const allocations = db.prepare(`
    SELECT ra.resource_id, ra.project_id, p.name as project_name,
      ra.allocated_hours_per_month,
      (ra.allocated_hours_per_month * r.hourly_rate) as monthly_cost
    FROM resource_allocations ra
    JOIN resources r ON ra.resource_id = r.id
    JOIN projects p ON ra.project_id = p.id
    ORDER BY ra.resource_id, monthly_cost DESC
  `).all();

  const allocMap = {};
  allocations.forEach(a => {
    if (!allocMap[a.resource_id]) allocMap[a.resource_id] = [];
    allocMap[a.resource_id].push({
      project_id: a.project_id,
      project_name: a.project_name,
      hours: a.allocated_hours_per_month,
      cost: a.monthly_cost
    });
  });

  const result = resources.map(r => ({
    ...r,
    project_costs: allocMap[r.id] || []
  }));

  const grandTotal = resources.reduce((sum, r) => sum + r.total_monthly_cost, 0);

  res.json({ resources: result, grand_total: grandTotal });
});

// GET /api/dashboard/portfolio-health
router.get('/portfolio-health', (req, res) => {
  // Financial health (40%): overall margin percentage mapped to 0-100
  const costs = db.prepare(`
    SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total_resource_cost
    FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id
  `).get();

  const perProject = db.prepare(`
    SELECT p.overhead_percentage, p.client_billing_rate_per_hour, p.fixed_facility_cost_monthly,
      COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as rc,
      COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as hrs,
      COALESCE((SELECT SUM(fc.monthly_cost) FROM facility_costs fc WHERE fc.project_id = p.id), 0) as fc_items
    FROM projects p
  `).all();

  let totalCost = 0, totalRevenue = 0;
  for (const p of perProject) {
    const facilityCost = p.fixed_facility_cost_monthly + p.fc_items;
    const overhead = p.rc * (p.overhead_percentage / 100);
    totalCost += p.rc + facilityCost + overhead;
    totalRevenue += p.hrs * p.client_billing_rate_per_hour;
  }
  const marginPct = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
  const financialScore = Math.min(100, Math.max(0, marginPct * 2.5));

  // Schedule health (20%): % milestones on time
  const totalMs = db.prepare('SELECT COUNT(*) as c FROM milestones').get().c;
  const onTimeMs = db.prepare("SELECT COUNT(*) as c FROM milestones WHERE status = 'Completed' OR (status IN ('Pending','In Progress') AND due_date >= date('now'))").get().c;
  const scheduleScore = totalMs > 0 ? (onTimeMs / totalMs) * 100 : 100;

  // Risk health (20%): inverse of critical open risks
  const totalRisks = db.prepare("SELECT COUNT(*) as c FROM risks WHERE status IN ('Open','Mitigating')").get().c;
  const criticalRisks = db.prepare("SELECT COUNT(*) as c FROM risks WHERE status = 'Open' AND (likelihood = 'Critical' OR impact = 'Critical')").get().c;
  const riskScore = totalRisks > 0 ? Math.max(0, (1 - criticalRisks / totalRisks) * 100) : 100;

  // Resource health (20%): % resources with 60-100% utilization
  const resourceUtils = db.prepare(`
    SELECT r.id, COALESCE(SUM(ra.allocation_percentage), 0) as util
    FROM resources r LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
    GROUP BY r.id
  `).all();
  const healthyResources = resourceUtils.filter(r => r.util >= 60 && r.util <= 100).length;
  const resourceScore = resourceUtils.length > 0 ? (healthyResources / resourceUtils.length) * 100 : 100;

  const overall = Math.round(financialScore * 0.4 + scheduleScore * 0.2 + riskScore * 0.2 + resourceScore * 0.2);

  res.json({
    overall_score: overall,
    financial_score: Math.round(financialScore),
    schedule_score: Math.round(scheduleScore),
    risk_score: Math.round(riskScore),
    resource_score: Math.round(resourceScore),
    components: {
      financial: Math.round(financialScore),
      schedule: Math.round(scheduleScore),
      risk: Math.round(riskScore),
      resource: Math.round(resourceScore),
    }
  });
});

// GET /api/dashboard/executive-summary
router.get('/executive-summary', (req, res) => {
  // Reuse summary logic
  const themeCount = db.prepare('SELECT COUNT(*) as count FROM investment_themes').get().count;
  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const activeCount = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'Active'").get().count;

  const redProjects = db.prepare("SELECT p.id, p.name, t.name as theme_name FROM projects p JOIN investment_themes t ON p.theme_id = t.id WHERE p.health_status = 'Red' AND p.status = 'Active'").all();
  const overdueMilestones = db.prepare(`
    SELECT m.*, p.name as project_name FROM milestones m JOIN projects p ON m.project_id = p.id
    WHERE m.status IN ('Pending','In Progress') AND m.due_date < date('now') LIMIT 10
  `).all();
  const criticalRisks = db.prepare(`
    SELECT r.*, p.name as project_name FROM risks r JOIN projects p ON r.project_id = p.id
    WHERE r.status = 'Open' AND (r.likelihood = 'Critical' OR r.impact = 'Critical') LIMIT 10
  `).all();

  const healthCounts = db.prepare(`
    SELECT health_status, COUNT(*) as count FROM projects WHERE status = 'Active' GROUP BY health_status
  `).all();

  res.json({
    theme_count: themeCount,
    project_count: projectCount,
    active_count: activeCount,
    red_projects: redProjects,
    overdue_milestones: overdueMilestones,
    critical_risks: criticalRisks,
    health_counts: healthCounts,
  });
});

export default router;
