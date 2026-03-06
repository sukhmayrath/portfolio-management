import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import KanbanBoard from '../components/KanbanBoard';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Plus, LayoutGrid, Table, ChevronRight } from 'lucide-react';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const PRIORITY_COLORS = {
  Critical: 'bg-red-100 text-red-800',
  High: 'bg-amber-100 text-amber-800',
  Medium: 'bg-blue-100 text-blue-800',
  Low: 'bg-slate-100 text-slate-800',
};

const KANBAN_COLUMNS = [
  { id: 'Draft', title: 'Draft', color: '#64748b' },
  { id: 'Submitted', title: 'Submitted', color: '#3b82f6' },
  { id: 'Under Review', title: 'Under Review', color: '#f59e0b' },
  { id: 'Approved', title: 'Approved', color: '#22c55e' },
  { id: 'Rejected', title: 'Rejected', color: '#ef4444' },
];

const VALID_TRANSITIONS = {
  Draft: ['Submitted'],
  Submitted: ['Under Review', 'Draft'],
  'Under Review': ['Approved', 'Rejected', 'Submitted'],
  Approved: ['Under Review'],
  Rejected: ['Draft', 'Submitted'],
};

const emptyForm = {
  title: '',
  description: '',
  theme_id: '',
  business_justification: '',
  estimated_budget: '',
  estimated_timeline: '',
  priority: 'Medium',
  strategic_alignment: 3,
  financial_impact: 3,
  risk_level: 3,
  resource_availability: 3,
};

function calculateScore({ strategic_alignment, financial_impact, risk_level, resource_availability }) {
  const sa = Number(strategic_alignment) || 0;
  const fi = Number(financial_impact) || 0;
  const rl = Number(risk_level) || 0;
  const ra = Number(resource_availability) || 0;
  return ((sa * 0.3 + fi * 0.3 + (6 - rl) * 0.2 + ra * 0.2) / 5) * 100;
}

function ScoreBar({ score, small }) {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 ${small ? 'h-1.5' : 'h-2'} bg-slate-200 rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`${small ? 'text-[10px]' : 'text-xs'} font-medium text-slate-600 min-w-[32px] text-right`}>{pct.toFixed(0)}%</span>
    </div>
  );
}

