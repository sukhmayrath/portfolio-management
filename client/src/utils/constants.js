export const THEME_STATUSES = ['Planning', 'Active', 'Completed', 'On Hold'];
export const PROJECT_STATUSES = ['Planning', 'Active', 'Completed', 'On Hold'];
export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'];
export const COST_TYPES = ['Fixed', 'Variable'];

export const ROLES = ['Admin', 'PMO', 'PM', 'Executive', 'Viewer'];
export const ROLE_HIERARCHY = { Admin: 5, PMO: 4, PM: 3, Executive: 2, Viewer: 1 };

export const HEALTH_STATUSES = ['Green', 'Amber', 'Red'];
export const HEALTH_COLORS = {
  Green: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100' },
  Amber: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-100' },
  Red: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100' },
};

export const RISK_CATEGORIES = ['Technical', 'Resource', 'Schedule', 'Budget', 'Scope', 'External', 'Quality'];
export const RISK_LIKELIHOODS = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
export const RISK_IMPACTS = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];
export const RISK_STATUSES = ['Open', 'Mitigated', 'Closed', 'Accepted'];

export const MILESTONE_STATUSES = ['Pending', 'In Progress', 'Completed', 'Delayed', 'Cancelled'];

export const STATUS_COLORS = {
  Planning: 'bg-blue-100 text-blue-800',
  Active: 'bg-green-100 text-green-800',
  Completed: 'bg-gray-100 text-gray-800',
  'On Hold': 'bg-amber-100 text-amber-800',
  'To Do': 'bg-slate-100 text-slate-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Done: 'bg-green-100 text-green-800',
};

export const DEPENDENCY_TYPES = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'];
export const VIEW_MODES = ['table', 'kanban'];

export const REQUEST_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Converted'];
export const REQUEST_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
export const REQUEST_PRIORITY_COLORS = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-amber-100 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
};

export const AUTOMATION_ENTITIES = ['project', 'task', 'risk', 'milestone'];
export const AUTOMATION_FIELDS = {
  project: ['status', 'health_status'],
  task: ['status'],
  risk: ['status', 'likelihood', 'impact'],
  milestone: ['status'],
};
export const AUTOMATION_FIELD_VALUES = {
  status: ['Planning', 'Active', 'Completed', 'On Hold', 'To Do', 'In Progress', 'Done', 'Open', 'Mitigating', 'Resolved', 'Accepted', 'Escalated', 'Pending', 'Missed', 'Deferred'],
  health_status: ['Green', 'Amber', 'Red'],
  likelihood: ['Low', 'Medium', 'High', 'Critical'],
  impact: ['Low', 'Medium', 'High', 'Critical'],
};
export const AUTOMATION_ACTIONS = ['notification', 'status_change', 'field_update'];

export const WIDGET_TYPES = [
  { value: 'kpi_card', label: 'KPI Card' },
  { value: 'bar_chart', label: 'Bar Chart' },
  { value: 'pie_chart', label: 'Pie Chart' },
  { value: 'project_table', label: 'Project Table' },
  { value: 'health_gauge', label: 'Health Gauge' },
  { value: 'risk_summary', label: 'Risk Summary' },
  { value: 'milestone_timeline', label: 'Milestone Timeline' },
];

export const PROJECT_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#ea580c',
  '#16a34a', '#0891b2', '#4f46e5', '#c026d3',
  '#d97706', '#059669', '#7c2d12', '#be185d',
  '#0d9488', '#6d28d9', '#b91c1c', '#1d4ed8',
  '#65a30d', '#a21caf', '#0369a1', '#c2410c',
  '#4338ca', '#15803d', '#9333ea', '#dc2626',
  '#0284c7', '#ca8a04', '#7e22ce', '#e11d48',
  '#047857', '#6366f1'
];
