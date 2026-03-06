import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/formatters';
import { THEME_STATUSES, PROJECT_STATUSES } from '../utils/constants';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function ThemeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: theme, loading, refetch } = useApi(`/themes/${id}`);
  const { mutate } = useMutation();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'Planning', client_billing_rate_per_hour: '', fixed_facility_cost_monthly: '', overhead_percentage: '', start_date: '', end_date: '' });

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!theme) return <div className="p-8 text-center text-slate-500">Client not found</div>;

  const totalCompanyCost = theme.projects?.reduce((s, p) => s + (p.total_company_cost_monthly || 0), 0) || 0;

  const handleEdit = () => {
    setEditForm({ name: theme.name, description: theme.description, status: theme.status, total_budget: theme.total_budget });
    setShowEdit(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await mutate('put', `/themes/${id}`, editForm);
    setShowEdit(false);
    refetch();
  };

  const handleDelete = async () => {
    await mutate('delete', `/themes/${id}`);
    navigate('/themes');
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    await mutate('post', '/projects', {
      theme_id: Number(id),
      ...projectForm,
      client_billing_rate_per_hour: Number(projectForm.client_billing_rate_per_hour) || 0,
      fixed_facility_cost_monthly: Number(projectForm.fixed_facility_cost_monthly) || 0,
      overhead_percentage: Number(projectForm.overhead_percentage) || 0,
    });
    setShowAddProject(false);
    setProjectForm({ name: '', description: '', status: 'Planning', client_billing_rate_per_hour: '', fixed_facility_cost_monthly: '', overhead_percentage: '', start_date: '', end_date: '' });
    refetch();
  };

  return (
    <div>
      <PageHeader title={theme.name} subtitle="Client">
        <button onClick={handleEdit} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"><Edit2 size={16} /> Edit</button>
        <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-danger bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /> Delete</button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Status</p>
          <div className="mt-1"><StatusBadge status={theme.status} /></div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Budget</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(theme.total_budget)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Projects</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{theme.projects?.length || 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Company Cost/mo</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(totalCompanyCost)}</p>
        </div>
      </div>

      {theme.description && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <p className="text-sm text-slate-600">{theme.description}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
        <button onClick={() => setShowAddProject(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">
          <Plus size={16} /> Add Project
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Project</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Resource Cost</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Facility Cost</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Overhead</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Total Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(theme.projects || []).map(p => (
              <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.resource_cost_monthly)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.total_facility_monthly)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(p.overhead_cost_monthly)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.total_company_cost_monthly)}</td>
              </tr>
            ))}
            {(!theme.projects || theme.projects.length === 0) && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No projects yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Client">
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {THEME_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Budget ($)</label>
                <input type="number" value={editForm.total_budget} onChange={e => setEditForm({ ...editForm, total_budget: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showAddProject} onClose={() => setShowAddProject(false)} title="Add Project" wide>
        <form onSubmit={handleAddProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
            <input value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={projectForm.start_date} onChange={e => setProjectForm({ ...projectForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" value={projectForm.end_date} onChange={e => setProjectForm({ ...projectForm, end_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Billing Rate ($/hr)</label>
              <input type="number" value={projectForm.client_billing_rate_per_hour} onChange={e => setProjectForm({ ...projectForm, client_billing_rate_per_hour: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fixed Facility Cost ($/mo)</label>
              <input type="number" value={projectForm.fixed_facility_cost_monthly} onChange={e => setProjectForm({ ...projectForm, fixed_facility_cost_monthly: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overhead (%)</label>
              <input type="number" value={projectForm.overhead_percentage} onChange={e => setProjectForm({ ...projectForm, overhead_percentage: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddProject(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Add Project</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Client" message={`Delete "${theme.name}" and all its projects? This cannot be undone.`} />
    </div>
  );
}
