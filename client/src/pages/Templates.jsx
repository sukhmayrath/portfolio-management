import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import { formatDate, formatCurrency } from '../utils/formatters';
import { Plus, Trash2, Eye, Rocket, Info } from 'lucide-react';

export default function Templates() {
  const { data: templates, loading, refetch } = useApi('/templates');
  const { data: themes } = useApi('/themes');
  const { mutate } = useMutation();
  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [applyForm, setApplyForm] = useState({
    theme_id: '',
    name: '',
    description: '',
    status: 'Planning',
    start_date: '',
    end_date: '',
    client_billing_rate_per_hour: '',
    fixed_facility_cost_monthly: '',
    overhead_percentage: '',
  });

  const parseSafe = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-slate-900">{v}</span> },
    {
      key: 'description',
      label: 'Description',
      render: (v) => (
        <span className="text-slate-500">
          {v && v.length > 50 ? v.substring(0, 50) + '...' : v || '-'}
        </span>
      ),
    },
    {
      key: 'default_tasks',
      label: 'Tasks',
      align: 'center',
      render: (v) => <span className="text-slate-600">{parseSafe(v).length}</span>,
    },
    {
      key: 'default_risks',
      label: 'Risks',
      align: 'center',
      render: (v) => <span className="text-slate-600">{parseSafe(v).length}</span>,
    },
    {
      key: 'default_milestones',
      label: 'Milestones',
      align: 'center',
      render: (v) => <span className="text-slate-600">{parseSafe(v).length}</span>,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (v) => formatDate(v),
    },
    {
      key: 'id',
      label: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleViewDetail(row); }}
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
            title="View details"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row); }}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
            title="Delete template"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const handleViewDetail = (template) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    await mutate('post', '/templates', {
      name: createForm.name,
      description: createForm.description,
      default_tasks: [],
      default_risks: [],
      default_milestones: [],
      default_facility_costs: [],
    });
    setShowCreateModal(false);
    setCreateForm({ name: '', description: '' });
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await mutate('delete', `/templates/${deleteConfirm.id}`);
    setDeleteConfirm(null);
    refetch();
  };

  const handleOpenApply = () => {
    setApplyForm({
      theme_id: '',
      name: selectedTemplate?.name || '',
      description: selectedTemplate?.description || '',
      status: 'Planning',
      start_date: '',
      end_date: '',
      client_billing_rate_per_hour: '',
      fixed_facility_cost_monthly: '',
      overhead_percentage: '',
    });
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    const result = await mutate('post', `/templates/${selectedTemplate.id}/apply`, {
      ...applyForm,
      theme_id: Number(applyForm.theme_id),
      client_billing_rate_per_hour: Number(applyForm.client_billing_rate_per_hour) || 0,
      fixed_facility_cost_monthly: Number(applyForm.fixed_facility_cost_monthly) || 0,
      overhead_percentage: Number(applyForm.overhead_percentage) || 0,
    });
    setShowApplyModal(false);
    setShowDetailModal(false);
    if (result?.project?.id) {
      navigate(`/projects/${result.project.id}`);
    } else {
      refetch();
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading templates...</div>;

  const tasks = selectedTemplate ? parseSafe(selectedTemplate.default_tasks) : [];
  const risks = selectedTemplate ? parseSafe(selectedTemplate.default_risks) : [];
  const milestones = selectedTemplate ? parseSafe(selectedTemplate.default_milestones) : [];
  const facilityCosts = selectedTemplate ? parseSafe(selectedTemplate.default_facility_costs) : [];

  return (
    <div>
      <PageHeader title="Project Templates" subtitle="Reusable project blueprints">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
        >
          <Plus size={16} /> Create Template
        </button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={templates || []}
        onRowClick={handleViewDetail}
        emptyMessage="No templates yet. Create one to get started."
      />

      {/* Create Template Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Template">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Standard Web Project"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Describe what this template is for..."
            />
          </div>
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              After creating, open a project and use "Save as Template" to populate with real project data.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Create Template</button>
          </div>
        </form>
      </Modal>

      {/* Template Detail Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedTemplate?.name || 'Template Details'} wide>
        {selectedTemplate && (
          <div className="space-y-5">
            {selectedTemplate.description && (
              <p className="text-sm text-slate-600">{selectedTemplate.description}</p>
            )}

            {/* Default Tasks */}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Default Tasks ({tasks.length})</h4>
              {tasks.length > 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tasks.map((t, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">{t.title || t.name || '-'}</td>
                          <td className="px-3 py-2"><StatusBadge status={t.status || 'To Do'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No default tasks</p>
              )}
            </div>

            {/* Default Risks */}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Default Risks ({risks.length})</h4>
              {risks.length > 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {risks.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">{r.title || r.name || '-'}</td>
                          <td className="px-3 py-2 text-slate-500">{r.category || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No default risks</p>
              )}
            </div>

            {/* Default Milestones */}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Default Milestones ({milestones.length})</h4>
              {milestones.length > 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Title</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {milestones.map((m, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">{m.title || m.name || '-'}</td>
                          <td className="px-3 py-2"><StatusBadge status={m.status || 'Pending'} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No default milestones</p>
              )}
            </div>

            {/* Default Facility Costs */}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Default Facility Costs ({facilityCosts.length})</h4>
              {facilityCosts.length > 0 ? (
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Description</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facilityCosts.map((fc, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-slate-700">{fc.description || '-'}</td>
                          <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(fc.cost || fc.amount || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No default facility costs</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleOpenApply}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"
              >
                <Rocket size={16} /> Apply Template
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply Template Modal */}
      <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)} title="Apply Template - Create Project" wide>
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
              <select
                value={applyForm.theme_id}
                onChange={(e) => setApplyForm({ ...applyForm, theme_id: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select client...</option>
                {(themes || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={applyForm.status}
                onChange={(e) => setApplyForm({ ...applyForm, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
            <input
              value={applyForm.name}
              onChange={(e) => setApplyForm({ ...applyForm, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={applyForm.description}
              onChange={(e) => setApplyForm({ ...applyForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={applyForm.start_date}
                onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={applyForm.end_date}
                onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Rate ($/hr)</label>
              <input
                type="number"
                value={applyForm.client_billing_rate_per_hour}
                onChange={(e) => setApplyForm({ ...applyForm, client_billing_rate_per_hour: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Facility Cost ($/mo)</label>
              <input
                type="number"
                value={applyForm.fixed_facility_cost_monthly}
                onChange={(e) => setApplyForm({ ...applyForm, fixed_facility_cost_monthly: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overhead (%)</label>
              <input
                type="number"
                value={applyForm.overhead_percentage}
                onChange={(e) => setApplyForm({ ...applyForm, overhead_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowApplyModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Create Project from Template</button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
