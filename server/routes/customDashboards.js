import { Router } from 'express';
import db from '../db/database.js';
import { logChange, diffChanges } from '../utils/auditLogger.js';

const router = Router();

// GET /api/custom-dashboards
router.get('/', (req, res) => {
  const dashboards = db.prepare(`
    SELECT cd.*, u.display_name as owner_name
    FROM custom_dashboards cd
    LEFT JOIN users u ON cd.owner_id = u.id
    WHERE cd.owner_id = ? OR cd.is_shared = 1
    ORDER BY cd.created_at DESC
  `).all(req.user?.id || 0);
  res.json(dashboards);
});

// GET /api/custom-dashboards/widget-data/:type — must be before /:id
router.get('/widget-data/:type', (req, res) => {
  const { type } = req.params;
  const config = req.query;

  switch (type) {
    case 'kpi_summary': {
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

      const facilityFixed = db.prepare('SELECT COALESCE(SUM(fixed_facility_cost_monthly), 0) as total FROM projects').get().total;
      const facilityLineItems = db.prepare('SELECT COALESCE(SUM(monthly_cost), 0) as total FROM facility_costs').get().total;

      const overheadData = db.prepare(`
        SELECT p.id, p.overhead_percentage,
          COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as resource_cost
        FROM projects p
      `).all();
      const totalOverhead = overheadData.reduce((sum, p) => sum + (p.resource_cost * p.overhead_percentage / 100), 0);

      const revenueData = db.prepare(`
        SELECT p.client_billing_rate_per_hour,
          COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as allocated_hours
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
      break;
    }

    case 'cost_breakdown': {
      const themes = db.prepare('SELECT * FROM investment_themes ORDER BY name').all();
      const result = themes.map(theme => {
        const projects = db.prepare('SELECT * FROM projects WHERE theme_id = ? ORDER BY name').all(theme.id);
        const projectDetails = projects.map(p => {
          const resourceCost = db.prepare(`
            SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total
            FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = ?
          `).get(p.id).total;
          const facilityLineItems = db.prepare('SELECT COALESCE(SUM(monthly_cost), 0) as total FROM facility_costs WHERE project_id = ?').get(p.id).total;
          const allocatedHours = db.prepare('SELECT COALESCE(SUM(allocated_hours_per_month), 0) as total FROM resource_allocations WHERE project_id = ?').get(p.id).total;
          const totalFacility = p.fixed_facility_cost_monthly + facilityLineItems;
          const overheadCost = resourceCost * (p.overhead_percentage / 100);
          const totalCompanyCost = resourceCost + totalFacility + overheadCost;
          const clientRevenue = allocatedHours * p.client_billing_rate_per_hour;
          return {
            id: p.id, name: p.name, status: p.status,
            resource_cost: resourceCost, facility_cost: totalFacility,
            overhead_cost: overheadCost, total_company_cost: totalCompanyCost,
            client_revenue: clientRevenue,
            margin: clientRevenue - totalCompanyCost,
            margin_percentage: clientRevenue > 0 ? ((clientRevenue - totalCompanyCost) / clientRevenue) * 100 : 0
          };
        });
        const themeCompanyCost = projectDetails.reduce((s, p) => s + p.total_company_cost, 0);
        const themeRevenue = projectDetails.reduce((s, p) => s + p.client_revenue, 0);
        return {
          id: theme.id, name: theme.name, total_budget: theme.total_budget,
          total_company_cost: themeCompanyCost, client_revenue: themeRevenue,
          margin: themeRevenue - themeCompanyCost,
          margin_percentage: themeRevenue > 0 ? ((themeRevenue - themeCompanyCost) / themeRevenue) * 100 : 0,
          projects: projectDetails
        };
      });
      res.json(result);
      break;
    }

    case 'health_summary': {
      const healthCounts = db.prepare(`
        SELECT health_status, COUNT(*) as count
        FROM projects
        GROUP BY health_status
      `).all();
      res.json(healthCounts);
      break;
    }

    case 'risk_summary': {
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count FROM risks GROUP BY status
      `).all();
      const byLikelihood = db.prepare(`
        SELECT likelihood, COUNT(*) as count FROM risks GROUP BY likelihood
      `).all();
      res.json({ by_status: byStatus, by_likelihood: byLikelihood });
      break;
    }

    case 'milestone_summary': {
      const byStatus = db.prepare(`
        SELECT status, COUNT(*) as count FROM milestones GROUP BY status
      `).all();
      const overdueCount = db.prepare(`
        SELECT COUNT(*) as count FROM milestones
        WHERE status IN ('Pending', 'In Progress') AND due_date < date('now')
      `).get().count;
      res.json({ by_status: byStatus, overdue_count: overdueCount });
      break;
    }

    case 'resource_utilization': {
      const resources = db.prepare(`
        SELECT r.id, r.name, r.role, r.department, r.available_hours_per_month,
          COALESCE(SUM(ra.allocation_percentage), 0) as total_allocated_pct,
          COALESCE(SUM(ra.allocated_hours_per_month), 0) as total_allocated_hours
        FROM resources r
        LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
        GROUP BY r.id
        ORDER BY r.name
      `).all();

      const totalResources = resources.length;
      const overAllocated = resources.filter(r => r.total_allocated_pct > 100).length;
      const underAllocated = resources.filter(r => r.total_allocated_pct < 50).length;
      const optimallyAllocated = resources.filter(r => r.total_allocated_pct >= 50 && r.total_allocated_pct <= 100).length;
      const avgUtilization = totalResources > 0
        ? resources.reduce((sum, r) => sum + r.total_allocated_pct, 0) / totalResources
        : 0;

      res.json({
        total_resources: totalResources,
        over_allocated: overAllocated,
        under_allocated: underAllocated,
        optimally_allocated: optimallyAllocated,
        avg_utilization: avgUtilization,
        resources
      });
      break;
    }

    case 'project_list': {
      let query = `
        SELECT p.id, p.name, p.status, p.health_status, p.start_date, p.end_date,
          t.name as theme_name, p.priority_score
        FROM projects p
        JOIN investment_themes t ON p.theme_id = t.id
        WHERE 1=1
      `;
      const params = [];
      if (config.status) { query += ' AND p.status = ?'; params.push(config.status); }
      if (config.theme_id) { query += ' AND p.theme_id = ?'; params.push(config.theme_id); }
      if (config.health_status) { query += ' AND p.health_status = ?'; params.push(config.health_status); }
      query += ' ORDER BY p.created_at DESC';
      res.json(db.prepare(query).all(...params));
      break;
    }

    case 'margin_analysis': {
      const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();
      const analysis = projects.map(p => {
        const resourceCost = db.prepare(`
          SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total
          FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = ?
        `).get(p.id).total;
        const facilityLineItems = db.prepare('SELECT COALESCE(SUM(monthly_cost), 0) as total FROM facility_costs WHERE project_id = ?').get(p.id).total;
        const allocatedHours = db.prepare('SELECT COALESCE(SUM(allocated_hours_per_month), 0) as total FROM resource_allocations WHERE project_id = ?').get(p.id).total;
        const totalFacility = p.fixed_facility_cost_monthly + facilityLineItems;
        const overheadCost = resourceCost * (p.overhead_percentage / 100);
        const totalCompanyCost = resourceCost + totalFacility + overheadCost;
        const clientRevenue = allocatedHours * p.client_billing_rate_per_hour;
        return {
          id: p.id, name: p.name, status: p.status,
          resource_cost: resourceCost, facility_cost: totalFacility,
          overhead_cost: overheadCost, total_company_cost: totalCompanyCost,
          client_revenue: clientRevenue,
          margin: clientRevenue - totalCompanyCost,
          margin_percentage: clientRevenue > 0 ? ((clientRevenue - totalCompanyCost) / clientRevenue) * 100 : 0
        };
      });
      res.json(analysis);
      break;
    }

    case 'kpi_card': {
      const metric = config.metric || 'project_count';
      let value = 0;
      let sublabel = '';

      if (metric === 'total_revenue' || metric === 'total_client_revenue') {
        const revenueData = db.prepare(`
          SELECT p.client_billing_rate_per_hour,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as allocated_hours
          FROM projects p
        `).all();
        value = revenueData.reduce((sum, p) => sum + (p.allocated_hours * p.client_billing_rate_per_hour), 0);
        sublabel = 'Monthly client revenue';
      } else if (metric === 'total_cost' || metric === 'total_company_cost') {
        const costs = db.prepare(`
          SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total_resource_cost
          FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id
        `).get();
        const facilityFixed = db.prepare('SELECT COALESCE(SUM(fixed_facility_cost_monthly), 0) as total FROM projects').get().total;
        const facilityLineItems = db.prepare('SELECT COALESCE(SUM(monthly_cost), 0) as total FROM facility_costs').get().total;
        const overheadData = db.prepare(`
          SELECT p.overhead_percentage,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as resource_cost
          FROM projects p
        `).all();
        const totalOverhead = overheadData.reduce((sum, p) => sum + (p.resource_cost * p.overhead_percentage / 100), 0);
        value = costs.total_resource_cost + facilityFixed + facilityLineItems + totalOverhead;
        sublabel = 'Monthly total cost';
      } else if (metric === 'margin_percentage') {
        const revenueData = db.prepare(`
          SELECT p.client_billing_rate_per_hour, p.overhead_percentage, p.fixed_facility_cost_monthly,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as allocated_hours,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as resource_cost,
            COALESCE((SELECT SUM(fc.monthly_cost) FROM facility_costs fc WHERE fc.project_id = p.id), 0) as facility_line_items
          FROM projects p
        `).all();
        let totalRev = 0, totalCost = 0;
        revenueData.forEach(p => {
          totalRev += p.allocated_hours * p.client_billing_rate_per_hour;
          const totalFac = p.fixed_facility_cost_monthly + p.facility_line_items;
          const overhead = p.resource_cost * (p.overhead_percentage / 100);
          totalCost += p.resource_cost + totalFac + overhead;
        });
        value = totalRev > 0 ? ((totalRev - totalCost) / totalRev) * 100 : 0;
        sublabel = 'Portfolio margin';
      } else if (metric === 'project_count') {
        value = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'Active'").get().count;
        sublabel = 'Active projects';
      } else if (metric === 'resource_count') {
        value = db.prepare('SELECT COUNT(*) as count FROM resources').get().count;
        sublabel = 'Total resources';
      } else if (metric === 'total_margin') {
        const revenueData = db.prepare(`
          SELECT p.client_billing_rate_per_hour, p.overhead_percentage, p.fixed_facility_cost_monthly,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as allocated_hours,
            COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as resource_cost,
            COALESCE((SELECT SUM(fc.monthly_cost) FROM facility_costs fc WHERE fc.project_id = p.id), 0) as facility_line_items
          FROM projects p
        `).all();
        let totalRev = 0, totalCost = 0;
        revenueData.forEach(p => {
          totalRev += p.allocated_hours * p.client_billing_rate_per_hour;
          const totalFac = p.fixed_facility_cost_monthly + p.facility_line_items;
          const overhead = p.resource_cost * (p.overhead_percentage / 100);
          totalCost += p.resource_cost + totalFac + overhead;
        });
        value = totalRev - totalCost;
        sublabel = 'Monthly margin';
      }

      res.json({ value, sublabel });
      break;
    }

    case 'health_gauge': {
      const healthCounts = db.prepare(`
        SELECT health_status, COUNT(*) as count FROM projects GROUP BY health_status
      `).all();
      const total = healthCounts.reduce((s, h) => s + h.count, 0);
      const greenCount = healthCounts.find(h => h.health_status === 'Green')?.count || 0;
      const amberCount = healthCounts.find(h => h.health_status === 'Amber')?.count || 0;
      // Score: Green=100, Amber=50, Red=0, weighted average
      const score = total > 0 ? Math.round((greenCount * 100 + amberCount * 50) / total) : 0;
      res.json({ score, details: healthCounts });
      break;
    }

    case 'milestone_timeline': {
      const milestones = db.prepare(`
        SELECT m.id, m.title, m.due_date, m.status, m.completed_date, p.name as project_name
        FROM milestones m
        JOIN projects p ON m.project_id = p.id
        ORDER BY m.due_date ASC
        LIMIT 20
      `).all();
      res.json(milestones);
      break;
    }

    case 'project_table': {
      let ptQuery = `
        SELECT p.id, p.name, p.status, p.health_status as health, p.start_date, p.end_date,
          t.name as theme_name, p.priority_score
        FROM projects p
        JOIN investment_themes t ON p.theme_id = t.id
        WHERE 1=1
      `;
      const ptParams = [];
      if (config.status) { ptQuery += ' AND p.status = ?'; ptParams.push(config.status); }
      if (config.theme_id) { ptQuery += ' AND p.theme_id = ?'; ptParams.push(config.theme_id); }
      if (config.health_status) { ptQuery += ' AND p.health_status = ?'; ptParams.push(config.health_status); }
      ptQuery += ' ORDER BY p.created_at DESC';
      res.json(db.prepare(ptQuery).all(...ptParams));
      break;
    }

    case 'bar_chart': {
      const dataSource = config.data_source || 'cost_breakdown';
      const limit = parseInt(config.limit) || 10;

      if (dataSource === 'cost_breakdown') {
        const projects = db.prepare('SELECT * FROM projects ORDER BY name LIMIT ?').all(limit);
        const chartData = projects.map(p => {
          const resourceCost = db.prepare(`
            SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total
            FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = ?
          `).get(p.id).total;
          return { name: p.name.substring(0, 15), value: Math.round(resourceCost) };
        });
        res.json(chartData);
      } else if (dataSource === 'margin_analysis') {
        const projects = db.prepare('SELECT * FROM projects ORDER BY name LIMIT ?').all(limit);
        const chartData = projects.map(p => {
          const resourceCost = db.prepare(`
            SELECT COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as total
            FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = ?
          `).get(p.id).total;
          const allocatedHours = db.prepare('SELECT COALESCE(SUM(allocated_hours_per_month), 0) as total FROM resource_allocations WHERE project_id = ?').get(p.id).total;
          const revenue = allocatedHours * p.client_billing_rate_per_hour;
          return { name: p.name.substring(0, 15), value: Math.round(revenue - resourceCost) };
        });
        res.json(chartData);
      } else {
        res.json([]);
      }
      break;
    }

    case 'pie_chart': {
      const pieSource = config.data_source || 'health_summary';

      if (pieSource === 'health_summary') {
        const healthCounts = db.prepare(`
          SELECT health_status as name, COUNT(*) as value FROM projects GROUP BY health_status
        `).all();
        res.json(healthCounts);
      } else if (pieSource === 'risk_summary') {
        const riskCounts = db.prepare(`
          SELECT status as name, COUNT(*) as value FROM risks GROUP BY status
        `).all();
        res.json(riskCounts);
      } else if (pieSource === 'project_status') {
        const statusCounts = db.prepare(`
          SELECT status as name, COUNT(*) as value FROM projects GROUP BY status
        `).all();
        res.json(statusCounts);
      } else {
        res.json([]);
      }
      break;
    }

    default:
      res.status(400).json({ error: { message: `Unknown widget type: ${type}` } });
  }
});

