import { Download } from 'lucide-react';
export default function ExportButton({ endpoint, filename, label = 'Export CSV' }) {
  const handleExport = async () => {
    try {
      const res = await fetch(`/api${endpoint}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };
  return (
    <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
      <Download size={16} /> {label}
    </button>
  );
}
