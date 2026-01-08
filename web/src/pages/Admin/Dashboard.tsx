import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useOffline } from '../../lib/offline/network';

const conditions = [5, 4, 3, 2, 1];
const priorities = [5, 4, 3, 2, 1];

function riskClass(priority: number, condition: number) {
  const score = priority * condition;
  if (score <= 6) return 'matrix-low';
  if (score <= 12) return 'matrix-medium';
  if (score <= 18) return 'matrix-high';
  return 'matrix-critical';
}

export default function AdminDashboard() {
  const { isOnline } = useOffline();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ storageBytes: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [assessmentsRes, usersRes, metricsRes] = await Promise.all([
        api.listAssessments(),
        api.listUsers(),
        api.getSystemMetrics(),
      ]);
      setAssessments(assessmentsRes.assessments || []);
      setUsers(usersRes.users || []);
      setMetrics(metricsRes);
      setLoading(false);
    })();
  }, []);

  const totalAssessments = assessments.length;
  const totalUsers = users.length;
  const activeUsers = users.filter((u: any) => u.isActive).length;

  const todayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return assessments.filter((a: any) => a.created_at >= start.getTime() && a.created_at <= end.getTime()).length;
  }, [assessments]);

  const recent = assessments.slice(0, 5);

  const countFor = (condition: number, priority: number) => {
    return assessments.filter((a: any) => (a.condition_rating || a.condition) === condition && (a.priority_rating || a.priority) === priority).length;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="admin-dashboard">
      <div className="page-header">
        <div className="page-title">Admin Dashboard</div>
        <div className={`status-icon ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.3 12.7a10 10 0 0 1 13.4 0" />
  <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
  <path d="M12 19a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z" />
</svg></div>
      </div>

      {loading ? (
        <div className="card">Loading...</div>
      ) : (
        <div className="metrics-grid">
          <div className="card metric-card staff-metric">
            <div className="metric-icon">📄</div>
            <div>
              <div className="metric-value">{totalAssessments}</div>
              <div className="metric-label">Total Assessments</div>
            </div>
          </div>
          <div className="card metric-card staff-metric">
            <div className="metric-icon">📆</div>
            <div>
              <div className="metric-value">{todayCount}</div>
              <div className="metric-label">Today</div>
            </div>
          </div>
          <div className="card metric-card staff-metric">
            <div className="metric-icon">👤</div>
            <div>
              <div className="metric-value">{totalUsers}</div>
              <div className="metric-label">Total Users</div>
            </div>
          </div>
          <div className="card metric-card staff-metric">
            <div className="metric-icon">✅</div>
            <div>
              <div className="metric-value">{activeUsers}</div>
              <div className="metric-label">Active Users</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-heading">Condition and Priority Matrix</div>
        <div className="small">Priority (rows) and Condition (columns)</div>
        <div style={{ marginTop: 12 }} className="matrix-grid">
          <div className="matrix-cell matrix-header">Priority</div>
          {conditions.map((c) => (
            <div className="matrix-cell matrix-header" key={`c-${c}`}>Cond {c}</div>
          ))}
          {priorities.map((p) => (
            <React.Fragment key={`p-${p}`}>
              <div className="matrix-cell matrix-header">Pri {p}</div>
              {conditions.map((c) => (
                <div key={`cell-${p}-${c}`} className={`matrix-cell ${riskClass(p, c)}`}>
                  {countFor(c, p)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="section-heading">Storage</div>
        <div className="row">
          <div className="col"><div className="label">Total Storage</div>{metrics ? formatBytes(metrics.storageBytes || 0) : 'Loading...'}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">Recent Assessments</div>
        {recent.length === 0 ? (
          <div className="muted">No assessments yet.</div>
        ) : (
          recent.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row" style={{ alignItems: 'center' }}>
                {item.photo_uri ? <img className="thumb" src={item.photo_uri} alt="thumb" /> : <div className="thumb placeholder">🧾</div>}
                <div>
                  <div><strong>{item.category} - {item.element}</strong></div>
                  <div className="small">{new Date(item.created_at).toLocaleString()}</div>
                </div>
              </div>
              <a className="button secondary muted-button" href={`/history/${item.id}`}>Open</a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


