import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import DashboardWidget, { COLOR_PALETTES } from '../components/DashboardWidget';
import {
  Plus,
  ArrowLeft,
  Settings,
  Trash2,
  Pencil,
  BarChart3,
  BarChart,
  PieChart,
  Table,
  Activity,
  AlertTriangle,
  Calendar,
  Palette,
} from 'lucide-react';

const WIDGET_TYPES = [
  { type: 'kpi_card', label: 'KPI Card', icon: BarChart3, description: 'Single metric display' },
  { type: 'bar_chart', label: 'Bar Chart', icon: BarChart, description: 'Comparative bar chart' },
  { type: 'pie_chart', label: 'Pie Chart', icon: PieChart, description: 'Distribution breakdown' },
  { type: 'project_table', label: 'Project Table', icon: Table, description: 'Project listing' },
  { type: 'health_gauge', label: 'Health Gauge', icon: Activity, description: 'Portfolio health score' },
  { type: 'risk_summary', label: 'Risk Summary', icon: AlertTriangle, description: 'Risk status overview' },
  { type: 'milestone_timeline', label: 'Milestone Timeline', icon: Calendar, description: 'Upcoming milestones' },
];

const KPI_METRICS = [
  { value: 'total_budget', label: 'Total Budget' },
  { value: 'total_revenue', label: 'Total Revenue' },
  { value: 'total_cost', label: 'Total Cost' },
  { value: 'margin_percentage', label: 'Margin Percentage' },
  { value: 'project_count', label: 'Project Count' },
  { value: 'resource_count', label: 'Resource Count' },
  { value: 'total_margin', label: 'Total Margin' },
];

const BAR_DATA_SOURCES = [
  { value: 'cost_breakdown', label: 'Cost Breakdown' },
  { value: 'margin_analysis', label: 'Margin Analysis' },
];

const PIE_DATA_SOURCES = [
  { value: 'health_summary', label: 'Health Summary' },
  { value: 'risk_summary', label: 'Risk Summary' },
  { value: 'project_status', label: 'Project Status' },
];

const PALETTE_NAMES = Object.keys(COLOR_PALETTES);

function getDefaultConfig(type) {
  switch (type) {
    case 'kpi_card':
      return { config: { metric: 'project_count', label: '', format: '' }, w: 3, h: 1 };
    case 'bar_chart':
      return { config: { data_source: 'cost_breakdown', limit: 10, title: 'Bar Chart', color_scheme: 'default' }, w: 6, h: 2 };
    case 'pie_chart':
      return { config: { data_source: 'health_summary', title: 'Pie Chart', color_scheme: 'default' }, w: 4, h: 2 };
    case 'project_table':
      return { config: { status: '', health_status: '', title: 'Projects' }, w: 6, h: 2 };
    case 'health_gauge':
      return { config: { title: 'Portfolio Health' }, w: 3, h: 2 };
    case 'risk_summary':
      return { config: { title: 'Risk Summary' }, w: 4, h: 1 };
    case 'milestone_timeline':
      return { config: { title: 'Milestones' }, w: 6, h: 2 };
    default:
      return { config: {}, w: 6, h: 2 };
  }
}

const emptyWidgetForm = { type: '', config: {}, x: 0, y: 0, w: 6, h: 2 };

