import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { formatDate } from '../utils/formatters';
import { Plus, Check, X } from 'lucide-react';

export default function DashboardsList() {
  const { data: dashboards, loading, refetch } = useApi('/custom-dashboards');
  const { mutate } = useMutation();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', is_shared: false });

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
      key: 'layout',
      label: 'Widgets',
      align: 'center',
      render: (v) => <span className="text-slate-600">{parseSafe(v).length}</span>,
    },
    {
      key: 'is_shared',
      label: 'Shared',
      align: 'center',
      render: (v) =>
        v ? (
          <Check size={16} className="text-emerald-500 inline-block" />
        ) : (
          <X size={16} className="text-slate-300 inline-block" />
        ),
    },
    {
      key: 'owner_name',
      label: 'Owner',
      render: (v) => v || '-',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (v) => formatDate(v),
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    await mutate('post', '/custom-dashboards', {
      name: form.name,
      description: form.description,
      is_shared: form.is_shared,
      layout: [],
    });
    setShowModal(false);
    setForm({ name: '', description: '', is_shared: false });
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboards...</div>;

  return (
    <div>
      <PageHeader title="Custom Dashboards" subtitle="Build personalized dashboard views">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
        >
          <Plus size={16} /> Create Dashboard
        </button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={dashboards || []}
        onRowClick={(row) => navigate(`/dashboards/${row.id}`)}
        emptyMessage="No custom dashboards yet. Create one to get started."
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Dashboard">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dashboard Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Executive Overview"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="What is this dashboard for?"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_shared}
                onChange={(e) => setForm({ ...form, is_shared: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-checked:bg-primary rounded-full peer-focus:ring-2 peer-focus:ring-primary/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
            <span className="text-sm text-slate-700">Share with team</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Create Dashboard</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
