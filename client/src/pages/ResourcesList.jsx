import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { Plus } from 'lucide-react';

export default function ResourcesList() {
  const { data: resources, loading, refetch } = useApi('/resources');
  const { mutate } = useMutation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', department: '', hourly_rate: '', available_hours_per_month: '160' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await mutate('post', '/resources', { ...form, hourly_rate: Number(form.hourly_rate) || 0, available_hours_per_month: Number(form.available_hours_per_month) || 160 });
    setShowModal(false);
    setForm({ name: '', role: '', department: '', hourly_rate: '', available_hours_per_month: '160' });
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading resources...</div>;

  return (
    <div>
      <PageHeader title="Resource Pool" subtitle="Manage your team members and their availability">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">
          <Plus size={16} /> Add Resource
        </button>
      </PageHeader>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Hrs/mo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600" style={{ minWidth: 200 }}>Utilization</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Allocated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(resources || []).map(r => {
              const pct = r.total_allocation_percentage || 0;
              const barColor = pct >= 100 ? 'bg-green-500' : pct > 80 ? 'bg-blue-600' : pct > 50 ? 'bg-blue-400' : 'bg-blue-300';
              return (
                <tr key={r.id} onClick={() => navigate(`/resources/${r.id}`)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.role}</td>
                  <td className="px-4 py-3 text-slate-600">{r.department}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(r.hourly_rate)}/hr</td>
                  <td className="px-4 py-3 text-right">{r.available_hours_per_month}</td>
                  <td className="px-4 py-3">
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${pct >= 100 ? 'text-green-600' : pct > 80 ? 'text-blue-600' : 'text-slate-600'}`}>
                    {formatPercentage(pct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Resource">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Department</label><input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate ($)</label><input type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Available Hours/mo</label><input type="number" value={form.available_hours_per_month} onChange={e => setForm({ ...form, available_hours_per_month: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Add Resource</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
