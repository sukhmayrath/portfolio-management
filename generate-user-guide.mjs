import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 60, bottom: 60, left: 55, right: 55 },
  info: {
    Title: 'Portfolio Management - User Guide',
    Author: 'Portfolio Management Team',
    Subject: 'User Guide for Portfolio Management Application',
  },
});

const stream = fs.createWriteStream('Portfolio_Management_User_Guide.pdf');
doc.pipe(stream);

// ─── Color palette ─────────────────────────────────────────
const C = {
  primary:    '#1e40af',
  primaryLt:  '#3b82f6',
  dark:       '#0f172a',
  text:       '#1e293b',
  muted:      '#64748b',
  light:      '#f1f5f9',
  white:      '#ffffff',
  accent:     '#0ea5e9',
  green:      '#059669',
  amber:      '#d97706',
  red:        '#dc2626',
  violet:     '#7c3aed',
  divider:    '#cbd5e1',
};

let pageNum = 0;

// Wrap addPage to add header line (no text — just the divider line, to avoid overflow issues)
const origAddPage = doc.addPage.bind(doc);
let inAddPage = false;
doc.addPage = function(options) {
  if (inAddPage) return origAddPage(options);
  inAddPage = true;
  origAddPage(options);
  pageNum++;
  if (pageNum > 2) {
    doc.save();
    doc.moveTo(doc.page.margins.left, 42)
       .lineTo(doc.page.width - doc.page.margins.right, 42)
       .strokeColor(C.divider).lineWidth(0.5).stroke();
    doc.restore();
  }
  inAddPage = false;
  return doc;
};

// ─── Helpers ───────────────────────────────────────────────
function pageWidth() {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function addHeader(text, opts = {}) {
  const { size = 22, color = C.primary, top = 0, underline = true } = opts;
  if (top) doc.moveDown(top);
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(text);
  if (underline) {
    doc.moveDown(0.3);
    const y = doc.y;
    doc.moveTo(doc.page.margins.left, y)
       .lineTo(doc.page.width - doc.page.margins.right, y)
       .strokeColor(C.primaryLt).lineWidth(1.5).stroke();
    doc.moveDown(0.5);
  }
}

function addSubHeader(text, opts = {}) {
  const { size = 15, color = C.dark } = opts;
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(text);
  doc.moveDown(0.3);
}

function addSubSubHeader(text) {
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.primaryLt).text(text);
  doc.moveDown(0.2);
}

function addPara(text, opts = {}) {
  const { size = 10, color = C.text, indent = 0 } = opts;
  doc.font('Helvetica').fontSize(size).fillColor(color)
     .text(text, doc.page.margins.left + indent, doc.y, {
       width: pageWidth() - indent,
       lineGap: 3,
     });
  doc.moveDown(0.3);
}

function addBullet(text, opts = {}) {
  const { indent = 12, size = 10, color = C.text } = opts;
  const x = doc.page.margins.left + indent;
  doc.font('ZapfDingbats').fontSize(6).fillColor(C.primaryLt)
     .text('l', x + 1, doc.y + 3, { continued: false });
  doc.moveUp(1);
  doc.font('Helvetica').fontSize(size).fillColor(color)
     .text(text, x + 14, doc.y, { width: pageWidth() - indent - 14, lineGap: 2 });
  doc.moveDown(0.15);
}

function addNumbered(num, text, opts = {}) {
  const { indent = 12, size = 10 } = opts;
  const x = doc.page.margins.left + indent;
  doc.font('Helvetica-Bold').fontSize(size).fillColor(C.primaryLt)
     .text(`${num}.`, x, doc.y, { continued: false });
  doc.moveUp(1);
  doc.font('Helvetica').fontSize(size).fillColor(C.text)
     .text(text, x + 18, doc.y, { width: pageWidth() - indent - 18, lineGap: 2 });
  doc.moveDown(0.15);
}

function addRoleBadge(role, color, desc, y) {
  const x = doc.page.margins.left + 16;
  // Badge
  const badgeW = doc.font('Helvetica-Bold').fontSize(9).widthOfString(role) + 16;
  doc.roundedRect(x, y, badgeW, 18, 4).fill(color);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
     .text(role, x + 8, y + 4, { width: badgeW - 16 });
  // Description
  doc.font('Helvetica').fontSize(10).fillColor(C.text)
     .text(desc, x + badgeW + 12, y + 3, { width: pageWidth() - badgeW - 40 });
}

