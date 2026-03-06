import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import AllocationBar from '../components/AllocationBar';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { Edit2, Trash2 } from 'lucide-react';

export default function ResourceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: resource, loading, refetch } = useApi(`/resources/${id}`);
  const { mutate } = useMutation();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editForm, setEditForm] = useState(null);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!resource) return <div className="p-8 text-center text-slate-500">Resource not found</div>;

  const handleEdit = () => {
    setEditForm({ name: resource.name, role: resource.role, department: resource.department, hourly_rate: resource.hourly_rate, available_hours_per_month: resource.available_hours_per_month });
    setShowEdit(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await mutate('put', `/resources/${id}`, editForm);
    setShowEdit(false);
    refetch();
  };

  const handleDelete = async () => { await mutate('delete', `/resources/${id}`); navigate('/resources'); };

  const totalMonthlyCost = (resource.allocations || []).reduce((s, a) => s + (a.monthly_cost || 0), 0);

  return (
    <div>
      <PageHeader title={resource.name} subtitle={`${resource.role} \u00B7 ${resource.department}`}>
        <button onClick={handleEdit} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"><Edit2 size={16} /> Edit</button>
        <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-danger bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Hourly Rate</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(resource.hourly_rate)}/hr</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Available Hours</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{resource.available_hours_per_month} hrs/mo</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Total Allocated</p>
          <p className={`text-lg font-bold mt-1 ${resource.total_allocation_percentage >= 100 ? 'text-green-600' : 'text-slate-900'}`}>{formatPercentage(resource.total_allocation_percentage)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Monthly Cost</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(totalMonthlyCost)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Allocation Overview</h3>
        <AllocationBar allocations={resource.allocations || []} />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-3">Project Allocations</h3>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Project</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-600">Client</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Allocation</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Hours/mo</th>
            <th className="px-4 py-3 text-right font-semibold text-slate-600">Cost/mo</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(resource.allocations || []).map(a => (
              <tr key={a.id} onClick={() => navigate(`/projects/${a.project_id}`)} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{a.project_name}</td>
                <td className="px-4 py-3 text-slate-600">{a.theme_name}</td>
                <td className="px-4 py-3 text-right">{formatPercentage(a.allocation_percentage)}</td>
                <td className="px-4 py-3 text-right">{a.allocated_hours_per_month}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.monthly_cost)}</td>
              </tr>
            ))}
            {(!resource.allocations || resource.allocations.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No allocations</td></tr>
            )}
            {resource.allocations?.length > 0 && (
              <tr className="bg-slate-50 font-semibold">
                <td className="px-4 py-3 text-slate-900" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right">{formatPercentage(resource.total_allocation_percentage)}</td>
                <td className="px-4 py-3 text-right">{resource.allocations.reduce((s, a) => s + a.allocated_hours_per_month, 0)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(totalMonthlyCost)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Resource">
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Role</label><input value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Department</label><input value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate ($)</label><input type="number" value={editForm.hourly_rate} onChange={e => setEditForm({ ...editForm, hourly_rate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Available Hrs/mo</label><input type="number" value={editForm.available_hours_per_month} onChange={e => setEditForm({ ...editForm, available_hours_per_month: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Resource" message={`Delete "${resource.name}"? All allocations will be removed.`} />
    </div>
  );
}