function ColorPaletteSelector({ value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-2">
        <span className="flex items-center gap-1.5"><Palette size={12} /> Color Scheme</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {PALETTE_NAMES.map(name => {
          const colors = COLOR_PALETTES[name];
          const isSelected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex gap-0.5 shrink-0">
                {colors.slice(0, 5).map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
              <span className="text-xs font-medium text-slate-700 capitalize">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WidgetConfigForm({ widgetForm, setWidgetForm, updateConfig, mode }) {
  const hasColorScheme = ['bar_chart', 'pie_chart'].includes(widgetForm.type);

  return (
    <>
      {/* Selected type indicator */}
      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
        <div className="flex items-center gap-2">
          {(() => {
            const wt = WIDGET_TYPES.find(w => w.type === widgetForm.type);
            const Icon = wt?.icon || BarChart3;
            return (
              <>
                <Icon size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-800">{wt?.label || widgetForm.type}</span>
              </>
            );
          })()}
        </div>
        {mode === 'add' && (
          <button
            type="button"
            onClick={() => setWidgetForm({ ...emptyWidgetForm })}
            className="text-xs text-primary hover:underline"
          >
            Change type
          </button>
        )}
      </div>

      {/* KPI Card config */}
      {widgetForm.type === 'kpi_card' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Metric</label>
            <select
              value={widgetForm.config.metric || ''}
              onChange={e => updateConfig('metric', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {KPI_METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Label (optional)</label>
            <input
              value={widgetForm.config.label || ''}
              onChange={e => updateConfig('label', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Custom label"
            />
          </div>
        </div>
      )}

      {/* Bar Chart config */}
      {widgetForm.type === 'bar_chart' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data Source</label>
            <select
              value={widgetForm.config.data_source || ''}
              onChange={e => updateConfig('data_source', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {BAR_DATA_SOURCES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Limit</label>
            <input
              type="number"
              value={widgetForm.config.limit || 10}
              onChange={e => updateConfig('limit', Number(e.target.value))}
              min="1"
              max="50"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input
              value={widgetForm.config.title || ''}
              onChange={e => updateConfig('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {/* Pie Chart config */}
      {widgetForm.type === 'pie_chart' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data Source</label>
            <select
              value={widgetForm.config.data_source || ''}
              onChange={e => updateConfig('data_source', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {PIE_DATA_SOURCES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input
              value={widgetForm.config.title || ''}
              onChange={e => updateConfig('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {/* Project Table config */}
      {widgetForm.type === 'project_table' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Filter by Status</label>
            <select
              value={widgetForm.config.status || ''}
              onChange={e => updateConfig('status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All statuses</option>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Filter by Health</label>
            <select
              value={widgetForm.config.health_status || ''}
              onChange={e => updateConfig('health_status', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All health</option>
              <option value="Green">Green</option>
              <option value="Amber">Amber</option>
              <option value="Red">Red</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
            <input
              value={widgetForm.config.title || ''}
              onChange={e => updateConfig('title', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      )}

      {/* Simple title for gauge/risk/milestone */}
      {['health_gauge', 'risk_summary', 'milestone_timeline'].includes(widgetForm.type) && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
          <input
            value={widgetForm.config.title || ''}
            onChange={e => updateConfig('title', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      {/* Color Scheme for chart types */}
      {hasColorScheme && (
        <ColorPaletteSelector
          value={widgetForm.config.color_scheme || 'default'}
          onChange={val => updateConfig('color_scheme', val)}
        />
      )}
    </>
  );
}

export default function CustomDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: dashboard, loading, error, refetch } = useApi(`/custom-dashboards/${id}`);
  const { mutate } = useMutation();

  const [editMode, setEditMode] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showEditWidget, setShowEditWidget] = useState(false);
  const [editWidgetIdx, setEditWidgetIdx] = useState(null);
  const [widgetForm, setWidgetForm] = useState({ ...emptyWidgetForm });
  const [deleteWidgetIdx, setDeleteWidgetIdx] = useState(null);

  const parseSafe = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };

  const layout = useMemo(() => parseSafe(dashboard?.layout), [dashboard?.layout]);

  const updateConfig = (key, value) => {
    setWidgetForm(prev => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const handleTypeSelect = (type) => {
    const defaults = getDefaultConfig(type);
    setWidgetForm({
      ...widgetForm,
      type,
      config: defaults.config,
      w: defaults.w,
      h: defaults.h,
    });
  };

  const handleAddWidget = async (e) => {
    e.preventDefault();
    if (!widgetForm.type) return;
    const newWidget = {
      type: widgetForm.type,
      config: widgetForm.config,
      x: Number(widgetForm.x) || 0,
      y: Number(widgetForm.y) || 0,
      w: Number(widgetForm.w) || 6,
      h: Number(widgetForm.h) || 2,
    };
    const newLayout = [...layout, newWidget];
    await mutate('put', `/custom-dashboards/${id}`, { layout: newLayout });
    setShowAddWidget(false);
    setWidgetForm({ ...emptyWidgetForm });
    refetch();
  };

  const openEditWidget = (idx) => {
    const widget = layout[idx];
    setEditWidgetIdx(idx);
    setWidgetForm({
      type: widget.type,
      config: { ...widget.config },
      x: widget.x || 0,
      y: widget.y || 0,
      w: widget.w || 6,
      h: widget.h || 2,
    });
    setShowEditWidget(true);
  };

  const handleEditWidget = async (e) => {
    e.preventDefault();
    if (editWidgetIdx == null) return;
    const newLayout = layout.map((w, i) => {
      if (i === editWidgetIdx) {
        return {
          ...w,
          type: widgetForm.type,
          config: widgetForm.config,
          x: Number(widgetForm.x) || 0,
          y: Number(widgetForm.y) || 0,
          w: Number(widgetForm.w) || 6,
          h: Number(widgetForm.h) || 2,
        };
      }
      return w;
    });
    await mutate('put', `/custom-dashboards/${id}`, { layout: newLayout });
    setShowEditWidget(false);
    setEditWidgetIdx(null);
    setWidgetForm({ ...emptyWidgetForm });
    refetch();
  };

  const handleDeleteWidget = async () => {
    if (deleteWidgetIdx == null) return;
    const newLayout = layout.filter((_, i) => i !== deleteWidgetIdx);
    await mutate('put', `/custom-dashboards/${id}`, { layout: newLayout });
    setDeleteWidgetIdx(null);
    refetch();
  };

  const handleWidgetPositionChange = async (idx, field, value) => {
    const newLayout = layout.map((w, i) => {
      if (i === idx) return { ...w, [field]: Number(value) || 0 };
      return w;
    });
    await mutate('put', `/custom-dashboards/${id}`, { layout: newLayout });
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Failed to load dashboard: {error}</div>;
  if (!dashboard) return <div className="p-8 text-center text-slate-500">Dashboard not found</div>;

  return (
    <div>
      <PageHeader title={dashboard.name} subtitle={dashboard.description || 'Custom dashboard'}>
        <button onClick={() => navigate('/dashboards')} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${editMode ? 'text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
        >
          <Settings size={16} /> {editMode ? 'Done Editing' : 'Edit Layout'}
        </button>
        <button
          onClick={() => { setWidgetForm({ ...emptyWidgetForm }); setShowAddWidget(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
        >
          <Plus size={16} /> Add Widget
        </button>
      </PageHeader>

      {/* Widget Grid */}
      {layout.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-3">No widgets yet. Add your first widget to get started.</p>
          <button
            onClick={() => { setWidgetForm({ ...emptyWidgetForm }); setShowAddWidget(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
          >
            <Plus size={16} /> Add Widget
          </button>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {layout.map((widget, idx) => (
            <div
              key={idx}
              style={{
                gridColumn: `${(widget.x || 0) + 1} / span ${widget.w || 6}`,
                gridRow: `${(widget.y || 0) + 1} / span ${widget.h || 2}`,
              }}
              className={editMode ? 'relative ring-2 ring-dashed ring-amber-300 rounded-xl' : 'relative group'}
            >
              <DashboardWidget widget={widget} />

              {/* Non-edit mode: hover edit button */}
              {!editMode && (
                <button
                  onClick={() => openEditWidget(idx)}
                  className="absolute top-2 right-2 p-1.5 bg-white/80 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Edit widget"
                >
                  <Pencil size={14} />
                </button>
              )}

              {/* Edit mode overlay */}
              {editMode && (
                <div className="absolute top-0 left-0 right-0 bg-amber-50/90 border-b border-amber-200 rounded-t-xl px-3 py-2 flex items-center gap-2 z-10">
                  <div className="flex items-center gap-1 text-[10px] text-amber-700">
                    <label>x:</label>
                    <input type="number" value={widget.x || 0} onChange={e => handleWidgetPositionChange(idx, 'x', e.target.value)} min="0" max="11" className="w-10 px-1 py-0.5 border border-amber-300 rounded text-[10px] text-center" />
                    <label className="ml-1">y:</label>
                    <input type="number" value={widget.y || 0} onChange={e => handleWidgetPositionChange(idx, 'y', e.target.value)} min="0" max="20" className="w-10 px-1 py-0.5 border border-amber-300 rounded text-[10px] text-center" />
                    <label className="ml-1">w:</label>
                    <input type="number" value={widget.w || 6} onChange={e => handleWidgetPositionChange(idx, 'w', e.target.value)} min="1" max="12" className="w-10 px-1 py-0.5 border border-amber-300 rounded text-[10px] text-center" />
                    <label className="ml-1">h:</label>
                    <input type="number" value={widget.h || 2} onChange={e => handleWidgetPositionChange(idx, 'h', e.target.value)} min="1" max="4" className="w-10 px-1 py-0.5 border border-amber-300 rounded text-[10px] text-center" />
                  </div>
                  <div className="flex-1" />
                  <button
                    onClick={() => openEditWidget(idx)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                    title="Edit widget settings"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteWidgetIdx(idx)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Remove widget"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Widget Modal */}
      <Modal isOpen={showAddWidget} onClose={() => setShowAddWidget(false)} title="Add Widget" wide>
        <form onSubmit={handleAddWidget} className="space-y-4">
          {!widgetForm.type ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Widget Type</label>
              <div className="grid grid-cols-2 gap-3">
                {WIDGET_TYPES.map(({ type, label, icon: Icon, description }) => (
                  <button key={type} type="button" onClick={() => handleTypeSelect(type)} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left">
                    <div className="p-2 bg-slate-100 rounded-lg shrink-0"><Icon size={20} className="text-slate-600" /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <WidgetConfigForm widgetForm={widgetForm} setWidgetForm={setWidgetForm} updateConfig={updateConfig} mode="add" />

              {/* Position Controls */}
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Position & Size</h4>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'X (0-11)', key: 'x', min: 0, max: 11 },
                    { label: 'Y (0-20)', key: 'y', min: 0, max: 20 },
                    { label: 'Width (1-12)', key: 'w', min: 1, max: 12 },
                    { label: 'Height (1-4)', key: 'h', min: 1, max: 4 },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                      <input
                        type="number"
                        value={widgetForm[f.key]}
                        onChange={e => setWidgetForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        min={f.min}
                        max={f.max}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowAddWidget(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Add Widget</button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Edit Widget Modal */}
      <Modal isOpen={showEditWidget} onClose={() => { setShowEditWidget(false); setEditWidgetIdx(null); }} title="Edit Widget" wide>
        <form onSubmit={handleEditWidget} className="space-y-4">
          <WidgetConfigForm widgetForm={widgetForm} setWidgetForm={setWidgetForm} updateConfig={updateConfig} mode="edit" />

          {/* Position Controls */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Position & Size</h4>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'X (0-11)', key: 'x', min: 0, max: 11 },
                { label: 'Y (0-20)', key: 'y', min: 0, max: 20 },
                { label: 'Width (1-12)', key: 'w', min: 1, max: 12 },
                { label: 'Height (1-4)', key: 'h', min: 1, max: 4 },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                  <input
                    type="number"
                    value={widgetForm[f.key]}
                    onChange={e => setWidgetForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    min={f.min}
                    max={f.max}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowEditWidget(false); setEditWidgetIdx(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* Delete Widget Confirmation */}
      <ConfirmDialog
        isOpen={deleteWidgetIdx != null}
        onClose={() => setDeleteWidgetIdx(null)}
        onConfirm={handleDeleteWidget}
        title="Remove Widget"
        message="Are you sure you want to remove this widget from the dashboard?"
      />
    </div>
  );
}
