import React, { useEffect, useState } from 'react';
import { api, type ApiUser } from '../../lib/api';
import { useOffline } from '../../lib/offline/network';
import { openBatchPdf } from '../../lib/pdf';

export default function AdminAllAssessments() {
  const { isOnline } = useOffline();
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const [assessments, userRes] = await Promise.all([
        api.listAssessments(),
        api.listUsers(),
      ]);
      setRows(assessments.assessments || []);
      setUsers(userRes.users || []);
    })();
  }, []);

  const getUserName = (userId: string) => users.find((u) => u.id === userId)?.displayName || 'Unknown';

  const filtered = rows.filter((r) => {
    const matchesUser = selectedUser === 'all' || r.user_id === selectedUser || r.userId === selectedUser;
    const q = query.toLowerCase();
    const matchesText = r.category.toLowerCase().includes(q) || r.element.toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q);
    return matchesUser && matchesText;
  });

  return (
    <div className="admin-assessments">
      <div className="page-header">
        <div className="page-title">All Assessments</div>
        <div className={`status-icon ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.3 12.7a10 10 0 0 1 13.4 0" />
  <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
  <path d="M12 19a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z" />
</svg></div>
      </div>

      <div className="card">
        <div className="row">
          <div className="col">
            <div className="label">Search</div>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="col">
            <div className="label">Filter by User</div>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
              <option value="all">All Users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
          </div>
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          Showing {filtered.length} of {rows.length} assessments
        </div>
      </div>

      <div className="card">
        <div className="history-header">
          <div className="history-count">Results</div>
          <button className="button secondary muted-button" onClick={() => openBatchPdf(filtered)} disabled={filtered.length === 0}>
            Export as PDF
          </button>
        </div>
        {filtered.length === 0 ? (
          <div className="muted">No assessments found.</div>
        ) : filtered.map((item) => (
          <a className="history-item" key={item.id} href={`/history/${item.id}`}>
            {item.photo_uri ? <img className="thumb" src={item.photo_uri} alt="thumb" /> : <div className="thumb placeholder">🧾</div>}
            <div className="history-item-content">
              <div className="history-title">{item.category} - {item.element}</div>
              <div className="history-meta">User: {getUserName(item.user_id || item.userId)}</div>
              <div className="history-meta">🗓 {new Date(item.created_at).toLocaleDateString()} · ⏰ {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <span className="history-chevron">›</span>
          </a>
        ))}
      </div>
    </div>
  );
}


