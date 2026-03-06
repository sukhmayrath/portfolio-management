import { NavLink, useNavigate } from 'react-router';
import { LayoutDashboard, Lightbulb, FolderKanban, Users, GitBranch, BarChart3, DollarSign, Calendar, Map, Scaling, Bell, FileText, ClipboardList, LogOut, Shield, LayoutGrid, Inbox, Zap, Blocks } from 'lucide-react';

const navItems = [
  { label: 'Overview', items: [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboards', icon: LayoutGrid, label: 'Custom Dashboards' },
  ]},
  { label: 'Investment', items: [
    { to: '/themes', icon: Lightbulb, label: 'Clients' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/demand', icon: Inbox, label: 'Pipeline' },
  ]},
  { label: 'Planning', items: [
    { to: '/timeline', icon: Calendar, label: 'Timeline' },
    { to: '/roadmap', icon: Map, label: 'Roadmap' },
    { to: '/capacity', icon: Scaling, label: 'Capacity' },
  ]},
  { label: 'Resources', items: [
    { to: '/resources', icon: Users, label: 'Resource Pool' },
    { to: '/allocation', icon: GitBranch, label: 'Allocation' },
    { to: '/utilization', icon: BarChart3, label: 'Utilization' },
  ]},
  { label: 'Reports', items: [
    { to: '/costs', icon: DollarSign, label: 'Financial Analysis' },
    { to: '/budget', icon: FileText, label: 'Budget Tracking' },
    { to: '/executive-summary', icon: ClipboardList, label: 'Executive Summary' },
  ]},
  { label: 'System', items: [
    { to: '/templates', icon: Blocks, label: 'Templates' },
    { to: '/automations', icon: Zap, label: 'Automations' },
    { to: '/alerts', icon: Bell, label: 'Alerts' },
    { to: '/audit', icon: Shield, label: 'Audit Log' },
  ]},
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />}
      <aside className={`w-64 bg-slate-900 text-white min-h-screen flex flex-col shrink-0 no-print fixed lg:static z-50 transition-transform duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-slate-700">
          <h1 className="text-lg font-bold tracking-tight">Portfolio Manager</h1>
          <p className="text-xs text-slate-400 mt-1">Investment Tracker</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(section => (
            <div key={section.label} className="mb-4">
              <p className="px-5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">{section.label}</p>
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                      isActive ? 'bg-slate-800 text-white border-r-2 border-primary' : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        {user && (
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-primary-light">
                {user.display_name?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{user.display_name}</p>
                <p className="text-xs text-slate-400">{user.role}</p>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-white"><LogOut size={16} /></button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
