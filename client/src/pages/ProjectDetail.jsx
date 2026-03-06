import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import MetricCard from '../components/MetricCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import RAGIndicator from '../components/RAGIndicator';
import PriorityBadge from '../components/PriorityBadge';
import TagBadge from '../components/TagBadge';
import TagSelector from '../components/TagSelector';
import ExportButton from '../components/ExportButton';
import CommentSection from '../components/CommentSection';
import ActivityFeed from '../components/ActivityFeed';
import KanbanBoard from '../components/KanbanBoard';
import AttachmentSection from '../components/AttachmentSection';
import { formatCurrency, formatPercentage, formatHours, formatDate } from '../utils/formatters';
import { PROJECT_STATUSES, TASK_STATUSES, COST_TYPES, HEALTH_STATUSES, RISK_CATEGORIES, RISK_LIKELIHOODS, RISK_IMPACTS, RISK_STATUSES, MILESTONE_STATUSES } from '../utils/constants';
import { Edit2, Trash2, Plus, Pencil, DollarSign, Users, TrendingUp, Building, AlertTriangle, Flag, MessageSquare, Tag, Blocks } from 'lucide-react';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, loading, refetch } = useApi(`/projects/${id}`);
  const { data: resources } = useApi('/resources');
  const { data: allTags } = useApi('/tags');
  const { mutate } = useMutation();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_resource_id: '', status: 'To Do', estimated_hours: '' });
  const [facilityForm, setFacilityForm] = useState({ description: '', monthly_cost: '', cost_type: 'Fixed' });
  const [editTask, setEditTask] = useState(null);
  const [editTaskForm, setEditTaskForm] = useState(null);
  const [activeTab, setActiveTab] = useState('resources');
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [riskForm, setRiskForm] = useState({ title: '', description: '', category: 'Technical', likelihood: 'Medium', impact: 'Medium', status: 'Open', mitigation_plan: '' });
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', due_date: '', status: 'Pending' });
  const [editMilestone, setEditMilestone] = useState(null);
  const [editMilestoneForm, setEditMilestoneForm] = useState(null);
  const [editFacility, setEditFacility] = useState(null);
  const [editFacilityForm, setEditFacilityForm] = useState(null);
  const [editRisk, setEditRisk] = useState(null);
  const [editRiskForm, setEditRiskForm] = useState(null);
  const [taskView, setTaskView] = useState('table');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading...</div>;
  if (!project) return <div className="p-8 text-center text-slate-500">Project not found</div>;

  const c = project.computed || {};

  const handleEdit = () => {
    setEditForm({
      name: project.name, description: project.description, status: project.status,
      start_date: project.start_date || '', end_date: project.end_date || '',
      client_billing_rate_per_hour: project.client_billing_rate_per_hour,
      fixed_facility_cost_monthly: project.fixed_facility_cost_monthly,
      overhead_percentage: project.overhead_percentage,
      health_status: project.health_status || 'Green',
      health_note: project.health_note || '',
      priority_score: project.priority_score || 50,
    });
    setShowEdit(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await mutate('put', `/projects/${id}`, editForm);
    setShowEdit(false);
    refetch();
  };

  const handleDelete = async () => { await mutate('delete', `/projects/${id}`); navigate('/projects'); };

  const handleAddTask = async (e) => {
    e.preventDefault();
    await mutate('post', '/tasks', { project_id: Number(id), ...taskForm, assigned_resource_id: taskForm.assigned_resource_id ? Number(taskForm.assigned_resource_id) : null, estimated_hours: Number(taskForm.estimated_hours) || 0 });
    setShowAddTask(false);
    setTaskForm({ title: '', description: '', assigned_resource_id: '', status: 'To Do', estimated_hours: '' });
    refetch();
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    await mutate('post', '/facility-costs', { project_id: Number(id), ...facilityForm, monthly_cost: Number(facilityForm.monthly_cost) || 0 });
    setShowAddFacility(false);
    setFacilityForm({ description: '', monthly_cost: '', cost_type: 'Fixed' });
    refetch();
  };

  const handleDeleteTask = async (taskId) => { await mutate('delete', `/tasks/${taskId}`); refetch(); };
  const handleDeleteFacility = async (fcId) => { await mutate('delete', `/facility-costs/${fcId}`); refetch(); };

  const openEditTask = (task) => {
    setEditTaskForm({
      title: task.title,
      description: task.description || '',
      assigned_resource_id: task.assigned_resource_id || '',
      status: task.status,
      estimated_hours: task.estimated_hours || '',
      actual_hours: task.actual_hours || '',
    });
    setEditTask(task);
  };

  const handleEditTaskSubmit = async (e) => {
    e.preventDefault();
    await mutate('put', `/tasks/${editTask.id}`, {
      ...editTaskForm,
      assigned_resource_id: editTaskForm.assigned_resource_id ? Number(editTaskForm.assigned_resource_id) : null,
      estimated_hours: Number(editTaskForm.estimated_hours) || 0,
      actual_hours: Number(editTaskForm.actual_hours) || 0,
    });
    setEditTask(null);
    setEditTaskForm(null);
    refetch();
  };

  const openEditMilestone = (m) => {
    setEditMilestoneForm({ title: m.title, description: m.description || '', due_date: m.due_date || '', status: m.status });
    setEditMilestone(m);
  };

  const handleEditMilestoneSubmit = async (e) => {
    e.preventDefault();
    await mutate('put', `/milestones/${editMilestone.id}`, editMilestoneForm);
    setEditMilestone(null);
    setEditMilestoneForm(null);
    refetch();
  };

  const openEditFacility = (fc) => {
    setEditFacilityForm({ description: fc.description, monthly_cost: fc.monthly_cost, cost_type: fc.cost_type });
    setEditFacility(fc);
  };

  const handleEditFacilitySubmit = async (e) => {
    e.preventDefault();
    await mutate('put', `/facility-costs/${editFacility.id}`, { ...editFacilityForm, monthly_cost: Number(editFacilityForm.monthly_cost) || 0 });
    setEditFacility(null);
    setEditFacilityForm(null);
    refetch();
  };

  const openEditRisk = (r) => {
    setEditRiskForm({ title: r.title, description: r.description || '', category: r.category, likelihood: r.likelihood, impact: r.impact, status: r.status, mitigation_plan: r.mitigation_plan || '' });
    setEditRisk(r);
  };

  const handleEditRiskSubmit = async (e) => {
    e.preventDefault();
    await mutate('put', `/risks/${editRisk.id}`, editRiskForm);
    setEditRisk(null);
    setEditRiskForm(null);
    refetch();
  };

  const tabs = [
    { id: 'resources', label: `Resources (${project.allocations?.length || 0})` },
    { id: 'tasks', label: `Tasks (${project.tasks?.length || 0})` },
    { id: 'risks', label: `Risks (${project.risks?.length || 0})` },
    { id: 'milestones', label: `Milestones (${project.milestones?.length || 0})` },
    { id: 'facility', label: `Facility Costs (${project.facility_costs?.length || 0})` },
    { id: 'files', label: `Files` },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <div>
      <PageHeader title={project.name} subtitle={`${project.theme_name} \u00B7 ${formatDate(project.start_date)} - ${formatDate(project.end_date)}`}>
        <RAGIndicator status={project.health_status || 'Green'} showLabel />
        <PriorityBadge score={project.priority_score} />
        <StatusBadge status={project.status} />
        <ExportButton endpoint={`/export/projects?id=${id}`} filename={`project-${id}.csv`} label="Export" />
        <button onClick={() => setShowSaveTemplate(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
          <Blocks size={14} /> Template
        </button>
        <button onClick={handleEdit} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"><Edit2 size={16} /> Edit</button>
        <button onClick={() => setShowDelete(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-danger bg-red-50 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
      </PageHeader>

      {/* Tags */}
      {(project.tags?.length > 0 || allTags?.length > 0) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Tag size={14} className="text-slate-400" />
          {(project.tags || []).map(tag => (
            <TagBadge key={tag.id} tag={tag} onRemove={async () => {
              await mutate('delete', `/tags/project/${id}`, { tag_id: tag.id });
              refetch();
            }} />
          ))}
          <TagSelector
            allTags={allTags || []}
            selectedTagIds={(project.tags || []).map(t => t.id)}
            onAdd={async (tagId) => {
              await mutate('post', `/tags/project/${id}`, { tag_id: tagId });
              refetch();
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Resource Cost" value={formatCurrency(c.resource_cost_monthly)} sublabel="Monthly" icon={Users} color="primary" />
        <MetricCard label="Facility + Overhead" value={formatCurrency((c.total_facility_monthly || 0) + (c.overhead_cost_monthly || 0))} sublabel="Monthly" icon={Building} color="warning" />
        <MetricCard label="Client Revenue" value={formatCurrency(c.client_revenue_monthly)} sublabel={`${formatHours(c.total_allocated_hours)} @ ${formatCurrency(project.client_billing_rate_per_hour)}/hr`} icon={DollarSign} color="success" />
        <MetricCard label="Margin" value={formatPercentage(c.margin_percentage)} sublabel={formatCurrency(c.margin_monthly) + '/mo'} icon={TrendingUp} color={c.margin_monthly >= 0 ? 'success' : 'danger'} />
      </div>

      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'resources' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Resource</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Allocation</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Hours/mo</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Rate</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Cost/mo</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(project.allocations || []).map(a => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.resource_name}</td>
                  <td className="px-4 py-3 text-slate-600">{a.role}</td>
                  <td className="px-4 py-3 text-right">{formatPercentage(a.allocation_percentage)}</td>
                  <td className="px-4 py-3 text-right">{a.allocated_hours_per_month}</td>
                  <td className="px-4 py-3 text-right">{formatCurrency(a.hourly_rate)}/hr</td>
                  <td className="px-4 py-3 text-right font-medium">{formatCurrency(a.monthly_cost)}</td>
                </tr>
              ))}
              {(!project.allocations || project.allocations.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No resources allocated</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddTask(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"><Plus size={16} /> Add Task</button>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <button onClick={() => setTaskView('table')} className={`px-3 py-1 text-xs font-medium rounded ${taskView === 'table' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>Table</button>
            <button onClick={() => setTaskView('kanban')} className={`px-3 py-1 text-xs font-medium rounded ${taskView === 'kanban' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>Board</button>
          </div>
          {taskView === 'table' && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Task</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Assignee</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Est. Hours</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actual Hours</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(project.tasks || []).map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{t.title}</td>
                    <td className="px-4 py-3 text-slate-600">{t.assigned_resource_name || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-right">{t.estimated_hours}</td>
                    <td className="px-4 py-3 text-right">{t.actual_hours}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditTask(t)} className="text-slate-400 hover:text-blue-500" title="Edit task"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteTask(t.id)} className="text-slate-400 hover:text-red-500" title="Delete task"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!project.tasks || project.tasks.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No tasks yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
          )}
          {taskView === 'kanban' && (
            <KanbanBoard
              columns={[
                { id: 'To Do', title: 'To Do', color: '#64748b' },
                { id: 'In Progress', title: 'In Progress', color: '#2563eb' },
                { id: 'Done', title: 'Done', color: '#16a34a' },
              ]}
              items={project.tasks || []}
              onStatusChange={async (taskId, newStatus) => {
                await mutate('put', `/tasks/${taskId}`, { status: newStatus });
                refetch();
              }}
              renderCard={(task) => (
                <div>
                  <p className="font-medium text-sm text-slate-800">{task.title}</p>
                  {task.assigned_resource_name && <p className="text-xs text-slate-500 mt-1">{task.assigned_resource_name}</p>}
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    {task.estimated_hours > 0 && <span>{task.estimated_hours}h est</span>}
                    {task.dependency_count > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{task.dependency_count} deps</span>}
                  </div>
                </div>
              )}
            />
          )}
        </div>
      )}

      {activeTab === 'risks' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddRisk(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"><Plus size={16} /> Add Risk</button>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Risk</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Likelihood</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Impact</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(project.risks || []).map(r => {
                  const riskLevel = { 'Very High': 'text-red-600 bg-red-50', 'High': 'text-orange-600 bg-orange-50', 'Medium': 'text-amber-600 bg-amber-50', 'Low': 'text-blue-600 bg-blue-50', 'Very Low': 'text-slate-600 bg-slate-50' };
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{r.title}</p>
                        {r.mitigation_plan && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{r.mitigation_plan}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.category}</td>
                      <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskLevel[r.likelihood] || ''}`}>{r.likelihood}</span></td>
                      <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskLevel[r.impact] || ''}`}>{r.impact}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditRisk(r)} className="text-slate-400 hover:text-blue-500" title="Edit risk"><Pencil size={14} /></button>
                          <button onClick={async () => { await mutate('delete', `/risks/${r.id}`); refetch(); }} className="text-slate-400 hover:text-red-500" title="Delete risk"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {(!project.risks || project.risks.length === 0) && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No risks registered</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddMilestone(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"><Plus size={16} /> Add Milestone</button>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Milestone</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Completed</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(project.milestones || []).map(m => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{m.title}</p>
                      {m.description && <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(m.due_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{m.completed_date ? formatDate(m.completed_date) : '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditMilestone(m)} className="text-slate-400 hover:text-blue-500" title="Edit milestone"><Pencil size={14} /></button>
                        <button onClick={async () => { await mutate('delete', `/milestones/${m.id}`); refetch(); }} className="text-slate-400 hover:text-red-500" title="Delete milestone"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!project.milestones || project.milestones.length === 0) && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No milestones yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'facility' && (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => setShowAddFacility(true)} className="flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark"><Plus size={16} /> Add Cost</button>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-3">
            <p className="text-sm text-slate-500">Base fixed facility cost: <span className="font-semibold text-slate-900">{formatCurrency(project.fixed_facility_cost_monthly)}/mo</span> | Overhead: <span className="font-semibold text-slate-900">{formatPercentage(project.overhead_percentage)}</span> of resource cost</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Monthly Cost</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(project.facility_costs || []).map(fc => (
                  <tr key={fc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{fc.description}</td>
                    <td className="px-4 py-3"><StatusBadge status={fc.cost_type} /></td>
                    <td className="px-4 py-3 text-right">{formatCurrency(fc.monthly_cost)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditFacility(fc)} className="text-slate-400 hover:text-blue-500" title="Edit cost"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteFacility(fc.id)} className="text-slate-400 hover:text-red-500" title="Delete cost"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(!project.facility_costs || project.facility_costs.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No facility costs</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <AttachmentSection entityType="project" entityId={id} />
      )}

      {activeTab === 'activity' && (
        <ActivityFeed entityType="project" entityId={id} />
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Project" wide>
        {editForm && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label><input type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">End Date</label><input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Client Rate ($/hr)</label><input type="number" value={editForm.client_billing_rate_per_hour} onChange={e => setEditForm({ ...editForm, client_billing_rate_per_hour: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Facility ($/mo)</label><input type="number" value={editForm.fixed_facility_cost_monthly} onChange={e => setEditForm({ ...editForm, fixed_facility_cost_monthly: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Overhead (%)</label><input type="number" value={editForm.overhead_percentage} onChange={e => setEditForm({ ...editForm, overhead_percentage: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Health Status</label>
                <select value={editForm.health_status} onChange={e => setEditForm({ ...editForm, health_status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {HEALTH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Health Note</label>
                <input value={editForm.health_note} onChange={e => setEditForm({ ...editForm, health_note: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Priority (0-100)</label>
                <input type="number" min="0" max="100" value={editForm.priority_score} onChange={e => setEditForm({ ...editForm, priority_score: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showAddTask} onClose={() => setShowAddTask(false)} title="Add Task">
        <form onSubmit={handleAddTask} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label><select value={taskForm.assigned_resource_id} onChange={e => setTaskForm({ ...taskForm, assigned_resource_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="">Unassigned</option>{(resources || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Est. Hours</label><input type="number" value={taskForm.estimated_hours} onChange={e => setTaskForm({ ...taskForm, estimated_hours: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddTask(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Add Task</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editTask} onClose={() => { setEditTask(null); setEditTaskForm(null); }} title="Edit Task">
        {editTaskForm && (
          <form onSubmit={handleEditTaskSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={editTaskForm.title} onChange={e => setEditTaskForm({ ...editTaskForm, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={editTaskForm.description} onChange={e => setEditTaskForm({ ...editTaskForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label><select value={editTaskForm.assigned_resource_id} onChange={e => setEditTaskForm({ ...editTaskForm, assigned_resource_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"><option value="">Unassigned</option>{(resources || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={editTaskForm.status} onChange={e => setEditTaskForm({ ...editTaskForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Est. Hours</label><input type="number" value={editTaskForm.estimated_hours} onChange={e => setEditTaskForm({ ...editTaskForm, estimated_hours: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Actual Hours</label><input type="number" value={editTaskForm.actual_hours} onChange={e => setEditTaskForm({ ...editTaskForm, actual_hours: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setEditTask(null); setEditTaskForm(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showAddFacility} onClose={() => setShowAddFacility(false)} title="Add Facility Cost">
        <form onSubmit={handleAddFacility} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><input value={facilityForm.description} onChange={e => setFacilityForm({ ...facilityForm, description: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Monthly Cost ($)</label><input type="number" value={facilityForm.monthly_cost} onChange={e => setFacilityForm({ ...facilityForm, monthly_cost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label><select value={facilityForm.cost_type} onChange={e => setFacilityForm({ ...facilityForm, cost_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{COST_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddFacility(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Add Cost</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAddRisk} onClose={() => setShowAddRisk(false)} title="Add Risk" wide>
        <form onSubmit={async (e) => {
          e.preventDefault();
          await mutate('post', '/risks', { project_id: Number(id), ...riskForm });
          setShowAddRisk(false);
          setRiskForm({ title: '', description: '', category: 'Technical', likelihood: 'Medium', impact: 'Medium', status: 'Open', mitigation_plan: '' });
          refetch();
        }} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={riskForm.title} onChange={e => setRiskForm({ ...riskForm, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={riskForm.description} onChange={e => setRiskForm({ ...riskForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div className="grid grid-cols-4 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label><select value={riskForm.category} onChange={e => setRiskForm({ ...riskForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Likelihood</label><select value={riskForm.likelihood} onChange={e => setRiskForm({ ...riskForm, likelihood: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_LIKELIHOODS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Impact</label><select value={riskForm.impact} onChange={e => setRiskForm({ ...riskForm, impact: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_IMPACTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={riskForm.status} onChange={e => setRiskForm({ ...riskForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Mitigation Plan</label><textarea value={riskForm.mitigation_plan} onChange={e => setRiskForm({ ...riskForm, mitigation_plan: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddRisk(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Add Risk</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAddMilestone} onClose={() => setShowAddMilestone(false)} title="Add Milestone">
        <form onSubmit={async (e) => {
          e.preventDefault();
          await mutate('post', '/milestones', { project_id: Number(id), ...milestoneForm });
          setShowAddMilestone(false);
          setMilestoneForm({ title: '', description: '', due_date: '', status: 'Pending' });
          refetch();
        }} className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={milestoneForm.title} onChange={e => setMilestoneForm({ ...milestoneForm, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={milestoneForm.description} onChange={e => setMilestoneForm({ ...milestoneForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label><input type="date" value={milestoneForm.due_date} onChange={e => setMilestoneForm({ ...milestoneForm, due_date: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={milestoneForm.status} onChange={e => setMilestoneForm({ ...milestoneForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{MILESTONE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddMilestone(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Add Milestone</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editRisk} onClose={() => { setEditRisk(null); setEditRiskForm(null); }} title="Edit Risk" wide>
        {editRiskForm && (
          <form onSubmit={handleEditRiskSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={editRiskForm.title} onChange={e => setEditRiskForm({ ...editRiskForm, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={editRiskForm.description} onChange={e => setEditRiskForm({ ...editRiskForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="grid grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Category</label><select value={editRiskForm.category} onChange={e => setEditRiskForm({ ...editRiskForm, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Likelihood</label><select value={editRiskForm.likelihood} onChange={e => setEditRiskForm({ ...editRiskForm, likelihood: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_LIKELIHOODS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Impact</label><select value={editRiskForm.impact} onChange={e => setEditRiskForm({ ...editRiskForm, impact: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_IMPACTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={editRiskForm.status} onChange={e => setEditRiskForm({ ...editRiskForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{RISK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Mitigation Plan</label><textarea value={editRiskForm.mitigation_plan} onChange={e => setEditRiskForm({ ...editRiskForm, mitigation_plan: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setEditRisk(null); setEditRiskForm(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!editMilestone} onClose={() => { setEditMilestone(null); setEditMilestoneForm(null); }} title="Edit Milestone">
        {editMilestoneForm && (
          <form onSubmit={handleEditMilestoneSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Title</label><input value={editMilestoneForm.title} onChange={e => setEditMilestoneForm({ ...editMilestoneForm, title: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea value={editMilestoneForm.description} onChange={e => setEditMilestoneForm({ ...editMilestoneForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label><input type="date" value={editMilestoneForm.due_date} onChange={e => setEditMilestoneForm({ ...editMilestoneForm, due_date: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Status</label><select value={editMilestoneForm.status} onChange={e => setEditMilestoneForm({ ...editMilestoneForm, status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{MILESTONE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setEditMilestone(null); setEditMilestoneForm(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={!!editFacility} onClose={() => { setEditFacility(null); setEditFacilityForm(null); }} title="Edit Facility Cost">
        {editFacilityForm && (
          <form onSubmit={handleEditFacilitySubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><input value={editFacilityForm.description} onChange={e => setEditFacilityForm({ ...editFacilityForm, description: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Monthly Cost ($)</label><input type="number" value={editFacilityForm.monthly_cost} onChange={e => setEditFacilityForm({ ...editFacilityForm, monthly_cost: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Type</label><select value={editFacilityForm.cost_type} onChange={e => setEditFacilityForm({ ...editFacilityForm, cost_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">{COST_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setEditFacility(null); setEditFacilityForm(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">Save Changes</button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="Save as Template">
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.target);
          await mutate('post', '/templates', {
            name: fd.get('templateName'),
            description: fd.get('templateDesc'),
            default_tasks: JSON.stringify((project.tasks || []).map(t => ({ title: t.title, description: t.description, status: 'To Do', estimated_hours: t.estimated_hours }))),
            default_risks: JSON.stringify((project.risks || []).map(r => ({ title: r.title, description: r.description, category: r.category, likelihood: r.likelihood, impact: r.impact }))),
            default_milestones: JSON.stringify((project.milestones || []).map(m => ({ title: m.title, description: m.description, status: 'Pending' }))),
            default_facility_costs: JSON.stringify((project.facility_costs || []).map(f => ({ description: f.description, monthly_cost: f.monthly_cost, cost_type: f.cost_type }))),
          });
          setShowSaveTemplate(false);
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
            <input name="templateName" defaultValue={`${project.name} Template`} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea name="templateDesc" rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <p className="text-xs text-slate-500">This will save {project.tasks?.length || 0} tasks, {project.risks?.length || 0} risks, {project.milestones?.length || 0} milestones, and {project.facility_costs?.length || 0} facility costs as template defaults.</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowSaveTemplate(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">Save Template</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showDelete} onClose={() => setShowDelete(false)} onConfirm={handleDelete} title="Delete Project" message={`Delete "${project.name}"? All tasks, allocations, and facility costs will be removed.`} />

      {/* Comments */}
      <div className="mt-6">
        <CommentSection entityType="project" entityId={id} />
      </div>
    </div>
  );
}
