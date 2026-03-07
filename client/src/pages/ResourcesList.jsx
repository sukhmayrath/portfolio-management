import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { Plus, Minus, RotateCcw, Save, FolderOpen, Scaling } from 'lucide-react';

export default function ResourcesList() {
  const { data: resources, loading, refetch } = useApi('/resources');
  const { data: allocations } = useApi('/allocations');
  const { data: scenarios, refetch: refetchScenarios } = useApi('/scenarios');
  const { mutate } = useMutation();
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', department: '', hourly_rate: '', available_hours_per_month: '160' });

  // Capacity planning state
  const [capacityMode, setCapacityMode] = useState(false);
  const [adjustments, setAdjustments] = useState({});
  const [additions, setAdditions] = useState([]);
  const [showSaveScenario, setShowSaveScenario] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);

  const analysis = useMemo(() => {
    if (!resources || !allocations) return null;
    const current = resources.map(r => ({
      ...r,
      currentUtil: r.total_allocation_percentage || 0,
      adjustedUtil: Math.max(0, (r.total_allocation_percentage || 0) + (adjustments[r.id] || 0)),
      monthlyCost: (r.hourly_rate * r.available_hours_per_month * ((r.total_allocation_percentage || 0) / 100)),
      adjustedCost: (r.hourly_rate * r.available_hours_per_month * (Math.max(0, (r.total_allocation_percentage || 0) + (adjustments[r.id] || 0)) / 100)),
    }));
    const totalCurrent = current.reduce((s, r) => s + r.monthlyCost, 0);
    const totalAdjusted = current.reduce((s, r) => s + r.adjustedCost, 0);
    const addedCost = additions.reduce((s, a) => s + ((a.rate || 0) * (a.hours || 0)), 0);
    return { resources: current, totalCurrent, totalAdjusted: totalAdjusted + addedCost, addedCost, costDelta: (totalAdjusted + addedCost) - totalCurrent };
  }, [resources, allocations, adjustments, additions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await mutate('post', '/resources', { ...form, hourly_rate: Number(form.hourly_rate) || 0, available_hours_per_month: Number(form.available_hours_per_month) || 160 });
    setShowModal(false);
    setForm({ name: '', role: '', department: '', hourly_rate: '', available_hours_per_month: '160' });
    refetch();
  };

  const resetCapacity = () => { setAdjustments({}); setAdditions([]); };

  const toggleCapacity = () => {
    if (capacityMode) resetCapacity();
    setCapacityMode(!capacityMode);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading resources...</div>;

  const hasAdjustments = Object.values(adjustments).some(v => v !== 0) || additions.length > 0;

  return (
    <div>
      <PageHeader title="Resource Pool" subtitle={capacityMode ? 'Capacity planning mode — adjust sliders to model scenarios' : 'Manage your team members and their availability'}>
        <div className="flex gap-2">
          <button onClick={toggleCapacity} className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${capacityMode ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            <Scaling size={16} /> {capacityMode ? 'Exit Planning' : 'Capacity Planning'}
          </button>
          {capacityMode && (
            <>
              <button onClick={() => setShowScenarios(true)} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                <FolderOpen size={14} /> Scenarios ({scenarios?.length || 0})
              </button>
              {hasAdjustments && (
                <>
                  <button onClick={() => setShowSaveScenario(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
                    <Save size={14} /> Save
                  </button>
                  <button onClick={resetCapacity} className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
                    <RotateCcw size={16} /> Reset
                  </button>
                </>
              )}
            </>
          )}
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">
            <Plus size={16} /> Add Resource
          </button>
        </div>
      </PageHeader>

      {/* Capacity Planning: Impact Summary */}
      {capacityMode && analysis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Current Monthly Cost</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(analysis.totalCurrent)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Projected Monthly Cost</p>
            <p className="text-xl font-bold text-slate-800">{formatCurrency(analysis.totalAdjusted)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${analysis.costDelta > 0 ? 'bg-red-50 border-red-200' : analysis.costDelta < 0 ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}>
            <p className="text-xs text-slate-500">Cost Impact</p>
            <p className={`text-xl font-bold ${analysis.costDelta > 0 ? 'text-red-600' : analysis.costDelta < 0 ? 'text-green-600' : 'text-slate-800'}`}>{analysis.costDelta > 0 ? '+' : ''}{formatCurrency(analysis.costDelta)}</p>
          </div>
        </div>
      )}

      {/* Capacity Planning: Scenario Resources */}
      {capacityMode && additions.length > 0 && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">New Resources (Scenario)</h3>
          {additions.map((a, i) => (
            <div key={i} className="flex items-center gap-3 mb-2">
              <input value={a.name} onChange={e => { const u = [...additions]; u[i].name = e.target.value; setAdditions(u); }} placeholder="Name" className="px-2 py-1.5 text-sm border border-blue-200 rounded-lg w-36" />
              <input value={a.role} onChange={e => { const u = [...additions]; u[i].role = e.target.value; setAdditions(u); }} placeholder="Role" className="px-2 py-1.5 text-sm border border-blue-200 rounded-lg w-36" />
              <label className="text-xs text-slate-500">Rate</label>
              <input type="number" value={a.rate} onChange={e => { const u = [...additions]; u[i].rate = Number(e.target.value); setAdditions(u); }} className="px-2 py-1.5 text-sm border border-blue-200 rounded-lg w-20" />
              <label className="text-xs text-slate-500">Hrs</label>
              <input type="number" value={a.hours} onChange={e => { const u = [...additions]; u[i].hours = Number(e.target.value); setAdditions(u); }} className="px-2 py-1.5 text-sm border border-blue-200 rounded-lg w-20" />
              <span className="text-sm text-blue-700 font-medium">{formatCurrency(a.rate * a.hours)}/mo</span>
              <button onClick={() => setAdditions(additions.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Minus size={16} /></button>
            </div>
          ))}
          <button onClick={() => setAdditions([...additions, { name: '', role: '', rate: 100, hours: 160 }])} className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
            <Plus size={14} /> Add another
          </button>
        </div>
      )}

      {/* Resource Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Hrs/mo</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600" style={{ minWidth: 160 }}>Utilization</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Allocated</th>
              {capacityMode && (
                <>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Adjustment</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Projected</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Cost Impact</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(analysis?.resources || resources || []).map(r => {
              const pct = r.total_allocation_percentage || r.currentUtil || 0;
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
                  {capacityMode && (
                    <>
                      <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        <input type="range" min="-50" max="50" value={adjustments[r.id] || 0} onChange={e => setAdjustments({...adjustments, [r.id]: Number(e.target.value)})} className="w-20 accent-primary" />
                        <span className="text-xs text-slate-500 ml-1">{adjustments[r.id] > 0 ? '+' : ''}{adjustments[r.id] || 0}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-sm font-medium ${r.adjustedUtil > 100 ? 'text-red-600' : r.adjustedUtil > 80 ? 'text-emerald-600' : 'text-blue-600'}`}>{r.adjustedUtil?.toFixed(0) || pct.toFixed(0)}%</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {adjustments[r.id] ? <span className={`text-sm font-medium ${r.adjustedCost > r.monthlyCost ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(r.adjustedCost - r.monthlyCost)}</span> : <span className="text-slate-400">-</span>}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Capacity Planning: prompt to add scenario resources */}
      {capacityMode && additions.length === 0 && (
        <div className="mt-4 text-center">
          <button onClick={() => setAdditions([{ name: '', role: '', rate: 100, hours: 160 }])} className="text-sm text-primary hover:text-primary-dark">
            <Plus size={14} className="inline mr-1" />Add scenario resource to model new hires
          </button>
        </div>
      )}

      {/* Add Resource Modal */}
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

      {/* Save Scenario Modal */}
      <Modal isOpen={showSaveScenario} onClose={() => setShowSaveScenario(false)} title="Save Current Scenario">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await mutate('post', '/scenarios', {
            name: fd.get('name'),
            description: fd.get('description'),
            adjustments: JSON.stringify(adjustments),
            base_data: JSON.stringify({ additions }),
            results: JSON.stringify({
              totalCurrent: analysis?.totalCurrent,
              totalAdjusted: analysis?.totalAdjusted,
              costDelta: analysis?.costDelta,
              overAllocated: analysis?.resources?.filter(r => r.adjustedUtil > 100).length,
              avgUtilization: analysis?.resources?.reduce((s, r) => s + r.adjustedUtil, 0) / (analysis?.resources?.length || 1),
            }),
          });
          setShowSaveScenario(false);
          refetchScenarios();
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Scenario Name</label>
            <input name="name" required placeholder="e.g., Q2 Expansion Plan" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="description" rows={2} placeholder="What does this scenario model?" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            <p>Current impact: <strong className={analysis?.costDelta > 0 ? 'text-red-600' : 'text-green-600'}>{analysis?.costDelta > 0 ? '+' : ''}{formatCurrency(analysis?.costDelta || 0)}</strong>/mo</p>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowSaveScenario(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">Save</button>
          </div>
        </form>
      </Modal>

      {/* Saved Scenarios Modal */}
      <Modal isOpen={showScenarios} onClose={() => setShowScenarios(false)} title="Saved Scenarios" wide>
        <div className="space-y-3">
          {(!scenarios || scenarios.length === 0) ? (
            <p className="text-sm text-slate-500 italic">No saved scenarios yet.</p>
          ) : scenarios.map(s => {
            const results = (() => { try { return JSON.parse(s.results); } catch { return {}; } })();
            return (
              <div key={s.id} className="flex items-center gap-4 p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <div className="flex-1">
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.description || 'No description'}</p>
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span>Cost: {formatCurrency(results.totalAdjusted || 0)}/mo</span>
                    <span>Delta: <span className={results.costDelta > 0 ? 'text-red-500' : 'text-green-500'}>{results.costDelta > 0 ? '+' : ''}{formatCurrency(results.costDelta || 0)}</span></span>
                  </div>
                </div>
                <button onClick={() => {
                  try {
                    const adj = JSON.parse(s.adjustments);
                    const base = JSON.parse(s.base_data);
                    setAdjustments(adj);
                    if (base.additions) setAdditions(base.additions);
                    setCapacityMode(true);
                    setShowScenarios(false);
                  } catch {}
                }} className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Load</button>
                <button onClick={async () => { await mutate('delete', `/scenarios/${s.id}`); refetchScenarios(); }}
                  className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100">Delete</button>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
