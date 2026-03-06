export default function RAGIndicator({ status, size = 'sm' }) {
  const colors = { Red: 'bg-red-500', Amber: 'bg-amber-500', Green: 'bg-emerald-500' };
  const sizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };
  return (
    <span className="relative group inline-flex">
      <span className={`${colors[status] || 'bg-gray-400'} ${sizes[size]} rounded-full inline-block`} />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{status || 'Unknown'}</span>
    </span>
  );
}