function checkSpace(needed) {
  const remaining = doc.page.height - doc.page.margins.bottom - doc.y;
  if (remaining < needed) doc.addPage();
}

function addInfoBox(title, text) {
  checkSpace(70);
  const x = doc.page.margins.left;
  const w = pageWidth();
  const startY = doc.y + 4;
  doc.roundedRect(x, startY, w, 0.1, 4).fill(C.light); // measure first

  // Measure content
  const titleH = doc.font('Helvetica-Bold').fontSize(10).heightOfString(title, { width: w - 30 });
  const textH = doc.font('Helvetica').fontSize(9.5).heightOfString(text, { width: w - 30, lineGap: 2 });
  const boxH = titleH + textH + 24;

  // Draw box
  doc.roundedRect(x, startY, w, boxH, 4).fill(C.light);
  doc.roundedRect(x, startY, 4, boxH, 2).fill(C.primaryLt);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.primary)
     .text(title, x + 14, startY + 8, { width: w - 30 });
  doc.font('Helvetica').fontSize(9.5).fillColor(C.text)
     .text(text, x + 14, startY + 8 + titleH + 4, { width: w - 30, lineGap: 2 });

  doc.y = startY + boxH + 8;
}

// ─── COVER PAGE ────────────────────────────────────────────
function drawCover() {
  // Full-page gradient-like background
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(C.primary);

  // Decorative shapes
  doc.circle(doc.page.width - 80, 120, 200).fill('#2563eb');
  doc.circle(-40, doc.page.height - 100, 160).fill('#1d4ed8');
  doc.circle(doc.page.width / 2, doc.page.height + 60, 300).fillOpacity(0.1).fill(C.white);
  doc.fillOpacity(1);

  // Title block
  const cx = doc.page.width / 2;
  doc.font('Helvetica-Bold').fontSize(42).fillColor(C.white)
     .text('Portfolio', 0, 200, { align: 'center', width: doc.page.width });
  doc.font('Helvetica-Bold').fontSize(42).fillColor(C.white)
     .text('Management', 0, doc.y, { align: 'center', width: doc.page.width });

  doc.moveDown(0.8);
  // Accent line
  doc.moveTo(cx - 60, doc.y).lineTo(cx + 60, doc.y)
     .strokeColor('#60a5fa').lineWidth(3).stroke();
  doc.moveDown(1);

  doc.font('Helvetica').fontSize(22).fillColor('#93c5fd')
     .text('User Guide', 0, doc.y, { align: 'center', width: doc.page.width });

  doc.moveDown(4);
  doc.font('Helvetica').fontSize(11).fillColor('#bfdbfe')
     .text('Enterprise Portfolio Management System', 0, doc.y, { align: 'center', width: doc.page.width });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(11).fillColor('#bfdbfe')
     .text('Investment Themes  |  Projects  |  Resources  |  Financials', 0, doc.y, { align: 'center', width: doc.page.width });

  // Footer
  doc.font('Helvetica').fontSize(10).fillColor('#93c5fd')
     .text('Version 1.0  |  March 2026', 0, doc.page.height - 80, { align: 'center', width: doc.page.width });
}

drawCover();

// ─── TABLE OF CONTENTS ─────────────────────────────────────
doc.addPage();
addHeader('Table of Contents', { size: 24 });
doc.moveDown(0.5);

const tocItems = [
  ['1', 'Getting Started', '3'],
  ['2', 'Dashboard', '4'],
  ['3', 'Investment Management', '5'],
  ['4', 'Planning & Timeline', '7'],
  ['5', 'Resource Management', '8'],
  ['6', 'Reports & Analytics', '10'],
  ['7', 'System Administration', '12'],
  ['8', 'Role-Based Access', '13'],
  ['9', 'Common Workflows', '14'],
];

for (const [num, title, pg] of tocItems) {
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.primary)
     .text(num + '.', doc.page.margins.left, y, { continued: false });
  doc.font('Helvetica').fontSize(12).fillColor(C.text)
     .text(title, doc.page.margins.left + 28, y);
  doc.font('Helvetica').fontSize(12).fillColor(C.muted)
     .text(pg, doc.page.width - doc.page.margins.right - 20, y, { width: 20, align: 'right' });
  doc.moveDown(0.5);
}

