import { useState, useMemo } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate } from '../utils/formatters';
import { Plus, Pencil, Trash2, Power, ChevronDown } from 'lucide-react';

const ENTITIES = ['project', 'task', 'risk', 'milestone'];

const ENTITY_FIELDS = {
  project: ['status', 'health_status'],
  task: ['status'],
  risk: ['status', 'likelihood', 'impact'],
  milestone: ['status'],
};

const FIELD_VALUES = {
  project: {
    status: ['Planning', 'Active', 'Completed', 'On Hold'],
    health_status: ['Green', 'Amber', 'Red'],
  },
  task: {
    status: ['To Do', 'In Progress', 'Done'],
  },
  risk: {
    status: ['Open', 'Mitigated', 'Closed', 'Accepted'],
    likelihood: ['Very Low', 'Low', 'Medium', 'High', 'Very High'],
    impact: ['Very Low', 'Low', 'Medium', 'High', 'Very High'],
  },
  milestone: {
    status: ['Pending', 'In Progress', 'Completed', 'Delayed', 'Missed', 'Cancelled'],
  },
};

const ACTION_TYPES = ['notification', 'status_change', 'field_update'];

const ACTION_BADGES = {
  notification: 'bg-blue-100 text-blue-800',
  status_change: 'bg-amber-100 text-amber-800',
  field_update: 'bg-purple-100 text-purple-800',
};

const SEVERITY_OPTIONS = ['info', 'warning', 'critical'];

const PRESET_TEMPLATES = [
  {
    label: 'Alert on Red Health',
    config: {
      name: 'Alert on Red Health',
      trigger_entity: 'project',
      trigger_field: 'health_status',
      trigger_value: 'Red',
      action_type: 'notification',
      action_config: { message: 'Project health has turned Red - immediate attention required', severity: 'critical' },
    },
  },
  {
    label: 'Notify on Critical Risk',
    config: {
      name: 'Notify on Critical Risk',
      trigger_entity: 'risk',
      trigger_field: 'likelihood',
      trigger_value: 'Very High',
      action_type: 'notification',
      action_config: { message: 'A risk has been marked as Very High likelihood', severity: 'warning' },
    },
  },
  {
    label: 'Alert on Overdue Milestone',
    config: {
      name: 'Alert on Overdue Milestone',
      trigger_entity: 'milestone',
      trigger_field: 'status',
      trigger_value: 'Missed',
      action_type: 'notification',
      action_config: { message: 'A milestone has been missed - review timeline', severity: 'warning' },
    },
  },
  {
    label: 'Notify on Task Completion',
    config: {
      name: 'Notify on Task Completion',
      trigger_entity: 'task',
      trigger_field: 'status',
      trigger_value: 'Done',
      action_type: 'notification',
      action_config: { message: 'A task has been completed', severity: 'info' },
    },
  },
  {
    label: 'Alert on Over-allocation',
    config: {
      name: 'Alert on Over-allocation',
      trigger_entity: 'project',
      trigger_field: 'health_status',
      trigger_value: 'Red',
      action_type: 'notification',
      action_config: { message: 'Project health is Red - possible resource over-allocation', severity: 'critical' },
    },
  },
];

const emptyForm = {
  name: '',
  trigger_entity: 'project',
  trigger_field: 'status',
  trigger_value: '',
  action_type: 'notification',
  action_config: { message: '', severity: 'info' },
  is_active: true,
};

