import db from './database.js';

// Seeded PRNG for deterministic randomization
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}
const rand = seededRandom(42);
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function dateStr(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function addMonths(baseYear, baseMonth, offset) {
  let m = baseMonth + offset;
  let y = baseYear;
  while (m > 12) { m -= 12; y++; }
  return { year: y, month: m };
}

// Clear existing data
db.exec(`
  DELETE FROM custom_dashboards;
  DELETE FROM scenarios;
  DELETE FROM attachments;
  DELETE FROM automation_rules;
  DELETE FROM project_requests;
  DELETE FROM task_dependencies;
  DELETE FROM project_templates;
  DELETE FROM budget_entries;
  DELETE FROM snapshots;
  DELETE FROM notifications;
  DELETE FROM alert_rules;
  DELETE FROM comments;
  DELETE FROM milestones;
  DELETE FROM risks;
  DELETE FROM project_tags;
  DELETE FROM tags;
  DELETE FROM audit_log;
  DELETE FROM users;
  DELETE FROM facility_costs;
  DELETE FROM tasks;
  DELETE FROM resource_allocations;
  DELETE FROM resources;
  DELETE FROM projects;
  DELETE FROM investment_themes;
  DELETE FROM sqlite_sequence;
`);

// ============================================================
// THEME & PROJECT DEFINITIONS (20 clients, 4-6 projects each)
// ============================================================
const themeConfigs = [
  { name: 'Meridian Health Systems', desc: 'Regional hospital network modernizing patient experience and clinical operations.', status: 'Active', budget: 2500000, projects: [
    { name: 'Patient Portal Redesign', desc: 'Modern UX portal with self-service scheduling and real-time lab results.', status: 'Active', startOff: 0, dur: 7, rate: 175, facility: 8000, overhead: 15 },
    { name: 'Mobile Health App', desc: 'Native mobile app for iOS and Android with telehealth and prescription refills.', status: 'Planning', startOff: 3, dur: 9, rate: 185, facility: 5000, overhead: 12 },
    { name: 'Clinical Workflow Engine', desc: 'Workflow automation for clinical care coordination using rule-based engine.', status: 'Active', startOff: 1, dur: 6, rate: 165, facility: 4000, overhead: 14 },
    { name: 'Internal Chatbot MVP', desc: 'AI-powered chatbot for patient FAQs and appointment triaging.', status: 'Planning', startOff: 4, dur: 5, rate: 155, facility: 2500, overhead: 10 },
  ]},
  { name: 'Nova Financial Group', desc: 'Mid-market investment firm upgrading trading and client reporting platforms.', status: 'Active', budget: 1800000, projects: [
    { name: 'Trading Analytics Dashboard', desc: 'Real-time portfolio analytics with performance attribution and risk heatmaps.', status: 'Active', startOff: 0, dur: 6, rate: 170, facility: 6000, overhead: 14 },
    { name: 'Personalization Engine', desc: 'ML-based personalization for investment recommendations and alerts.', status: 'Active', startOff: 1, dur: 8, rate: 190, facility: 7000, overhead: 16 },
    { name: 'Client Feedback System', desc: 'Multi-channel client feedback collection and sentiment analysis.', status: 'Planning', startOff: 3, dur: 5, rate: 155, facility: 3000, overhead: 11 },
    { name: 'Loyalty Tier Revamp', desc: 'Tiered client loyalty program with fee discounts and priority access.', status: 'Planning', startOff: 5, dur: 7, rate: 160, facility: 3500, overhead: 12 },
    { name: 'NPS Tracking Platform', desc: 'NPS surveys, CSAT tracking, and automated follow-up workflows.', status: 'Active', startOff: 2, dur: 4, rate: 150, facility: 2500, overhead: 10 },
  ]},
  { name: 'Titan Retail Corp', desc: 'National retailer migrating legacy e-commerce to headless architecture.', status: 'Active', budget: 2200000, projects: [
    { name: 'Headless Commerce Backend', desc: 'API-first commerce engine with product catalog, cart, and checkout.', status: 'Active', startOff: 0, dur: 10, rate: 195, facility: 10000, overhead: 18 },
    { name: 'Storefront PWA', desc: 'Progressive web app storefront with offline support and fast loading.', status: 'Active', startOff: 1, dur: 8, rate: 175, facility: 5000, overhead: 14 },
    { name: 'Payment Gateway Integration', desc: 'Multi-provider payment processing with Stripe, PayPal, and Apple Pay.', status: 'Planning', startOff: 4, dur: 4, rate: 180, facility: 4000, overhead: 15 },
    { name: 'Inventory Management API', desc: 'Real-time inventory sync across warehouses and retail locations.', status: 'Planning', startOff: 3, dur: 6, rate: 165, facility: 3500, overhead: 13 },
  ]},
  { name: 'Pinnacle Insurance', desc: 'National insurer integrating web, mobile, call center, and agent channels.', status: 'Planning', budget: 1500000, projects: [
    { name: 'Unified Customer Profile', desc: 'Single policyholder view aggregating data from all channels.', status: 'Planning', startOff: 2, dur: 7, rate: 170, facility: 5000, overhead: 14 },
    { name: 'Channel Orchestration Hub', desc: 'Event-driven orchestration of cross-channel policyholder interactions.', status: 'Planning', startOff: 3, dur: 8, rate: 180, facility: 6000, overhead: 16 },
    { name: 'Call Center Modernization', desc: 'Cloud-based contact center with AI-assisted agent workspace.', status: 'Planning', startOff: 4, dur: 6, rate: 165, facility: 4500, overhead: 13 },
    { name: 'Agent Portal Integration', desc: 'API integration between online portal and agent management systems.', status: 'Planning', startOff: 5, dur: 5, rate: 155, facility: 3000, overhead: 11 },
  ]},
  { name: 'BrightPath Education', desc: 'EdTech company building marketing automation and student engagement tools.', status: 'Active', budget: 900000, projects: [
    { name: 'Campaign Management Tool', desc: 'Multi-channel campaign creation, scheduling, and A/B testing.', status: 'Active', startOff: 0, dur: 6, rate: 160, facility: 4000, overhead: 12 },
    { name: 'Email Automation Pipeline', desc: 'Triggered email workflows with dynamic content and segmentation.', status: 'Active', startOff: 1, dur: 4, rate: 150, facility: 2500, overhead: 10 },
    { name: 'Social Media Analytics', desc: 'Social listening dashboard with engagement metrics and trend analysis.', status: 'Planning', startOff: 3, dur: 5, rate: 145, facility: 2000, overhead: 9 },
    { name: 'Enrollment Attribution Model', desc: 'Multi-touch attribution model for ROI tracking across channels.', status: 'Planning', startOff: 4, dur: 5, rate: 170, facility: 3000, overhead: 13 },
  ]},
  { name: 'Crestview Hotels & Resorts', desc: 'Luxury hospitality brand building advanced guest analytics and CRM suite.', status: 'Planning', budget: 1100000, projects: [
    { name: 'Guest Segmentation Engine', desc: 'ML-based dynamic segmentation with behavioral clustering.', status: 'Planning', startOff: 2, dur: 6, rate: 185, facility: 5500, overhead: 16 },
    { name: 'Churn Prediction Model', desc: 'Predictive model for identifying at-risk loyalty members.', status: 'Planning', startOff: 3, dur: 5, rate: 190, facility: 4500, overhead: 15 },
    { name: 'Guest Lifetime Value Calculator', desc: 'Guest lifetime value estimation with cohort analysis.', status: 'Planning', startOff: 4, dur: 4, rate: 175, facility: 3000, overhead: 13 },
    { name: 'Behavioral Analytics Dashboard', desc: 'Real-time guest behavior tracking with booking funnels and retention curves.', status: 'Planning', startOff: 2, dur: 7, rate: 165, facility: 4000, overhead: 12 },
  ]},
  { name: 'Atlas Logistics Inc.', desc: 'Freight and logistics company migrating on-premise infrastructure to AWS.', status: 'Active', budget: 3200000, projects: [
    { name: 'AWS Infrastructure Migration', desc: 'Core infra migration with VPC setup, security hardening, and CI/CD.', status: 'Active', startOff: 0, dur: 9, rate: 195, facility: 12000, overhead: 18 },
    { name: 'Legacy System Decommission', desc: 'Systematic decommissioning of legacy mainframe systems.', status: 'Planning', startOff: 5, dur: 10, rate: 160, facility: 3000, overhead: 10 },
    { name: 'Database Migration Suite', desc: 'Oracle to Aurora PostgreSQL migration with zero-downtime cutover.', status: 'Active', startOff: 1, dur: 7, rate: 185, facility: 8000, overhead: 16 },
    { name: 'Cloud Cost Optimization', desc: 'FinOps practices with reserved instances and spot fleet management.', status: 'Active', startOff: 2, dur: 5, rate: 170, facility: 3500, overhead: 12 },
    { name: 'Multi-Region DR Setup', desc: 'Active-passive disaster recovery across two AWS regions.', status: 'Planning', startOff: 6, dur: 6, rate: 190, facility: 9000, overhead: 17 },
  ]},
  { name: 'Quantum Dynamics Corp', desc: 'Aerospace manufacturer adopting DevOps practices across engineering teams.', status: 'Active', budget: 1400000, projects: [
    { name: 'CI/CD Pipeline Standardization', desc: 'GitHub Actions pipelines with automated testing and deployment gates.', status: 'Active', startOff: 0, dur: 5, rate: 170, facility: 5000, overhead: 14 },
    { name: 'Infrastructure as Code', desc: 'Terraform modules for all cloud resources with state management.', status: 'Active', startOff: 1, dur: 6, rate: 175, facility: 4000, overhead: 13 },
    { name: 'Observability Platform', desc: 'Centralized logging, metrics, and tracing with Grafana stack.', status: 'Planning', startOff: 3, dur: 5, rate: 165, facility: 6000, overhead: 15 },
    { name: 'GitOps Workflow', desc: 'ArgoCD-based GitOps for Kubernetes deployments.', status: 'Planning', startOff: 4, dur: 4, rate: 160, facility: 3000, overhead: 11 },
  ]},
  { name: 'Vanguard Energy Partners', desc: 'Renewable energy firm modernizing infrastructure with containers and service mesh.', status: 'Active', budget: 2800000, projects: [
    { name: 'Kubernetes Platform', desc: 'Production-grade EKS cluster with multi-tenancy and auto-scaling.', status: 'Active', startOff: 0, dur: 8, rate: 195, facility: 11000, overhead: 18 },
    { name: 'Service Mesh Implementation', desc: 'Istio service mesh for traffic management and mTLS.', status: 'Active', startOff: 2, dur: 6, rate: 185, facility: 7000, overhead: 16 },
    { name: 'Container Registry & Scanning', desc: 'Private container registry with vulnerability scanning pipeline.', status: 'Active', startOff: 1, dur: 4, rate: 165, facility: 4000, overhead: 13 },
    { name: 'Network Segmentation', desc: 'Micro-segmentation of network with policy-based access controls.', status: 'Planning', startOff: 4, dur: 5, rate: 175, facility: 5000, overhead: 15 },
    { name: 'Storage Modernization', desc: 'Migration from SAN to software-defined storage with Ceph.', status: 'Planning', startOff: 5, dur: 6, rate: 170, facility: 6000, overhead: 14 },
  ]},
  { name: 'Pacific Coast Credit Union', desc: 'Regional credit union enhancing disaster recovery and business continuity.', status: 'Completed', budget: 800000, projects: [
    { name: 'Automated Failover System', desc: 'Route53 health checks with automated DNS failover.', status: 'Completed', startOff: 0, dur: 5, rate: 180, facility: 5000, overhead: 15 },
    { name: 'Backup Modernization', desc: 'AWS Backup with cross-region replication and lifecycle policies.', status: 'Completed', startOff: 1, dur: 4, rate: 160, facility: 4000, overhead: 12 },
    { name: 'DR Runbook Automation', desc: 'Automated runbooks for disaster recovery procedures.', status: 'Completed', startOff: 0, dur: 3, rate: 155, facility: 2000, overhead: 10 },
    { name: 'Chaos Engineering Framework', desc: 'Controlled failure injection to validate resilience.', status: 'Completed', startOff: 2, dur: 4, rate: 175, facility: 3500, overhead: 14 },
  ]},
  { name: 'Redwood Pharmaceuticals', desc: 'Biotech firm building centralized data platform with lake, warehouse, and governance.', status: 'Active', budget: 2600000, projects: [
    { name: 'Data Lake on S3', desc: 'Scalable data lake with partitioned Parquet storage and Glue catalog.', status: 'Active', startOff: 0, dur: 8, rate: 185, facility: 9000, overhead: 16 },
    { name: 'Data Warehouse Migration', desc: 'Redshift Serverless warehouse replacing on-prem Teradata.', status: 'Active', startOff: 1, dur: 7, rate: 190, facility: 10000, overhead: 17 },
    { name: 'ETL Pipeline Modernization', desc: 'Apache Airflow DAGs replacing legacy SSIS packages.', status: 'Active', startOff: 0, dur: 6, rate: 175, facility: 5000, overhead: 14 },
    { name: 'Data Quality Framework', desc: 'Great Expectations-based data quality checks with alerting.', status: 'Planning', startOff: 4, dur: 5, rate: 165, facility: 3500, overhead: 12 },
    { name: 'Self-Service BI Portal', desc: 'Metabase portal for research team self-service analytics.', status: 'Planning', startOff: 5, dur: 4, rate: 155, facility: 3000, overhead: 11 },
  ]},
  { name: 'Summit Manufacturing Co.', desc: 'Industrial manufacturer implementing MLOps for predictive quality control.', status: 'Planning', budget: 1900000, projects: [
    { name: 'ML Feature Store', desc: 'Centralized feature store for ML model training and serving.', status: 'Planning', startOff: 2, dur: 7, rate: 195, facility: 7000, overhead: 17 },
    { name: 'Model Training Platform', desc: 'SageMaker-based training platform with experiment tracking.', status: 'Planning', startOff: 3, dur: 8, rate: 200, facility: 9000, overhead: 18 },
    { name: 'Model Serving Infrastructure', desc: 'Real-time and batch model serving with A/B testing.', status: 'Planning', startOff: 4, dur: 6, rate: 190, facility: 6000, overhead: 16 },
    { name: 'ML Monitoring Dashboard', desc: 'Model drift detection and performance monitoring.', status: 'Planning', startOff: 5, dur: 4, rate: 170, facility: 4000, overhead: 13 },
  ]},
  { name: 'Evergreen Media Group', desc: 'Digital media conglomerate refreshing BI tooling and executive dashboards.', status: 'Active', budget: 1200000, projects: [
    { name: 'Executive Dashboard Suite', desc: 'C-level dashboards with KPIs, trends, and drill-down.', status: 'Active', startOff: 0, dur: 5, rate: 165, facility: 4000, overhead: 13 },
    { name: 'Financial Reporting Module', desc: 'Automated P&L, balance sheet, and cash flow reports.', status: 'Active', startOff: 1, dur: 4, rate: 160, facility: 3000, overhead: 11 },
    { name: 'Content Performance Platform', desc: 'Real-time content KPIs with engagement alerts.', status: 'Planning', startOff: 3, dur: 5, rate: 155, facility: 3500, overhead: 12 },
    { name: 'Report Scheduler', desc: 'Automated report generation and email distribution.', status: 'Planning', startOff: 4, dur: 3, rate: 145, facility: 1500, overhead: 9 },
  ]},
  { name: 'Ironbridge Capital', desc: 'Private equity firm building real-time analytics for portfolio monitoring.', status: 'Planning', budget: 1700000, projects: [
    { name: 'Kafka Cluster Setup', desc: 'Multi-broker Kafka cluster with schema registry.', status: 'Planning', startOff: 2, dur: 6, rate: 185, facility: 8000, overhead: 16 },
    { name: 'Stream Processing Pipeline', desc: 'Flink-based stream processing for complex event processing.', status: 'Planning', startOff: 3, dur: 7, rate: 195, facility: 7000, overhead: 17 },
    { name: 'Real-time Portfolio Dashboard', desc: 'WebSocket-powered dashboards with sub-second data freshness.', status: 'Planning', startOff: 4, dur: 5, rate: 170, facility: 4000, overhead: 13 },
    { name: 'Event Sourcing Migration', desc: 'Migrating core services to event sourcing architecture.', status: 'Planning', startOff: 5, dur: 8, rate: 180, facility: 5000, overhead: 15 },
  ]},
  { name: 'Sentinel Defense Technologies', desc: 'Defense contractor implementing zero-trust architecture across all systems.', status: 'Active', budget: 2100000, projects: [
    { name: 'Identity Verification Service', desc: 'Continuous identity verification with device trust scoring.', status: 'Active', startOff: 0, dur: 7, rate: 190, facility: 7000, overhead: 17 },
    { name: 'Micro-Segmentation Rollout', desc: 'Network micro-segmentation with policy enforcement.', status: 'Active', startOff: 1, dur: 6, rate: 185, facility: 6000, overhead: 16 },
    { name: 'SASE Implementation', desc: 'Secure access service edge for remote workforce.', status: 'Planning', startOff: 4, dur: 5, rate: 180, facility: 5500, overhead: 15 },
    { name: 'Privileged Access Management', desc: 'CyberArk PAM for privileged account security.', status: 'Active', startOff: 2, dur: 5, rate: 175, facility: 5000, overhead: 14 },
    { name: 'Zero Trust Policy Engine', desc: 'Dynamic policy engine for real-time access decisions.', status: 'Planning', startOff: 5, dur: 6, rate: 195, facility: 6500, overhead: 18 },
  ]},
  { name: 'Heritage Bank & Trust', desc: 'Community bank building automated compliance monitoring for SOX and GLBA.', status: 'Active', budget: 1600000, projects: [
    { name: 'Compliance Dashboard', desc: 'Real-time compliance posture dashboard with audit trails.', status: 'Active', startOff: 0, dur: 6, rate: 170, facility: 5000, overhead: 14 },
    { name: 'Audit Trail System', desc: 'Immutable audit logging for all system changes.', status: 'Active', startOff: 1, dur: 4, rate: 165, facility: 4000, overhead: 13 },
    { name: 'Policy Automation Engine', desc: 'OPA-based policy enforcement for cloud resources.', status: 'Planning', startOff: 3, dur: 5, rate: 180, facility: 4500, overhead: 15 },
    { name: 'Data Subject Requests Portal', desc: 'Automated DSR handling with data discovery and deletion.', status: 'Active', startOff: 0, dur: 5, rate: 160, facility: 3000, overhead: 12 },
  ]},
  { name: 'Northstar Airlines', desc: 'Regional carrier upgrading SAP ERP from legacy ECC to S/4HANA.', status: 'Active', budget: 3500000, projects: [
    { name: 'S/4HANA Core Migration', desc: 'Technical migration of ECC to S/4HANA with data conversion.', status: 'Active', startOff: 0, dur: 12, rate: 210, facility: 15000, overhead: 20 },
    { name: 'Finance Module Redesign', desc: 'Reimplementation of FI/CO modules with universal journal.', status: 'Active', startOff: 1, dur: 10, rate: 200, facility: 10000, overhead: 18 },
    { name: 'Supply Chain Module', desc: 'Extended warehouse management and demand planning.', status: 'Planning', startOff: 4, dur: 8, rate: 195, facility: 8000, overhead: 17 },
    { name: 'Integration Layer', desc: 'SAP CPI middleware for third-party system integration.', status: 'Active', startOff: 2, dur: 7, rate: 185, facility: 6000, overhead: 15 },
    { name: 'ERP Testing & Validation', desc: 'Comprehensive UAT with automated regression testing.', status: 'Planning', startOff: 6, dur: 5, rate: 165, facility: 4000, overhead: 12 },
    { name: 'User Training Program', desc: 'Role-based training materials and instructor-led sessions.', status: 'Planning', startOff: 8, dur: 3, rate: 145, facility: 2000, overhead: 8 },
  ]},
  { name: 'Clearwater Telecom', desc: 'Telecom provider implementing Salesforce to replace legacy CRM.', status: 'Active', budget: 1400000, projects: [
    { name: 'Salesforce Core Setup', desc: 'Sales Cloud configuration with custom objects and workflows.', status: 'Active', startOff: 0, dur: 6, rate: 175, facility: 6000, overhead: 14 },
    { name: 'Data Migration & Cleansing', desc: 'Legacy CRM data extraction, cleansing, and loading.', status: 'Active', startOff: 1, dur: 4, rate: 165, facility: 3500, overhead: 12 },
    { name: 'Marketing Cloud Integration', desc: 'Journey Builder campaigns with CRM data sync.', status: 'Planning', startOff: 3, dur: 5, rate: 170, facility: 4000, overhead: 13 },
    { name: 'Service Cloud Deployment', desc: 'Case management and knowledge base for support team.', status: 'Planning', startOff: 4, dur: 5, rate: 165, facility: 3500, overhead: 12 },
  ]},
  { name: 'Apex Consumer Goods', desc: 'CPG company optimizing supply chain with demand forecasting and logistics.', status: 'Active', budget: 2000000, projects: [
    { name: 'Demand Forecasting Engine', desc: 'ML-based demand forecasting with seasonal adjustments.', status: 'Active', startOff: 0, dur: 7, rate: 185, facility: 7000, overhead: 16 },
    { name: 'Logistics Route Optimizer', desc: 'AI-powered route optimization for last-mile delivery.', status: 'Active', startOff: 1, dur: 6, rate: 180, facility: 5500, overhead: 15 },
    { name: 'Supplier Portal', desc: 'Self-service portal for supplier onboarding and PO management.', status: 'Planning', startOff: 3, dur: 5, rate: 165, facility: 4000, overhead: 13 },
    { name: 'Warehouse Automation', desc: 'Pick-and-pack automation with barcode scanning integration.', status: 'Planning', startOff: 4, dur: 6, rate: 170, facility: 5000, overhead: 14 },
    { name: 'Supply Chain Dashboard', desc: 'End-to-end supply chain visibility with risk indicators.', status: 'Active', startOff: 2, dur: 4, rate: 160, facility: 3000, overhead: 11 },
  ]},
  { name: 'Horizon Biotech', desc: 'Life sciences startup deploying RPA for lab operations and regulatory filing.', status: 'Active', budget: 1300000, projects: [
    { name: 'Invoice Processing Bot', desc: 'Automated invoice extraction, matching, and approval.', status: 'Active', startOff: 0, dur: 4, rate: 160, facility: 3000, overhead: 12 },
    { name: 'Employee Onboarding Bot', desc: 'Automated account provisioning and onboarding checklist.', status: 'Active', startOff: 1, dur: 3, rate: 155, facility: 2500, overhead: 11 },
    { name: 'Report Generation Bot', desc: 'Automated data extraction and regulatory report compilation.', status: 'Active', startOff: 0, dur: 3, rate: 150, facility: 2000, overhead: 10 },
    { name: 'RPA Center of Excellence', desc: 'Governance framework for bot lifecycle management.', status: 'Planning', startOff: 2, dur: 5, rate: 170, facility: 4000, overhead: 14 },
    { name: 'Process Mining Analysis', desc: 'Automated process discovery for RPA candidate identification.', status: 'Planning', startOff: 3, dur: 4, rate: 175, facility: 3500, overhead: 13 },
  ]},
];

// ============================================================
// RESOURCE DEFINITIONS (30 resources)
// ============================================================
const resourceDefs = [
  // Engineering (12)
  { name: 'Sarah Chen', role: 'Senior Full-Stack Engineer', dept: 'Engineering', rate: 125 },
  { name: 'Marcus Johnson', role: 'Senior Backend Engineer', dept: 'Engineering', rate: 125 },
  { name: 'Emily Rodriguez', role: 'Mid-Level Frontend Engineer', dept: 'Engineering', rate: 95 },
  { name: 'David Kim', role: 'Mid-Level DevOps Engineer', dept: 'Engineering', rate: 95 },
  { name: 'Alex Turner', role: 'Senior Frontend Engineer', dept: 'Engineering', rate: 130 },
  { name: 'Nina Kowalski', role: 'Senior Cloud Engineer', dept: 'Engineering', rate: 135 },
  { name: 'Carlos Ramirez', role: 'Mid-Level Backend Engineer', dept: 'Engineering', rate: 100 },
  { name: 'Aisha Patel', role: 'Mid-Level Full-Stack Engineer', dept: 'Engineering', rate: 100 },
  { name: "Ryan O'Brien", role: 'Junior Frontend Engineer', dept: 'Engineering', rate: 70 },
  { name: 'Mei Zhang', role: 'Junior Backend Engineer', dept: 'Engineering', rate: 75 },
  { name: 'Tom Nakamura', role: 'Senior DevOps Engineer', dept: 'Engineering', rate: 115 },
  { name: 'Laura Fischer', role: 'Platform Engineer', dept: 'Engineering', rate: 110 },
  // Design (3)
  { name: 'Lisa Wang', role: 'Senior UX/UI Designer', dept: 'Design', rate: 90 },
  { name: 'Chris Bennett', role: 'Senior Product Designer', dept: 'Design', rate: 95 },
  { name: 'Zara Ahmed', role: 'Junior UX Designer', dept: 'Design', rate: 60 },
  // PMO (4)
  { name: 'James Thompson', role: 'Senior Project Manager', dept: 'PMO', rate: 115 },
  { name: 'Rachel Green', role: 'Senior Program Manager', dept: 'PMO', rate: 120 },
  { name: 'Kevin Park', role: 'Project Manager', dept: 'PMO', rate: 90 },
  { name: 'Sophie Martin', role: 'Project Coordinator', dept: 'PMO', rate: 85 },
  // Architecture (3)
  { name: 'Robert Martinez', role: 'Solutions Architect', dept: 'Architecture', rate: 140 },
  { name: 'Diana Volkov', role: 'Enterprise Architect', dept: 'Architecture', rate: 160 },
  { name: 'Hassan Ali', role: 'Cloud Architect', dept: 'Architecture', rate: 145 },
  // Data & Analytics (4)
  { name: 'Olivia Chen', role: 'Senior Data Engineer', dept: 'Data', rate: 115 },
  { name: 'Jamal Williams', role: 'Data Engineer', dept: 'Data', rate: 100 },
  { name: 'Priya Sharma', role: 'Data Scientist', dept: 'Data', rate: 120 },
  { name: "Mike O'Connell", role: 'BI Analyst', dept: 'Data', rate: 85 },
  // Quality (3)
  { name: 'Priya Patel', role: 'QA Lead', dept: 'Quality', rate: 95 },
  { name: 'Derek Chang', role: 'Senior QA Engineer', dept: 'Quality', rate: 85 },
  { name: 'Anna Kowalski', role: 'QA Engineer', dept: 'Quality', rate: 75 },
  // Security (1)
  { name: 'Victor Nguyen', role: 'Security Engineer', dept: 'Security', rate: 125 },
];

// ============================================================
// TEMPLATES
// ============================================================
const taskTemplates = [
  'Architecture design document', 'Backend API development', 'Frontend implementation',
  'Database schema design', 'Integration testing', 'Performance optimization',
  'UX research and wireframes', 'UI mockups and prototypes', 'Design system updates',
  'Project kickoff and planning', 'Sprint management', 'Stakeholder reporting',
  'Security review', 'Code review and refactoring', 'Documentation',
  'Data migration scripts', 'API integration', 'Load testing',
  'Deployment automation', 'User acceptance testing', 'Monitoring setup',
];

const facilityTemplates = [
  { desc: 'Development Workstations', min: 200, max: 600, type: 'Fixed' },
  { desc: 'Software Licenses', min: 150, max: 500, type: 'Fixed' },
  { desc: 'Cloud Dev/Staging Environment', min: 300, max: 1000, type: 'Variable' },
  { desc: 'Security Audit Tools', min: 200, max: 500, type: 'Fixed' },
  { desc: 'Testing Infrastructure', min: 200, max: 600, type: 'Variable' },
  { desc: 'CI/CD Pipeline Services', min: 100, max: 400, type: 'Fixed' },
  { desc: 'Monitoring & Observability', min: 150, max: 400, type: 'Fixed' },
  { desc: 'Data Storage & Backup', min: 200, max: 700, type: 'Variable' },
];

// ============================================================
// INSERT DATA
// ============================================================
const insertTheme = db.prepare('INSERT INTO investment_themes (name, description, status, total_budget) VALUES (?, ?, ?, ?)');
const insertProject = db.prepare('INSERT INTO projects (theme_id, name, description, status, start_date, end_date, client_billing_rate_per_hour, fixed_facility_cost_monthly, overhead_percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertResource = db.prepare('INSERT INTO resources (name, role, department, hourly_rate, available_hours_per_month) VALUES (?, ?, ?, ?, ?)');
const insertAlloc = db.prepare('INSERT INTO resource_allocations (resource_id, project_id, allocation_percentage, allocated_hours_per_month, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)');
const insertTask = db.prepare('INSERT INTO tasks (project_id, assigned_resource_id, title, description, status, estimated_hours, actual_hours) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insertFacility = db.prepare('INSERT INTO facility_costs (project_id, description, monthly_cost, cost_type) VALUES (?, ?, ?, ?)');

// ============================================================
// MARGIN ADJUSTMENT: Ensure ~80% positive margins
// Boost billing rates & reduce facility for most projects;
// every 5th project per theme keeps original pricing (negative margin)
// ============================================================
let globalProjIdx = 0;
for (const tc of themeConfigs) {
  for (const pc of tc.projects) {
    globalProjIdx++;
    // Every 5th project keeps original pricing → negative margin (~20%)
    if (globalProjIdx % 5 !== 0) {
      pc.rate = Math.round(pc.rate * 2.25);
      pc.facility = Math.round(pc.facility * 0.12);
      pc.overhead = Math.max(4, pc.overhead - 5);
    } else {
      // Keep original rate but reduce facility slightly so margins aren't wildly negative
      pc.facility = Math.round(pc.facility * 0.6);
    }
  }
}

// Insert themes and projects
const allProjects = [];
let themeCount = 0, projectCount = 0;

for (const tc of themeConfigs) {
  const themeResult = insertTheme.run(tc.name, tc.desc, tc.status, tc.budget);
  const themeId = themeResult.lastInsertRowid;
  themeCount++;

  for (const pc of tc.projects) {
    const start = addMonths(2026, 1, pc.startOff);
    const end = addMonths(2026, 1, pc.startOff + pc.dur);
    const startDate = dateStr(start.year, start.month, randInt(1, 15));
    const endDate = dateStr(end.year, end.month, randInt(15, 28));
    const projResult = insertProject.run(themeId, pc.name, pc.desc, pc.status, startDate, endDate, pc.rate, pc.facility, pc.overhead);
    allProjects.push({ id: projResult.lastInsertRowid, themeStatus: tc.status, projectStatus: pc.status, startDate, endDate });
    projectCount++;
  }
}

// Insert resources
const resources = [];
for (const rd of resourceDefs) {
  const result = insertResource.run(rd.name, rd.role, rd.dept, rd.rate, 160);
  resources.push({ id: result.lastInsertRowid, ...rd });
}

// ============================================================
// GENERATE ALLOCATIONS (capacity-tracked)
// ============================================================
const capacity = {};
resources.forEach(r => { capacity[r.id] = 100; });

let allocCount = 0;
const shuffledProjects = shuffle(allProjects);
const projectsByPriority = [
  ...shuffledProjects.filter(p => p.projectStatus === 'Active'),
  ...shuffledProjects.filter(p => p.projectStatus === 'Planning'),
  ...shuffledProjects.filter(p => p.projectStatus === 'Completed'),
  ...shuffledProjects.filter(p => p.projectStatus === 'On Hold'),
];

// First pass: give every project at least 1 resource with small allocation
for (const proj of projectsByPriority) {
  const available = shuffle(resources.filter(r => capacity[r.id] >= 5));
  if (available.length === 0) break;

  const r = available[0];
  let pct;
  if (proj.projectStatus === 'Active') pct = randInt(5, 10);
  else if (proj.projectStatus === 'Planning') pct = randInt(5, 8);
  else pct = 5;

  pct = Math.min(pct, capacity[r.id]);
  if (pct >= 5) {
    const hours = Math.round(pct / 100 * 160);
    insertAlloc.run(r.id, proj.id, pct, hours, proj.startDate, proj.endDate);
    capacity[r.id] -= pct;
    allocCount++;
  }
}

// Second pass: add more resources to Active and Planning projects with remaining capacity
for (const proj of projectsByPriority) {
  let extraResources;
  if (proj.projectStatus === 'Active') extraResources = randInt(1, 2);
  else if (proj.projectStatus === 'Planning') extraResources = randInt(0, 1);
  else continue;

  const available = shuffle(resources.filter(r => capacity[r.id] >= 5));
  const selected = available.slice(0, Math.min(extraResources, available.length));

  for (const r of selected) {
    // Check not already allocated to this project
    const existing = db.prepare('SELECT COUNT(*) as c FROM resource_allocations WHERE resource_id = ? AND project_id = ?').get(r.id, proj.id).c;
    if (existing > 0) continue;

    let pct = randInt(5, 10);
    pct = Math.min(pct, capacity[r.id]);
    if (pct < 5) continue;

    const hours = Math.round(pct / 100 * 160);
    insertAlloc.run(r.id, proj.id, pct, hours, proj.startDate, proj.endDate);
    capacity[r.id] -= pct;
    allocCount++;
  }
}

// ============================================================
// GENERATE TASKS
// ============================================================
let taskCount = 0;

for (const proj of allProjects) {
  const numTasks = randInt(3, 6);
  const taskNames = shuffle(taskTemplates).slice(0, numTasks);
  const allocRows = db.prepare('SELECT resource_id FROM resource_allocations WHERE project_id = ?').all(proj.id);
  const projResources = allocRows.map(a => a.resource_id);

  for (let i = 0; i < taskNames.length; i++) {
    const title = taskNames[i];
    const estimatedHours = randInt(15, 60);
    const assignedResource = projResources.length > 0 ? projResources[i % projResources.length] : null;

    let status;
    const roll = rand();
    if (proj.projectStatus === 'Active') status = roll < 0.25 ? 'Done' : roll < 0.65 ? 'In Progress' : 'To Do';
    else if (proj.projectStatus === 'Planning') status = roll < 0.1 ? 'Done' : roll < 0.3 ? 'In Progress' : 'To Do';
    else if (proj.projectStatus === 'Completed') status = roll < 0.8 ? 'Done' : roll < 0.95 ? 'In Progress' : 'To Do';
    else status = roll < 0.3 ? 'Done' : roll < 0.5 ? 'In Progress' : 'To Do';

    let actualHours = 0;
    if (status === 'Done') actualHours = Math.round(estimatedHours * (0.85 + rand() * 0.3));
    else if (status === 'In Progress') actualHours = Math.round(estimatedHours * (0.2 + rand() * 0.4));

    insertTask.run(proj.id, assignedResource, title, `${title} for project deliverable.`, status, estimatedHours, actualHours);
    taskCount++;
  }
}

// ============================================================
// GENERATE FACILITY COSTS
// ============================================================
let facilityCount = 0;

for (const proj of allProjects) {
  const numItems = randInt(1, 3);
  const items = shuffle(facilityTemplates).slice(0, numItems);
  for (const item of items) {
    const cost = randInt(item.min, item.max);
    insertFacility.run(proj.id, item.desc, cost, item.type);
    facilityCount++;
  }
}

// ============================================================
// SEED USERS
// ============================================================
const { createHash } = await import('crypto');
function hashPwd(p) { return createHash('sha256').update(p).digest('hex'); }

const insertUser = db.prepare('INSERT INTO users (username, password_hash, display_name, email, role) VALUES (?, ?, ?, ?, ?)');
insertUser.run('admin', hashPwd('admin'), 'Admin User', 'admin@company.com', 'Admin');
insertUser.run('pmo_user', hashPwd('pmo123'), 'Sarah PMO', 'sarah.pmo@company.com', 'PMO');
insertUser.run('pm_user', hashPwd('pm123'), 'James PM', 'james.pm@company.com', 'PM');
insertUser.run('exec_user', hashPwd('exec123'), 'Diana Exec', 'diana.exec@company.com', 'Executive');
insertUser.run('viewer', hashPwd('viewer'), 'View Only', 'viewer@company.com', 'Viewer');

// ============================================================
// SEED TAGS
// ============================================================
const insertTag = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
const tagDefs = [
  ['Digital Transformation', '#3b82f6'], ['Compliance', '#ef4444'], ['Innovation', '#8b5cf6'],
  ['Cost Optimization', '#f59e0b'], ['Revenue Growth', '#10b981'], ['Quick Win', '#06b6d4'],
  ['Technical Debt', '#f97316'], ['Strategic', '#6366f1'], ['Infrastructure', '#64748b'],
  ['Data & Analytics', '#ec4899'],
];
const tagIds = [];
for (const [name, color] of tagDefs) {
  const r = insertTag.run(name, color);
  tagIds.push(r.lastInsertRowid);
}

// Assign random tags to projects
const insertProjTag = db.prepare('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)');
for (const proj of allProjects) {
  const numTags = randInt(1, 3);
  const chosen = shuffle([...tagIds]).slice(0, numTags);
  for (const tid of chosen) {
    insertProjTag.run(proj.id, tid);
  }
}

// ============================================================
// SEED HEALTH STATUS & PRIORITY ON PROJECTS
// ============================================================
const healthStatuses = ['Green', 'Green', 'Green', 'Amber', 'Amber', 'Red'];
const updateHealth = db.prepare("UPDATE projects SET health_status = ?, priority_score = ? WHERE id = ?");
for (const proj of allProjects) {
  const health = pick(healthStatuses);
  const priority = randInt(20, 95);
  updateHealth.run(health, priority, proj.id);
}

// ============================================================
// SEED RISKS
// ============================================================
const riskCategories = ['Technical', 'Financial', 'Resource', 'Schedule', 'Scope', 'External'];
const riskLikelihoods = ['Low', 'Medium', 'High', 'Critical'];
const riskImpacts = ['Low', 'Medium', 'High', 'Critical'];
const riskStatuses = ['Open', 'Open', 'Mitigating', 'Resolved', 'Accepted'];
const riskTitles = [
  'Key resource attrition', 'Vendor delivery delay', 'Scope creep from stakeholders',
  'Technology stack incompatibility', 'Budget overrun risk', 'Integration complexity underestimated',
  'Regulatory compliance gap', 'Data migration data loss', 'Performance bottleneck identified',
  'Security vulnerability in dependency', 'Third-party API deprecation', 'Requirements ambiguity',
];

const insertRisk = db.prepare('INSERT INTO risks (project_id, title, description, category, likelihood, impact, status, owner_resource_id, mitigation_plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
let riskCount = 0;
for (const proj of allProjects) {
  if (proj.projectStatus === 'Completed') continue;
  const numRisks = randInt(1, 3);
  const titles = shuffle(riskTitles).slice(0, numRisks);
  for (const title of titles) {
    const owner = resources.length > 0 ? pick(resources).id : null;
    insertRisk.run(proj.id, title, `${title} - requires monitoring and mitigation.`, pick(riskCategories), pick(riskLikelihoods), pick(riskImpacts), pick(riskStatuses), owner, 'Monitor closely and escalate if threshold reached.');
    riskCount++;
  }
}

// ============================================================
// SEED MILESTONES
// ============================================================
const milestoneTitles = [
  'Project Kickoff', 'Requirements Sign-off', 'Architecture Review',
  'Development Sprint 1 Complete', 'Alpha Release', 'Integration Testing Complete',
  'UAT Sign-off', 'Production Deployment', 'Post-Launch Review',
  'Phase 1 Complete', 'Security Audit Complete', 'Performance Testing',
];
const milestoneStatuses = ['Pending', 'Pending', 'In Progress', 'Completed', 'Completed'];

const insertMilestone = db.prepare('INSERT INTO milestones (project_id, title, description, due_date, status, completed_date) VALUES (?, ?, ?, ?, ?, ?)');
let milestoneCount = 0;
for (const proj of allProjects) {
  const numMs = randInt(3, 5);
  const titles = shuffle(milestoneTitles).slice(0, numMs);
  for (let i = 0; i < titles.length; i++) {
    const startD = new Date(proj.startDate);
    const endD = new Date(proj.endDate);
    const range = endD - startD;
    const dueDate = new Date(startD.getTime() + (range * (i + 1)) / (titles.length + 1));
    const dueDateStr = dueDate.toISOString().split('T')[0];
    const status = pick(milestoneStatuses);
    const completedDate = status === 'Completed' ? dueDateStr : null;
    insertMilestone.run(proj.id, titles[i], `${titles[i]} milestone for project delivery.`, dueDateStr, status, completedDate);
    milestoneCount++;
  }
}

// ============================================================
// SEED COMMENTS
// ============================================================
const commentTemplates = [
  'Looking good so far. On track for the deadline.',
  'Need to review resource allocation - some team members are stretched thin.',
  'Client provided positive feedback on the last demo.',
  'Blocked by dependency on infrastructure team. Escalating.',
  'Sprint velocity has improved by 20% this iteration.',
  'Risk mitigation plan has been updated and approved.',
  'Budget review completed - within 5% of planned.',
  'Stakeholder meeting scheduled for next week to review progress.',
];

const insertComment = db.prepare('INSERT INTO comments (entity_type, entity_id, user_id, content) VALUES (?, ?, ?, ?)');
let commentCount = 0;
for (const proj of allProjects) {
  const numComments = randInt(1, 3);
  for (let i = 0; i < numComments; i++) {
    const userId = randInt(1, 5);
    insertComment.run('project', proj.id, userId, pick(commentTemplates));
    commentCount++;
  }
}

// ============================================================
// SEED ALERT RULES
// ============================================================
const insertAlert = db.prepare('INSERT INTO alert_rules (name, rule_type, threshold_value, is_active, created_by) VALUES (?, ?, ?, ?, ?)');
insertAlert.run('Low Margin Warning', 'margin_below', 15, 1, 1);
insertAlert.run('Over-Allocation Alert', 'over_allocation', null, 1, 1);
insertAlert.run('Red Health Projects', 'health_red', null, 1, 1);
insertAlert.run('Overdue Milestones', 'milestone_overdue', null, 1, 1);
insertAlert.run('Critical Risks', 'risk_critical', null, 1, 1);

// ============================================================
// SEED HISTORICAL SNAPSHOTS (6 months backfill)
// ============================================================
const insertSnapshot = db.prepare('INSERT INTO snapshots (snapshot_date, snapshot_type, data_type, entity_id, metrics_json) VALUES (?, ?, ?, ?, ?)');
let snapshotCount = 0;
for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const snapDate = d.toISOString().split('T')[0];
  const variance = 1 + (6 - monthsAgo) * 0.03 + (rand() - 0.5) * 0.05;
  const metrics = {
    total_resource_cost: Math.round(350000 * variance),
    total_facility_cost: Math.round(45000 * variance),
    total_overhead_cost: Math.round(42000 * variance),
    total_cost: Math.round(437000 * variance),
    total_revenue: Math.round(600000 * variance),
    margin_percentage: 35 + (rand() - 0.5) * 8,
    project_count: 89,
    active_projects: 40 + randInt(-3, 3),
    resource_count: 30,
  };
  insertSnapshot.run(snapDate, 'monthly', 'portfolio_summary', null, JSON.stringify(metrics));
  snapshotCount++;
}

// ============================================================
// SEED BUDGET ENTRIES (for active projects, last 3 months)
// ============================================================
const insertBudget = db.prepare('INSERT INTO budget_entries (project_id, month, planned_resource_cost, planned_facility_cost, planned_overhead_cost, planned_revenue) VALUES (?, ?, ?, ?, ?, ?)');
let budgetCount = 0;
const activeProjects = allProjects.filter(p => p.projectStatus === 'Active');
for (const proj of activeProjects) {
  for (let mo = 2; mo >= 0; mo--) {
    const d = new Date();
    d.setMonth(d.getMonth() - mo);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const baseCost = randInt(8000, 35000);
    const variance = 0.9 + rand() * 0.2;
    insertBudget.run(proj.id, monthStr, Math.round(baseCost * variance), Math.round(baseCost * 0.15 * variance), Math.round(baseCost * 0.12 * variance), Math.round(baseCost * 1.6 * variance));
    budgetCount++;
  }
}


// ============================================================
// NEW INDUSTRY FEATURES: Templates, Dependencies, Requests, Automations, Scenarios, Dashboards
// ============================================================

// --- Project Templates ---
const insertTemplate = db.prepare('INSERT INTO project_templates (name, description, default_tasks, default_risks, default_milestones, default_facility_costs, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');

insertTemplate.run('Standard Software Project', 'Full lifecycle software development project template',
  JSON.stringify([
    { title: 'Requirements Gathering', status: 'To Do', estimated_hours: 40 },
    { title: 'Architecture Design', status: 'To Do', estimated_hours: 30 },
    { title: 'Development Sprint 1', status: 'To Do', estimated_hours: 80 },
    { title: 'Development Sprint 2', status: 'To Do', estimated_hours: 80 },
    { title: 'QA Testing', status: 'To Do', estimated_hours: 40 },
    { title: 'Deployment & Go-Live', status: 'To Do', estimated_hours: 20 },
  ]),
  JSON.stringify([
    { title: 'Technical complexity underestimated', category: 'Technical', likelihood: 'Medium', impact: 'High' },
    { title: 'Resource availability risk', category: 'Resource', likelihood: 'Medium', impact: 'Medium' },
    { title: 'Scope creep', category: 'Scope', likelihood: 'High', impact: 'Medium' },
  ]),
  JSON.stringify([
    { title: 'Requirements Sign-off', status: 'Pending' },
    { title: 'Architecture Review', status: 'Pending' },
    { title: 'Beta Release', status: 'Pending' },
    { title: 'Production Go-Live', status: 'Pending' },
  ]),
  JSON.stringify([
    { description: 'CI/CD Pipeline', monthly_cost: 150, cost_type: 'Fixed' },
    { description: 'Cloud Hosting', monthly_cost: 300, cost_type: 'Variable' },
  ]),
  1
);

insertTemplate.run('Compliance Initiative', 'Regulatory compliance and audit preparation',
  JSON.stringify([
    { title: 'Gap Analysis', status: 'To Do', estimated_hours: 60 },
    { title: 'Policy Documentation', status: 'To Do', estimated_hours: 40 },
    { title: 'Control Implementation', status: 'To Do', estimated_hours: 80 },
    { title: 'Internal Audit', status: 'To Do', estimated_hours: 30 },
    { title: 'Remediation', status: 'To Do', estimated_hours: 40 },
  ]),
  JSON.stringify([
    { title: 'Regulatory deadline missed', category: 'Schedule', likelihood: 'Low', impact: 'Critical' },
    { title: 'Documentation gaps', category: 'Scope', likelihood: 'Medium', impact: 'High' },
  ]),
  JSON.stringify([
    { title: 'Gap Analysis Complete', status: 'Pending' },
    { title: 'Policies Approved', status: 'Pending' },
    { title: 'Audit Passed', status: 'Pending' },
  ]),
  JSON.stringify([
    { description: 'Compliance Software License', monthly_cost: 500, cost_type: 'Fixed' },
  ]),
  1
);

insertTemplate.run('Quick POC', 'Rapid proof of concept for new ideas',
  JSON.stringify([
    { title: 'Define Success Criteria', status: 'To Do', estimated_hours: 8 },
    { title: 'Build Prototype', status: 'To Do', estimated_hours: 40 },
    { title: 'User Testing', status: 'To Do', estimated_hours: 16 },
    { title: 'Results Presentation', status: 'To Do', estimated_hours: 8 },
  ]),
  JSON.stringify([
    { title: 'POC scope too large', category: 'Scope', likelihood: 'High', impact: 'Medium' },
  ]),
  JSON.stringify([
    { title: 'Prototype Demo', status: 'Pending' },
    { title: 'Go/No-Go Decision', status: 'Pending' },
  ]),
  JSON.stringify([]),
  1
);

// --- Task Dependencies ---
const insertDep = db.prepare('INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)');
const projectTasks = db.prepare('SELECT id, project_id, title FROM tasks ORDER BY project_id, id').all();
const tasksByProject = {};
projectTasks.forEach(t => {
  if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = [];
  tasksByProject[t.project_id].push(t);
});
let depCount = 0;
Object.values(tasksByProject).forEach(tasks => {
  for (let i = 1; i < Math.min(tasks.length, 4); i++) {
    insertDep.run(tasks[i].id, tasks[i-1].id);
    depCount++;
  }
});

// --- Project Requests ---
const insertRequest = db.prepare('INSERT INTO project_requests (title, description, requested_by, business_justification, estimated_budget, estimated_timeline, priority, strategic_alignment, financial_impact, risk_level, resource_availability, total_score, status, reviewer_id, review_notes, theme_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const calcScore = (sa, fi, rl, ra) => (sa * 0.35 + fi * 0.25 + (6 - rl) * 0.20 + ra * 0.20) * 20;

insertRequest.run('AI-Powered Analytics Dashboard', 'Build ML-based insights for portfolio optimization', 3, 'Reduce manual reporting by 60%, improve decision-making speed', 150000, '6 months', 'High', 5, 4, 3, 3, calcScore(5,4,3,3), 'Approved', 2, 'Strong business case. Approved for Q2 start.', 1);
insertRequest.run('Mobile App for Field Teams', 'Native mobile application for remote workers', 3, 'Enable real-time updates from field, reduce data entry lag by 80%', 200000, '8 months', 'High', 4, 4, 2, 4, calcScore(4,4,2,4), 'Under Review', null, '', 2);
insertRequest.run('Legacy System Migration', 'Migrate from on-prem to cloud infrastructure', 3, 'Reduce infrastructure costs by 40%, improve scalability', 500000, '12 months', 'Critical', 5, 5, 4, 2, calcScore(5,5,4,2), 'Submitted', null, '', 3);
insertRequest.run('Customer Self-Service Portal', 'Client-facing portal for project status visibility', 3, 'Reduce support tickets by 50%, improve client satisfaction', 120000, '5 months', 'Medium', 4, 3, 2, 4, calcScore(4,3,2,4), 'Approved', 2, 'Good ROI. Align with Q3 roadmap.', 4);
insertRequest.run('Automated Testing Framework', 'Implement comprehensive test automation', 3, 'Reduce regression testing time from 2 weeks to 2 days', 80000, '4 months', 'Medium', 3, 3, 2, 5, calcScore(3,3,2,5), 'Draft', null, '', null);
insertRequest.run('Data Warehouse Modernization', 'Replace legacy data warehouse with modern stack', 3, 'Enable real-time analytics, reduce query times by 90%', 350000, '10 months', 'High', 4, 5, 3, 2, calcScore(4,5,3,2), 'Rejected', 2, 'Budget constraints for this fiscal year. Resubmit in Q4.', 5);
insertRequest.run('DevOps Pipeline Enhancement', 'Improve CI/CD and deployment automation', 3, 'Reduce deployment time from hours to minutes', 60000, '3 months', 'Low', 3, 2, 1, 5, calcScore(3,2,1,5), 'Submitted', null, '', null);
insertRequest.run('Security Compliance Overhaul', 'SOC2 Type II certification preparation', 3, 'Required for enterprise client contracts', 180000, '7 months', 'Critical', 5, 5, 3, 3, calcScore(5,5,3,3), 'Draft', null, '', null);

// --- Automation Rules ---
const insertAutoRule = db.prepare('INSERT INTO automation_rules (name, trigger_entity, trigger_field, trigger_value, action_type, action_config, is_active, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

insertAutoRule.run('Alert on Red Health', 'project', 'health_status', 'Red', 'notification', JSON.stringify({ message: 'Project health changed to Red - immediate attention required', severity: 'critical' }), 1, 1);
insertAutoRule.run('Notify on Critical Risk', 'risk', 'likelihood', 'Critical', 'notification', JSON.stringify({ message: 'Risk likelihood escalated to Critical', severity: 'warning' }), 1, 1);
insertAutoRule.run('Alert on Milestone Missed', 'milestone', 'status', 'Missed', 'notification', JSON.stringify({ message: 'Milestone has been marked as Missed', severity: 'warning' }), 1, 1);
insertAutoRule.run('Notify on Task Completion', 'task', 'status', 'Done', 'notification', JSON.stringify({ message: 'Task has been completed', severity: 'info' }), 1, 1);
insertAutoRule.run('Alert on Risk Escalation', 'risk', 'status', 'Escalated', 'notification', JSON.stringify({ message: 'Risk has been escalated - management review needed', severity: 'critical' }), 1, 1);

// --- Scenarios ---
const insertScenario = db.prepare('INSERT INTO scenarios (name, description, base_data, adjustments, results, created_by) VALUES (?, ?, ?, ?, ?, ?)');

insertScenario.run('Q2 Team Expansion', 'Model impact of hiring 3 new developers',
  JSON.stringify({ additions: [{ name: 'New Dev 1', role: 'Developer', rate: 85, hours: 160 }, { name: 'New Dev 2', role: 'Developer', rate: 85, hours: 160 }, { name: 'New Dev 3', role: 'Developer', rate: 90, hours: 160 }] }),
  '{}',
  JSON.stringify({ totalCurrent: 45000, totalAdjusted: 86600, costDelta: 41600, overAllocated: 0, avgUtilization: 68 }),
  1
);
insertScenario.run('Cost Reduction Plan', 'Model 20% resource reduction across projects',
  JSON.stringify({ additions: [] }),
  JSON.stringify(Object.fromEntries([1,2,3,4,5].map(id => [id, -20]))),
  JSON.stringify({ totalCurrent: 45000, totalAdjusted: 36000, costDelta: -9000, overAllocated: 0, avgUtilization: 55 }),
  1
);

// --- Custom Dashboards ---
const insertDashboard = db.prepare('INSERT INTO custom_dashboards (name, description, owner_id, is_shared, layout) VALUES (?, ?, ?, ?, ?)');

insertDashboard.run('PMO Overview', 'Key metrics for portfolio management office', 1, 1, JSON.stringify([
  { id: 'w1', type: 'health_gauge', config: {}, x: 0, y: 0, w: 4, h: 2 },
  { id: 'w2', type: 'kpi_card', config: { metric: 'total_revenue', label: 'Monthly Revenue' }, x: 4, y: 0, w: 4, h: 1 },
  { id: 'w3', type: 'kpi_card', config: { metric: 'margin_percentage', label: 'Portfolio Margin' }, x: 8, y: 0, w: 4, h: 1 },
  { id: 'w4', type: 'risk_summary', config: {}, x: 4, y: 1, w: 4, h: 1 },
  { id: 'w5', type: 'milestone_timeline', config: {}, x: 8, y: 1, w: 4, h: 1 },
  { id: 'w6', type: 'project_table', config: { health_status: 'Red' }, x: 0, y: 2, w: 12, h: 2 },
]));

insertDashboard.run('Financial Overview', 'Revenue, cost, and margin analysis', 1, 1, JSON.stringify([
  { id: 'w1', type: 'kpi_card', config: { metric: 'total_revenue', label: 'Total Revenue' }, x: 0, y: 0, w: 3, h: 1 },
  { id: 'w2', type: 'kpi_card', config: { metric: 'total_cost', label: 'Total Cost' }, x: 3, y: 0, w: 3, h: 1 },
  { id: 'w3', type: 'kpi_card', config: { metric: 'margin_percentage', label: 'Margin %' }, x: 6, y: 0, w: 3, h: 1 },
  { id: 'w4', type: 'kpi_card', config: { metric: 'project_count', label: 'Active Projects' }, x: 9, y: 0, w: 3, h: 1 },
  { id: 'w5', type: 'bar_chart', config: { data_source: 'cost_breakdown', limit: 10 }, x: 0, y: 1, w: 6, h: 2 },
  { id: 'w6', type: 'pie_chart', config: { data_source: 'health_summary' }, x: 6, y: 1, w: 6, h: 2 },
]));


// ============================================================
// SUMMARY
// ============================================================
const avgUtil = resources.map(r => 100 - capacity[r.id]);
const totalUtil = avgUtil.reduce((a, b) => a + b, 0);

console.log('Database seeded successfully!');
console.log(`  - ${themeCount} Clients`);
console.log(`  - ${projectCount} Projects`);
console.log(`  - ${resources.length} Resources`);
console.log(`  - ${allocCount} Resource Allocations`);
console.log(`  - ${taskCount} Tasks`);
console.log(`  - ${facilityCount} Facility Cost Items`);
console.log(`  - 5 Users`);
console.log(`  - ${tagDefs.length} Tags`);
console.log(`  - ${riskCount} Risks`);
console.log(`  - ${milestoneCount} Milestones`);
console.log(`  - ${commentCount} Comments`);
console.log(`  - 5 Alert Rules`);
console.log(`  - ${snapshotCount} Snapshots`);
console.log(`  - ${budgetCount} Budget Entries`);
console.log(`  - 3 Project Templates`);
console.log(`  - ${depCount} Task Dependencies`);
console.log(`  - 8 Project Requests`);
console.log(`  - 5 Automation Rules`);
console.log(`  - 2 Scenarios`);
console.log(`  - 2 Custom Dashboards`);
console.log(`  - Avg resource utilization: ${(totalUtil / resources.length).toFixed(1)}%`);

