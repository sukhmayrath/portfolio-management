import { useState, useRef, useEffect, useCallback } from 'react';

/* ─── Label helpers ─── */
function priorityLabel(s) {
  if (s >= 81) return 'Critical';
  if (s >= 61) return 'High';
  if (s >= 31) return 'Medium';
  return 'Low';
}

function priorityColor(s) {
  if (s >= 81) return 'bg-red-100 text-red-700 ring-red-300';
  if (s >= 61) return 'bg-amber-100 text-amber-700 ring-amber-300';
  if (s >= 31) return 'bg-blue-100 text-blue-700 ring-blue-300';
  return 'bg-slate-100 text-slate-600 ring-slate-300';
}

function activeColor(s) {
  if (s >= 81) return 'bg-red-200 text-red-800 ring-2 ring-red-400 shadow-lg shadow-red-100';
  if (s >= 61) return 'bg-amber-200 text-amber-800 ring-2 ring-amber-400 shadow-lg shadow-amber-100';
  if (s >= 31) return 'bg-blue-200 text-blue-800 ring-2 ring-blue-400 shadow-lg shadow-blue-100';
  return 'bg-slate-200 text-slate-700 ring-2 ring-slate-400 shadow-lg shadow-slate-100';
}

function trackGradient(s) {
  const pct = s;
  if (s >= 81) return `linear-gradient(90deg, #fca5a5 0%, #ef4444 ${pct}%, #e2e8f0 ${pct}%)`;
  if (s >= 61) return `linear-gradient(90deg, #fde68a 0%, #f59e0b ${pct}%, #e2e8f0 ${pct}%)`;
  if (s >= 31) return `linear-gradient(90deg, #bfdbfe 0%, #3b82f6 ${pct}%, #e2e8f0 ${pct}%)`;
  return `linear-gradient(90deg, #e2e8f0 0%, #94a3b8 ${pct}%, #e2e8f0 ${pct}%)`;
}

/**
 * PriorityBadge
 *
 * Static mode (default): just renders a coloured pill.
 * Interactive mode (editable=true): left‑click to activate,
 * scroll ▲ to increase / ▼ to decrease priority, click outside / Esc to commit.
 */
export default function PriorityBadge({ score, editable = false, onChange }) {
  const s = score ?? 50;
  const [active, setActive] = useState(false);
  const [localScore, setLocalScore] = useState(s);
  const ref = useRef(null);
  const startScore = useRef(s);
  const localScoreRef = useRef(localScore);

  // Keep ref in sync with state for use in native event handlers
  useEffect(() => { localScoreRef.current = localScore; }, [localScore]);

  /* sync if parent changes the score while not editing */
  useEffect(() => {
    if (!active) setLocalScore(s);
  }, [s, active]);

  /* Commit helper */
  const commit = useCallback(() => {
    setActive(false);
    const current = localScoreRef.current;
    if (current !== startScore.current) {
      onChange?.(current);
    }
  }, [onChange]);

  /* Click‑outside listener */
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) commit();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active, commit]);

  /* Keyboard listener (Arrow Up/Down also change value) */
  useEffect(() => {
    if (!active) return;
    const handler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') commit();
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setLocalScore(prev => Math.min(100, prev + 5));
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setLocalScore(prev => Math.max(0, prev - 5));
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [active, commit]);

  /* Native wheel listener with { passive: false } so preventDefault works */
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const step = e.shiftKey ? 1 : 5;
      if (e.deltaY < 0) {
        setLocalScore(prev => Math.min(100, prev + step));
      } else if (e.deltaY > 0) {
        setLocalScore(prev => Math.max(0, prev - step));
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [active]);

  /* ── Static mode ── */
  if (!editable) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${priorityColor(s)}`}>
        {s}
      </span>
    );
  }

  /* ── Interactive mode ── */
  const display = active ? localScore : s;
  const label = priorityLabel(display);

  const handleClick = (e) => {
    e.stopPropagation(); // prevent row navigation
    if (!active) {
      startScore.current = s;
      setLocalScore(s);
      setActive(true);
    }
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className="inline-flex flex-col items-center gap-1 select-none"
      title={active ? 'Scroll ▲▼ to change priority · Shift+scroll for fine steps · Esc/Enter to save' : 'Click to adjust priority'}
    >
      {/* Badge pill */}
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer transition-all duration-200 ${
          active ? activeColor(display) : `${priorityColor(display)} hover:ring-1`
        }`}
      >
        {/* Scroll indicator arrows */}
        {active && (
          <span className="flex flex-col text-[8px] leading-[8px] opacity-60 -ml-0.5">
            <span>▲</span>
            <span>▼</span>
          </span>
        )}
        <span>{display}</span>
        <span className="opacity-70 text-[10px]">{label}</span>
      </span>

      {/* Mini track bar when active */}
      {active && (
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: trackGradient(display) }}>
          <div className="h-full rounded-full transition-all duration-100" style={{ width: `${display}%` }} />
        </div>
      )}
    </div>
  );
}
