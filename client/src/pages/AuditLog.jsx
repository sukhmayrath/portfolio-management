import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import DateRangeFilter from '../components/DateRangeFilter';
import { formatDate } from '../utils/formatters';
import { History } from 'lucide-react';

const actionColors = { CREATE: 'bg-green-100 text-green-800', UPDATE: 'bg-blue-100 text-blue-800', DELETE: 'bg-red-100 text-red-800' };

export default function AuditLog() {
  const [filters, setFilters] = useState({ entity_type: '', start_date: '', end_date: '' });
  const params = Object.entries(filters).filter(([,v]) => v).map(([k,v]) => `${k}=${v}`).join('&');
  const { data } = useApi(`/audit?limit=100${params ? `&${params}` : ''}`);

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Track all changes across the system"><History size={20} className="text-slate-400" /></PageHeader>
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <select value={filters.entity_type} onChange={e => setFilters({...filters, entity_type: e.target.value})} className="px-3 py-2 text-sm border border-slate-300 rounded-lg">
          <option value="">All Entities</option>
          {['project','theme','risk','milestone','resource','allocation','task'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <DateRangeFilter onChange={({start_date, end_date}) => setFilters({...filters, start_date, end_date})} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Action</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Entity</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Field</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Old Value</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">New Value</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.entries || []).map(e => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(e.timestamp)}</td>
                <td className="px-4 py-2.5 text-slate-700">{e.user_name || '-'}</td>
                <td className="px-4 py-2.5"><span className={`px-2 py-0.5 text-xs font-medium rounded-full ${actionColors[e.action] || ''}`}>{e.action}</span></td>
                <td className="px-4 py-2.5 text-slate-700">{e.entity_type} #{e.entity_id}</td>
                <td className="px-4 py-2.5 text-slate-500">{e.field_name || '-'}</td>
                <td className="px-4 py-2.5 text-slate-500 max-w-32 truncate">{e.old_value || '-'}</td>
                <td className="px-4 py-2.5 text-slate-700 max-w-32 truncate">{e.new_value || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data?.entries || data.entries.length === 0) && <p className="p-8 text-center text-slate-400">No audit entries found</p>}
      </div>
    </div>
  );
}
