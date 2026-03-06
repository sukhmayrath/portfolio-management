import { useState, useEffect, useRef } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { Tag, Plus, Check } from 'lucide-react';

export default function TagSelector({ projectId, currentTags = [], onUpdate }) {
  const { data: allTags } = useApi('/tags');
  const { mutate } = useMutation();
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const currentIds = currentTags.map(t => t.id);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTag = async (tagId) => {
    if (currentIds.includes(tagId)) {
      await mutate('delete', `/tags/project/${projectId}/${tagId}`);
    } else {
      await mutate('post', `/tags/project/${projectId}`, { tag_ids: [tagId] });
    }
    onUpdate?.();
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded-full hover:bg-slate-200">
        <Tag size={12} /> <Plus size={12} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 py-1 max-h-60 overflow-y-auto">
          {(allTags || []).map(tag => (
            <button key={tag.id} onClick={() => toggleTag(tag.id)} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="flex-1 text-slate-700">{tag.name}</span>
              {currentIds.includes(tag.id) && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