// ─── 1. GETTING STARTED ────────────────────────────────────
doc.addPage();
addHeader('1. Getting Started');

addSubHeader('Overview');
addPara('The Portfolio Management Application is a full-stack enterprise system for managing investment themes, projects, resources, and financial tracking. It provides comprehensive tools for project managers, executives, and administrators to oversee and optimize their organization\'s project portfolio.');

addSubHeader('Accessing the Application');
addPara('Open your web browser and navigate to the application URL. You will be presented with a login screen where you can enter your credentials (username and password). Once authenticated, you will be directed to the main Dashboard.');

addSubHeader('Navigation');
addPara('The application uses a collapsible sidebar for navigation, organized into the following sections:');
addBullet('Overview  - Dashboard and custom views');
addBullet('Investment  - Clients, Projects, and Demand Pipeline');
addBullet('Planning  - Timeline (Gantt chart) and Roadmap');
addBullet('Resources  - Resource Pool, Allocation, and Utilization');
addBullet('Reports  - Financial Analysis, Budget Tracking, Executive Summary');
addBullet('System  - Templates, Automations, Alerts, Audit Log, and User Management');

addInfoBox('Tip: Role-Based Visibility',
  'Some sections may not appear in your sidebar depending on your assigned role. Financial reports are only visible to Admin, PMO, and Executive roles. User Management is Admin-only.');

addSubHeader('Global Search');
addPara('A search bar at the top of the application allows you to quickly find clients, projects, and resources across the entire system. Simply type your search term and results will appear instantly.');

// ─── 2. DASHBOARD ──────────────────────────────────────────
doc.addPage();
addHeader('2. Dashboard');

addPara('The Dashboard is your central hub, providing an at-a-glance view of portfolio health and key performance metrics. Content varies based on your role.');

addSubHeader('Key Performance Indicators');
addPara('The top of the Dashboard displays KPI cards:');
addBullet('Total Projects  - Count of all projects across all clients (visible to all users)');
addBullet('Monthly Cost  - Total company cost across all projects (financial roles only)');
addBullet('Monthly Revenue  - Total client billing revenue (financial roles only)');
addBullet('Net Margin  - Profit margin percentage and dollar amount (financial roles only)');

addSubHeader('Portfolio Health Score');
addPara('A circular gauge displays an overall health score (0-100) computed from four weighted components:');
addBullet('Financial Health (40%)  - Based on overall margin percentage');
addBullet('Schedule Health (20%)  - Percentage of milestones on time');
addBullet('Risk Health (20%)  - Inverse ratio of critical open risks');
addBullet('Resource Health (20%)  - Percentage of resources with 60-100% utilization');

addSubHeader('Project Health Overview');
addPara('Three color-coded cards show the distribution of active projects by health status:');

checkSpace(60);
const healthY = doc.y + 4;
// Green card
doc.roundedRect(doc.page.margins.left, healthY, 150, 40, 4).fill('#ecfdf5');
doc.circle(doc.page.margins.left + 18, healthY + 20, 5).fill(C.green);
doc.font('Helvetica-Bold').fontSize(11).fillColor(C.green).text('Green', doc.page.margins.left + 30, healthY + 12);
// Amber card
doc.roundedRect(doc.page.margins.left + 165, healthY, 150, 40, 4).fill('#fffbeb');
doc.circle(doc.page.margins.left + 183, healthY + 20, 5).fill(C.amber);
doc.font('Helvetica-Bold').fontSize(11).fillColor(C.amber).text('Amber', doc.page.margins.left + 195, healthY + 12);
// Red card
doc.roundedRect(doc.page.margins.left + 330, healthY, 150, 40, 4).fill('#fef2f2');
doc.circle(doc.page.margins.left + 348, healthY + 20, 5).fill(C.red);
doc.font('Helvetica-Bold').fontSize(11).fillColor(C.red).text('Red', doc.page.margins.left + 360, healthY + 12);
doc.y = healthY + 52;

addPara('Hover over any card to see the list of projects in that health category. These cards are visible to all users regardless of role.');

