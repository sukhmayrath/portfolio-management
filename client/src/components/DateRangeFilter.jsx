import { useState } from 'react';
import { Calendar } from 'lucide-react';
export default function DateRangeFilter({ onChange }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const apply = (s, e) => { setStart(s); setEnd(e); onChange?.({ start_date: s, end_date: e }); };
  const setPreset = (months) => {
    const e = new Date();
    const s = new Date();
    s.setMonth(s.getMonth() - months);
    apply(s.toISOString().split('T')[0], e.toISOString().split('T')[0]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={16} className="text-slate-400" />
      <input type="date" value={start} onChange={e => apply(e.target.value, end)} className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <span className="text-slate-400 text-sm">to</span>
      <input type="date" value={end} onChange={e => apply(start, e.target.value)} className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />
      <div className="flex gap-1">
        {[['1M', 1], ['3M', 3], ['6M', 6], ['1Y', 12]].map(([label, m]) => (
          <button key={label} onClick={() => setPreset(m)} className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded hover:bg-slate-200">{label}</button>
        ))}
        <button onClick={() => apply('', '')} className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 rounded hover:bg-slate-200">All</button>
      </div>
    </div>
  );
}
