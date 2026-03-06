import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency } from '../utils/formatters';
import { THEME_STATUSES } from '../utils/constants';
import { Plus } from 'lucide-react';

export default function ThemesList() {
  const { data: themes, loading, refetch } = useApi('/themes');
  const { mutate } = useMutation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', status: 'Planning', total_budget: '' });

  const columns = [
    { key: 'name', label: 'Client Name', render: (v) => <span className="font-medium text-slate-900">{v}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'project_count', label: 'Projects', align: 'right' },
    { key: 'total_budget', label: 'Budget', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'total_resource_cost', label: 'Resource Cost/mo', align: 'right', render: (v) => formatCurrency(v) },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    await mutate('post', '/themes', { ...form, total_budget: Number(form.total_budget) || 0 });
    setShowModal(false);
    setForm({ name: '', description: '', status: 'Planning', total_budget: '' });
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading clients...</div>;

  return (
    <div>
      <PageHeader title="Clients" subtitle="Track strategic investment initiatives">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">
          <Plus size={16} /> Create Client
        </button>
      </PageHeader>

      <DataTable columns={columns} data={themes} onRowClick={(row) => navigate(`/themes/${row.id}`)} emptyMessage="No clients yet. Create one to get started." />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Client">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                {THEME_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total Budget ($)</label>
              <input type="number" value={form.total_budget} onChange={e => setForm({ ...form, total_budget: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Create Client</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
