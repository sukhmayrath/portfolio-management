import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router';
import PageHeader from '../components/PageHeader';
import RAGIndicator from '../components/RAGIndicator';
import StatusBadge from '../components/StatusBadge';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function Roadmap() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedClient, setSelectedClient] = useState('');
  const { data, loading } = useApi(`/timeline/roadmap?year=${year}`);
  const navigate = useNavigate();

  const quarters = data?.quarters || {};

  // Extract unique client names from all quarters
  const clientNames = useMemo(() => {
    const names = new Set();
    Object.values(quarters).forEach(projs => projs.forEach(p => { if (p.theme_name) names.add(p.theme_name); }));
    return [...names].sort();
  }, [quarters]);

  // Filter projects per quarter by selected client
  const filteredQuarters = useMemo(() => {
    if (!selectedClient) return quarters;
    const filtered = {};
    for (const [qLabel, projs] of Object.entries(quarters)) {
      filtered[qLabel] = projs.filter(p => p.theme_name === selectedClient);
    }
    return filtered;
  }, [quarters, selectedClient]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  return (
    <div>
      <PageHeader title="Roadmap" subtitle={`Project roadmap for ${year}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">All Clients</option>
              {clientNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {selectedClient && (
              <button onClick={() => setSelectedClient('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setYear(y => y - 1)} className="p-1.5 hover:bg-slate-100 rounded"><ChevronLeft size={18} /></button>
            <span className="text-sm font-semibold text-slate-800 w-12 text-center">{year}</span>
            <button onClick={() => setYear(y => y + 1)} className="p-1.5 hover:bg-slate-100 rounded"><ChevronRight size={18} /></button>
          </div>
        </div>
      </PageHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {Object.entries(filteredQuarters).map(([qLabel, projs]) => (
          <div key={qLabel} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{qLabel}</span>
              <span className="text-xs text-slate-400">{projs.length} projects</span>
            </div>
            <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {projs.map(p => (
                <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="p-3 border border-slate-100 rounded-lg hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <RAGIndicator status={p.health_status} />
                    <span className="text-sm font-medium text-slate-800 truncate flex-1">{p.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 truncate">{p.theme_name}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    {p.milestone_progress > 0 && (
                      <div className="flex items-center gap-1 flex-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.milestone_progress}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400">{p.milestone_progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {projs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No projects</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
