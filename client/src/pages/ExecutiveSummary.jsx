import { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import HealthScoreGauge from '../components/HealthScoreGauge';
import RAGIndicator from '../components/RAGIndicator';
import { formatCurrency, formatDate, formatPercentage } from '../utils/formatters';
import {
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, BarChart3,
  Percent, AlertTriangle, Clock, ShieldAlert, Briefcase, Activity,
  CheckCircle2, LayoutGrid, ArrowRight,
} from 'lucide-react';
import PrintButton from '../components/PrintButton';

/* ---------- colour constants ---------- */
const RAG_COLORS = { Green: '#10b981', Amber: '#f59e0b', Red: '#ef4444' };
const HEALTH_BAR_COLORS = { Financial: '#3b82f6', Schedule: '#8b5cf6', Risk: '#f59e0b', Resource: '#10b981' };

function scoreColor(score) {
  if (score >= 71) return 'text-emerald-600';
  if (score >= 41) return 'text-amber-600';
  return 'text-red-600';
}
function scoreBarHex(score) {
  if (score >= 71) return '#10b981';
  if (score >= 41) return '#f59e0b';
  return '#ef4444';
}

function daysOverdue(dateStr) {
  if (!dateStr) return 0;
  const due = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

/* ---------- KPI Card ---------- */
function KPICard({ label, value, icon: Icon, gradient, trend }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg ${gradient}`}>
      {/* decorative circle */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/70 tracking-wide uppercase">{label}</p>
          <p className="text-3xl font-extrabold mt-2 tracking-tight">{value}</p>
          {trend !== undefined && trend !== null && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? <TrendingUp size={14} className="text-white/80" /> : <TrendingDown size={14} className="text-white/80" />}
              <span className="text-xs font-medium text-white/80">{trend >= 0 ? '+' : ''}{trend.toFixed(1)}% vs prior</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Section wrapper ---------- */
function Section({ title, icon: Icon, children, className = '', badge }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center gap-3 px-6 pt-6 pb-2">
          {Icon && <Icon size={20} className="text-slate-400" />}
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {badge !== undefined && badge !== null && (
            <span className="ml-auto inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {badge}
            </span>
          )}
        </div>
      )}
      <div className="px-6 pb-6 pt-2">{children}</div>
    </div>
  );
}

/* ---------- Custom PieChart label ---------- */
function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#475569" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
      {name} ({value})
    </text>
  );
}

/* ---------- Custom Tooltip ---------- */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {typeof entry.value === 'number' && entry.value > 1000 ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ================================================================ */
export default function ExecutiveSummary() {
  const { data: summary } = useApi('/dashboard/summary');
  const { data: health } = useApi('/dashboard/portfolio-health');
  const { data: exec } = useApi('/dashboard/executive-summary');
  const { data: trends } = useApi('/snapshots/trends?period=180');
  const { data: themes } = useApi('/themes');

  /* derived data */
  const healthDistribution = useMemo(() => {
    if (!exec?.health_counts) return [];
    const map = { Green: 0, Amber: 0, Red: 0 };
    exec.health_counts.forEach(h => {
      const key = h.health_status;
      if (key in map) map[key] = h.count;
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [exec]);

  const budgetByClient = useMemo(() => {
    if (!themes) return [];
    return [...themes]
      .sort((a, b) => (b.total_budget || 0) - (a.total_budget || 0))
      .slice(0, 8)
      .map(t => ({ name: t.name, Budget: t.total_budget || 0, Cost: t.total_resource_cost || 0 }));
  }, [themes]);

  const trendChartData = useMemo(() => {
    if (!trends || !Array.isArray(trends) || trends.length === 0) return [];
    return trends.map(s => ({
      date: s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
      Revenue: s.total_revenue || 0,
      Cost: s.total_cost || s.total_company_cost || 0,
      Margin: s.margin_percentage ?? 0,
    }));
  }, [trends]);

  /* margin trend */
  const marginTrend = useMemo(() => {
    if (!trendChartData || trendChartData.length < 2) return null;
    const recent = trendChartData[trendChartData.length - 1].Margin;
    const prev = trendChartData[trendChartData.length - 2].Margin;
    if (prev === 0) return null;
    return ((recent - prev) / Math.abs(prev)) * 100;
  }, [trendChartData]);

  /* loading state */
  if (!summary || !health || !exec) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500">Loading executive summary...</p>
        </div>
      </div>
    );
  }

  const healthBreakdown = [
    { label: 'Financial', score: health.financial_score, icon: DollarSign, color: HEALTH_BAR_COLORS.Financial },
    { label: 'Schedule', score: health.schedule_score, icon: Clock, color: HEALTH_BAR_COLORS.Schedule },
    { label: 'Risk', score: health.risk_score, icon: ShieldAlert, color: HEALTH_BAR_COLORS.Risk },
    { label: 'Resource', score: health.resource_score, icon: Briefcase, color: HEALTH_BAR_COLORS.Resource },
  ];

  const redCount = exec.red_projects?.length || 0;
  const overdueCount = exec.overdue_milestones?.length || 0;
  const riskCount = exec.critical_risks?.length || 0;
  const attentionTotal = redCount + overdueCount + riskCount;

  return (
    <div className="space-y-0">
      {/* ---- Header ---- */}
      <PageHeader title="Executive Summary" subtitle="Portfolio overview for leadership">
        <PrintButton />
      </PageHeader>

      <div className="space-y-6">
        {/* ================================================================
            SECTION 1: Hero - Health Gauge + KPI Cards
            ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Central health gauge */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center">
            <HealthScoreGauge score={health.overall_score} size={180} />
            <p className="text-sm font-semibold text-slate-600 mt-4 tracking-wide">Portfolio Health Score</p>
            <p className="text-xs text-slate-400 mt-1">{exec.project_count} projects across {exec.theme_count} clients</p>
          </div>

          {/* KPI cards grid */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard
              label="Total Budget"
              value={formatCurrency(summary.total_budget)}
              icon={Wallet}
              gradient="bg-gradient-to-br from-blue-500 to-blue-700"
            />
            <KPICard
              label="Monthly Cost"
              value={formatCurrency(summary.total_company_cost)}
              icon={DollarSign}
              gradient="bg-gradient-to-br from-amber-500 to-orange-600"
            />
            <KPICard
              label="Monthly Revenue"
              value={formatCurrency(summary.total_client_revenue)}
              icon={BarChart3}
              gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
            />
            <KPICard
              label="Net Margin"
              value={formatPercentage(summary.margin_percentage)}
              icon={Percent}
              gradient="bg-gradient-to-br from-violet-500 to-purple-700"
              trend={marginTrend}
            />
          </div>
        </div>

        {/* ================================================================
            SECTION 2: Health Breakdown Bar
            ================================================================ */}
        <Section title="Health Breakdown" icon={Activity}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {healthBreakdown.map(h => {
              const HIcon = h.icon;
              return (
                <div key={h.label} className="group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${h.color}15` }}>
                        <HIcon size={16} style={{ color: h.color }} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{h.label}</span>
                    </div>
                    <span className={`text-xl font-bold ${scoreColor(h.score)}`}>
                      {h.score ?? 0}
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${h.score ?? 0}%`,
                        backgroundColor: scoreBarHex(h.score),
                        animation: 'grow-width 1.2s ease-out',
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    {h.score >= 71 ? 'On Track' : h.score >= 41 ? 'Needs Attention' : 'Critical'}
                  </p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ================================================================
            SECTION 3: Charts Row - Donut + Bar
            ================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut: Health distribution */}
          <Section title="Project Health Distribution" icon={LayoutGrid}>
            {healthDistribution.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={healthDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={3}
                      label={renderDonutLabel}
                      labelLine={{ strokeWidth: 1, stroke: '#94a3b8' }}
                    >
                      {healthDistribution.map((entry) => (
                        <Cell key={entry.name} fill={RAG_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No health data available</p>
            )}
            {/* Legend */}
            {healthDistribution.length > 0 && (
              <div className="flex items-center justify-center gap-6 mt-2">
                {healthDistribution.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: RAG_COLORS[d.name] }} />
                    <span className="text-xs font-medium text-slate-600">{d.name}</span>
                    <span className="text-xs text-slate-400">({d.value})</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Bar: Budget by Client */}
          <Section title="Budget by Client" icon={Wallet}>
            {budgetByClient.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={budgetByClient} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    width={120}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Budget" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={24} name="Budget" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">No client data available</p>
            )}
          </Section>
        </div>

        {/* ================================================================
            SECTION 4: Attention Required
            ================================================================ */}
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50/50 to-white shadow-sm">
          <div className="flex items-center gap-3 px-6 pt-6 pb-3">
            <div className="p-2 rounded-xl bg-red-100">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Attention Required</h3>
            {attentionTotal > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 px-2.5 py-0.5 text-xs font-bold">
                {attentionTotal} {attentionTotal === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 px-6 pb-6">
            {/* Red Projects */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-red-700">Red Status Projects</h4>
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-600 text-white text-[10px] font-bold px-1.5">
                  {redCount}
                </span>
              </div>
              <div className="space-y-2">
                {(exec.red_projects || []).map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                    <RAGIndicator status="Red" size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.theme_name}</p>
                    </div>
                    <ArrowRight size={14} className="text-slate-300 shrink-0" />
                  </div>
                ))}
                {redCount === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm text-emerald-700">No red projects</span>
                  </div>
                )}
              </div>
            </div>

            {/* Overdue Milestones */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-amber-700">Overdue Milestones</h4>
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5">
                  {overdueCount}
                </span>
              </div>
              <div className="space-y-2">
                {(exec.overdue_milestones || []).map(m => {
                  const days = daysOverdue(m.due_date);
                  return (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                      <Clock size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                        <p className="text-xs text-slate-400 truncate">{m.project_name} &middot; Due {formatDate(m.due_date)}</p>
                      </div>
                      {days > 0 && (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                          {days}d late
                        </span>
                      )}
                    </div>
                  );
                })}
                {overdueCount === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm text-emerald-700">All milestones on track</span>
                  </div>
                )}
              </div>
            </div>

            {/* Critical Risks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-orange-700">Critical Risks</h4>
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-orange-500 text-white text-[10px] font-bold px-1.5">
                  {riskCount}
                </span>
              </div>
              <div className="space-y-2">
                {(exec.critical_risks || []).map(r => (
                  <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                    <ShieldAlert size={16} className="text-orange-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400 truncate">{r.theme_name} · {r.project_name}</p>
                    </div>
                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                      Critical
                    </span>
                  </div>
                ))}
                {riskCount === 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-sm text-emerald-700">No critical risks</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================
            SECTION 5: Key Metrics - Revenue / Cost Trend Area Chart
            ================================================================ */}
        {trendChartData.length > 0 && (
          <Section title="Key Metrics -- Portfolio Trend (6 Months)" icon={TrendingUp}>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#gradRevenue)"
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="Cost"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  fill="url(#gradCost)"
                  dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                  activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-slate-600">Cost</span>
              </div>
            </div>
          </Section>
        )}

        {/* Margin summary */}
        {summary.total_margin !== undefined && summary.total_margin !== null && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm font-medium text-blue-200 uppercase tracking-wide">Total Portfolio Margin</p>
                <p className="text-3xl font-extrabold mt-1">{formatCurrency(summary.total_margin)}</p>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold">{exec.active_count ?? 0}</p>
                  <p className="text-xs text-blue-200">Active Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{summary.resource_count ?? 0}</p>
                  <p className="text-xs text-blue-200">Resources</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inline animation keyframes for health bar grow */}
      <style>{`
        @keyframes grow-width {
          from { width: 0%; }
        }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
