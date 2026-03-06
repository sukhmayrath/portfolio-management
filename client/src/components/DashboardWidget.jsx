import { useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { formatCurrency, formatPercentage, formatDate } from '../utils/formatters';
import { AlertCircle } from 'lucide-react';
import MetricCard from './MetricCard';
import HealthScoreGauge from './HealthScoreGauge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLOR_PALETTES = {
  default: ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#4f46e5', '#c026d3', '#d97706', '#059669'],
  ocean: ['#0ea5e9', '#06b6d4', '#0891b2', '#0d9488', '#14b8a6', '#2dd4bf', '#67e8f9', '#a5f3fc', '#0284c7', '#0369a1'],
  sunset: ['#f97316', '#ef4444', '#f59e0b', '#ec4899', '#e11d48', '#dc2626', '#ea580c', '#d97706', '#fb923c', '#fbbf24'],
  forest: ['#16a34a', '#15803d', '#22c55e', '#4ade80', '#86efac', '#059669', '#10b981', '#34d399', '#166534', '#14532d'],
  corporate: ['#1e40af', '#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8', '#2563eb', '#3730a3', '#4f46e5', '#6366f1'],
  vibrant: ['#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#f43f5e', '#a855f7', '#06b6d4', '#eab308', '#22c55e', '#6366f1'],
  monochrome: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9', '#f8fafc'],
  warm: ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#f97316', '#ef4444', '#f59e0b', '#fbbf24', '#84cc16'],
};

function getColors(config) {
  const palette = config?.color_scheme || 'default';
  return COLOR_PALETTES[palette] || COLOR_PALETTES.default;
}

const CHART_COLORS = COLOR_PALETTES.default;

const RISK_STATUS_COLORS = {
  Open: 'bg-red-100 text-red-700',
  Mitigated: 'bg-blue-100 text-blue-700',
  Closed: 'bg-green-100 text-green-700',
  Accepted: 'bg-amber-100 text-amber-700',
};