// GET /api/custom-dashboards/:id
router.get('/:id', (req, res) => {
  const dashboard = db.prepare(`
    SELECT cd.*, u.display_name as owner_name
    FROM custom_dashboards cd
    LEFT JOIN users u ON cd.owner_id = u.id
    WHERE cd.id = ?
  `).get(req.params.id);
  if (!dashboard) return res.status(404).json({ error: { message: 'Dashboard not found' } });
  res.json(dashboard);
});

// POST /api/custom-dashboards
router.post('/', (req, res) => {
  const { name, description, is_shared, layout } = req.body;
  if (!name) return res.status(400).json({ error: { message: 'Name is required' } });

  const result = db.prepare(`
    INSERT INTO custom_dashboards (name, description, owner_id, is_shared, layout)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    name,
    description || '',
    req.user?.id || null,
    is_shared ? 1 : 0,
    layout ? (typeof layout === 'string' ? layout : JSON.stringify(layout)) : '[]'
  );

  logChange({ userId: req.user?.id, entityType: 'custom_dashboard', entityId: result.lastInsertRowid, action: 'CREATE' });

  const dashboard = db.prepare('SELECT * FROM custom_dashboards WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(dashboard);
});

// PUT /api/custom-dashboards/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM custom_dashboards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Dashboard not found' } });

  const { name, description, is_shared, layout } = req.body;

  const updated = {
    name: name ?? existing.name,
    description: description ?? existing.description,
    is_shared: is_shared !== undefined ? (is_shared ? 1 : 0) : existing.is_shared,
    layout: layout !== undefined ? (typeof layout === 'string' ? layout : JSON.stringify(layout)) : existing.layout,
  };

  const changes = diffChanges(existing, updated, ['name', 'description', 'is_shared']);

  db.prepare(`
    UPDATE custom_dashboards SET name=?, description=?, is_shared=?, layout=?, updated_at=datetime('now')
    WHERE id=?
  `).run(updated.name, updated.description, updated.is_shared, updated.layout, req.params.id);

  if (changes.length) logChange({ userId: req.user?.id, entityType: 'custom_dashboard', entityId: Number(req.params.id), action: 'UPDATE', changes });

  const dashboard = db.prepare('SELECT * FROM custom_dashboards WHERE id = ?').get(req.params.id);
  res.json(dashboard);
});

// DELETE /api/custom-dashboards/:id
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM custom_dashboards WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: { message: 'Dashboard not found' } });

  // Only owner can delete
  if (existing.owner_id && req.user?.id && existing.owner_id !== req.user.id) {
    return res.status(403).json({ error: { message: 'Only the dashboard owner can delete it' } });
  }

  db.prepare('DELETE FROM custom_dashboards WHERE id = ?').run(req.params.id);
  logChange({ userId: req.user?.id, entityType: 'custom_dashboard', entityId: Number(req.params.id), action: 'DELETE' });
  res.json({ message: 'Dashboard deleted' });
});

export default router;
