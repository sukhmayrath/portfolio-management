import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Bell, Plus, Play, Trash2 } from 'lucide-react';

const RULE_TYPES = [
  { value: 'margin_below', label: 'Margin Below Threshold' },
  { value: 'budget_exceeded', label: 'Budget Exceeded' },
  { value: 'over_allocation', label: 'Over-Allocation' },
  { value: 'health_red', label: 'Red Health Projects' },
  { value: 'milestone_overdue', label: 'Overdue Milestones' },
  { value: 'risk_critical', label: 'Critical Risks' },
];

export default function AlertRules() {
  const { data: rules, refetch } = useApi('/notifications/alert-rules');
  const { data: notifData } = useApi('/notifications?limit=20');
  const { mutate } = useMutation();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', rule_type: 'margin_below', threshold_value: '', is_active: 1 });
  const [evalResult, setEvalResult] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    await mutate('post', '/notifications/alert-rules', { ...form, threshold_value: form.threshold_value ? Number(form.threshold_value) : null });
    setShowModal(false);
    setForm({ name: '', rule_type: 'margin_below', threshold_value: '', is_active: 1 });
    refetch();
  };

  const handleEvaluate = async () => {
    const result = await mutate('post', '/notifications/evaluate');
    setEvalResult(result);
    refetch();
  };

  const handleDelete = async (id) => {
    await mutate('delete', `/notifications/alert-rules/${id}`);
    refetch();
  };

  return (
    <div>
      <PageHeader title="Alert Rules" subtitle="Configure and manage notifications">
        <div className="flex gap-2">
          <button onClick={handleEvaluate} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"><Play size={16} /> Evaluate Now</button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark"><Plus size={16} /> Add Rule</button>
        </div>
      </PageHeader>

      {evalResult && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">{evalResult.message}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rule Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Threshold</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Active</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(rules || []).map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-slate-500">{RULE_TYPES.find(t => t.value === r.rule_type)?.label || r.rule_type}</td>
                <td className="px-4 py-3 text-slate-500">{r.threshold_value ?? '-'}</td>
                <td className="px-4 py-3 text-center"><span className={`w-2 h-2 rounded-full inline-block ${r.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} /></td>
                <td className="px-4 py-3 text-right"><button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Notifications */}
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2"><Bell size={16} /> Recent Notifications</h3>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {(notifData?.notifications || []).map(n => (
          <div key={n.id} className="px-4 py-3 flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full shrink-0 ${n.severity === 'critical' ? 'bg-red-500' : n.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            <p className="text-sm text-slate-700 flex-1">{n.message}</p>
            <span className="text-xs text-slate-400 shrink-0">{new Date(n.created_at).toLocaleDateString()}</span>
          </div>
        ))}
        {(!notifData?.notifications || notifData.notifications.length === 0) && <p className="p-4 text-sm text-slate-400 text-center">No notifications yet. Click "Evaluate Now" to generate alerts.</p>}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Alert Rule">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rule Type</label>
            <select value={form.rule_type} onChange={e => setForm({...form, rule_type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
              {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Threshold Value (optional)</label>
            <input type="number" value={form.threshold_value} onChange={e => setForm({...form, threshold_value: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="e.g. 15 for 15% margin" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Create Rule</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
