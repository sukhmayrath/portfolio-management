import { Printer } from 'lucide-react';

export default function PrintButton({ label = 'Print / PDF' }) {
  const handlePrint = () => {
    document.body.setAttribute(
      'data-print-date',
      new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    );

    // 1. Apply print layout so Recharts ResizeObserver fires and
    //    re-renders charts at the correct print dimensions.
    //    The class also kills CSS transitions/animations so charts
    //    appear instantly instead of animating over ~1.5 s.
    document.body.classList.add('preparing-print');

    // 2. Trigger resize → Recharts re-renders SVGs at new widths.
    //    Two rAF frames ensure the DOM has reflowed first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));

        // 3. Wait for Recharts to finish rendering, then print.
        setTimeout(() => {
          window.print();
          document.body.classList.remove('preparing-print');
        }, 600);
      });
    });
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
    >
      <Printer size={16} /> {label}
    </button>
  );
}