checkSpace(80);
addSubHeader('Additional Dashboard Sections (Financial Roles)');
addBullet('Budget Utilization  - Progress bar showing annualized spend rate vs. total budget');
addBullet('Top 10 Clients by Cost  - Stacked bar chart (resource, facility, overhead costs)');
addBullet('Investment Distribution  - Donut chart showing client cost distribution');
addBullet('Revenue vs. Cost Comparison  - Side-by-side bars for top clients');
addBullet('Top/Bottom 10 Projects by Margin  - Profitability rankings');
addBullet('Client Roll-up Table  - Expandable rows with full financial details per client');

addSubHeader('Project Status Breakdown');
addPara('A horizontal bar chart shows project counts by status (Active, Planning, Completed, On Hold) with color-coded bars and percentage indicators. This section is visible to all users.');

addSubHeader('Export Options');
addPara('Use the Print/PDF and Export CSV buttons at the top right to generate reports from your Dashboard view.');

// ─── 3. INVESTMENT MANAGEMENT ──────────────────────────────
doc.addPage();
addHeader('3. Investment Management');

addSubHeader('3.1  Clients (Investment Themes)');
addPara('Clients represent strategic investment initiatives or business units. Each client can contain multiple projects.');

addSubSubHeader('Viewing Clients');
addPara('The Clients page displays a table of all investment themes with columns for name, status, project count, budget, and resource cost per month.');

addSubSubHeader('Creating a Client');
addNumbered(1, 'Click the "New Client" button at the top of the page.');
addNumbered(2, 'Fill in the name, description, status (Planning, Active, Completed, or On Hold), and total budget.');
addNumbered(3, 'Click "Create" to save the new client.');

addSubSubHeader('Client Detail');
addPara('Click any client row to view its detail page, which shows all associated projects, budget utilization, and aggregate financial metrics.');

checkSpace(100);
addSubHeader('3.2  Projects');
addPara('Projects are the core work items, organized under clients. The Projects page supports both table and Kanban board views.');

addSubSubHeader('Table View');
addPara('Displays all projects with columns for name, client, priority, status, health, and financial metrics. Click column headers to sort. Use the health filter buttons (Green/Amber/Red) to narrow results.');

addSubSubHeader('Kanban Board View');
addPara('Toggle to the board view to see projects organized into status columns (Planning, Active, Completed, On Hold). Drag and drop cards between columns to change project status.');

addSubSubHeader('Creating a Project');
addNumbered(1, 'Click "New Project" to open the creation form.');
addNumbered(2, 'Enter the project name, description, and select the parent client.');
addNumbered(3, 'Set the status and health indicators.');
addNumbered(4, 'Configure financial fields: client billing rate ($/hr), fixed facility cost ($/month), and overhead percentage.');
addNumbered(5, 'Click "Create" to save.');

checkSpace(100);
addSubSubHeader('Project Detail Page');
addPara('The project detail page is the most comprehensive view, containing:');
addBullet('Overview section with status, health, and priority badges');
addBullet('Financial metrics  - resource cost, facility & overhead, client revenue, and margin');
addBullet('Milestones  - track deliverables with status (Pending, In Progress, Completed) and due dates');
addBullet('Risks  - log and manage project risks with likelihood, impact, and mitigation strategies');
addBullet('Resource allocations  - view team members assigned to the project');
addBullet('Tasks  - create and track work items');
addBullet('Comments  - collaborate with team via activity feed');
addBullet('Tags  - categorize projects with color-coded labels');

checkSpace(160);
addSubHeader('3.3  Demand Pipeline');
addPara('The Pipeline manages intake and approval of new project requests through a structured workflow.');

addSubSubHeader('Request Stages');
addBullet('Draft  - Initial submission, still being refined');
addBullet('Submitted  - Ready for review by management');
addBullet('Under Review  - Being evaluated by a reviewer');
addBullet('Approved / Rejected  - Final disposition');