export default function Automations() {
  const { data: rules, loading, refetch } = useApi('/automations');
  const { mutate } = useMutation();

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showPresets, setShowPresets] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const availableFields = useMemo(
    () => ENTITY_FIELDS[form.trigger_entity] || [],
    [form.trigger_entity]
  );

  const availableValues = useMemo(
    () => (FIELD_VALUES[form.trigger_entity] && FIELD_VALUES[form.trigger_entity][form.trigger_field]) || [],
    [form.trigger_entity, form.trigger_field]
  );

  const parseConfig = (val) => {
    if (typeof val === 'object' && val !== null) return val;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return {}; }
    }
    return {};
  };

  const formatTrigger = (row) => {
    const entity = row.trigger_entity || '?';
    const field = row.trigger_field || '?';
    const value = row.trigger_value || '?';
    return `When ${entity}.${field} = "${value}"`;
  };

  const columns = [
    { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-slate-900">{v}</span> },
    {
      key: 'trigger_entity',
      label: 'Trigger',
      render: (_, row) => (
        <span className="text-xs text-slate-600 font-mono bg-slate-100 px-2 py-1 rounded">
          {formatTrigger(row)}
        </span>
      ),
    },
    {
      key: 'action_type',
      label: 'Action',
      render: (v) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_BADGES[v] || 'bg-slate-100 text-slate-800'}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Active',
      align: 'center',
      render: (v) => (
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${v ? 'bg-emerald-500' : 'bg-red-400'}`} />
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (v) => formatDate(v),
    },
    {
      key: 'id',
      label: '',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleActive(row); }}
            className={`p-1.5 rounded hover:bg-slate-100 ${row.is_active ? 'text-emerald-600' : 'text-slate-400'}`}
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            <Power size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50"
            title="Edit rule"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(row); }}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
            title="Delete rule"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const handleToggleActive = async (row) => {
    await mutate('put', `/automations/${row.id}`, { is_active: !row.is_active });
    refetch();
  };

  const handleEdit = (row) => {
    const config = parseConfig(row.action_config);
    setEditingRule(row);
    setForm({
      name: row.name,
      trigger_entity: row.trigger_entity || 'project',
      trigger_field: row.trigger_field || 'status',
      trigger_value: row.trigger_value || '',
      action_type: row.action_type || 'notification',
      action_config: config,
      is_active: !!row.is_active,
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setForm({ ...emptyForm });
    setShowPresets(false);
    setShowModal(true);
  };

  const handlePresetSelect = (preset) => {
    setForm({
      ...preset.config,
      is_active: true,
    });
    setShowPresets(false);
  };

  const handleEntityChange = (entity) => {
    const fields = ENTITY_FIELDS[entity] || [];
    const firstField = fields[0] || '';
    setForm({
      ...form,
      trigger_entity: entity,
      trigger_field: firstField,
      trigger_value: '',
    });
  };

  const handleFieldChange = (field) => {
    setForm({ ...form, trigger_field: field, trigger_value: '' });
  };

  const handleActionTypeChange = (type) => {
    let defaultConfig = {};
    if (type === 'notification') defaultConfig = { message: '', severity: 'info' };
    else if (type === 'status_change') defaultConfig = { target_entity: '', target_field: '', target_value: '' };
    else if (type === 'field_update') defaultConfig = { field: '', value: '' };
    setForm({ ...form, action_type: type, action_config: defaultConfig });
  };

  const updateActionConfig = (key, value) => {
    setForm({ ...form, action_config: { ...form.action_config, [key]: value } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      trigger_entity: form.trigger_entity,
      trigger_field: form.trigger_field,
      trigger_value: form.trigger_value,
      action_type: form.action_type,
      action_config: form.action_config,
      is_active: form.is_active,
    };
    if (editingRule) {
      await mutate('put', `/automations/${editingRule.id}`, payload);
    } else {
      await mutate('post', '/automations', payload);
    }
    setShowModal(false);
    setEditingRule(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await mutate('delete', `/automations/${deleteConfirm.id}`);
    setDeleteConfirm(null);
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading automation rules...</div>;

  return (
    <div>
      <PageHeader title="Automation Rules" subtitle="Automated workflows triggered by data changes">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
        >
          <Plus size={16} /> Create Rule
        </button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={rules || []}
        emptyMessage="No automation rules configured yet."
      />

      {/* Create / Edit Rule Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingRule(null); }} title={editingRule ? 'Edit Rule' : 'Create Automation Rule'} wide>
        <div className="space-y-4">
          {/* Preset Templates */}
          {!editingRule && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 w-full justify-between"
              >
                <span>Pre-built Templates</span>
                <ChevronDown size={16} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
              </button>
              {showPresets && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {PRESET_TEMPLATES.map((preset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePresetSelect(preset)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rule Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Alert on Red Health"
              />
            </div>

            {/* Trigger Section */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Trigger</h4>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Entity</label>
                  <select
                    value={form.trigger_entity}
                    onChange={(e) => handleEntityChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Field</label>
                  <select
                    value={form.trigger_field}
                    onChange={(e) => handleFieldChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {availableFields.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Value</label>
                  {availableValues.length > 0 ? (
                    <select
                      value={form.trigger_value}
                      onChange={(e) => setForm({ ...form, trigger_value: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select...</option>
                      {availableValues.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : (
                    <input
                      value={form.trigger_value}
                      onChange={(e) => setForm({ ...form, trigger_value: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Enter value"
                    />
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono">
                When {form.trigger_entity}.{form.trigger_field} = "{form.trigger_value || '...'}"
              </p>
            </div>

            {/* Action Section */}
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">Action</h4>
              <div className="mb-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Action Type</label>
                <select
                  value={form.action_type}
                  onChange={(e) => handleActionTypeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {ACTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {form.action_type === 'notification' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Message</label>
                    <textarea
                      value={form.action_config.message || ''}
                      onChange={(e) => updateActionConfig('message', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Notification message..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Severity</label>
                    <select
                      value={form.action_config.severity || 'info'}
                      onChange={(e) => updateActionConfig('severity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.action_type === 'status_change' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Target Entity</label>
                    <select
                      value={form.action_config.target_entity || ''}
                      onChange={(e) => updateActionConfig('target_entity', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select...</option>
                      {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Target Field</label>
                    <input
                      value={form.action_config.target_field || ''}
                      onChange={(e) => updateActionConfig('target_field', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. status"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Target Value</label>
                    <input
                      value={form.action_config.target_value || ''}
                      onChange={(e) => updateActionConfig('target_value', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. On Hold"
                    />
                  </div>
                </div>
              )}

              {form.action_type === 'field_update' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Field Name</label>
                    <input
                      value={form.action_config.field || ''}
                      onChange={(e) => updateActionConfig('field', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. priority"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">New Value</label>
                    <input
                      value={form.action_config.value || ''}
                      onChange={(e) => updateActionConfig('value', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g. High"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-checked:bg-primary rounded-full peer-focus:ring-2 peer-focus:ring-primary/50 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-sm text-slate-700">Rule is active</span>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowModal(false); setEditingRule(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Rule"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
