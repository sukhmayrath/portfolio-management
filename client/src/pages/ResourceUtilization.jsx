import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import { formatPercentage } from '../utils/formatters';

export default function ResourceUtilization() {
  const { data, loading } = useApi('/dashboard/resource-utilization');

  if (loading) return <div className="p-8 text-center text-slate-500">Loading utilization data...</div>;

  const { resources = [], projects = [] } = data || {};

  const getCellColor = (pct) => {
    if (!pct || pct === 0) return 'bg-white';
    if (pct <= 25) return 'bg-blue-50 text-blue-700';
    if (pct <= 50) return 'bg-blue-100 text-blue-800';
    if (pct <= 75) return 'bg-blue-200 text-blue-900';
    if (pct <= 99) return 'bg-blue-300 text-blue-900';
    if (pct === 100) return 'bg-green-200 text-green-900';
    return 'bg-red-200 text-red-900';
  };

  return (
    <div>
      <PageHeader title="Resource Utilization" subtitle="View allocation across all resources and projects" />

      <div className="bg-white rounded-lg border border-slate-200 overflow-auto mb-6" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        <table className="text-sm" style={{ minWidth: 'max-content' }}>
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 min-w-[180px]">Resource</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 min-w-[100px] bg-slate-50">Role</th>
              {projects.map(p => (
                <th key={p.id} className="px-3 py-3 text-center font-semibold text-slate-600 min-w-[100px] bg-slate-50">
                  <div className="text-xs truncate max-w-[100px]" title={p.name}>{p.name}</div>
                </th>
              ))}
              <th className="px-3 py-3 text-center font-semibold text-slate-600 min-w-[80px] bg-slate-100">Total</th>
              <th className="px-3 py-3 text-center font-semibold text-slate-600 min-w-[80px] bg-slate-100">Free</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-900 sticky left-0 bg-white z-10">{r.name}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{r.role}</td>
                {projects.map(p => {
                  const alloc = r.allocations[p.id];
                  const pct = alloc?.percentage || 0;
                  return (
                    <td key={p.id} className={`px-3 py-3 text-center text-xs font-medium ${getCellColor(pct)}`}>
                      {pct > 0 ? `${pct}%` : '-'}
                    </td>
                  );
                })}
                <td className={`px-3 py-3 text-center text-xs font-bold ${r.total_allocated_pct >= 100 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
                  {formatPercentage(r.total_allocated_pct)}
                </td>
                <td className={`px-3 py-3 text-center text-xs font-bold ${r.unallocated_pct <= 0 ? 'bg-green-100 text-green-800' : r.unallocated_pct <= 20 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                  {formatPercentage(r.unallocated_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
