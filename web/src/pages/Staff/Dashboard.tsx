import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useOffline } from '../../lib/offline/network';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const navigate = useNavigate();
  const [total, setTotal] = useState(0);
  const [today, setToday] = useState(0);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      const data = await api.listAssessments(user.id);
      const rows = data.assessments || [];
      setTotal(rows.length);
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const todayCount = rows.filter((r: any) => r.created_at >= start.getTime() && r.created_at <= end.getTime()).length;
      setToday(todayCount);
      setRecent(rows.slice(0, 3));
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="dashboard">
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className={`status-icon ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.3 12.7a10 10 0 0 1 13.4 0" />
  <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
  <path d="M12 19a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z" />
</svg></div>
      </div>

      <div className="logo-row">
        <img className="brand-logo" src="/logo.png" alt="Microcorp" />
      </div>

      <div className="card">
        <div className="welcome-card">
          <div>
            <div className="muted">Welcome back!</div>
            <div className="welcome-name">{user?.displayName || 'User'}</div>
            <div className="role-pill">
              <span className="role-pill-icon">👤</span>
              {user?.role === 'admin' ? 'ADMIN' : 'STAFF'}
            </div>
          </div>
          {user?.photoUrl ? (
            <img className="avatar-circle" src={user.photoUrl} alt="Profile" />
          ) : (
            <div className="avatar-circle">👤</div>
          )}
        </div>
      </div>

      <div className="section-heading">Overview</div>
      {loading ? (
        <div className="card">Loading...</div>
      ) : (
        <div className="metrics-grid">
          <div className="card metric-card staff-metric">
            <div className="metric-icon">📄</div>
            <div>
              <div className="metric-value">{total}</div>
              <div className="metric-label">Total Audits</div>
            </div>
          </div>
          <div className="card metric-card staff-metric">
            <div className="metric-icon">📆</div>
            <div>
              <div className="metric-value">{today}</div>
              <div className="metric-label">Today</div>
            </div>
          </div>
        </div>
      )}

      <div className="card action-card">
        <div className="action-row">
          <div className="action-icon">📷</div>
          <div>
            <div className="card-title">Start New Audit</div>
            <div className="muted">Capture and assess a new asset with our guided process.</div>
          </div>
        </div>
        <button className="button primary full" onClick={() => navigate('/staff/capture')}>Begin Audit</button>
      </div>

      <div className="section-header">
        <div className="section-heading">Recent Activity</div>
        <button className="button secondary muted-button" onClick={() => navigate('/staff/history')}>View All</button>
      </div>
      <div className="card">
        {recent.length === 0 ? (
          <div className="muted">No assessments yet.</div>
        ) : (
          <>
            {recent.map((item) => (
              <div className="activity-item" key={item.id}>
                <div className="row" style={{ alignItems: 'center' }}>
                  {item.photo_uri ? <img className="thumb" src={item.photo_uri} alt="thumb" /> : <div className="thumb placeholder">🧾</div>}
                  <div>
                    <div className="activity-title">{item.category} - {item.element}</div>
                    <div className="small">🗓 {new Date(item.created_at).toLocaleDateString()}  ⏰ {new Date(item.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
                <button className="button secondary muted-button" onClick={() => navigate(`/staff/history/${item.id}`)}>Open</button>
              </div>
            ))}
            <div className="center" style={{ paddingTop: 12 }}>
              <button className="button secondary full muted-button" onClick={() => navigate('/staff/history')}>View All History</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


