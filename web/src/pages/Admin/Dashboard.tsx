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
  const [matrixFilter, setMatrixFilter] = useState<{ priority: number; condition: number } | null>(null);

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
  const activeStaff = users.filter((u: any) => u.isActive && u.role === 'staff').length;

  const recent = assessments.slice(0, 5);

  const countFor = (condition: number, priority: number) => {
    return assessments.filter((a: any) => (a.condition_rating || a.condition) === condition && (a.priority_rating || a.priority) === priority).length;
  };

  const matrixResults = useMemo(() => {
    if (!matrixFilter) return [];
    return assessments.filter((a: any) => {
      const condition = a.condition_rating || a.condition;
      const priority = a.priority_rating || a.priority;
      return condition === matrixFilter.condition && priority === matrixFilter.priority;
    });
  }, [assessments, matrixFilter]);

  const criticalIssues = useMemo(() => {
    return assessments.filter((a: any) => {
      const condition = a.condition_rating || a.condition;
      const priority = a.priority_rating || a.priority;
      return condition && priority && condition * priority > 18;
    }).length;
  }, [assessments]);

  const last7Days = useMemo(() => {
    const days: Date[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  }, []);

  const weekCounts = useMemo(() => {
    return last7Days.map((day) => {
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000 - 1;
      return assessments.filter((a: any) => a.created_at >= start && a.created_at <= end).length;
    });
  }, [assessments, last7Days]);

  const weekTotal = weekCounts.reduce((sum, value) => sum + value, 0);

  const weekLabels = last7Days.map((d) => d.toLocaleDateString(undefined, { weekday: 'short' }));

  const priorityDistribution = useMemo(() => {
    const map: Record<string, number> = {
      'Very High': 0,
      High: 0,
      Medium: 0,
      Low: 0,
      'Very Low': 0,
    };
    assessments.forEach((a: any) => {
      const value = a.priority_rating || a.priority;
      if (value === 5) map['Very High'] += 1;
      else if (value === 4) map.High += 1;
      else if (value === 3) map.Medium += 1;
      else if (value === 2) map.Low += 1;
      else if (value === 1) map['Very Low'] += 1;
    });
    return [
      { label: 'Very High', value: map['Very High'], color: '#f97316' },
      { label: 'High', value: map.High, color: '#fb923c' },
      { label: 'Medium', value: map.Medium, color: '#f59e0b' },
      { label: 'Low', value: map.Low, color: '#38bdf8' },
      { label: 'Very Low', value: map['Very Low'], color: '#60a5fa' },
    ];
  }, [assessments]);

  const donutTotal = priorityDistribution.reduce((sum, item) => sum + item.value, 0);
  const donutRadius = 56;
  const donutCenter = { x: 80, y: 80 };
  const donutCircumference = 2 * Math.PI * donutRadius;
  let donutOffset = 0;
  const chartPaddingX = 38;
  const chartPaddingY = 28;
  const chartWidth = 520;
  const chartHeight = 200;
  const yAxisX = chartPaddingX - 12;
  const yMax = Math.max(1, ...weekCounts);
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_value, index) => {
    const step = yMax / yTickCount;
    return Math.round(yMax - step * index);
  });
  const chartPoints = weekCounts.map((value, index) => {
    const step = (chartWidth - chartPaddingX * 2) / (weekCounts.length - 1);
    const x = chartPaddingX + step * index;
    const y = chartHeight - chartPaddingY - (value / yMax) * (chartHeight - chartPaddingY * 2);
    return { x, y, value };
  });
  const areaPath = chartPoints.length
    ? `M${chartPoints[0].x},${chartHeight - chartPaddingY} ` +
      chartPoints.map((point) => `L${point.x},${point.y}`).join(' ') +
      ` L${chartPoints[chartPoints.length - 1].x},${chartHeight - chartPaddingY} Z`
    : '';


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
        <>
          <div className="admin-stat-grid">
            <div className="card admin-stat-card">
              <div className="admin-stat-icon blue">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="3" width="12" height="18" rx="2" />
                  <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
              </div>
              <div className="admin-stat-title">Total Audits</div>
              <div className="admin-stat-value">{totalAssessments}</div>
            </div>
            <div className="card admin-stat-card">
              <div className="admin-stat-icon red">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3l9 16H3l9-16z" />
                  <path d="M12 8v5M12 17h.01" />
                </svg>
              </div>
              <div className="admin-stat-title">Critical Issues</div>
              <div className="admin-stat-value">{criticalIssues}</div>
            </div>
            <div className="card admin-stat-card">
              <div className="admin-stat-icon green">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16 11a4 4 0 1 0-8 0" />
                  <path d="M3 21a9 9 0 0 1 18 0" />
                </svg>
              </div>
              <div className="admin-stat-title">Active Staff</div>
              <div className="admin-stat-value">{activeStaff}</div>
            </div>
            <div className="card admin-stat-card">
              <div className="admin-stat-icon purple">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 15l4-4 4 3 6-7" />
                  <path d="M19 7h-5" />
                </svg>
              </div>
              <div className="admin-stat-title">This Week</div>
              <div className="admin-stat-value">{weekTotal}</div>
            </div>
          </div>

          <div className="admin-chart-grid">
            <div className="card admin-chart-card">
              <div className="section-heading">Audits This Week</div>
              <div className="line-chart">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 22}`} aria-hidden="true">
                  <defs>
                    <linearGradient id="auditArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {yTicks.map((tick) => {
                    const y = chartHeight - chartPaddingY - (tick / yMax) * (chartHeight - chartPaddingY * 2);
                    return (
                      <g key={`y-${tick}`}>
                        <line
                          className="chart-grid"
                          x1={chartPaddingX}
                          y1={y}
                          x2={chartWidth - chartPaddingX}
                          y2={y}
                        />
                        <text x={yAxisX} y={y} textAnchor="end" fill="#94a3b8" fontSize="12" dy="0.35em">
                          {tick}
                        </text>
                      </g>
                    );
                  })}
                  <line
                    x1={chartPaddingX}
                    y1={chartHeight - chartPaddingY}
                    x2={chartPaddingX}
                    y2={chartPaddingY}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  <line
                    x1={chartPaddingX}
                    y1={chartHeight - chartPaddingY}
                    x2={chartWidth - chartPaddingX}
                    y2={chartHeight - chartPaddingY}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                  />
                  {areaPath ? <path d={areaPath} fill="url(#auditArea)" /> : null}
                  <polyline
                    points={chartPoints.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartPoints.map((point, index) => (
                    <circle
                      key={`point-${index}`}
                      className="line-point"
                      cx={point.x}
                      cy={point.y}
                      r="4"
                    />
                  ))}
                  {chartPoints.map((point, index) => (
                    <text
                      key={`val-${index}`}
                      className="line-value"
                      x={point.x}
                      y={point.y - 10}
                      textAnchor="middle"
                    >
                      {point.value}
                    </text>
                  ))}
                  {chartPoints.map((point, index) => (
                    <text
                      key={`x-${index}`}
                      x={point.x}
                      y={chartHeight + 18}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize="12"
                    >
                      {weekLabels[index]}
                    </text>
                  ))}
                </svg>
              </div>
            </div>
            <div className="card admin-chart-card">
              <div className="section-heading">Priority Distribution</div>
              <div className="donut-chart simple">
                <svg viewBox="0 0 160 160" aria-hidden="true">
                  <circle className="donut-track" cx={donutCenter.x} cy={donutCenter.y} r={donutRadius} />
                  {donutTotal > 0 ? priorityDistribution.map((item) => {
                    const value = (item.value / donutTotal) * donutCircumference;
                    const dash = `${value} ${donutCircumference - value}`;
                    const circle = (
                      <circle
                        key={item.label}
                        className="donut-segment"
                        cx={donutCenter.x}
                        cy={donutCenter.y}
                        r={donutRadius}
                        stroke={item.color}
                        strokeDasharray={dash}
                        strokeDashoffset={-donutOffset}
                      />
                    );
                    donutOffset += value;
                    return circle;
                  }) : null}
                  <text className="donut-center-title" x={donutCenter.x} y={donutCenter.y - 4} textAnchor="middle">PRIORITY</text>
                  <text className="donut-center-sub" x={donutCenter.x} y={donutCenter.y + 14} textAnchor="middle">DISTRIBUTION</text>
                </svg>
                <div className="donut-legend">
                  {priorityDistribution.map((item) => (
                    <div className="legend-row" key={item.label}>
                      <span className="legend-dot" style={{ background: item.color }} />
                      <span>{item.label}</span>
                      <span className="legend-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <div className="section-heading">Condition and Priority Matrix</div>
        <div className="small">Tap any cells to view detailed assessments</div>
        <div style={{ marginTop: 12 }} className="matrix-grid">
          <div className="matrix-cell matrix-header matrix-header-diagonal">
            <span className="matrix-label matrix-label-priority">Priority</span>
            <span className="matrix-label matrix-label-condition">Condition</span>
          </div>
          {conditions.map((c) => (
            <div className="matrix-cell matrix-header" key={`c-${c}`}>
              <div>{c}</div>
              <div className="matrix-sub">
                {c === 5 ? 'Replace' : c === 4 ? 'Poor' : c === 3 ? 'Plan' : c === 2 ? 'Good' : 'Excellent'}
              </div>
            </div>
          ))}
          {priorities.map((p) => (
            <React.Fragment key={`p-${p}`}>
              <div className="matrix-cell matrix-header">
                <div>{p}</div>
                <div className="matrix-sub">
                  {p === 5 ? 'Very High' : p === 4 ? 'High' : p === 3 ? 'Medium' : p === 2 ? 'Low' : 'Very Low'}
                </div>
              </div>
              {conditions.map((c) => (
                <button
                  key={`cell-${p}-${c}`}
                  className={`matrix-cell matrix-cell-button ${riskClass(p, c)}`}
                  type="button"
                  onClick={() => setMatrixFilter({ priority: p, condition: c })}
                >
                  {countFor(c, p)}
                </button>
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

      {matrixFilter ? (
        <div className="matrix-modal-overlay" role="dialog" aria-modal="true">
          <div className="matrix-modal">
            <div className="matrix-modal-header">
              <div>
                <div className="matrix-modal-title">Assessments</div>
                <div className="muted">
                  Priority {matrixFilter.priority} / Condition {matrixFilter.condition} • {matrixResults.length} item(s)
                </div>
              </div>
              <button className="matrix-close" onClick={() => setMatrixFilter(null)}>x</button>
            </div>
            {matrixResults.length === 0 ? (
              <div className="muted">No matching assessments.</div>
            ) : (
              <div className="matrix-list">
                {matrixResults.map((item: any) => (
                  <div className="matrix-row" key={item.id}>
                    <div>
                      <div><strong>{item.category} - {item.element}</strong></div>
                      <div className="small">{item.building || 'Unknown'} • {new Date(item.created_at).toLocaleString()}</div>
                    </div>
                    <a className="button secondary muted-button" href={`/history/${item.id}`}>Open</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}



