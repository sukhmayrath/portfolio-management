import { useApi } from '../hooks/useApi';
import { CirclePlus, Pencil, Trash2, Loader2, Clock } from 'lucide-react';
import { formatDate } from '../utils/formatters';

const ACTION_CONFIG = {
  CREATE: {
    icon: CirclePlus,
    color: 'bg-green-100 text-green-700',
    borderColor: 'border-green-400',
    dotColor: 'bg-green-500',
    label: 'Created',
  },
  UPDATE: {
    icon: Pencil,
    color: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-400',
    dotColor: 'bg-blue-500',
    label: 'Updated',
  },
  DELETE: {
    icon: Trash2,
    color: 'bg-red-100 text-red-700',
    borderColor: 'border-red-400',
    dotColor: 'bg-red-500',
    label: 'Deleted',
  },
};

function getDescription(entry, entityType) {
  const action = entry.action?.toUpperCase() || '';

  if (action === 'CREATE') {
    return <span>Created this {entityType}</span>;
  }

  if (action === 'DELETE') {
    return <span>Deleted {entry.field_name || entityType}</span>;
  }

  if (action === 'UPDATE' && entry.field_name) {
    return (
      <span>
        Changed <span className="font-semibold">{entry.field_name}</span> from{' '}
        <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">
          {entry.old_value ?? '—'}
        </code>{' '}
        to{' '}
        <code className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">
          {entry.new_value ?? '—'}
        </code>
      </span>
    );
  }

  return <span>{entry.description || `${action} action performed`}</span>;
}

export default function ActivityFeed({ entityType, entityId }) {
  const { data: entries, loading, error } = useApi(
    `/audit/entity/${entityType}/${entityId}`
  );

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Clock size={16} /> Activity
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <Clock size={16} /> Activity
        </h3>
        <p className="text-sm text-red-500">Failed to load activity: {error}</p>
      </div>
    );
  }

  const items = entries || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
        <Clock size={16} /> Activity ({items.length})
      </h3>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-4 text-center">
          No activity recorded yet
        </p>
      ) : (
        <div className="relative max-h-96 overflow-y-auto">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-slate-200" />

          <div className="space-y-4">
            {items.map((entry) => {
              const action = entry.action?.toUpperCase() || 'UPDATE';
              const config = ACTION_CONFIG[action] || ACTION_CONFIG.UPDATE;
              const Icon = config.icon;

              return (
                <div key={entry.id} className="relative flex gap-3 pl-1">
                  {/* Timeline dot / icon */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0 ${config.color}`}
                  >
                    <Icon size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${config.color}`}
                      >
                        {config.label}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {entry.user_name || 'System'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {getDescription(entry, entityType)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