addSubSubHeader('Creating a Demand Request');
addNumbered(1, 'Click "New Request" to open the form.');
addNumbered(2, 'Provide a title, description, business justification, estimated budget, and timeline.');
addNumbered(3, 'Score the request across four criteria using 1-5 sliders:');
addPara('- Strategic Alignment (30% weight)\n- Financial Impact (30% weight)\n- Risk Level (20% weight  - lower risk scores higher)\n- Resource Availability (20% weight)', { indent: 30 });
addNumbered(4, 'The total score (0-100%) is auto-calculated and used for prioritization.');

addSubSubHeader('Reviewing & Approving Requests');
addPara('Reviewers can add notes, then approve or reject a request. Approved requests can be converted directly into live projects by specifying the target client, dates, billing rate, and overhead settings.');

// ─── 4. PLANNING & TIMELINE ───────────────────────────────
checkSpace(100);
addHeader('4. Planning & Timeline', { top: 1 });

addSubHeader('4.1  Timeline (Gantt Chart)');
addPara('The Timeline page provides an interactive Gantt chart for visualizing project schedules across your entire portfolio.');

addSubSubHeader('Features');
addBullet('Year and month header bands with a "today" indicator line');
addBullet('Projects grouped by client  - click a client row to collapse/expand');
addBullet('Color-coded project bars based on health status (green, amber, red gradients)');
addBullet('Milestone diamonds displayed on project bars (white = completed, slate = upcoming, red = overdue)');
addBullet('Hover tooltips showing project name, date range, and milestone progress');
addBullet('Zoom controls (0.5x - 3x) for adjusting the time scale');

addSubSubHeader('Filtering');
addPara('Use the multi-filter system to narrow the view:');
addBullet('Filter by client (with project count shown)');
addBullet('Filter by status (Active, Planning, Completed, On Hold)');
addBullet('Filter by health (Green, Amber, Red)');
addBullet('Search bar for quick project name lookup');

doc.addPage();
addSubHeader('4.2  Roadmap');
addPara('The Roadmap provides a quarterly view of planned and active projects, perfect for strategic planning meetings.');

addSubSubHeader('Layout');
addPara('Projects are organized into four quarterly columns for the selected year. Each project card shows:');
addBullet('Health status indicator dot');
addBullet('Project name and client');
addBullet('Status badge');
addBullet('Milestone progress bar (if milestones are defined)');

addPara('Use the year navigation arrows to move between years, and the client filter dropdown to focus on specific investment themes. Click any project card to navigate directly to its detail page.');

// ─── 5. RESOURCE MANAGEMENT ───────────────────────────────
checkSpace(80);
addHeader('5. Resource Management', { top: 1 });

addSubHeader('5.1  Resource Pool');
addPara('The Resource Pool lists all team members and their current capacity utilization.');

addSubSubHeader('Resource List');
addPara('Each resource row shows the team member\'s name, role, department, and a utilization bar indicating how allocated they are across projects. Color coding helps identify capacity issues:');
addBullet('Blue  - Underutilized (below 100%)');
addBullet('Green  - Fully utilized (100%)');
addBullet('Red  - Over-allocated (exceeds 100%)');

addSubSubHeader('Adding a Resource');
addNumbered(1, 'Click "Add Resource" to open the form.');
addNumbered(2, 'Enter name, role, department, hourly rate, and available hours per month.');
addNumbered(3, 'Click "Save" to add the resource to the pool.');

addInfoBox('Note: Financial Fields',
  'Hourly rate and cost impact columns are only visible to users with Admin, PMO, or Executive roles. PM and Viewer users see resource details without financial data.');

checkSpace(100);
addSubSubHeader('Capacity Planning Mode');
addPara('Toggle "Capacity Planning" to enter scenario modeling:');
addNumbered(1, 'Adjust existing resource allocation using sliders (±50% adjustment).');
addNumbered(2, 'Add hypothetical new hires with estimated rates and hours.');
addNumbered(3, 'View projected utilization and cost impact in real-time.');
addNumbered(4, 'Save scenarios with a name and description for future comparison.');
addNumbered(5, 'Load previously saved scenarios to compare cost deltas.');

doc.addPage();
addSubHeader('5.2  Resource Allocation');
addPara('The Allocation page lets you assign resources to projects with flexible percentage-based allocation.');

