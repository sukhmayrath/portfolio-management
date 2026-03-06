import { useState, useMemo } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatCurrency } from '../utils/formatters';
import { Plus, Minus, RotateCcw, Save, FolderOpen } from 'lucide-react';

export default function CapacityPlanning() {
  const { data: resources } = useApi('/resources');
  const { data: allocations } = useApi('/allocations');
  const [adjustments, setAdjustments] = useState({});
  const [additions, setAdditions] = useState([]);
  const [showSaveScenario, setShowSaveScenario] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  const { data: scenarios, refetch: refetchScenarios } = useApi('/scenarios');
  const { mutate } = useMutation();

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

  const addResource = () => setAdditions([...additions, { name: '', role: '', rate: 100, hours: 160 }]);
  const reset = () => { setAdjustments({}); setAdditions([]); };

  if (!analysis) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div>
      <PageHeader title="Capacity Planning" subtitle="What-if resource modeling">
        <div className="flex gap-2">
          <button onClick={() => setShowScenarios(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            <FolderOpen size={14} /> Scenarios ({scenarios?.length || 0})
          </button>
          <button onClick={() => setShowSaveScenario(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark">
            <Save size={14} /> Save Scenario
          </button>
          <button onClick={addResource} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"><Plus size={16} /> Add Resource</button>
          <button onClick={reset} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"><RotateCcw size={16} /> Reset</button>
        </div>
      </PageHeader>

      {/* Impact Summary */}
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

      {/* Added Resources */}
      {additions.length > 0 && (
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
        </div>
      )}

      {/* Resource Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Resource</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Rate</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Current Util</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Adjustment</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Projected Util</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Cost Impact</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {analysis.resources.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.role}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">${r.hourly_rate}/hr</td>
                <td className="px-4 py-2.5 text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.currentUtil > 100 ? 'bg-red-500' : r.currentUtil > 80 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, r.currentUtil)}%` }} /></div>
                    <span className="text-xs w-8">{r.currentUtil.toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <input type="range" min="-50" max="50" value={adjustments[r.id] || 0} onChange={e => setAdjustments({...adjustments, [r.id]: Number(e.target.value)})} className="w-20 accent-primary" />
                  <span className="text-xs text-slate-500 ml-1">{adjustments[r.id] > 0 ? '+' : ''}{adjustments[r.id] || 0}%</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-sm font-medium ${r.adjustedUtil > 100 ? 'text-red-600' : r.adjustedUtil > 80 ? 'text-emerald-600' : 'text-blue-600'}`}>{r.adjustedUtil.toFixed(0)}%</span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {adjustments[r.id] ? <span className={`text-sm font-medium ${r.adjustedCost > r.monthlyCost ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(r.adjustedCost - r.monthlyCost)}</span> : <span className="text-slate-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
