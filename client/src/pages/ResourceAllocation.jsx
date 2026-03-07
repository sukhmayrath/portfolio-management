import { useState, useMemo } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { Plus, Trash2, Pencil, User, Briefcase, Clock, RotateCcw } from 'lucide-react';

export default function ResourceAllocation() {
  const { data: allocations, refetch: refetchAllocs } = useApi('/allocations');
  const { data: resources, refetch: refetchResources } = useApi('/resources');
  const { data: projects } = useApi('/projects');
  const { mutate, error: mutateError } = useMutation();
  const [form, setForm] = useState({ resource_id: '', project_id: '', allocation_percentage: '', allocated_hours_per_month: '' });
  const [error, setError] = useState('');

  // Edit modal state
  const [editAlloc, setEditAlloc] = useState(null);
  const [editForm, setEditForm] = useState({ allocation_percentage: '', allocated_hours_per_month: '' });
  const [editError, setEditError] = useState('');

  const selectedResource = resources?.find(r => r.id === Number(form.resource_id));
  const currentAllocation = selectedResource?.total_allocation_percentage || 0;
  const remaining = 100 - currentAllocation;

  // Split projects into allocated vs available when a resource is selected
  const { allocatedProjects, availableProjects } = useMemo(() => {
    if (!projects || !allocations || !form.resource_id) return { allocatedProjects: [], availableProjects: projects || [] };
    const resourceAllocProjectIds = new Set(
      allocations.filter(a => a.resource_id === Number(form.resource_id)).map(a => a.project_id)
    );
    return {
      allocatedProjects: projects.filter(p => resourceAllocProjectIds.has(p.id)),
      availableProjects: projects.filter(p => !resourceAllocProjectIds.has(p.id)),
    };
  }, [projects, allocations, form.resource_id]);

  // Filter allocations by selected resource and/or project
  const displayedAllocations = useMemo(() => {
    if (!allocations) return [];
    let filtered = allocations;
    if (form.resource_id) filtered = filtered.filter(a => a.resource_id === Number(form.resource_id));
    if (form.project_id) filtered = filtered.filter(a => a.project_id === Number(form.project_id));
    return filtered;
  }, [allocations, form.resource_id, form.project_id]);

  const handlePercentageChange = (pct) => {
    const numPct = Number(pct) || 0;
    const hours = selectedResource ? Math.round((numPct / 100) * selectedResource.available_hours_per_month) : 0;
    setForm({ ...form, allocation_percentage: pct, allocated_hours_per_month: String(hours) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await mutate('post', '/allocations', {
        resource_id: Number(form.resource_id),
        project_id: Number(form.project_id),
        allocation_percentage: Number(form.allocation_percentage),
        allocated_hours_per_month: Number(form.allocated_hours_per_month),
      });
      setForm({ ...form, project_id: '', allocation_percentage: '', allocated_hours_per_month: '' });
      refetchAllocs();
      refetchResources();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    await mutate('delete', `/allocations/${id}`);
    refetchAllocs();
    refetchResources();
  };

  // Edit handlers
  const openEdit = (alloc) => {
    setEditAlloc(alloc);
    setEditForm({
      allocation_percentage: String(alloc.allocation_percentage),
      allocated_hours_per_month: String(alloc.allocated_hours_per_month),
    });
    setEditError('');
  };

  const handleEditPercentageChange = (pct) => {
    const numPct = Number(pct) || 0;
    const editResource = resources?.find(r => r.id === editAlloc?.resource_id);
    const hours = editResource ? Math.round((numPct / 100) * editResource.available_hours_per_month) : 0;
    setEditForm({ allocation_percentage: pct, allocated_hours_per_month: String(hours) });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setEditError('');
    try {
      await mutate('put', `/allocations/${editAlloc.id}`, {
        allocation_percentage: Number(editForm.allocation_percentage),
        allocated_hours_per_month: Number(editForm.allocated_hours_per_month),
      });
      setEditAlloc(null);
      refetchAllocs();
      refetchResources();
    } catch (err) {
      setEditError(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Resource Allocation" subtitle="Assign resources to projects with partial allocation" />

      {/* New Allocation Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">New Allocation</h3>
        {(error || mutateError) && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error || mutateError}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Resource</label>
            <select value={form.resource_id} onChange={e => { setForm({ ...form, resource_id: e.target.value, project_id: '', allocation_percentage: '', allocated_hours_per_month: '' }); }} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">Select resource...</option>
              {(resources || []).map(r => <option key={r.id} value={r.id}>{r.name} ({formatPercentage(r.total_allocation_percentage)} used)</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
            <select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">{form.resource_id ? 'All projects...' : 'Select project...'}</option>
              {form.resource_id ? (
                <>
                  {allocatedProjects.length > 0 && (
                    <optgroup label="Current Projects">
                      {allocatedProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </optgroup>
                  )}
                  {availableProjects.length > 0 && (
                    <optgroup label="Other Projects">
                      {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </optgroup>
                  )}
                </>
              ) : (
                (projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Allocation % <span className="text-slate-400">(avail: {remaining}%)</span></label>
            <input type="number" min="0" max="100" value={form.allocation_percentage} onChange={e => handlePercentageChange(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Hours/mo</label>
            <input type="number" value={form.allocated_hours_per_month} onChange={e => setForm({ ...form, allocated_hours_per_month: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark h-[38px]">
              <Plus size={16} /> Allocate
            </button>
            {(form.resource_id || form.project_id) && (
              <button
                type="button"
                onClick={() => setForm({ resource_id: '', project_id: '', allocation_percentage: '', allocated_hours_per_month: '' })}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 h-[38px]"
                title="Reset filters"
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Selected Resource Summary Card */}
      {selectedResource && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4 mb-6">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">{selectedResource.name}</span>
              <span className="text-xs text-slate-500">{selectedResource.role}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-slate-400" />
              <span className="text-sm text-slate-700">Rate: <span className="font-medium">{formatCurrency(selectedResource.hourly_rate)}/hr</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <span className="text-sm text-slate-700">{selectedResource.available_hours_per_month} hrs/mo available</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <div className="text-center">
                <div className="text-xs text-slate-500">Allocated</div>
                <div className={`text-sm font-bold ${currentAllocation >= 100 ? 'text-green-600' : currentAllocation > 80 ? 'text-blue-600' : 'text-slate-700'}`}>{formatPercentage(currentAllocation)}</div>
              </div>
              <div className="w-px h-8 bg-blue-200" />
              <div className="text-center">
                <div className="text-xs text-slate-500">Available</div>
                <div className={`text-sm font-bold ${remaining <= 0 ? 'text-red-500' : remaining <= 20 ? 'text-amber-600' : 'text-green-600'}`}>{formatPercentage(remaining)}</div>
              </div>
              {/* Mini utilization bar */}
              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${currentAllocation >= 100 ? 'bg-green-500' : currentAllocation > 80 ? 'bg-blue-500' : 'bg-blue-400'}`}
                  style={{ width: `${Math.min(100, currentAllocation)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Allocations Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">
            {form.resource_id || form.project_id
              ? `Filtered Allocations${selectedResource ? ` — ${selectedResource.name}` : ''}${form.project_id ? ` — ${projects?.find(p => p.id === Number(form.project_id))?.name || 'Project'}` : ''}`
              : 'Current Allocations'}
          </h3>
          <span className="text-xs text-slate-500">{displayedAllocations.length} allocation{displayedAllocations.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Resource</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Project</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Allocation</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Hours/mo</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Cost/mo</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {displayedAllocations.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No allocations found</td></tr>
              ) : displayedAllocations.map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.resource_name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.role}</td>
                  <td className="px-4 py-3 text-slate-600">{a.project_name}</td>
                  <td className="px-4 py-3 text-right">{formatPercentage(a.allocation_percentage)}</td>
                  <td className="px-4 py-3 text-right">{a.allocated_hours_per_month}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(a.hourly_rate)}/hr</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.monthly_cost)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(a)} className="text-slate-400 hover:text-blue-500" title="Edit allocation"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-500" title="Delete allocation"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Allocation Modal */}
      <Modal isOpen={!!editAlloc} onClose={() => setEditAlloc(null)} title="Edit Allocation">
        {editAlloc && (
          <form onSubmit={handleEditSave} className="space-y-4">
            {editError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{editError}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resource</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">{editAlloc.resource_name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">{editAlloc.project_name}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Allocation %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.allocation_percentage}
                  onChange={e => handleEditPercentageChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hours/mo</label>
                <input
                  type="number"
                  value={editForm.allocated_hours_per_month}
                  onChange={e => setEditForm({ ...editForm, allocated_hours_per_month: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEditAlloc(null)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
