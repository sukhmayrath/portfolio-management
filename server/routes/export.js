import { Router } from 'express';
import db from '../db/database.js';

const router = Router();

function toCsv(rows, columns) {
  if (!rows.length) return '';
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(row =>
    columns.map(c => {
      let val = typeof c.key === 'function' ? c.key(row) : row[c.key];
      if (val == null) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  ).join('\n');
  return header + '\n' + body;
}

function sendCsv(res, csv, filename) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// GET /api/export/projects
router.get('/projects', (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, t.name as theme_name,
      COALESCE((SELECT SUM(ra.allocated_hours_per_month * r.hourly_rate) FROM resource_allocations ra JOIN resources r ON ra.resource_id = r.id WHERE ra.project_id = p.id), 0) as resource_cost,
      COALESCE((SELECT SUM(ra.allocated_hours_per_month) FROM resource_allocations ra WHERE ra.project_id = p.id), 0) as total_hours
    FROM projects p JOIN investment_themes t ON p.theme_id = t.id ORDER BY t.name, p.name
  `).all();
  
  projects.forEach(p => {
    p.facility_cost = p.fixed_facility_cost_monthly;
    p.overhead_cost = p.resource_cost * (p.overhead_percentage / 100);
    p.total_cost = p.resource_cost + p.facility_cost + p.overhead_cost;
    p.revenue = p.total_hours * p.client_billing_rate_per_hour;
    p.margin = p.revenue - p.total_cost;
    p.margin_pct = p.revenue > 0 ? (p.margin / p.revenue * 100) : 0;
  });
  
  const csv = toCsv(projects, [
    { label: 'Client', key: 'theme_name' },
    { label: 'Project', key: 'name' },
    { label: 'Status', key: 'status' },
    { label: 'Health', key: 'health_status' },
    { label: 'Priority', key: 'priority_score' },
    { label: 'Start Date', key: 'start_date' },
    { label: 'End Date', key: 'end_date' },
    { label: 'Resource Cost/mo', key: r => r.resource_cost.toFixed(2) },
    { label: 'Facility Cost/mo', key: r => r.facility_cost.toFixed(2) },
    { label: 'Overhead Cost/mo', key: r => r.overhead_cost.toFixed(2) },
    { label: 'Total Cost/mo', key: r => r.total_cost.toFixed(2) },
    { label: 'Revenue/mo', key: r => r.revenue.toFixed(2) },
    { label: 'Margin/mo', key: r => r.margin.toFixed(2) },
    { label: 'Margin %', key: r => r.margin_pct.toFixed(1) },
  ]);
  sendCsv(res, csv, 'projects-export.csv');
});

// GET /api/export/resources
router.get('/resources', (req, res) => {
  const resources = db.prepare(`
    SELECT r.*, COALESCE(SUM(ra.allocation_percentage), 0) as total_allocation,
      COALESCE(SUM(ra.allocated_hours_per_month * r.hourly_rate), 0) as monthly_cost
    FROM resources r LEFT JOIN resource_allocations ra ON r.id = ra.resource_id
    GROUP BY r.id ORDER BY r.name
  `).all();
  
  const csv = toCsv(resources, [
    { label: 'Name', key: 'name' },
    { label: 'Role', key: 'role' },
    { label: 'Department', key: 'department' },
    { label: 'Hourly Rate', key: r => r.hourly_rate.toFixed(2) },
    { label: 'Available Hours/mo', key: 'available_hours_per_month' },
    { label: 'Allocation %', key: r => r.total_allocation.toFixed(1) },
    { label: 'Monthly Cost', key: r => r.monthly_cost.toFixed(2) },
  ]);
  sendCsv(res, csv, 'resources-export.csv');
});

// GET /api/export/themes
router.get('/themes', (req, res) => {
  const themes = db.prepare(`
    SELECT t.*, COUNT(DISTINCT p.id) as project_count
    FROM investment_themes t LEFT JOIN projects p ON t.id = p.theme_id
    GROUP BY t.id ORDER BY t.name
  `).all();
  
  const csv = toCsv(themes, [
    { label: 'Client', key: 'name' },
    { label: 'Status', key: 'status' },
    { label: 'Budget', key: r => (r.total_budget || 0).toFixed(2) },
    { label: 'Projects', key: 'project_count' },
  ]);
  sendCsv(res, csv, 'clients-export.csv');
});

// GET /api/export/allocations
router.get('/allocations', (req, res) => {
  const allocs = db.prepare(`
    SELECT ra.*, r.name as resource_name, r.role, r.hourly_rate, p.name as project_name, t.name as theme_name,
      (ra.allocated_hours_per_month * r.hourly_rate) as monthly_cost
    FROM resource_allocations ra
    JOIN resources r ON ra.resource_id = r.id
    JOIN projects p ON ra.project_id = p.id
    JOIN investment_themes t ON p.theme_id = t.id
    ORDER BY r.name, p.name
  `).all();
  
  const csv = toCsv(allocs, [
    { label: 'Resource', key: 'resource_name' },
    { label: 'Role', key: 'role' },
    { label: 'Client', key: 'theme_name' },
    { label: 'Project', key: 'project_name' },
    { label: 'Allocation %', key: r => r.allocation_percentage.toFixed(1) },
    { label: 'Hours/mo', key: r => r.allocated_hours_per_month.toFixed(0) },
    { label: 'Rate/hr', key: r => r.hourly_rate.toFixed(2) },
    { label: 'Cost/mo', key: r => r.monthly_cost.toFixed(2) },
  ]);
  sendCsv(res, csv, 'allocations-export.csv');
});

export default router;