export default function DemandPipeline() {
  const { data: requests, loading, refetch } = useApi('/requests');
  const { data: themes } = useApi('/themes');
  const { mutate } = useMutation();
  const navigate = useNavigate();

  const [view, setView] = useState('kanban');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [reviewNotes, setReviewNotes] = useState('');
  const [convertForm, setConvertForm] = useState({
    theme_id: '',
    start_date: '',
    end_date: '',
    client_billing_rate_per_hour: '',
    fixed_facility_cost_monthly: '',
    overhead_percentage: '',
  });

  const scorePreview = useMemo(() => calculateScore(form), [form.strategic_alignment, form.financial_impact, form.risk_level, form.resource_availability]);

  const columns = [
    { key: 'title', label: 'Title', render: (v) => <span className="font-medium text-slate-900">{v}</span> },
    { key: 'theme_name', label: 'Client', render: (v) => v ? <span className="text-slate-700">{v}</span> : <span className="text-slate-400">—</span> },
    { key: 'requester_name', label: 'Requester' },
    {
      key: 'priority',
      label: 'Priority',
      render: (v) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[v] || PRIORITY_COLORS.Medium}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'total_score',
      label: 'Score',
      render: (v) => <ScoreBar score={v} />,
    },
    {
      key: 'estimated_budget',
      label: 'Est. Budget',
      align: 'right',
      render: (v) => formatCurrency(v),
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (v) => formatDate(v),
    },
  ];

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    await mutate('post', '/requests', {
      ...form,
      theme_id: form.theme_id ? Number(form.theme_id) : null,
      estimated_budget: Number(form.estimated_budget) || 0,
      strategic_alignment: Number(form.strategic_alignment),
      financial_impact: Number(form.financial_impact),
      risk_level: Number(form.risk_level),
      resource_availability: Number(form.resource_availability),
    });
    setShowCreateModal(false);
    setForm({ ...emptyForm });
    refetch();
  };

  const handleStatusChange = async (id, newStatus) => {
    const item = (requests || []).find((r) => r.id === id);
    if (!item) return;
    const allowed = VALID_TRANSITIONS[item.status] || [];
    if (!allowed.includes(newStatus)) return;
    await mutate('put', `/requests/${id}`, { status: newStatus });
    refetch();
  };

  const handleRowClick = (row) => {
    setSelectedRequest(row);
    setReviewNotes('');
    setShowDetailModal(true);
  };

  const handleReview = async (decision) => {
    await mutate('put', `/requests/${selectedRequest.id}`, {
      status: decision,
      review_notes: reviewNotes,
    });
    setShowDetailModal(false);
    refetch();
  };

  const handleOpenConvert = () => {
    setConvertForm({
      theme_id: selectedRequest?.theme_id || '',
      start_date: '',
      end_date: '',
      client_billing_rate_per_hour: '',
      fixed_facility_cost_monthly: '',
      overhead_percentage: '',
    });
    setShowConvertModal(true);
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    const result = await mutate('post', `/requests/${selectedRequest.id}/convert`, {
      ...convertForm,
      theme_id: Number(convertForm.theme_id),
      client_billing_rate_per_hour: Number(convertForm.client_billing_rate_per_hour) || 0,
      fixed_facility_cost_monthly: Number(convertForm.fixed_facility_cost_monthly) || 0,
      overhead_percentage: Number(convertForm.overhead_percentage) || 0,
    });
    setShowConvertModal(false);
    setShowDetailModal(false);
    if (result?.project?.id) {
      navigate(`/projects/${result.project.id}`);
    } else {
      refetch();
    }
  };

  const renderKanbanCard = (item) => (
    <div className="space-y-2" onClick={() => handleRowClick(item)}>
      {/* Client badge */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${item.theme_name ? 'bg-primary/60' : 'bg-slate-300'}`} />
        <span className={`text-[11px] font-medium truncate ${item.theme_name ? 'text-primary/80' : 'text-slate-400 italic'}`}>
          {item.theme_name || 'No client assigned'}
        </span>
      </div>

      {/* Project / Request title */}
      <p className="text-sm font-semibold text-slate-800 leading-snug">{item.title}</p>

      {/* Description snippet */}
      {item.description && (
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{item.description}</p>
      )}

      {/* Requester + budget row */}
      <div className="flex items-center justify-between gap-2">
        {item.requester_name ? (
          <span className="text-[11px] text-slate-500 truncate">by {item.requester_name}</span>
        ) : <span />}
        {item.estimated_budget > 0 && (
          <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{formatCurrency(item.estimated_budget)}</span>
        )}
      </div>

      {/* Priority + timeline row */}
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.Medium}`}>
          {item.priority}
        </span>
        {item.estimated_timeline && (
          <span className="text-[10px] text-slate-400">{item.estimated_timeline}</span>
        )}
      </div>

      {/* Score bar */}
      {item.total_score != null && <ScoreBar score={item.total_score} small />}
    </div>
  );

  if (loading) return <div className="p-8 text-center text-slate-500">Loading pipeline...</div>;

  const detailScores = selectedRequest ? [
    { label: 'Strategic Alignment', value: selectedRequest.strategic_alignment, weight: '30%' },
    { label: 'Financial Impact', value: selectedRequest.financial_impact, weight: '30%' },
    { label: 'Risk Level', value: selectedRequest.risk_level, weight: '20%', inverted: true },
    { label: 'Resource Availability', value: selectedRequest.resource_availability, weight: '20%' },
  ] : [];

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Project intake and approval workflow">
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <LayoutGrid size={14} /> Kanban
          </button>
          <button
            onClick={() => setView('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'table' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Table size={14} /> Table
          </button>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"
        >
          <Plus size={16} /> New Request
        </button>
      </PageHeader>

      {view === 'kanban' ? (
        <KanbanBoard
          columns={KANBAN_COLUMNS}
          items={requests || []}
          onStatusChange={handleStatusChange}
          renderCard={renderKanbanCard}
          statusField="status"
          validTransitions={VALID_TRANSITIONS}
        />
      ) : (
        <DataTable
          columns={columns}
          data={requests || []}
          onRowClick={handleRowClick}
          emptyMessage="No pipeline requests yet."
        />
      )}

      {/* Create Request Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Demand Request" wide>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Project request title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
              <select
                value={form.theme_id}
                onChange={(e) => setForm({ ...form, theme_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select client...</option>
                {(themes || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Business Justification</label>
            <textarea
              value={form.business_justification}
              onChange={(e) => setForm({ ...form, business_justification: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Why is this project needed?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Budget</label>
              <input
                type="number"
                value={form.estimated_budget}
                onChange={(e) => setForm({ ...form, estimated_budget: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="$0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Timeline</label>
              <input
                value={form.estimated_timeline}
                onChange={(e) => setForm({ ...form, estimated_timeline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. 3 months"
              />
            </div>
          </div>

          {/* Scoring Criteria */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-slate-800">Scoring Criteria</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Total Score:</span>
                <span className="text-sm font-bold text-slate-800">{scorePreview.toFixed(0)}%</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { key: 'strategic_alignment', label: 'Strategic Alignment', weight: '30%' },
                { key: 'financial_impact', label: 'Financial Impact', weight: '30%' },
                { key: 'risk_level', label: 'Risk Level', weight: '20%' },
                { key: 'resource_availability', label: 'Resource Availability', weight: '20%' },
              ].map(({ key, label, weight }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-600">{label} ({weight})</label>
                    <span className="text-xs font-semibold text-slate-700">{form[key]}/5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Submit Request</button>
          </div>
        </form>
      </Modal>

      {/* Request Detail / Review Modal */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedRequest?.title || 'Request Details'} wide>
        {selectedRequest && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Status</p>
                <StatusBadge status={selectedRequest.status} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Priority</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[selectedRequest.priority] || PRIORITY_COLORS.Medium}`}>
                  {selectedRequest.priority}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Requester</p>
                <p className="text-sm text-slate-800">{selectedRequest.requester_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Estimated Budget</p>
                <p className="text-sm text-slate-800">{formatCurrency(selectedRequest.estimated_budget)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Estimated Timeline</p>
                <p className="text-sm text-slate-800">{selectedRequest.estimated_timeline || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Created</p>
                <p className="text-sm text-slate-800">{formatDate(selectedRequest.created_at)}</p>
              </div>
            </div>

            {selectedRequest.description && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-700">{selectedRequest.description}</p>
              </div>
            )}

            {selectedRequest.business_justification && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Business Justification</p>
                <p className="text-sm text-slate-700">{selectedRequest.business_justification}</p>
              </div>
            )}

            {/* Scoring Breakdown */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">Scoring Breakdown</h4>
                <span className="text-sm font-bold text-slate-800">
                  Total: {(selectedRequest.total_score || 0).toFixed(0)}%
                </span>
              </div>
              <div className="space-y-2">
                {detailScores.map(({ label, value, weight, inverted }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-40 shrink-0">{label} ({weight})</span>
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${inverted ? 'bg-amber-500' : 'bg-primary'}`}
                        style={{ width: `${((value || 0) / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-8 text-right">{value || 0}/5</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Panel */}
            {(selectedRequest.status === 'Submitted' || selectedRequest.status === 'Under Review') && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Review</h4>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Review Notes</label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Add review notes..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleReview('Approved')}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReview('Rejected')}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Convert to Project */}
            {selectedRequest.status === 'Approved' && (
              <div className="border-t border-slate-200 pt-4">
                <button
                  onClick={handleOpenConvert}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark w-full justify-center"
                >
                  <ChevronRight size={16} /> Convert to Project
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Convert to Project Modal */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Convert to Project" wide>
        <form onSubmit={handleConvertSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
            <select
              value={convertForm.theme_id}
              onChange={(e) => setConvertForm({ ...convertForm, theme_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select client...</option>
              {(themes || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={convertForm.start_date}
                onChange={(e) => setConvertForm({ ...convertForm, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={convertForm.end_date}
                onChange={(e) => setConvertForm({ ...convertForm, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Client Rate ($/hr)</label>
              <input
                type="number"
                value={convertForm.client_billing_rate_per_hour}
                onChange={(e) => setConvertForm({ ...convertForm, client_billing_rate_per_hour: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Facility Cost ($/mo)</label>
              <input
                type="number"
                value={convertForm.fixed_facility_cost_monthly}
                onChange={(e) => setConvertForm({ ...convertForm, fixed_facility_cost_monthly: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Overhead (%)</label>
              <input
                type="number"
                value={convertForm.overhead_percentage}
                onChange={(e) => setConvertForm({ ...convertForm, overhead_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowConvertModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Create Project</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
