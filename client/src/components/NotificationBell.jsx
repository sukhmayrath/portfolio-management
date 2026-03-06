import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { formatDate } from '../utils/formatters';

const severityIcons = { critical: AlertTriangle, warning: AlertCircle, info: Info };
const severityColors = { critical: 'text-red-500', warning: 'text-amber-500', info: 'text-blue-500' };

export default function NotificationBell() {
  const [data, setData] = useState({ notifications: [], unread_count: 0 });
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const fetchNotifications = async () => {
    try { const d = await api.get('/notifications?limit=20'); setData(d); } catch {}
  };

  useEffect(() => { fetchNotifications(); const i = setInterval(fetchNotifications, 30000); return () => clearInterval(i); }, []);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => { await api.put('/notifications/read-all'); fetchNotifications(); };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
        <Bell size={20} />
        {data.unread_count > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{data.unread_count > 9 ? '9+' : data.unread_count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-96 bg-white rounded-lg shadow-xl border border-slate-200 max-h-96 overflow-hidden z-50">
          <div className="flex items-center justify-between p-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {data.unread_count > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
          </div>
          <div className="overflow-y-auto max-h-80">
            {data.notifications.length === 0 && <p className="p-4 text-sm text-slate-400 text-center">No notifications</p>}
            {data.notifications.map(n => {
              const Icon = severityIcons[n.severity] || Info;
              return (
                <div key={n.id} className={`flex gap-3 p-3 border-b border-slate-50 ${n.is_read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                  <Icon size={16} className={`shrink-0 mt-0.5 ${severityColors[n.severity] || 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-700">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(n.created_at)}</p>
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
