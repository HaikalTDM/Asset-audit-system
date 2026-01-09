import React, { useMemo, useState } from 'react';
import { api } from '../../lib/api';

type ReportType = 'detailed' | 'risk' | 'staff';

type HistoryEntry = {
  id: string;
  title: string;
  createdAt: number;
  filename: string;
};

const timeOptions = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'All Time', value: 0 },
];

const priorityOptions = [
  { label: 'All Priorities', value: 0 },
  { label: 'Very High', value: 5 },
  { label: 'High', value: 4 },
  { label: 'Medium', value: 3 },
  { label: 'Low', value: 2 },
  { label: 'Very Low', value: 1 },
];

function formatDate(ts: number) {
  return new Date(ts).toISOString();
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminReport() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportType>('detailed');
  const [timePeriod, setTimePeriod] = useState(30);
  const [priorityLevel, setPriorityLevel] = useState(0);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      const [assessmentsRes, usersRes] = await Promise.all([
        api.listAssessments(),
        api.listUsers(),
      ]);
      setAssessments(assessmentsRes.assessments || []);
      setUsers(usersRes.users || []);
      setLoading(false);
    })();
  }, []);

  const userMap = useMemo(() => {
    const map = new Map<string, any>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const filteredAssessments = useMemo(() => {
    const now = Date.now();
    const minDate = timePeriod ? now - timePeriod * 24 * 60 * 60 * 1000 : 0;
    return assessments.filter((a) => a.created_at >= minDate);
  }, [assessments, timePeriod]);

  const priorityFiltered = useMemo(() => {
    if (!priorityLevel) return filteredAssessments;
    return filteredAssessments.filter((a) => (a.priority_rating || a.priority) === priorityLevel);
  }, [filteredAssessments, priorityLevel]);

  const summaryCounts = useMemo(() => {
    const highRisk = filteredAssessments.filter((a) => (a.priority_rating || a.priority) >= 4).length;
    const staffCount = users.filter((u) => u.role === 'staff' && u.isActive).length;
    const thisWeek = filteredAssessments.filter((a) => a.created_at >= Date.now() - 7 * 24 * 60 * 60 * 1000).length;
    return { total: filteredAssessments.length, highRisk, staffCount, thisWeek };
  }, [filteredAssessments, users]);

  const openModal = (type: ReportType) => {
    setActiveReport(type);
    setModalOpen(true);
  };

  const handleGenerate = () => {
    const nowLabel = new Date().toISOString().replace(/[:.]/g, '-');
    if (activeReport === 'detailed') {
      const rows = [
        ['id', 'user_id', 'user_name', 'user_email', 'created_at', 'building', 'floor', 'room', 'category', 'element', 'condition', 'priority', 'damage_category', 'root_cause', 'notes', 'latitude', 'longitude'],
        ...priorityFiltered.map((a) => {
          const user = userMap.get(a.user_id);
          return [
            a.id,
            a.user_id,
            user?.displayName || '',
            user?.email || '',
            formatDate(a.created_at),
            a.building || '',
            a.floor || '',
            a.room || '',
            a.category || '',
            a.element || '',
            a.condition_rating || a.condition || '',
            a.priority_rating || a.priority || '',
            a.damage_category || '',
            a.root_cause || '',
            a.notes || '',
            a.latitude || '',
            a.longitude || '',
          ];
        }),
      ];
      const filename = `detailed-audit-log-${nowLabel}.csv`;
      downloadCsv(filename, rows);
      setHistory((prev) => [{ id: nowLabel, title: 'Detailed Audit Log', createdAt: Date.now(), filename }, ...prev]);
    }

    if (activeReport === 'risk') {
      const rows = [
        ['id', 'user_name', 'user_email', 'created_at', 'building', 'category', 'element', 'condition', 'priority'],
        ...priorityFiltered
          .filter((a) => (a.priority_rating || a.priority) >= 4)
          .map((a) => {
            const user = userMap.get(a.user_id);
            return [
              a.id,
              user?.displayName || '',
              user?.email || '',
              formatDate(a.created_at),
              a.building || '',
              a.category || '',
              a.element || '',
              a.condition_rating || a.condition || '',
              a.priority_rating || a.priority || '',
            ];
          }),
      ];
      const filename = `risk-summary-${nowLabel}.csv`;
      downloadCsv(filename, rows);
      setHistory((prev) => [{ id: nowLabel, title: 'Risk Summary', createdAt: Date.now(), filename }, ...prev]);
    }

    if (activeReport === 'staff') {
      const counts = new Map<string, number>();
      priorityFiltered.forEach((a) => {
        counts.set(a.user_id, (counts.get(a.user_id) || 0) + 1);
      });
      const rows = [
        ['user_id', 'user_name', 'user_email', 'assessments'],
        ...Array.from(counts.entries()).map(([userId, count]) => {
          const user = userMap.get(userId);
          return [userId, user?.displayName || '', user?.email || '', String(count)];
        }),
      ];
      const filename = `staff-activity-${nowLabel}.csv`;
      downloadCsv(filename, rows);
      setHistory((prev) => [{ id: nowLabel, title: 'Staff Activity', createdAt: Date.now(), filename }, ...prev]);
    }

    setModalOpen(false);
  };

  return (
    <div className="admin-report">
      <div className="page-header">
        <div>
          <div className="page-title">Reports Centre</div>
          <div className="muted">Generate and download real audit data.</div>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading...</div>
      ) : (
        <>
          <div className="report-grid">
            <div className="card report-card">
              <div className="report-card-top">
                <div className="report-icon green">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="6" y="3" width="12" height="18" rx="2" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                  </svg>
                </div>
                <span className="report-pill">CSV</span>
              </div>
              <div className="report-title">Detailed Audit Log</div>
              <div className="report-subtitle">Complete export of all assessments data.</div>
              <div className="report-metric">Total Records: {summaryCounts.total}</div>
              <button className="report-button" onClick={() => openModal('detailed')}>Configure & Generate</button>
            </div>

            <div className="card report-card">
              <div className="report-card-top">
                <div className="report-icon red">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3l9 16H3l9-16z" />
                    <path d="M12 8v5M12 17h.01" />
                  </svg>
                </div>
                <span className="report-pill">CSV</span>
              </div>
              <div className="report-title">Risk Summary</div>
              <div className="report-subtitle">High and critical priority items only.</div>
              <div className="report-metric">Critical Issues: {summaryCounts.highRisk}</div>
              <button className="report-button" onClick={() => openModal('risk')}>Configure & Generate</button>
            </div>

            <div className="card report-card">
              <div className="report-card-top">
                <div className="report-icon blue">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 19h16M7 16V8M12 16V5M17 16v-6" />
                  </svg>
                </div>
                <span className="report-pill">CSV</span>
              </div>
              <div className="report-title">Staff Activity</div>
              <div className="report-subtitle">Performance stats per staff member.</div>
              <div className="report-metric">Active Staff: {summaryCounts.staffCount}</div>
              <button className="report-button" onClick={() => openModal('staff')}>Configure & Generate</button>
            </div>
          </div>

          <div className="card report-history">
            <div className="section-heading">Recent History</div>
            {history.length === 0 ? (
              <div className="muted center">Your recent downloads will appear here.</div>
            ) : (
              <div className="report-history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="report-history-item">
                    <div>
                      <div className="report-history-title">{entry.title}</div>
                      <div className="small muted">{new Date(entry.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="small">{entry.filename}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {modalOpen ? (
        <div className="report-modal-overlay" role="dialog" aria-modal="true">
          <div className="report-modal">
            <div className="report-modal-header">
              <div>
                <div className="report-modal-title">Configure Report</div>
                <div className="muted">Set filters for the {activeReport === 'risk' ? 'Risk Summary' : activeReport === 'staff' ? 'Staff Activity' : 'Detailed Audit Log'}.</div>
              </div>
              <button className="report-close" onClick={() => setModalOpen(false)}>x</button>
            </div>

            <div className="report-field">
              <div className="report-label">Time Period</div>
              <select value={timePeriod} onChange={(e) => setTimePeriod(Number(e.target.value))}>
                {timeOptions.map((option) => (
                  <option key={option.label} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="report-field">
              <div className="report-label">Priority Level</div>
              <select value={priorityLevel} onChange={(e) => setPriorityLevel(Number(e.target.value))}>
                {priorityOptions.map((option) => (
                  <option key={option.label} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <button className="report-download" onClick={handleGenerate}>Download CSV</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
