import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Search, Building2, FolderKanban, Users, ListTodo, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';

const typeIcons = { client: Building2, project: FolderKanban, resource: Users, task: ListTodo, risk: AlertTriangle };
const typeRoutes = { client: '/themes', project: '/projects', resource: '/resources', task: null, risk: null };

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const data = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data.results || []);
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (item) => {
    setOpen(false); setQuery('');
    const route = typeRoutes[item.type];
    if (route) navigate(`${route}/${item.id}`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => results.length && setOpen(true)} placeholder="Search clients, projects, resources..." className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white" />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50">
          {results.map((item, i) => {
            const Icon = typeIcons[item.type] || FolderKanban;
            return (
              <button key={`${item.type}-${item.id}-${i}`} onClick={() => handleSelect(item)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 text-left">
                <Icon size={16} className="text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-800 truncate">{item.name || item.title}</div>
                  <div className="text-xs text-slate-400">{item.type} {item.theme_name ? `· ${item.theme_name}` : ''}{item.project_name ? `· ${item.project_name}` : ''}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
