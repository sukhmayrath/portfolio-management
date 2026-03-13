import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import RAGIndicator from '../components/RAGIndicator';
import ExportButton from '../components/ExportButton';
import PrintButton from '../components/PrintButton';
import HealthScoreGauge from '../components/HealthScoreGauge';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Briefcase, BarChart3, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PROJECT_COLORS } from '../utils/constants';
import { canViewFinancials } from '../utils/roleHelpers';
import { useNavigate } from 'react-router';

const DONUT_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#ea580c', '#4f46e5', '#64748b'];

function KpiCard({ label, value, sublabel, icon: Icon, trend, trendLabel, color }) {
  const colorMap = {
    blue: { bg: 'from-blue-500 to-blue-600', light: 'bg-blue-400/20', icon: 'text-white' },
    amber: { bg: 'from-amber-500 to-amber-600', light: 'bg-amber-400/20', icon: 'text-white' },
    emerald: { bg: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-400/20', icon: 'text-white' },
    violet: { bg: 'from-violet-500 to-violet-600', light: 'bg-violet-400/20', icon: 'text-white' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`bg-gradient-to-br ${c.bg} rounded-xl p-5 text-white shadow-lg shadow-${color}-500/20`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.light} rounded-lg p-2`}>
          <Icon size={20} className={c.icon} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-white/20' : 'bg-red-400/30'}`}>
            {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trendLabel}
          </div>
        )}
      </div>
      <p className="text-white/70 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
      {sublabel && <p className="text-white/60 text-xs mt-1">{sublabel}</p>}
    </div>
  );
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-medium ml-auto">{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-slate-600 mt-1 pt-1 flex justify-between">
        <span className="text-slate-300">Total:</span>
        <span className="font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function CustomDonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.fill }} />
        <span className="font-semibold">{d.name}</span>
      </div>
      <p className="text-slate-300 mt-1">{formatCurrency(d.value)}</p>
    </div>
  );
}

