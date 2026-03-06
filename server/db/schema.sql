CREATE TABLE IF NOT EXISTS investment_themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Planning'
        CHECK(status IN ('Planning', 'Active', 'Completed', 'On Hold')),
    total_budget REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'Planning'
        CHECK(status IN ('Planning', 'Active', 'Completed', 'On Hold')),
    start_date TEXT,
    end_date TEXT,
    client_billing_rate_per_hour REAL DEFAULT 0,
    fixed_facility_cost_monthly REAL DEFAULT 0,
    overhead_percentage REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (theme_id) REFERENCES investment_themes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    department TEXT,
    hourly_rate REAL NOT NULL DEFAULT 0,
    available_hours_per_month REAL DEFAULT 160,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resource_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    allocation_percentage REAL NOT NULL DEFAULT 0
        CHECK(allocation_percentage >= 0 AND allocation_percentage <= 100),
    allocated_hours_per_month REAL NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    assigned_resource_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'To Do'
        CHECK(status IN ('To Do', 'In Progress', 'Done')),
    estimated_hours REAL DEFAULT 0,
    actual_hours REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_resource_id) REFERENCES resources(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS facility_costs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    monthly_cost REAL NOT NULL DEFAULT 0,
    cost_type TEXT NOT NULL DEFAULT 'Fixed'
        CHECK(cost_type IN ('Fixed', 'Variable')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);


-- =====================================================
-- Phase 2-6: New Tables for Portfolio Management App
-- =====================================================

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'Viewer'
        CHECK(role IN ('Admin', 'PMO', 'PM', 'Executive', 'Viewer')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL
        CHECK(action IN ('CREATE', 'UPDATE', 'DELETE')),
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    timestamp TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#64748b',
    created_at TEXT DEFAULT (datetime('now'))
);

-- Project-Tag Junction Table
CREATE TABLE IF NOT EXISTS project_tags (
    project_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, tag_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Risk Register
CREATE TABLE IF NOT EXISTS risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Technical'
        CHECK(category IN ('Technical', 'Financial', 'Resource', 'Schedule', 'Scope', 'External')),
    likelihood TEXT DEFAULT 'Medium'
        CHECK(likelihood IN ('Low', 'Medium', 'High', 'Critical')),
    impact TEXT DEFAULT 'Medium'
        CHECK(impact IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT DEFAULT 'Open'
        CHECK(status IN ('Open', 'Mitigating', 'Resolved', 'Accepted', 'Escalated')),
    owner_resource_id INTEGER,
    mitigation_plan TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_resource_id) REFERENCES resources(id) ON DELETE SET NULL
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    completed_date TEXT,
    status TEXT DEFAULT 'Pending'
        CHECK(status IN ('Pending', 'In Progress', 'Completed', 'Missed', 'Deferred')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Comments (polymorphic)
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL
        CHECK(entity_type IN ('project', 'theme', 'risk', 'task')),
    entity_id INTEGER NOT NULL,
    user_id INTEGER,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Alert Rules
CREATE TABLE IF NOT EXISTS alert_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL
        CHECK(rule_type IN ('margin_below', 'budget_exceeded', 'over_allocation', 'health_red', 'milestone_overdue', 'risk_critical')),
    threshold_value REAL,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_rule_id INTEGER,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info'
        CHECK(severity IN ('info', 'warning', 'critical')),
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (alert_rule_id) REFERENCES alert_rules(id) ON DELETE SET NULL
);

-- Historical Snapshots
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT NOT NULL,
    snapshot_type TEXT NOT NULL
        CHECK(snapshot_type IN ('daily', 'weekly', 'monthly')),
    data_type TEXT NOT NULL
        CHECK(data_type IN ('portfolio_summary', 'project_metrics', 'resource_utilization')),
    entity_id INTEGER,
    metrics_json TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Budget Entries (Monthly Planning)
CREATE TABLE IF NOT EXISTS budget_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    planned_resource_cost REAL DEFAULT 0,
    planned_facility_cost REAL DEFAULT 0,
    planned_overhead_cost REAL DEFAULT 0,
    planned_revenue REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- =====================================================
-- Industry Features: Templates, Dependencies, Requests, Automations, Attachments, Scenarios, Custom Dashboards
-- =====================================================

-- Project Templates
CREATE TABLE IF NOT EXISTS project_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    default_tasks TEXT DEFAULT '[]',
    default_risks TEXT DEFAULT '[]',
    default_milestones TEXT DEFAULT '[]',
    default_facility_costs TEXT DEFAULT '[]',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Task Dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type TEXT DEFAULT 'finish_to_start',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(task_id, depends_on_task_id)
);

-- Project Requests (Demand Pipeline)
CREATE TABLE IF NOT EXISTS project_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    requested_by INTEGER REFERENCES users(id),
    business_justification TEXT DEFAULT '',
    estimated_budget REAL DEFAULT 0,
    estimated_timeline TEXT DEFAULT '',
    priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low','Medium','High','Critical')),
    strategic_alignment INTEGER DEFAULT 3,
    financial_impact INTEGER DEFAULT 3,
    risk_level INTEGER DEFAULT 3,
    resource_availability INTEGER DEFAULT 3,
    total_score REAL DEFAULT 0,
    status TEXT DEFAULT 'Draft' CHECK(status IN ('Draft','Submitted','Under Review','Approved','Rejected','Converted')),
    reviewer_id INTEGER REFERENCES users(id),
    review_notes TEXT DEFAULT '',
    reviewed_at TEXT,
    converted_project_id INTEGER REFERENCES projects(id),
    theme_id INTEGER REFERENCES investment_themes(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Automation Rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    trigger_entity TEXT NOT NULL,
    trigger_field TEXT NOT NULL,
    trigger_value TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK(action_type IN ('notification','status_change','field_update')),
    action_config TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- File Attachments
CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT DEFAULT '',
    size_bytes INTEGER DEFAULT 0,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now'))
);

-- Scenarios (What-If Planning)
CREATE TABLE IF NOT EXISTS scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    base_data TEXT DEFAULT '{}',
    adjustments TEXT DEFAULT '{}',
    results TEXT DEFAULT '{}',
    created_by INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Custom Dashboards
CREATE TABLE IF NOT EXISTS custom_dashboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    owner_id INTEGER REFERENCES users(id),
    is_shared INTEGER DEFAULT 0,
    layout TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