addSubSubHeader('Creating an Allocation');
addNumbered(1, 'Select a resource from the dropdown (shows current utilization percentage).');
addNumbered(2, 'Select a project (projects are grouped into "Current Projects" and "Other Projects").');
addNumbered(3, 'Set the allocation percentage  - hours per month auto-calculates based on the resource\'s available hours.');
addNumbered(4, 'Click "Allocate" to save.');

addSubSubHeader('Resource Summary Card');
addPara('When a resource is selected, a summary card appears showing the resource\'s name, role, available hours, current allocation vs. remaining capacity, and a mini utilization bar.');

addSubSubHeader('Allocation Table');
addPara('The table lists all current allocations with columns for resource, role, project, allocation percentage, and hours per month. Financial roles also see rate and cost/mo columns. Use the edit and delete buttons to modify or remove allocations.');

checkSpace(100);
addSubHeader('5.3  Resource Utilization Matrix');
addPara('The Utilization page provides a heat map-style matrix showing how every resource is allocated across every project.');

addSubSubHeader('Reading the Matrix');
addBullet('Rows represent resources (name and role)');
addBullet('Columns represent projects');
addBullet('Cells show allocation percentages with color intensity gradients:');
addPara('  White (0%) > Light Blue (1-25%) > Medium Blue (26-50%) > Dark Blue (51-75%) > Green (100%) > Red (>100%)', { indent: 24, size: 9.5 });
addBullet('"Total" column shows overall utilization per resource');
addBullet('"Free" column shows remaining capacity');

// ─── 6. REPORTS & ANALYTICS ───────────────────────────────
doc.addPage();
addHeader('6. Reports & Analytics');

addInfoBox('Access Restriction',
  'All reports in this section require Admin, PMO, or Executive role. PM and Viewer users will not see these pages in the sidebar and cannot access them via direct URL.');

addSubHeader('6.1  Financial Analysis (Cost Dashboard)');
addPara('Comprehensive cost vs. revenue analysis across your portfolio, organized into three tabs.');

addSubSubHeader('Overview Tab');
addBullet('Revenue vs. Cost bar chart by client');
addBullet('Cost Composition stacked bars (resource, facility, overhead per client)');
addBullet('Top 10 / Bottom 10 Projects by Margin');
addBullet('Client Cost Summary table with full financial breakdown');

addSubSubHeader('Client Analysis Tab');
addPara('Select a specific client to see deep-dive analytics:');
addBullet('Four KPI cards: Revenue, Total Cost, Net Margin ($), Margin %');
addBullet('Revenue vs. Cost by Project within the client');
addBullet('Cost Composition by Project (stacked bars)');
addBullet('Profit Margin by Project (horizontal bar chart)');
addBullet('Project Cost Breakdown table with per-project detail');

addSubSubHeader('Resource Costs Tab');
addPara('View individual resource costs with a searchable table showing name, role, department, hourly rate, allocated hours, and monthly cost. Badges show which projects each resource is allocated to.');

checkSpace(100);
addSubHeader('6.2  Budget Tracking');
addPara('Track budget versus actual spending with forecasting capabilities.');

addSubSubHeader('Budget vs. Actual Tab');
addPara('Monthly bar chart comparing planned vs. actual spend, with a detailed table showing variance per project per month. Variances are color-coded: red for overage, green for under budget.');

addSubSubHeader('Forecasting Tab');
addPara('View project-level forecasts including monthly burn rate, months remaining, projected total cost, and estimated end date.');

checkSpace(100);
addSubHeader('6.3  Executive Summary');
addPara('A high-level strategic overview designed for leadership presentations.');
addBullet('Portfolio Health Score gauge as the central focus');
addBullet('Four KPI cards: Total Budget, Monthly Cost, Monthly Revenue, Net Margin');
addBullet('Health Score Breakdown with component scores and ratings');
addBullet('Project Health Distribution donut chart');
addBullet('Budget by Client horizontal bars');
addBullet('Attention Required section highlighting: Red projects, overdue milestones, and critical risks');
addBullet('Key Metrics 6-month trend chart (revenue and cost lines)');

addPara('Use the Print button to generate a print-optimized layout for board meetings and stakeholder presentations.');

// ─── 7. SYSTEM ADMINISTRATION ──────────────────────────────
doc.addPage();
addHeader('7. System Administration');

addSubHeader('7.1  Audit Log');
addPara('The Audit Log provides a complete record of all changes made in the system for compliance and traceability.');

