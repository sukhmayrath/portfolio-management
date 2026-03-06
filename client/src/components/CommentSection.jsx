import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { MessageSquare, Send } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function CommentSection({ entityType, entityId }) {
  const { data: comments, refetch } = useApi(`/comments?entity_type=${entityType}&entity_id=${entityId}`);
  const { mutate } = useMutation();
  const [text, setText] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await mutate('post', '/comments', { entity_type: entityType, entity_id: entityId, content: text.trim() });
    setText('');
    refetch();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4"><MessageSquare size={16} /> Comments ({comments?.length || 0})</h3>
      <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
        {(comments || []).map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {(c.user_name || 'U')[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{c.user_name || 'Anonymous'}</span>
                <span className="text-xs text-slate-400">{formatDate(c.created_at)}</span>
              </div>
              <p className="text-sm text-slate-600 mt-0.5">{c.content}</p>
            </div>
          </div>
        ))}
        {(!comments || comments.length === 0) && <p className="text-sm text-slate-400 italic">No comments yet</p>}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Add a comment..." className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
        <button type="submit" className="px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"><Send size={16} /></button>
      </form>
    </div>
  );
}
