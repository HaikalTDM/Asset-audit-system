import React, { useEffect, useState } from 'react';
import { api, type ApiUser } from '../../lib/api';
import { useOffline } from '../../lib/offline/network';

export default function AdminUsers() {
  const { isOnline } = useOffline();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', role: 'staff' as 'admin' | 'staff' });

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.listUsers();
      setUsers(data.users || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!form.displayName || !form.email || !form.password) return;
    setCreating(true);
    try {
      await api.adminCreateUser(form.email, form.password, form.displayName, form.role);
      setForm({ displayName: '', email: '', password: '', role: 'staff' });
      await load();
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (id: string, data: { role?: 'admin' | 'staff'; isActive?: boolean }) => {
    await api.adminUpdateUser(id, data);
    await load();
  };

  const resetPassword = async (id: string) => {
    const res = await api.adminResetPassword(id);
    alert(`Temporary password: ${res.tempPassword}`);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await api.adminDeleteUser(id);
    await load();
  };

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const staffCount = users.filter((u) => u.role === 'staff').length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="admin-users">
      <div className="page-header">
        <div className="page-title">Users</div>
        <div className={`status-icon ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.3 12.7a10 10 0 0 1 13.4 0" />
  <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
  <path d="M12 19a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z" />
</svg></div>
      </div>

      <div className="metrics-grid">
        <div className="card metric-card staff-metric">
          <div className="metric-icon">🛡️</div>
          <div>
            <div className="metric-value">{adminCount}</div>
            <div className="metric-label">Admins</div>
          </div>
        </div>
        <div className="card metric-card staff-metric">
          <div className="metric-icon">👤</div>
          <div>
            <div className="metric-value">{staffCount}</div>
            <div className="metric-label">Staff</div>
          </div>
        </div>
        <div className="card metric-card staff-metric">
          <div className="metric-icon">✅</div>
          <div>
            <div className="metric-value">{activeCount}</div>
            <div className="metric-label">Active</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">Create User</div>
        <div className="row admin-user-form">
          <div className="col">
            <div className="label">Display Name</div>
            <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div className="col">
            <div className="label">Email</div>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="col">
            <div className="label">Password</div>
            <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="col">
            <div className="label">Role</div>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'staff' })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        <button className="button primary full admin-user-submit" onClick={createUser} disabled={creating}>
          {creating ? 'Creating...' : 'Create User'}
        </button>
      </div>

      <div className="card">
        <div className="section-heading">All Users</div>
        {loading && <div>Loading...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && users.map((u) => (
          <div className="user-row" key={u.id}>
            <div className="user-info">
              <div className="user-name">{u.displayName}</div>
              <div className="small">{u.email}</div>
              <div className="small">Role: {u.role} · Active: {u.isActive ? 'Yes' : 'No'}</div>
            </div>
            <div className="user-actions">
              <button className="button secondary" onClick={() => updateUser(u.id, { role: u.role === 'admin' ? 'staff' : 'admin' })}>
                Toggle Role
              </button>
              <button className="button secondary" onClick={() => updateUser(u.id, { isActive: !u.isActive })}>
                {u.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button className="button secondary" onClick={() => resetPassword(u.id)}>Reset Password</button>
              <button className="button danger" onClick={() => deleteUser(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


