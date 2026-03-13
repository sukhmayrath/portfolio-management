import express from 'express';
import cors from 'cors';
import { mkdirSync } from 'fs';
import { authenticate, requireRole } from './middleware/auth.js';
import themesRouter from './routes/themes.js';
import projectsRouter from './routes/projects.js';
import resourcesRouter from './routes/resources.js';
import allocationsRouter from './routes/allocations.js';
import tasksRouter from './routes/tasks.js';
import facilityCostsRouter from './routes/facilityCosts.js';
import dashboardRouter from './routes/dashboard.js';
import authRouter from './routes/auth.js';
import auditRouter from './routes/audit.js';
import tagsRouter from './routes/tags.js';
import risksRouter from './routes/risks.js';
import milestonesRouter from './routes/milestones.js';
import bulkRouter from './routes/bulk.js';
import commentsRouter from './routes/comments.js';
import notificationsRouter from './routes/notifications.js';
import searchRouter from './routes/search.js';
import exportRouter from './routes/export.js';
import snapshotsRouter from './routes/snapshots.js';
import budgetRouter from './routes/budget.js';
import timelineRouter from './routes/timeline.js';
import templatesRouter from './routes/templates.js';
import requestsRouter from './routes/requests.js';
import automationsRouter from './routes/automations.js';
import attachmentsRouter from './routes/attachments.js';
import scenariosRouter from './routes/scenarios.js';
import customDashboardsRouter from './routes/customDashboards.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = 3001;

app.use(cors());

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

app.use(express.json({ limit: '50mb' }));
app.use(authenticate);

// Core data routes
app.use('/api/themes', themesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/allocations', allocationsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/facility-costs', requireRole('Admin', 'PMO', 'Executive'), facilityCostsRouter);
app.use('/api/dashboard', dashboardRouter);

// Auth & system routes
app.use('/api/auth', authRouter);
app.use('/api/audit', auditRouter);
app.use('/api/tags', tagsRouter);

// PMO routes
app.use('/api/risks', risksRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/bulk', bulkRouter);

// Templates & demand routes
app.use('/api/templates', templatesRouter);
app.use('/api/requests', requestsRouter);

// Collaboration routes
app.use('/api/comments', commentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/search', searchRouter);

// Automation & attachment routes
app.use('/api/automations', automationsRouter);
app.use('/api/attachments', attachmentsRouter);

// Financial & reporting routes (Admin, PMO, Executive only)
app.use('/api/export', requireRole('Admin', 'PMO', 'Executive'), exportRouter);
app.use('/api/snapshots', requireRole('Admin', 'PMO', 'Executive'), snapshotsRouter);
app.use('/api/budget', requireRole('Admin', 'PMO', 'Executive'), budgetRouter);
app.use('/api/timeline', timelineRouter);

// Planning & customization routes
app.use('/api/scenarios', scenariosRouter);
app.use('/api/custom-dashboards', customDashboardsRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
