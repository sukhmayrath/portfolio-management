import { useState, useCallback, useMemo } from 'react';
import { GripVertical } from 'lucide-react';

export default function KanbanBoard({
  columns,
  items,
  onStatusChange,
  renderCard,
  statusField = 'status',
  validTransitions,
}) {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [draggingItem, setDraggingItem] = useState(null);

  const getColumnItems = useCallback(
    (columnId) => (items || []).filter((item) => item[statusField] === columnId),
    [items, statusField]
  );

  /* Which columns can the currently-dragged item move to? */
  const allowedTargets = useMemo(() => {
    if (!draggingItem || !validTransitions) return null;
    const source = draggingItem[statusField];
    return validTransitions[source] || [];
  }, [draggingItem, validTransitions, statusField]);

  const isValidTarget = useCallback(
    (columnId) => {
      if (!allowedTargets) return true; // no restrictions
      return allowedTargets.includes(columnId);
    },
    [allowedTargets]
  );

  const handleDragStart = useCallback((e, item) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItem(item);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingItem(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e, columnId) => {
      e.preventDefault();
      setDragOverColumn(null);
      setDraggingItem(null);

      try {
        const raw = e.dataTransfer.getData('text/plain');
        const { id } = JSON.parse(raw);
        if (id != null && onStatusChange) {
          onStatusChange(id, columnId);
        }
      } catch {
        // ignore invalid drag data
      }
    },
    [onStatusChange]
  );

  const isDragging = !!draggingItem;

  return (
    <div className="flex flex-wrap gap-4">
      {(columns || []).map((column) => {
        const colItems = getColumnItems(column.id);
        const isOver = dragOverColumn === column.id;
        const isSelf = draggingItem && draggingItem[statusField] === column.id;
        const valid = isDragging && !isSelf && isValidTarget(column.id);
        const invalid = isDragging && !isSelf && !isValidTarget(column.id);

        return (
          <div
            key={column.id}
            className={`flex-1 min-w-[250px] rounded-lg flex flex-col transition-all duration-200 ${
              isOver && valid
                ? 'bg-emerald-50 ring-2 ring-emerald-400/50'
                : isOver && invalid
                  ? 'bg-red-50 ring-2 ring-red-300/40'
                  : valid
                    ? 'bg-blue-50/50 ring-1 ring-blue-200'
                    : invalid
                      ? 'bg-slate-50 opacity-50'
                      : 'bg-slate-50'
            }`}
            style={{ borderTop: `4px solid ${column.color || '#64748b'}`, minHeight: 200 }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-3">
              <h3 className="text-sm font-semibold text-slate-700">{column.title}</h3>
              <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
                {colItems.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 px-2 pb-2 space-y-2">
              {colItems.map((item) => {
                const isThisDragging = draggingItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    className={`group bg-white rounded-lg shadow-sm border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-slate-300 transition-all ${
                      isThisDragging ? 'opacity-30 scale-95 rotate-1' : 'opacity-100'
                    }`}
                  >
                    <div className="flex gap-2">
                      {/* Drag grip */}
                      <div className="shrink-0 pt-0.5 text-slate-300 group-hover:text-slate-400 transition-colors">
                        <GripVertical size={14} />
                      </div>
                      {/* Card content */}
                      <div className="flex-1 min-w-0">
                        {renderCard ? renderCard(item) : (
                          <span className="text-sm text-slate-700">{item.name || item.title || `#${item.id}`}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {colItems.length === 0 && (
                <div
                  className={`flex items-center justify-center rounded-lg border-2 border-dashed py-8 text-xs transition-colors ${
                    isOver && valid
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                      : isOver && invalid
                        ? 'border-red-300 bg-red-50 text-red-500'
                        : valid
                          ? 'border-blue-300 bg-blue-50/50 text-blue-500'
                          : 'border-slate-200 text-slate-400'
                  }`}
                >
                  {isOver && valid ? 'Drop here' : isOver && invalid ? 'Not allowed' : valid ? 'Drop here' : 'No items'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
