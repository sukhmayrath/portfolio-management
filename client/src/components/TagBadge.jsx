import { X } from 'lucide-react';
export default function TagBadge({ name, color = '#64748b', onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full text-white" style={{ backgroundColor: color }}>
      {name}
      {onRemove && <button onClick={onRemove} className="hover:text-white/70 ml-0.5"><X size={12} /></button>}
    </span>
  );
}
