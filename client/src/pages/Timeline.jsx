import { useState, useMemo, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useNavigate } from 'react-router';
import PageHeader from '../components/PageHeader';
import RAGIndicator from '../components/RAGIndicator';
import ExportButton from '../components/ExportButton';
import { Filter, X, ChevronDown, ChevronRight, Search, ZoomIn, ZoomOut } from 'lucide-react';

const healthBarColors = { Red: 'bg-red-400', Amber: 'bg-amber-400', Green: 'bg-emerald-400' };
const statusColors = { Active: 'bg-emerald-100 text-emerald-700', Planning: 'bg-blue-100 text-blue-700', Completed: 'bg-slate-100 text-slate-600', 'On Hold': 'bg-amber-100 text-amber-700' };

export default function Timeline() {
  const { data: projects, loading } = useApi('/timeline/projects');
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState({});
  const [selectedClients, setSelectedClients] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedHealth, setSelectedHealth] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 0.5 = zoom out, 2 = zoom in
  const [tooltip, setTooltip] = useState(null);
  const ganttRef = useRef(null);

  // Extract unique clients, statuses, health from data
  const { clientList, statusList, healthList } = useMemo(() => {
    if (!projects?.length) return { clientList: [], statusList: [], healthList: [] };
    const clients = [...new Set(projects.map(p => p.theme_name))].sort();
    const statuses = [...new Set(projects.map(p => p.status))].sort();
    const healths = [...new Set(projects.map(p => p.health_status).filter(Boolean))];
    return { clientList: clients, statusList: statuses, healthList: healths };
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!projects?.length) return [];
    return projects.filter(p => {
      if (selectedClients.length > 0 && !selectedClients.includes(p.theme_name)) return false;
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(p.status)) return false;
      if (selectedHealth.length > 0 && !selectedHealth.includes(p.health_status)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.name.toLowerCase().includes(q) && !p.theme_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [projects, selectedClients, selectedStatuses, selectedHealth, searchQuery]);

  const activeFilterCount = selectedClients.length + selectedStatuses.length + selectedHealth.length;

  const { grouped, minDate, maxDate, months } = useMemo(() => {
    if (!filteredProjects?.length) return { grouped: {}, minDate: null, maxDate: null, months: [] };
    const dates = filteredProjects.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    const min = new Date(Math.min(...dates));
    const max = new Date(Math.max(...dates));
    min.setDate(1);
    max.setMonth(max.getMonth() + 1, 0);
    const ms = [];
    const d = new Date(min);
    while (d <= max) { ms.push(new Date(d)); d.setMonth(d.getMonth() + 1); }
    const g = {};
    filteredProjects.forEach(p => { (g[p.theme_name] = g[p.theme_name] || []).push(p); });
    return { grouped: g, minDate: min, maxDate: max, months: ms };
  }, [filteredProjects]);

  const totalMs = (maxDate && minDate) ? (maxDate - minDate || 1) : 1;
  const today = new Date();
  const todayPct = minDate ? Math.max(0, Math.min(100, ((today - minDate) / totalMs) * 100)) : 0;

  const toggleFilter = useCallback((list, setList, value) => {
    setList(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  }, []);

  const clearAllFilters = () => {
    setSelectedClients([]);
    setSelectedStatuses([]);
    setSelectedHealth([]);
    setSearchQuery('');
  };

  const handleBarHover = (e, project) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const completedMs = project.milestones?.filter(m => m.status === 'Completed').length || 0;
    const totalMilestones = project.milestones?.length || 0;
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      project,
      completedMs,
      totalMilestones,
    });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;

  const totalProjects = filteredProjects.length;
  const totalClients = Object.keys(grouped).length;

  return (
    <div>
      <PageHeader title="Timeline" subtitle="Project schedule overview">
        <ExportButton endpoint="/export/projects" filename="projects-timeline.csv" />
      </PageHeader>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects or clients..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              disabled={zoomLevel <= 0.5}
            >
              <ZoomOut size={16} />
            </button>
            <span className="px-2 text-xs font-medium text-slate-600 min-w-[40px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}
              className="p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
              disabled={zoomLevel >= 3}
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Summary */}
          <div className="text-xs text-slate-500 ml-auto">
            {totalClients} clients &middot; {totalProjects} projects
          </div>
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            {/* Client filter */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Clients</p>
              <div className="flex flex-wrap gap-2">
                {clientList.map(client => {
                  const isSelected = selectedClients.includes(client);
                  const projectCount = projects.filter(p => p.theme_name === client).length;
                  return (
                    <button
                      key={client}
                      onClick={() => toggleFilter(selectedClients, setSelectedClients, client)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {client}
                      <span className={`ml-1 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>({projectCount})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status + Health in one row */}
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {statusList.map(status => {
                    const isSelected = selectedStatuses.includes(status);
                    return (
                      <button
                        key={status}
                        onClick={() => toggleFilter(selectedStatuses, setSelectedStatuses, status)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Health</p>
                <div className="flex flex-wrap gap-2">
                  {healthList.map(health => {
                    const isSelected = selectedHealth.includes(health);
                    const dotColor = { Green: 'bg-emerald-500', Amber: 'bg-amber-500', Red: 'bg-red-500' }[health] || 'bg-slate-400';
                    return (
                      <button
                        key={health}
                        onClick={() => toggleFilter(selectedHealth, setSelectedHealth, health)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : dotColor}`} />
                        {health}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Active filter chips (shown when filter panel is closed) */}
      {!showFilters && activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {selectedClients.map(c => (
            <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-700 rounded-full border border-blue-200">
              {c}
              <button onClick={() => toggleFilter(selectedClients, setSelectedClients, c)} className="hover:text-blue-900"><X size={12} /></button>
            </span>
          ))}
          {selectedStatuses.map(s => (
            <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-violet-50 text-violet-700 rounded-full border border-violet-200">
              {s}
              <button onClick={() => toggleFilter(selectedStatuses, setSelectedStatuses, s)} className="hover:text-violet-900"><X size={12} /></button>
            </span>
          ))}
          {selectedHealth.map(h => (
            <span key={h} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-50 text-amber-700 rounded-full border border-amber-200">
              {h}
              <button onClick={() => toggleFilter(selectedHealth, setSelectedHealth, h)} className="hover:text-amber-900"><X size={12} /></button>
            </span>
          ))}
          <button onClick={clearAllFilters} className="text-xs text-slate-500 hover:text-red-600 ml-1">Clear all</button>
        </div>
      )}

      {/* Empty state */}
      {totalProjects === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <p className="text-slate-500 mb-2">No projects match the current filters</p>
          <button onClick={clearAllFilters} className="text-sm text-blue-600 hover:text-blue-700 font-medium">Clear filters</button>
        </div>
      )}

      {/* Gantt Chart */}
      {totalProjects > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto" ref={ganttRef}>
          {/* Month headers */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 flex">
            <div className="w-64 shrink-0 px-4 py-2 text-xs font-semibold text-slate-500 border-r border-slate-200 flex items-center gap-2">
              Client / Project
            </div>
            <div className="flex-1 relative flex" style={{ minWidth: `${months.length * 80 * zoomLevel}px` }}>
              {months.map((m, i) => {
                const isCurrentMonth = m.getMonth() === today.getMonth() && m.getFullYear() === today.getFullYear();
                return (
                  <div
                    key={i}
                    className={`text-center text-xs py-2 border-r border-slate-100 ${isCurrentMonth ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-500'}`}
                    style={{ width: `${100 / months.length}%` }}
                  >
                    {m.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project rows */}
          {Object.entries(grouped).map(([theme, projs]) => (
            <div key={theme}>
              {/* Client header row */}
              <div
                className="flex items-center bg-slate-50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setCollapsed(prev => ({ ...prev, [theme]: !prev[theme] }))}
              >
                <div className="w-64 shrink-0 px-4 py-2 flex items-center gap-2">
                  {collapsed[theme] ? <ChevronRight size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  <span className="text-sm font-semibold text-slate-800 truncate">{theme}</span>
                  <span className="text-xs text-slate-400 ml-auto shrink-0">{projs.length}</span>
                </div>
                <div className="flex-1 relative h-6" style={{ minWidth: `${months.length * 80 * zoomLevel}px` }}>
                  {/* Aggregate bar for collapsed client */}
                  {collapsed[theme] && (() => {
                    const earliest = Math.min(...projs.map(p => new Date(p.start_date)));
                    const latest = Math.max(...projs.map(p => new Date(p.end_date)));
                    const left = ((earliest - minDate) / totalMs) * 100;
                    const width = Math.max(1, ((latest - earliest) / totalMs) * 100);
                    return (
                      <div
                        className="absolute top-1 h-4 rounded-full bg-slate-300 opacity-60"
                        style={{ left: `${left}%`, width: `${width}%`, minWidth: '8px' }}
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Individual project rows */}
              {!collapsed[theme] && projs.map(p => {
                const left = ((new Date(p.start_date) - minDate) / totalMs) * 100;
                const width = Math.max(1, ((new Date(p.end_date) - new Date(p.start_date)) / totalMs) * 100);
                const barColor = healthBarColors[p.health_status] || 'bg-slate-300';
                const statusBadge = statusColors[p.status] || 'bg-slate-100 text-slate-600';
                return (
                  <div
                    key={p.id}
                    className="flex items-center border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer group"
                    onClick={() => navigate(`/projects/${p.id}`)}
                  >
                    <div className="w-64 shrink-0 px-4 py-1.5 flex items-center gap-2">
                      <RAGIndicator status={p.health_status} />
                      <span className="text-sm text-slate-700 truncate flex-1 group-hover:text-blue-600 transition-colors">{p.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${statusBadge}`}>{p.status}</span>
                    </div>
                    <div className="flex-1 relative h-8 px-1" style={{ minWidth: `${months.length * 80 * zoomLevel}px` }}>
                      {/* Month grid lines */}
                      {months.map((_, i) => (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 border-r border-slate-50"
                          style={{ left: `${(i / months.length) * 100}%` }}
                        />
                      ))}
                      {/* Project bar */}
                      <div
                        className={`absolute top-1.5 h-5 rounded-full ${barColor} opacity-80 hover:opacity-100 transition-all hover:shadow-md`}
                        style={{ left: `${left}%`, width: `${width}%`, minWidth: '8px' }}
                        onMouseEnter={e => handleBarHover(e, p)}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {/* Milestone diamonds */}
                        {p.milestones?.map(m => {
                          const mPct = ((new Date(m.due_date) - new Date(p.start_date)) / (new Date(p.end_date) - new Date(p.start_date))) * 100;
                          const isOverdue = m.status !== 'Completed' && new Date(m.due_date) < today;
                          return (
                            <div
                              key={m.id}
                              className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border ${
                                m.status === 'Completed'
                                  ? 'bg-white border-white'
                                  : isOverdue
                                  ? 'bg-red-600 border-red-600'
                                  : 'bg-slate-800 border-slate-800'
                              }`}
                              style={{ left: `${Math.min(95, Math.max(2, mPct))}%` }}
                              title={`${m.title} — ${m.status}${isOverdue ? ' (Overdue)' : ''}`}
                            />
                          );
                        })}
                      </div>
                      {/* Today line */}
                      <div
                        className="absolute top-0 bottom-0 border-l-2 border-red-400 border-dashed z-10 pointer-events-none"
                        style={{ left: `${todayPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-50">
            <span className="font-medium text-slate-600">Legend:</span>
            <span className="flex items-center gap-1.5"><span className="w-8 h-2.5 rounded-full bg-emerald-400" /> Green</span>
            <span className="flex items-center gap-1.5"><span className="w-8 h-2.5 rounded-full bg-amber-400" /> Amber</span>
            <span className="flex items-center gap-1.5"><span className="w-8 h-2.5 rounded-full bg-red-400" /> Red</span>
            <span className="border-l border-slate-300 pl-4 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-white border border-slate-300 inline-block" /> Completed milestone</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-slate-800 inline-block" /> Upcoming milestone</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rotate-45 bg-red-600 inline-block" /> Overdue milestone</span>
            <span className="border-l border-slate-300 pl-4 flex items-center gap-1.5"><span className="w-4 border-t-2 border-red-400 border-dashed inline-block" /> Today</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700 pointer-events-none max-w-xs"
          style={{
            left: `${Math.min(tooltip.x, window.innerWidth - 250)}px`,
            top: `${tooltip.y - 70}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <p className="font-semibold mb-1">{tooltip.project.name}</p>
          <p className="text-slate-300">{tooltip.project.theme_name}</p>
          <div className="flex items-center gap-3 mt-1 pt-1 border-t border-slate-600">
            <span>{new Date(tooltip.project.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
            <span className="text-slate-400">→</span>
            <span>{new Date(tooltip.project.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</span>
          </div>
          {tooltip.totalMilestones > 0 && (
            <p className="mt-1 text-slate-300">
              Milestones: {tooltip.completedMs}/{tooltip.totalMilestones} completed
            </p>
          )}
        </div>
      )}
    </div>
  );
}
