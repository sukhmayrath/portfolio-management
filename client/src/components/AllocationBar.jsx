import { PROJECT_COLORS } from '../utils/constants';

export default function AllocationBar({ allocations = [], projects = [] }) {
  const segments = [];
  let colorIdx = 0;

  if (Array.isArray(allocations)) {
    allocations.forEach(a => {
      segments.push({
        label: a.project_name || `Project ${a.project_id}`,
        percentage: a.allocation_percentage || a.percentage || 0,
        color: PROJECT_COLORS[colorIdx % PROJECT_COLORS.length]
      });
      colorIdx++;
    });
  } else if (typeof allocations === 'object') {
    Object.entries(allocations).forEach(([projectId, data]) => {
      const project = projects.find(p => p.id === Number(projectId));
      segments.push({
        label: project?.name || `Project ${projectId}`,
        percentage: data.percentage || 0,
        color: PROJECT_COLORS[colorIdx % PROJECT_COLORS.length]
      });
      colorIdx++;
    });
  }

  const total = segments.reduce((s, seg) => s + seg.percentage, 0);
  const unallocated = Math.max(0, 100 - total);

  return (
    <div>
      <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden flex">
        {segments.map((seg, i) => (
          <div
            key={i}
            title={`${seg.label}: ${seg.percentage}%`}
            style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
            className="h-full transition-all"
          />
        ))}
        {unallocated > 0 && (
          <div title={`Unallocated: ${unallocated}%`} style={{ width: `${unallocated}%` }} className="h-full bg-slate-200" />
        )}
      </div>
      <div className="flex gap-3 mt-1.5 flex-wrap">
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1 text-xs text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: seg.color }} />
            {seg.label} ({seg.percentage}%)
          </span>
        ))}
        {unallocated > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-slate-200" />
            Unallocated ({unallocated}%)
          </span>
        )}
      </div>
    </div>
  );
}
