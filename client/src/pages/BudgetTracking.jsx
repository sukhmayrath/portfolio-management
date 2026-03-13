import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import ExportButton from '../components/ExportButton';
import PrintButton from '../components/PrintButton';
import { formatCurrency } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-medium ml-auto">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BudgetTracking() {
  const [tab, setTab] = useState('comparison');
  const { data: comparison } = useApi('/budget/comparison?year=2026');
  const { data: forecasts } = useApi('/budget/forecast');

  const TABS = [{ key: 'comparison', label: 'Budget vs Actual' }, { key: 'forecast', label: 'Forecasting' }];

  // Aggregate comparison by month
  const monthlyData = {};
  (comparison || []).forEach(e => {
    if (!monthlyData[e.month]) monthlyData[e.month] = { month: e.month, planned: 0, actual: 0 };
    monthlyData[e.month].planned += e.planned_total;
    monthlyData[e.month].actual += e.actual_total;
  });
  const chartData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <div>
      <PageHeader title="Budget Tracking" subtitle="Planned vs actual spend analysis">
        <PrintButton />
        <ExportButton endpoint="/export/projects" filename="budget-export.csv" />
      </PageHeader>
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'comparison' && (
        <div>
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Monthly Budget vs Actual</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<DarkTooltip />} /><Legend iconType="circle" iconSize={8} />
                  <Bar dataKey="planned" name="Planned" fill="#94a3b8" radius={[4,4,0,0]} /><Bar dataKey="actual" name="Actual" fill="#2563eb" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Month</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Planned</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actual</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Variance</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(comparison || []).map((e, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{e.project_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{e.month}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(e.planned_total)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(e.actual_total)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${e.cost_variance > 0 ? 'text-red-600' : 'text-green-600'}`}>{e.cost_variance > 0 ? '+' : ''}{formatCurrency(e.cost_variance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'forecast' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Project</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Client</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Monthly Burn</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Months Left</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Projected Total</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">End Date</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(forecasts || []).map(f => (
                <tr key={f.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{f.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{f.theme_name}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatCurrency(f.monthly_burn)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{f.months_remaining}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-800">{formatCurrency(f.projected_total)}</td>
                  <td className="px-4 py-2.5 text-slate-500">{f.end_date || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