function buildQueryString(config) {
  if (!config || typeof config !== 'object') return '';
  const params = new URLSearchParams();
  Object.entries(config).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.append(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function KpiCard({ data, config }) {
  const value = data?.value ?? 0;
  const label = config?.label || config?.metric || 'Metric';
  const metricType = config?.format || config?.metric_type || '';

  let formattedValue = value;
  if (metricType.includes('currency') || metricType.includes('financial')) {
    formattedValue = formatCurrency(value);
  } else if (metricType.includes('percent')) {
    formattedValue = formatPercentage(value);
  } else if (typeof value === 'number' && !Number.isInteger(value)) {
    formattedValue = value.toFixed(1);
  }

  return (
    <MetricCard
      label={label}
      value={formattedValue}
      sublabel={data?.sublabel}
      color={config?.color || 'primary'}
    />
  );
}

function BarChartWidget({ data, config }) {
  const chartData = Array.isArray(data) ? data : data?.items || [];
  const colors = getColors(config);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={{ stroke: '#e2e8f0' }}
        />
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={colors[idx % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartWidget({ data, config }) {
  const chartData = Array.isArray(data) ? data : data?.items || [];
  const colors = getColors(config);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          labelLine={{ strokeWidth: 1, stroke: '#94a3b8' }}
        >
          {chartData.map((_, idx) => (
            <Cell key={idx} fill={colors[idx % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ProjectTable({ data }) {
  const projects = Array.isArray(data) ? data : data?.items || [];

  const healthColor = (health) => {
    if (health === 'Green') return 'text-emerald-600';
    if (health === 'Amber') return 'text-amber-600';
    if (health === 'Red') return 'text-red-600';
    return 'text-slate-500';
  };

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Project
            </th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Status
            </th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Health
            </th>
            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Margin
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 font-medium text-slate-700 truncate max-w-[180px]">
                {project.name}
              </td>
              <td className="px-4 py-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                  {project.status}
                </span>
              </td>
              <td className={`px-4 py-2 font-medium ${healthColor(project.health)}`}>
                {project.health || '—'}
              </td>
              <td className="px-4 py-2 text-right text-slate-600">
                {project.margin != null ? formatPercentage(project.margin) : '—'}
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400 text-xs italic">
                No projects
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HealthGaugeWidget({ data }) {
  const score = data?.score ?? data?.value ?? 0;
  return (
    <div className="flex items-center justify-center py-2">
      <HealthScoreGauge score={score} size={140} />
    </div>
  );
}

function RiskSummary({ data }) {
  // Handle both formats: { by_status: [...] } or flat array or { Open: 3, ... }
  let entries = [];
  if (data?.by_status && Array.isArray(data.by_status)) {
    entries = data.by_status;
  } else if (Array.isArray(data)) {
    entries = data;
  } else if (data?.risks && Array.isArray(data.risks)) {
    entries = data.risks;
  } else if (data?.items && Array.isArray(data.items)) {
    entries = data.items;
  } else if (data && typeof data === 'object') {
    entries = Object.entries(data)
      .filter(([, v]) => typeof v === 'number')
      .map(([status, count]) => ({ status, count }));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((entry) => {
        const status = entry.status || entry.name;
        const count = entry.count ?? entry.value ?? 0;
        const colorClass = RISK_STATUS_COLORS[status] || 'bg-slate-100 text-slate-700';
        return (
          <div
            key={status}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colorClass}`}
          >
            <span className="text-lg font-bold">{count}</span>
            <span className="text-xs font-medium">{status}</span>
          </div>
        );
      })}
      {entries.length === 0 && (
        <p className="text-sm text-slate-400 italic">No risk data</p>
      )}
    </div>
  );
}

function MilestoneTimeline({ data }) {
  const milestones = Array.isArray(data) ? data : data?.items || [];

  return (
    <div className="space-y-3 max-h-52 overflow-y-auto">
      {milestones.map((ms, idx) => {
        const isCompleted = ms.status === 'Completed';
        const isDelayed = ms.status === 'Delayed';
        return (
          <div key={ms.id || idx} className="flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full shrink-0 mt-1 ${
                  isCompleted
                    ? 'bg-emerald-500'
                    : isDelayed
                    ? 'bg-red-500'
                    : 'bg-slate-300'
                }`}
              />
              {idx < milestones.length - 1 && (
                <div className="w-px h-6 bg-slate-200 mt-1" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-sm font-medium text-slate-700 truncate">{ms.name || ms.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-400">
                  {formatDate(ms.due_date || ms.date)}
                </span>
                {ms.status && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-700'
                        : isDelayed
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ms.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {milestones.length === 0 && (
        <p className="text-sm text-slate-400 italic text-center py-4">
          No upcoming milestones
        </p>
      )}
    </div>
  );
}

const WIDGET_RENDERERS = {
  kpi_card: KpiCard,
  bar_chart: BarChartWidget,
  pie_chart: PieChartWidget,
  project_table: ProjectTable,
  health_gauge: HealthGaugeWidget,
  risk_summary: RiskSummary,
  milestone_timeline: MilestoneTimeline,
};

export { COLOR_PALETTES };

export default function DashboardWidget({ widget }) {
  const queryString = useMemo(
    () => buildQueryString(widget.config),
    [widget.config]
  );

  const { data, loading, error } = useApi(
    `/custom-dashboards/widget-data/${widget.type}${queryString}`
  );

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-hidden">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-6 text-slate-400">
          <AlertCircle size={24} className="mb-2" />
          <p className="text-sm">Failed to load widget</p>
        </div>
      </div>
    );
  }

  const Renderer = WIDGET_RENDERERS[widget.type];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-hidden">
      {widget.config?.title && (
        <h4 className="text-sm font-semibold text-slate-700 mb-3">
          {widget.config.title}
        </h4>
      )}

      {Renderer ? (
        <Renderer data={data} config={widget.config} />
      ) : (
        <p className="text-sm text-slate-400 italic text-center py-6">
          Unknown widget type: {widget.type}
        </p>
      )}
    </div>
  );
}
