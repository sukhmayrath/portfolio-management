import { useState } from 'react';
import { api } from '../api/client';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Portfolio Manager</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to continue</p>
        </div>
        {error && <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <button type="submit" className="w-full py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark">Sign In</button>
        </form>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500 font-medium mb-1">Demo accounts:</p>
          <p className="text-xs text-slate-400">admin / admin &nbsp;·&nbsp; pmo_user / pmo123</p>
          <p className="text-xs text-slate-400">pm_user / pm123 &nbsp;·&nbsp; exec_user / exec123</p>
        </div>
      </div>
    </div>
  );
}