/* ─── Health Card Popover ─── */
function HealthCardPopover({ status, projects, totalCount, navigate }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef(null);
  const timerRef = useRef(null);

  const count = projects.length;
  const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(0) : 0;

  const colorMap = {
    Green: { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-300', popBg: 'bg-emerald-50', popBorder: 'border-emerald-200', dot: 'bg-emerald-500', hoverBg: 'hover:bg-emerald-100' },
    Amber: { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-300', popBg: 'bg-amber-50', popBorder: 'border-amber-200', dot: 'bg-amber-500', hoverBg: 'hover:bg-amber-100' },
    Red: { bg: 'bg-red-500', light: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ring: 'ring-red-300', popBg: 'bg-red-50', popBorder: 'border-red-200', dot: 'bg-red-500', hoverBg: 'hover:bg-red-100' },
  };
  const c = colorMap[status];

  const show = () => { clearTimeout(timerRef.current); setOpen(true); };
  const hide = () => { if (pinned) return; timerRef.current = setTimeout(() => setOpen(false), 200); };

  // Click outside to close pinned
  useEffect(() => {
    if (!pinned) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setPinned(false); setOpen(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pinned]);

  // Sort: active first, then by margin desc
  const sorted = [...projects].sort((a, b) => {
    const statusOrder = { Active: 0, Planning: 1, 'On Hold': 2, Completed: 3 };
    const diff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
    return diff !== 0 ? diff : (b.margin_percentage || 0) - (a.margin_percentage || 0);
  });

  return (
    <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
      <div
        onClick={(e) => { e.stopPropagation(); setPinned(!pinned); setOpen(true); }}
        className={`${c.light} border ${c.border} rounded-lg p-4 text-center cursor-pointer transition-all duration-200 ${
          open ? `ring-2 ${c.ring} shadow-lg scale-[1.03]` : `hover:ring-1 ${c.ring} hover:shadow-md`
        }`}
      >
        <div className={`w-4 h-4 rounded-full ${c.bg} mx-auto mb-2 ${open ? 'animate-pulse' : ''}`} />
        <p className={`text-2xl font-bold ${c.text}`}>{count}</p>
        <p className="text-xs text-slate-500 mt-1">{status} ({pct}%)</p>
      </div>

      {open && (
        <div
          className={`absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2 w-80 max-h-72 bg-white rounded-xl border ${c.popBorder} shadow-xl overflow-hidden animate-in fade-in`}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className={`${c.popBg} px-3 py-2 border-b ${c.popBorder} flex items-center justify-between`}>
            <span className={`text-xs font-semibold ${c.text}`}>{status} Projects ({count})</span>
            {pinned && <span className="text-[10px] text-slate-400">Click outside to close</span>}
          </div>
          <div className="overflow-y-auto max-h-56 divide-y divide-slate-100">
            {sorted.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${c.hoverBg} transition-colors group`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${c.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate group-hover:text-primary">{p.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{p.theme_name}</p>
                </div>
                <StatusBadge status={p.status} />
                <span className={`text-[10px] font-semibold w-12 text-right ${(p.margin_percentage || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {(p.margin_percentage || 0).toFixed(0)}%
                </span>
                <ExternalLink size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Component Score Tooltip ─── */
function ComponentScoreTooltip({ label, score, description }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  const show = () => { clearTimeout(timerRef.current); setOpen(true); };
  const hide = () => { timerRef.current = setTimeout(() => setOpen(false), 150); };

  const s = score || 0;
  const colorClass = s >= 70 ? 'text-emerald-600' : s >= 40 ? 'text-amber-600' : 'text-red-600';
  const barColor = s >= 70 ? 'bg-emerald-500' : s >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const barBg = s >= 70 ? 'bg-emerald-100' : s >= 40 ? 'bg-amber-100' : 'bg-red-100';
  const rating = s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Needs Attention' : s >= 20 ? 'At Risk' : 'Critical';
  const ratingColor = s >= 80 ? 'text-emerald-600 bg-emerald-50' : s >= 60 ? 'text-blue-600 bg-blue-50' : s >= 40 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

  return (
    <div className="relative text-center" onMouseEnter={show} onMouseLeave={hide}>
      <div className={`cursor-pointer transition-all duration-200 px-2 py-1.5 rounded-lg ${open ? 'bg-slate-100 ring-1 ring-slate-200 scale-105' : 'hover:bg-slate-50'}`}>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className={`text-lg font-bold ${colorClass} transition-transform duration-200 ${open ? 'scale-110' : ''}`}>
          {s.toFixed(0)}
        </p>
      </div>

      {open && (
        <div
          className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden"
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{label} Health</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ratingColor}`}>{rating}</span>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500">Score</span>
              <span className={`text-sm font-bold ${colorClass}`}>{s.toFixed(0)} / 100</span>
            </div>
            <div className={`w-full ${barBg} rounded-full h-2 overflow-hidden mb-2.5`}>
              <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${s}%` }} />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: summary, loading: l1 } = useApi('/dashboard/summary');
  const { data: breakdown, loading: l2 } = useApi('/dashboard/cost-breakdown');
  const { data: healthData } = useApi('/dashboard/portfolio-health');
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  if (l1 || l2) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

  // Sort clients by total cost descending, take top 10 for bar chart
  const sortedBreakdown = [...(breakdown || [])].sort((a, b) => b.total_company_cost - a.total_company_cost);

  const barData = sortedBreakdown.slice(0, 10).map(t => ({
    name: t.name.length > 18 ? t.name.substring(0, 18) + '...' : t.name,
    'Resource Cost': t.resource_cost,
    'Facility Cost': t.facility_cost,
    'Overhead': t.overhead_cost,
  }));

  // Donut: top 7 + Others
  const topClients = sortedBreakdown.slice(0, 7);
  const othersTotal = sortedBreakdown.slice(7).reduce((s, t) => s + t.total_company_cost, 0);
  const donutData = [
    ...topClients.map(t => ({ name: t.name, value: t.total_company_cost })),
    ...(othersTotal > 0 ? [{ name: 'Others', value: othersTotal }] : []),
  ];

  // Revenue vs Cost comparison data for top clients
  const comparisonData = sortedBreakdown.slice(0, 8).map(t => ({
    name: t.name.length > 15 ? t.name.substring(0, 15) + '...' : t.name,
    Revenue: t.projects.reduce((s, p) => s + (p.client_revenue || 0), 0),
    Cost: t.total_company_cost,
  }));

  // All projects sorted by margin
  const allProjects = (breakdown || []).flatMap(t => t.projects.map(p => ({ ...p, theme_name: t.name })));
  const sortedByMargin = [...allProjects].sort((a, b) => (b.margin_percentage || 0) - (a.margin_percentage || 0));
  const topProjects = sortedByMargin.slice(0, 5);
  const bottomProjects = sortedByMargin.slice(-5).reverse();

  // Status counts
  const statusCounts = allProjects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const totalCost = summary?.total_company_cost || 0;
  const totalRevenue = summary?.total_client_revenue || 0;
  const utilizationPct = totalCost > 0 ? ((totalRevenue / totalCost) * 100).toFixed(0) : 0;
  const showFinancials = canViewFinancials();

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Investment portfolio overview">
        <PrintButton />
        <ExportButton endpoint="/export/projects" filename="dashboard-projects.csv" />
      </PageHeader>

      {/* KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${showFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4 mb-6`}>
        <KpiCard label="Total Projects" value={summary?.project_count || 0} icon={Briefcase} color="blue" sublabel={`Across ${summary?.theme_count || 0} clients`} />
        {showFinancials && (
          <>
            <KpiCard label="Monthly Cost" value={formatCurrency(totalCost)} icon={TrendingDown} color="amber" sublabel="Total company cost" />
            <KpiCard label="Monthly Revenue" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="emerald" trend={summary?.margin_percentage} trendLabel={`${utilizationPct}% return`} sublabel="Client billings" />
            <KpiCard label="Net Margin" value={formatPercentage(summary?.margin_percentage)} icon={BarChart3} color={summary?.margin_percentage >= 0 ? 'violet' : 'amber'} sublabel={formatCurrency(summary?.total_margin) + ' / month'} trend={summary?.margin_percentage} trendLabel={summary?.margin_percentage >= 0 ? 'Profitable' : 'Loss'} />
          </>
        )}
      </div>

      {/* Portfolio Health + RAG Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-center">
          <HealthScoreGauge score={healthData?.overall_score || 0} size={160} />
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">Project Health Overview</h3>
          <p className="text-[11px] text-slate-400 mb-4">Hover over cards to view project details</p>
          <div className="grid grid-cols-3 gap-4">
            {['Green', 'Amber', 'Red'].map(status => {
              const statusProjects = allProjects.filter(p => (p.health_status || 'Green') === status);
              return (
                <HealthCardPopover
                  key={status}
                  status={status}
                  projects={statusProjects}
                  totalCount={allProjects.length}
                  navigate={navigate}
                />
              );
            })}
          </div>
          {healthData && (
            <div className="mt-4 grid grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              {[
                { label: 'Financial', score: healthData.components?.financial, description: 'Measures budget adherence, revenue realization, and margin health across all active projects.' },
                { label: 'Schedule', score: healthData.components?.schedule, description: 'Tracks milestone completion rates, deadline adherence, and timeline variance across the portfolio.' },
                { label: 'Risk', score: healthData.components?.risk, description: 'Evaluates open risk count, severity levels, and mitigation progress across projects.' },
                { label: 'Resource', score: healthData.components?.resource, description: 'Monitors team utilization, allocation balance, and capacity against demand.' },
              ].map(item => (
                <ComponentScoreTooltip key={item.label} label={item.label} score={item.score} description={item.description} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cost vs Revenue bar + Budget utilization */}
      {showFinancials && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-slate-700">Budget Utilization</h3>
            <span className="text-xs text-slate-500">{formatCurrency(totalCost)} spent of {formatCurrency(summary?.total_budget)} budget</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            {(() => {
              const pct = summary?.total_budget > 0 ? Math.min((totalCost * 12 / summary.total_budget) * 100, 100) : 0;
              return (
                <div
                  className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' : pct > 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              );
            })()}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {summary?.total_budget > 0 ? `${((totalCost * 12 / summary.total_budget) * 100).toFixed(1)}% annualized spend rate` : ''}
          </p>
        </div>
      )}

      {/* Charts Row */}
      {showFinancials && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cost Breakdown — vertical bar chart sorted by cost */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Top 10 Clients by Cost</h3>
            <span className="text-xs text-slate-400">Monthly spend</span>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Resource Cost" fill="#2563eb" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Facility Cost" fill="#7c3aed" stackId="a" />
              <Bar dataKey="Overhead" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Investment Distribution</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2} cornerRadius={4}>
                    {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomDonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-44 shrink-0 space-y-2">
              {donutData.map((d, i) => {
                const total = donutData.reduce((s, x) => s + x.value, 0);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-slate-600 truncate flex-1">{d.name}</span>
                    <span className="text-slate-500 font-medium">{((d.value / total) * 100).toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>}

      {/* Revenue vs Cost comparison */}
      {showFinancials && <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Revenue vs Cost by Client</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-emerald-500" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-slate-300" /> Cost</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={comparisonData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Cost" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>}

      {/* Project Status + Top/Bottom Performers */}
      <div className={`grid grid-cols-1 ${showFinancials ? 'lg:grid-cols-3' : ''} gap-6 mb-6`}>
        {/* Project Status Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Project Status</h3>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => {
              const pct = allProjects.length > 0 ? (count / allProjects.length) * 100 : 0;
              const barColor = { Active: 'bg-emerald-500', Planning: 'bg-blue-500', Completed: 'bg-slate-400', 'On Hold': 'bg-amber-500' }[status] || 'bg-slate-300';
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">{status}</span>
                    <span className="text-sm font-semibold text-slate-900">{count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-2xl font-bold text-slate-900">{allProjects.length}</span>
            <span className="text-sm text-slate-500 ml-1">total projects</span>
          </div>
        </div>

        {/* Top Performers */}
        {showFinancials && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <ArrowUpRight size={16} className="text-emerald-500" /> Top Margins
            </h3>
            <div className="space-y-2.5">
              {topProjects.map((p, i) => (
                <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary">{p.name}</p>
                    <p className="text-xs text-slate-400 truncate">{p.theme_name}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">{formatPercentage(p.margin_percentage)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Performers */}
        {showFinancials && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <ArrowDownRight size={16} className="text-red-500" /> Lowest Margins
            </h3>
            <div className="space-y-2.5">
              {bottomProjects.map((p, i) => (
                <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group">
                  <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate group-hover:text-primary">{p.name}</p>
                    <p className="text-xs text-slate-400 truncate">{p.theme_name}</p>
                  </div>
                  <span className={`text-sm font-bold ${p.margin_percentage >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{formatPercentage(p.margin_percentage)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clients Roll-up */}
      {showFinancials && (() => {
        const themes = breakdown || [];
        const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
        const grandTotals = themes.reduce((acc, t) => ({
          resource: acc.resource + t.resource_cost,
          facility: acc.facility + t.facility_cost,
          overhead: acc.overhead + t.overhead_cost,
          company: acc.company + t.total_company_cost,
          revenue: acc.revenue + t.client_revenue,
          margin: acc.margin + t.margin,
        }), { resource: 0, facility: 0, overhead: 0, company: 0, revenue: 0, margin: 0 });
        const grandMarginPct = grandTotals.revenue > 0 ? ((grandTotals.margin / grandTotals.revenue) * 100) : 0;

        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Client Roll-up</h3>
              <span className="text-xs text-slate-400">{themes.length} clients &middot; {allProjects.length} projects</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600 w-8"></th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Health</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Resource Cost</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Facility Cost</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Overhead</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Total Cost</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Revenue</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {themes.map(t => (
                    <Fragment key={t.id}>
                      <tr onClick={() => toggle(t.id)} className="cursor-pointer hover:bg-slate-50 bg-blue-50/30 font-semibold">
                        <td className="px-4 py-3 text-slate-400">
                          {expanded[t.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>
                        <td className="px-4 py-3 text-slate-900">{t.name}</td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3 text-center"><RAGIndicator status={t.health_status || 'Green'} /></td>
                        <td className="px-4 py-3 text-right">{formatCurrency(t.resource_cost)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(t.facility_cost)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(t.overhead_cost)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(t.total_company_cost)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(t.client_revenue)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 ${t.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {t.margin >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {formatPercentage(t.margin_percentage)}
                          </span>
                        </td>
                      </tr>
                      {expanded[t.id] && t.projects.map(p => (
                        <tr key={`p-${p.id}`} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer hover:bg-slate-50">
                          <td className="px-4 py-3"></td>
                          <td className="px-4 py-3 text-slate-700 pl-10">{p.name}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3 text-center"><RAGIndicator status={p.health_status || 'Green'} /></td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.resource_cost)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.total_facility_cost)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.overhead_cost)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.total_company_cost)}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.client_revenue)}</td>
                          <td className={`px-4 py-3 text-right ${p.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercentage(p.margin_percentage)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-slate-900">Grand Total</td>
                    <td className="px-4 py-3"></td>
                    <td></td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandTotals.resource)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandTotals.facility)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandTotals.overhead)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandTotals.company)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(grandTotals.revenue)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${grandTotals.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatPercentage(grandMarginPct)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
