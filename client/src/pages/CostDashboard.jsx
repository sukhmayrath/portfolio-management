import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { DollarSign, TrendingUp, TrendingDown, Building, Users, Search, ChevronDown, ArrowUpRight, ArrowDownRight, Briefcase } from 'lucide-react';
import ExportButton from '../components/ExportButton';
import PrintButton from '../components/PrintButton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'themes', label: 'Client Analysis' },
  { key: 'resources', label: 'Resource Costs' },
];

function truncate(str, len = 22) {
  return str.length > len ? str.substring(0, len) + '...' : str;
}

/* ─── Shared Components ─── */

function KpiCard({ label, value, sublabel, icon: Icon, color }) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    emerald: 'from-emerald-500 to-emerald-600',
    violet: 'from-violet-500 to-violet-600',
    rose: 'from-rose-500 to-rose-600',
  };
  const bg = colorMap[color] || colorMap.blue;
  return (
    <div className={`bg-gradient-to-br ${bg} rounded-xl p-5 text-white shadow-lg`}>
      <div className="bg-white/15 rounded-lg p-2 w-fit mb-3">
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-white/70 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1 tracking-tight">{value}</p>
      {sublabel && <p className="text-white/60 text-xs mt-1">{sublabel}</p>}
    </div>
  );
}

function DarkTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const fmt = valueFormatter || (v => formatCurrency(v));
  return (
    <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-700">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="font-medium ml-auto">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

/* ─── Main ─── */

export default function CostDashboard() {
  const { data: summary, loading: l1 } = useApi('/dashboard/summary');
  const { data: analysis, loading: l2 } = useApi('/dashboard/margin-analysis');
  const { data: costData, loading: l3 } = useApi('/dashboard/resource-costs');
  const { data: themeData, loading: l4 } = useApi('/dashboard/cost-breakdown');

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedThemeId, setSelectedThemeId] = useState(null);
  const [resourceSearch, setResourceSearch] = useState('');

  if (l1 || l2 || l3 || l4) return <div className="p-8 text-center text-slate-500">Loading cost data...</div>;

  const projects = analysis || [];
  const themes = themeData || [];
  const resourcePct = summary?.total_company_cost > 0
    ? ((summary?.total_resource_cost / summary?.total_company_cost) * 100).toFixed(0)
    : 0;

  return (
    <div>
      <PageHeader title="Financial Analysis" subtitle="Client cost vs Company cost analysis">
        <PrintButton />
        <ExportButton endpoint="/export/projects" filename="financial-analysis.csv" />
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Client Revenue" value={formatCurrency(summary?.total_client_revenue)} sublabel="Monthly billings" icon={DollarSign} color="emerald" />
        <KpiCard label="Company Cost" value={formatCurrency(summary?.total_company_cost)} sublabel="Monthly total" icon={Building} color="amber" />
        <KpiCard label="Resource Cost" value={formatCurrency(summary?.total_resource_cost)} sublabel={`${resourcePct}% of total cost`} icon={Users} color="blue" />
        <KpiCard label="Net Margin" value={formatPercentage(summary?.margin_percentage)} sublabel={formatCurrency(summary?.total_margin) + '/mo'} icon={summary?.margin_percentage >= 0 ? TrendingUp : TrendingDown} color={summary?.margin_percentage >= 0 ? 'violet' : 'rose'} />
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab themes={themes} projects={projects} summary={summary} />
      )}
      {activeTab === 'themes' && (
        <ThemeAnalysisTab
          themes={themes}
          selectedThemeId={selectedThemeId}
          onSelectTheme={setSelectedThemeId}
        />
      )}
      {activeTab === 'resources' && (
        <ResourceCostsTab
          costData={costData}
          search={resourceSearch}
          onSearchChange={setResourceSearch}
        />
      )}
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ themes, projects, summary }) {
  const themeRevenueCost = themes.map(t => ({
    name: truncate(t.name, 18),
    Revenue: t.client_revenue,
    Cost: t.total_company_cost,
  }));

  const themeCostComposition = themes.map(t => ({
    name: truncate(t.name, 18),
    'Resource Cost': t.resource_cost,
    'Facility Cost': t.facility_cost,
    'Overhead': t.overhead_cost,
  }));

  const sorted = [...projects].sort((a, b) => b.margin_percentage - a.margin_percentage);
  const top10 = sorted.slice(0, 10).map(p => ({
    name: truncate(p.name, 25),
    margin: p.margin_percentage,
    fill: '#10b981',
  }));
  const bottom10 = sorted.slice(-10).reverse().map(p => ({
    name: truncate(p.name, 25),
    margin: p.margin_percentage,
    fill: p.margin_percentage >= 0 ? '#f59e0b' : '#ef4444',
  }));

  return (
    <div className="space-y-6">
      {/* Theme-level charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Revenue vs Cost by Client" subtitle="Monthly">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={themeRevenueCost} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} angle={-35} textAnchor="end" height={80} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cost" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Cost Composition by Client" subtitle="Stacked monthly">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={themeCostComposition}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} angle={-35} textAnchor="end" height={80} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Resource Cost" fill="#2563eb" stackId="a" />
              <Bar dataKey="Facility Cost" fill="#7c3aed" stackId="a" />
              <Bar dataKey="Overhead" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Top/Bottom margin projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Top 10 Projects by Margin" subtitle="Highest profitability">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip valueFormatter={v => formatPercentage(v)} />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="margin" name="Margin %" radius={[0, 4, 4, 0]}>
                {top10.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Bottom 10 Projects by Margin" subtitle="Needs attention">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bottom10} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip valueFormatter={v => formatPercentage(v)} />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="margin" name="Margin %" radius={[0, 4, 4, 0]}>
                {bottom10.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Theme summary table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Client Cost Summary</h3>
          <span className="text-xs text-slate-400">Monthly figures</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Client</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Projects</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Resource Cost</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Facility Cost</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Overhead</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-red-50/50">Total Cost</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-emerald-50/50">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {themes.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{t.projects.length}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.resource_cost)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.facility_cost)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(t.overhead_cost)}</td>
                  <td className="px-4 py-3 text-right font-medium bg-red-50/50">{formatCurrency(t.total_company_cost)}</td>
                  <td className="px-4 py-3 text-right font-medium bg-emerald-50/50">{formatCurrency(t.client_revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 font-bold ${t.margin_percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.margin_percentage >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {formatPercentage(t.margin_percentage)}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="px-4 py-3 text-slate-900">Grand Total</td>
                <td className="px-4 py-3 text-center">{themes.reduce((s, t) => s + t.projects.length, 0)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(summary?.total_resource_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(summary?.total_facility_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(summary?.total_overhead_cost)}</td>
                <td className="px-4 py-3 text-right bg-red-50/50">{formatCurrency(summary?.total_company_cost)}</td>
                <td className="px-4 py-3 text-right bg-emerald-50/50">{formatCurrency(summary?.total_client_revenue)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 ${summary?.margin_percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {summary?.margin_percentage >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {formatPercentage(summary?.margin_percentage)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Client Analysis Tab ─── */
function ThemeAnalysisTab({ themes, selectedThemeId, onSelectTheme }) {
  const selected = themes.find(t => t.id === selectedThemeId) || themes[0];

  if (!selected) return <div className="text-slate-500 text-center py-8">No clients available</div>;

  const themeProjects = selected.projects || [];

  const revenueVsCost = themeProjects.map(p => ({
    name: truncate(p.name, 20),
    Revenue: p.client_revenue,
    Cost: p.total_company_cost,
  }));

  const costComp = themeProjects.map(p => ({
    name: truncate(p.name, 20),
    'Resource Cost': p.resource_cost,
    'Facility Cost': p.total_facility_cost,
    'Overhead': p.overhead_cost,
  }));

  const marginData = themeProjects.map(p => ({
    name: truncate(p.name, 25),
    margin: p.margin_percentage,
    fill: p.margin_percentage >= 0 ? '#10b981' : '#ef4444',
  }));

  const isProfit = selected.margin_percentage >= 0;

  return (
    <div className="space-y-6">
      {/* Client selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Select Client:</label>
        <div className="relative">
          <select
            value={selected.id}
            onChange={e => onSelectTheme(Number(e.target.value))}
            className="appearance-none bg-white border border-slate-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            {themes.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.projects.length} projects)
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <span className={`ml-2 px-2.5 py-1 rounded-full text-xs font-medium ${
          selected.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
          selected.status === 'Planning' ? 'bg-blue-100 text-blue-800' :
          selected.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
          'bg-amber-100 text-amber-800'
        }`}>
          {selected.status}
        </span>
      </div>

      {/* Client summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
          <p className="text-emerald-100 text-xs font-medium mb-1">Revenue</p>
          <p className="text-xl font-bold">{formatCurrency(selected.client_revenue)}</p>
          <p className="text-emerald-200 text-xs mt-1">per month</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-4 text-white shadow-lg">
          <p className="text-rose-100 text-xs font-medium mb-1">Total Cost</p>
          <p className="text-xl font-bold">{formatCurrency(selected.total_company_cost)}</p>
          <p className="text-rose-200 text-xs mt-1">per month</p>
        </div>
        <div className={`bg-gradient-to-br ${isProfit ? 'from-blue-500 to-blue-600' : 'from-amber-500 to-amber-600'} rounded-xl p-4 text-white shadow-lg`}>
          <p className="text-white/70 text-xs font-medium mb-1">Net Margin</p>
          <p className="text-xl font-bold">{formatCurrency(selected.margin)}</p>
          <p className="text-white/60 text-xs mt-1">per month</p>
        </div>
        <div className={`bg-gradient-to-br ${isProfit ? 'from-violet-500 to-violet-600' : 'from-red-500 to-red-600'} rounded-xl p-4 text-white shadow-lg`}>
          <p className="text-white/70 text-xs font-medium mb-1">Margin %</p>
          <p className="text-xl font-bold flex items-center gap-1">
            {isProfit ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
            {formatPercentage(selected.margin_percentage)}
          </p>
          <p className="text-white/60 text-xs mt-1">{themeProjects.length} projects</p>
        </div>
      </div>

      {/* Per-project charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Revenue vs Cost by Project">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueVsCost} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cost" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Cost Composition">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={costComp}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" height={60} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<DarkTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Resource Cost" fill="#2563eb" stackId="a" />
              <Bar dataKey="Facility Cost" fill="#7c3aed" stackId="a" />
              <Bar dataKey="Overhead" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Margin chart */}
      <SectionCard title="Profit Margin by Project">
        <ResponsiveContainer width="100%" height={Math.max(180, themeProjects.length * 36)}>
          <BarChart data={marginData} layout="vertical" margin={{ left: 0, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
            <Tooltip content={<DarkTooltip valueFormatter={v => formatPercentage(v)} />} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="margin" name="Margin %" radius={[0, 4, 4, 0]}>
              {marginData.map((e, i) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Project detail table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Project Cost Breakdown — {selected.name}</h3>
          <span className="text-xs text-slate-400">{themeProjects.length} projects</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Project</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Resource</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Facility</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Overhead</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-red-50/50">Total Cost</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 bg-emerald-50/50">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {themeProjects.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                      p.status === 'Planning' ? 'bg-blue-100 text-blue-800' :
                      p.status === 'Completed' ? 'bg-gray-100 text-gray-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.resource_cost)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.total_facility_cost)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.overhead_cost)}</td>
                  <td className="px-4 py-3 text-right font-medium bg-red-50/50">{formatCurrency(p.total_company_cost)}</td>
                  <td className="px-4 py-3 text-right font-medium bg-emerald-50/50">{formatCurrency(p.client_revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 font-bold ${p.margin_percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {p.margin_percentage >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {formatPercentage(p.margin_percentage)}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="px-4 py-3 text-slate-900" colSpan={2}>Client Total</td>
                <td className="px-4 py-3 text-right">{formatCurrency(selected.resource_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(selected.facility_cost)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(selected.overhead_cost)}</td>
                <td className="px-4 py-3 text-right bg-red-50/50">{formatCurrency(selected.total_company_cost)}</td>
                <td className="px-4 py-3 text-right bg-emerald-50/50">{formatCurrency(selected.client_revenue)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 ${selected.margin_percentage >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selected.margin_percentage >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {formatPercentage(selected.margin_percentage)}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Resource Costs Tab ─── */
function ResourceCostsTab({ costData, search, onSearchChange }) {
  const filtered = useMemo(() => {
    if (!costData?.resources) return [];
    if (!search.trim()) return costData.resources;
    const q = search.toLowerCase();
    return costData.resources.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.role.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  }, [costData, search]);

  const filteredTotal = filtered.reduce((s, r) => s + r.total_monthly_cost, 0);
  const filteredHours = filtered.reduce((s, r) => s + r.total_allocated_hours, 0);

  return (
    <div className="space-y-4">
      {/* Search and summary */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by name, role, or department..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500"><span className="font-semibold text-slate-700">{filtered.length}</span> resources</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500"><span className="font-bold text-blue-600">{formatCurrency(filteredTotal)}</span>/mo</span>
        </div>
      </div>

      {/* Resource table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Resource</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Allocated Hrs</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Monthly Cost</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Project Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.role}</td>
                  <td className="px-4 py-3 text-slate-600">{r.department}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(r.hourly_rate)}/hr</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.total_allocated_hours} hrs</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">{formatCurrency(r.total_monthly_cost)}</td>
                  <td className="px-4 py-3">
                    {r.project_costs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {r.project_costs.map(pc => (
                          <span key={pc.project_id} className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            {pc.project_name}: {formatCurrency(pc.cost)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs italic">No allocations</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="px-4 py-3 text-slate-900" colSpan={4}>Total{search && ' (filtered)'}</td>
                <td className="px-4 py-3 text-right">{filteredHours} hrs</td>
                <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(filteredTotal)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