addSubSubHeader('Viewing Audit Entries');
addPara('Filter entries by entity type (project, theme, risk, milestone, resource, allocation, task) and date range. Each entry shows:');
addBullet('Timestamp of the change');
addBullet('User who made the change');
addBullet('Action type: CREATE (green), UPDATE (blue), or DELETE (red)');
addBullet('Entity type and ID');
addBullet('Field name with old value and new value');

addSubHeader('7.2  User Management');

addInfoBox('Admin Only', 'The User Management page is accessible exclusively to users with the Admin role.');

addSubSubHeader('Managing Users');
addPara('The User Management page displays all system users in a table with name, username, email, role badge, and status indicator.');

addSubSubHeader('Creating a User');
addNumbered(1, 'Click "Add User" to open the creation modal.');
addNumbered(2, 'Enter username, password, display name, and email.');
addNumbered(3, 'Select a role from the dropdown (descriptions are shown below the selector).');
addNumbered(4, 'Click "Create User" to save.');

addSubSubHeader('Editing Users');
addPara('Click the edit button on any user row to modify their display name, email, role, or reset their password. You can also toggle a user\'s active/inactive status. Note: you cannot deactivate your own account.');

addSubHeader('7.3  Other System Features');
addBullet('Templates  - Store reusable project and task templates');
addBullet('Automations  - Configure automated workflow actions');
addBullet('Alerts  - Set up notification rules for portfolio events');

// ─── 8. ROLE-BASED ACCESS ──────────────────────────────────
doc.addPage();
addHeader('8. Role-Based Access Control');

addPara('The application enforces role-based access control with five distinct user roles. Each role determines what data and features are visible.');

doc.moveDown(0.5);

const roles = [
  { name: 'Admin', color: C.red, desc: 'Full system access. Can manage users, view all financial data, configure system settings, and perform all actions.' },
  { name: 'PMO', color: C.violet, desc: 'Portfolio Management Office. Full access to all features and financial data. Cannot manage user accounts.' },
  { name: 'Executive', color: C.primaryLt, desc: 'Strategic oversight role. Can view all features including financial analysis and reports. Cannot manage users.' },
  { name: 'PM', color: C.green, desc: 'Project Manager. Can manage projects, resources, and allocations. Cannot view financial data (rates, costs, margins, budgets). Reports section is hidden.' },
  { name: 'Viewer', color: C.muted, desc: 'Read-only access. Can view projects, resources, and timelines but cannot see financial data. Cannot create or edit records.' },
];

for (const role of roles) {
  checkSpace(45);
  addRoleBadge(role.name, role.color, role.desc, doc.y);
  doc.moveDown(2.2);
}

doc.moveDown(0.5);
addSubHeader('Financial Data Visibility');
addPara('The following data is hidden from PM and Viewer roles across all pages:');
addBullet('Hourly rates and billing rates');
addBullet('Monthly costs and revenue figures');
addBullet('Margin calculations and percentages');
addBullet('Budget utilization metrics');
addBullet('Cost breakdown charts and tables');

addPara('This applies consistently to the Dashboard, Project Detail, Resource pages, and Allocation views. Server-side API protection ensures financial data cannot be accessed even through direct API calls.');

checkSpace(280);
addSubHeader('Page Access Summary');

// Simple access table
const tableTop = doc.y + 4;
const colWidths = [200, 50, 50, 60, 40, 52];
const headers = ['Feature', 'Admin', 'PMO', 'Exec', 'PM', 'Viewer'];
let tx = doc.page.margins.left;

// Header row
doc.rect(tx, tableTop, pageWidth(), 22).fill(C.primary);
for (let i = 0; i < headers.length; i++) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.white)
     .text(headers[i], tx + 4, tableTop + 6, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'center' });
  tx += colWidths[i];
}

