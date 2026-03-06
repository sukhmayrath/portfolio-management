import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import RAGIndicator from '../components/RAGIndicator';
import PriorityBadge from '../components/PriorityBadge';
import KanbanBoard from '../components/KanbanBoard';
import ExportButton from '../components/ExportButton';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { PROJECT_STATUSES, HEALTH_STATUSES } from '../utils/constants';
import { Plus, Filter } from 'lucide-react';

export default function ProjectsList() {
  const [searchParams] = useSearchParams();
  const themeFilter = searchParams.get('theme_id') || '';
  const { data: projects, loading, refetch } = useApi(`/projects${themeFilter ? `?theme_id=${themeFilter}` : ''}`);
  const { data: themes } = useApi('/themes');
  const { mutate } = useMutation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [healthFilter, setHealthFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [form, setForm] = useState({ theme_id: '', name: '', description: '', status: 'Planning', client_billing_rate_per_hour: '', fixed_facility_cost_monthly: '', overhead_percentage: '' });

  const columns = [
    { key: 'name', label: 'Project', render: (v) => <span className="font-medium text-slate-900">{v}</span> },
    { key: 'theme_name', label: 'Client' },
    { key: 'priority_score', label: 'Priority', align: 'center', render: (v, row) => (
      <PriorityBadge
        score={v}
        editable
        onChange={async (newScore) => {
          await mutate('put', `/projects/${row.id}`, { priority_score: newScore });
          refetch();
        }}
      />
    ) },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'health_status', label: 'Health', align: 'center', render: (v) => <RAGIndicator status={v || 'Green'} /> },
    { key: 'resource_cost_monthly', label: 'Resource Cost', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'total_company_cost_monthly', label: 'Total Cost', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'client_revenue_monthly', label: 'Revenue', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'margin_percentage', label: 'Margin', align: 'right', render: (v, row) => <span className={row.margin_monthly >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPercentage(v)}</span> },
  ];

  const filteredProjects = (projects || []).filter(p => !healthFilter || (p.health_status || 'Green') === healthFilter);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await mutate('post', '/projects', {
      ...form,
      theme_id: Number(form.theme_id),
      client_billing_rate_per_hour: Number(form.client_billing_rate_per_hour) || 0,
      fixed_facility_cost_monthly: Number(form.fixed_facility_cost_monthly) || 0,
      overhead_percentage: Number(form.overhead_percentage) || 0,
    });
    setShowModal(false);
    setForm({ theme_id: '', name: '', description: '', status: 'Planning', client_billing_rate_per_hour: '', fixed_facility_cost_monthly: '', overhead_percentage: '' });
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading projects...</div>;

  return (
    <div>
      <PageHeader title="Projects" subtitle="All projects across clients">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Table</button>
          <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Board</button>
        </div>
        <div className="flex items-center gap-2">
          <select value={healthFilter} onChange={e => setHealthFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">All Health</option>
            {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <ExportButton endpoint="/export/projects" filename="projects.csv" />
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">
          <Plus size={16} /> Create Project
        </button>
      </PageHeader>

      {viewMode === 'table' && (
        <DataTable columns={columns} data={filteredProjects} onRowClick={(row) => navigate(`/projects/${row.id}`)} />
      )}

      {viewMode === 'kanban' && (
        <KanbanBoard
          columns={[
            { id: 'Planning', title: 'Planning', color: '#3b82f6' },
            { id: 'Active', title: 'Active', color: '#16a34a' },
            { id: 'Completed', title: 'Completed', color: '#6b7280' },
            { id: 'On Hold', title: 'On Hold', color: '#f59e0b' },
          ]}
          items={(filteredProjects || []).map(p => ({ ...p, id: p.id }))}
          onStatusChange={async (projectId, newStatus) => {
            await mutate('put', `/projects/${projectId}`, { status: newStatus });
            refetch();
          }}
          renderCard={(project) => (
            <div onClick={() => navigate(`/projects/${project.id}`)} className="cursor-pointer">
              <div className="flex items-center gap-2 mb-1">
                {project.health_status && <RAGIndicator status={project.health_status} size="sm" />}
                <p className="font-medium text-sm text-slate-800 truncate">{project.name}</p>
              </div>
              <p className="text-xs text-slate-500 truncate">{project.theme_name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">{formatCurrency(project.margin_monthly)}/mo</span>
                <span className={`text-xs font-medium ${(project.margin_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(project.margin_percentage || 0).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        />
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Project" wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
              <select value={form.theme_id} onChange={e => setForm({ ...form, theme_id: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Select client...</option>
                {(themes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Rate ($/hr)</label>
              <input type="number" value={form.client_billing_rate_per_hour} onChange={e => setForm({ ...form, client_billing_rate_per_hour: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Facility Cost ($/mo)</label>
              <input type="number" value={form.fixed_facility_cost_monthly} onChange={e => setForm({ ...form, fixed_facility_cost_monthly: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overhead (%)</label>
              <input type="number" value={form.overhead_percentage} onChange={e => setForm({ ...form, overhead_percentage: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Create Project</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
