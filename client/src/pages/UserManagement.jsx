import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Plus, Edit2, UserX, UserCheck, Shield } from 'lucide-react';

const ROLES = ['Admin', 'PMO', 'Executive', 'PM', 'Viewer'];
const ROLE_COLORS = {
  Admin: 'bg-red-100 text-red-700',
  PMO: 'bg-violet-100 text-violet-700',
  Executive: 'bg-blue-100 text-blue-700',
  PM: 'bg-emerald-100 text-emerald-700',
  Viewer: 'bg-slate-100 text-slate-600',
};

export default function UserManagement() {
  const { data: users, loading, refetch } = useApi('/auth/users');
  const { mutate } = useMutation();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', display_name: '', email: '', role: 'Viewer' });

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  const openCreate = () => {
    setEditingUser(null);
    setForm({ username: '', password: '', display_name: '', email: '', role: 'Viewer' });
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ username: user.username, password: '', display_name: user.display_name, email: user.email || '', role: user.role });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingUser) {
      const body = { display_name: form.display_name, email: form.email, role: form.role };
      if (form.password) body.password = form.password;
      await mutate('put', `/auth/users/${editingUser.id}`, body);
    } else {
      await mutate('post', '/auth/register', form);
    }
    setShowModal(false);
    refetch();
  };

  const toggleActive = async (user) => {
    await mutate('put', `/auth/users/${user.id}`, { is_active: !user.is_active });
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading users...</div>;

  return (
    <div>
      <PageHeader title="User Management" subtitle="Create, edit, and manage user accounts and roles">
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark">
          <Plus size={16} /> Add User
        </button>
      </PageHeader>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Username</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(users || []).map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{user.display_name}</td>
                <td className="px-4 py-3 text-slate-600">{user.username}</td>
                <td className="px-4 py-3 text-slate-600">{user.email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.Viewer}`}>
                    <Shield size={10} /> {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {user.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(user)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-lg" title="Edit">
                      <Edit2 size={14} />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button onClick={() => toggleActive(user)} className={`p-1.5 rounded-lg ${user.is_active ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={user.is_active ? 'Deactivate' : 'Activate'}>
                        {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingUser ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
            <input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{editingUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} {...(!editingUser ? { required: true } : {})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {form.role === 'Admin' && 'Full access to all features including user management'}
              {form.role === 'PMO' && 'Access to all features including financial data'}
              {form.role === 'Executive' && 'Access to all features including financial data'}
              {form.role === 'PM' && 'Project management access — no financial data visibility'}
              {form.role === 'Viewer' && 'Read-only access — no financial data visibility'}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark">{editingUser ? 'Save Changes' : 'Create User'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
