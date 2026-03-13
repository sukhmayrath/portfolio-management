import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ThemesList from './pages/ThemesList';
import ThemeDetail from './pages/ThemeDetail';
import ProjectsList from './pages/ProjectsList';
import ProjectDetail from './pages/ProjectDetail';
import ResourcesList from './pages/ResourcesList';
import ResourceDetail from './pages/ResourceDetail';
import ResourceAllocation from './pages/ResourceAllocation';
import ResourceUtilization from './pages/ResourceUtilization';
import CostDashboard from './pages/CostDashboard';
import Login from './pages/Login';
import AuditLog from './pages/AuditLog';
import Timeline from './pages/Timeline';
import Roadmap from './pages/Roadmap';
import AlertRules from './pages/AlertRules';
import BudgetTracking from './pages/BudgetTracking';
import ExecutiveSummary from './pages/ExecutiveSummary';
import Templates from './pages/Templates';
import DemandPipeline from './pages/DemandPipeline';
import Automations from './pages/Automations';
import DashboardsList from './pages/DashboardsList';
import CustomDashboard from './pages/CustomDashboard';
import UserManagement from './pages/UserManagement';

const ROLE_ACCESS = {
  Financial: ['Admin', 'PMO', 'Executive'],
  Admin: ['Admin'],
};

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RoleProtectedRoute({ children, allowedRoles }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();
  if (!allowedRoles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="themes" element={<ThemesList />} />
          <Route path="themes/:id" element={<ThemeDetail />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="resources" element={<ResourcesList />} />
          <Route path="resources/:id" element={<ResourceDetail />} />
          <Route path="allocation" element={<ResourceAllocation />} />
          <Route path="utilization" element={<ResourceUtilization />} />
          <Route path="costs" element={<RoleProtectedRoute allowedRoles={ROLE_ACCESS.Financial}><CostDashboard /></RoleProtectedRoute>} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="alerts" element={<AlertRules />} />
          <Route path="budget" element={<RoleProtectedRoute allowedRoles={ROLE_ACCESS.Financial}><BudgetTracking /></RoleProtectedRoute>} />
          <Route path="executive-summary" element={<RoleProtectedRoute allowedRoles={ROLE_ACCESS.Financial}><ExecutiveSummary /></RoleProtectedRoute>} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="templates" element={<Templates />} />
          <Route path="demand" element={<DemandPipeline />} />
          <Route path="automations" element={<Automations />} />
          <Route path="dashboards" element={<DashboardsList />} />
          <Route path="dashboards/:id" element={<CustomDashboard />} />
          <Route path="users" element={<RoleProtectedRoute allowedRoles={ROLE_ACCESS.Admin}><UserManagement /></RoleProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