const accessRows = [
  ['Dashboard (non-financial)', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Dashboard (financial data)', 'Y', 'Y', 'Y', ' -', ' -'],
  ['Clients / Projects / Pipeline', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Timeline / Roadmap', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Resource Pool / Allocation', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['Financial Analysis', 'Y', 'Y', 'Y', ' -', ' -'],
  ['Budget Tracking', 'Y', 'Y', 'Y', ' -', ' -'],
  ['Executive Summary', 'Y', 'Y', 'Y', ' -', ' -'],
  ['Audit Log', 'Y', 'Y', 'Y', 'Y', 'Y'],
  ['User Management', 'Y', ' -', ' -', ' -', ' -'],
];

let rowY = tableTop + 22;
for (let r = 0; r < accessRows.length; r++) {
  const row = accessRows[r];
  const bgColor = r % 2 === 0 ? C.light : C.white;
  tx = doc.page.margins.left;
  doc.rect(tx, rowY, pageWidth(), 18).fill(bgColor);
  for (let i = 0; i < row.length; i++) {
    const color = row[i] === 'Y' ? C.green : row[i] === ' -' ? C.muted : C.text;
    doc.font(i === 0 ? 'Helvetica' : 'Helvetica-Bold').fontSize(8.5).fillColor(color)
       .text(row[i], tx + 4, rowY + 5, { width: colWidths[i] - 8, align: i === 0 ? 'left' : 'center' });
    tx += colWidths[i];
  }
  rowY += 18;
}
doc.y = rowY + 8;

// ─── 9. COMMON WORKFLOWS ──────────────────────────────────
doc.addPage();
addHeader('9. Common Workflows');

addSubHeader('Creating a New Project from Scratch');
addNumbered(1, 'Navigate to Investment > Clients and create or select a client.');
addNumbered(2, 'Go to Investment > Projects and click "New Project".');
addNumbered(3, 'Fill in all required fields including name, client, status, and financial settings.');
addNumbered(4, 'Save the project, then navigate to its detail page.');
addNumbered(5, 'Add milestones to define your schedule.');
addNumbered(6, 'Go to Resources > Allocation and assign team members to the project.');
addNumbered(7, 'Add risks, tasks, and comments as needed.');

addSubHeader('Processing a Demand Request');
addNumbered(1, 'A team member creates a request via Investment > Pipeline > New Request.');
addNumbered(2, 'They fill in the business case and score it across the four criteria.');
addNumbered(3, 'The request moves to "Submitted" status.');
addNumbered(4, 'A reviewer opens the request, evaluates the scoring, and adds review notes.');
addNumbered(5, 'The reviewer clicks "Approve" or "Reject".');
addNumbered(6, 'If approved, click "Convert to Project" to create a live project with client, dates, and financial settings.');

addSubHeader('Capacity Planning Scenario');
addNumbered(1, 'Navigate to Resources > Resource Pool.');
addNumbered(2, 'Click "Capacity Planning" to enter scenario mode.');
addNumbered(3, 'Adjust sliders for existing resources to model proposed allocation changes.');
addNumbered(4, 'Add hypothetical new hires to see their impact on capacity and cost.');
addNumbered(5, 'Review the projected cost delta.');
addNumbered(6, 'Save the scenario with a descriptive name for future reference.');
addNumbered(7, 'Compare multiple scenarios to choose the optimal staffing plan.');

addSubHeader('Monitoring Portfolio Health');
addNumbered(1, 'Start on the Dashboard to review the overall health score and component breakdown.');
addNumbered(2, 'Check the Project Health Overview cards for red and amber projects.');
addNumbered(3, 'Hover over red cards to identify specific at-risk projects.');
addNumbered(4, 'Navigate to individual project detail pages to investigate issues.');
addNumbered(5, 'Review risks, overdue milestones, and resource allocation gaps.');
addNumbered(6, 'For executive reporting, use Reports > Executive Summary with the Print option.');

checkSpace(80);
addSubHeader('Generating Reports for Stakeholders');
addNumbered(1, 'Navigate to the relevant report page (Financial Analysis, Budget Tracking, or Executive Summary).');
addNumbered(2, 'Apply any necessary filters (client, date range, etc.).');
addNumbered(3, 'Click "Print/PDF" for a formatted printable report.');
addNumbered(4, 'Click "Export CSV" to download raw data for further analysis in spreadsheet tools.');

doc.end();

stream.on('finish', () => {
  const stats = fs.statSync('Portfolio_Management_User_Guide.pdf');
  console.log(`PDF generated: Portfolio_Management_User_Guide.pdf (${(stats.size / 1024).toFixed(0)} KB)`);
});
