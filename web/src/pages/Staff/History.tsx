import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useOffline } from '../../lib/offline/network';
import { openBatchPdf } from '../../lib/pdf';

const CATEGORIES = ['Civil', 'Electrical', 'Mechanical'];

export default function StaffHistory() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [datePreset, setDatePreset] = useState('all');

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      const data = await api.listAssessments(user.id);
      setRows(data.assessments || []);
      setLoading(false);
    })();
  }, [user]);

  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case 'today':
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);
        setStartDate(todayStart);
        setEndDate(todayEnd);
        break;
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday);
        yesterdayStart.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        setStartDate(yesterdayStart);
        setEndDate(yesterdayEnd);
        break;
      case 'last7days':
        const last7Start = new Date(now);
        last7Start.setDate(last7Start.getDate() - 6);
        last7Start.setHours(0, 0, 0, 0);
        const last7End = new Date(now);
        last7End.setHours(23, 59, 59, 999);
        setStartDate(last7Start);
        setEndDate(last7End);
        break;
      case 'last30days':
        const last30Start = new Date(now);
        last30Start.setDate(last30Start.getDate() - 29);
        last30Start.setHours(0, 0, 0, 0);
        const last30End = new Date(now);
        last30End.setHours(23, 59, 59, 999);
        setStartDate(last30Start);
        setEndDate(last30End);
        break;
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(now);
        monthEnd.setHours(23, 59, 59, 999);
        setStartDate(monthStart);
        setEndDate(monthEnd);
        break;
      case 'all':
      default:
        setStartDate(null);
        setEndDate(null);
        break;
    }
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      if (startDate && r.created_at < startDate.getTime()) return false;
      if (endDate && r.created_at > endDate.getTime()) return false;
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      return r.category.toLowerCase().includes(q) || r.element.toLowerCase().includes(q) || (r.notes || '').toLowerCase().includes(q);
    });
  }, [rows, query, startDate, endDate, selectedCategory]);

  const clearFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedCategory('all');
    setDatePreset('all');
  };

  const exportPdf = () => {
    if (filtered.length === 0) return;
    openBatchPdf(filtered);
  };

  return (
    <div className="history">
      <div className="page-header">
        <div className="page-title">History</div>
        <div className={`status-icon ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.3 12.7a10 10 0 0 1 13.4 0" />
  <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
  <path d="M12 19a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z" />
</svg></div>
      </div>

      <div className="card filter-card">
        <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
          <span className="filter-icon">🧾</span>
          <span className="filter-title">Filters</span>
          <span className="filter-caret">{showFilters ? '▴' : '▾'}</span>
        </button>
        {showFilters && (
          <div className="filter-body">
            <div className="label">Date Range</div>
            <div className="pill-row">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7days', label: 'Last 7 Days' },
                { id: 'last30days', label: 'Last 30 Days' },
                { id: 'thisMonth', label: 'This Month' },
              ].map((p) => (
                <button key={p.id} className={`pill ${datePreset === p.id ? 'active' : ''}`} onClick={() => applyDatePreset(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="label">Category</div>
              <button className="select-button" onClick={() => {}}>
                <span className="select-icon">🧩</span>
                <span className="select-text">{selectedCategory === 'all' ? 'All Categories' : selectedCategory}</span>
                <span className="select-caret">▾</span>
              </button>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ marginTop: 8 }}>
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <button className="button secondary" onClick={clearFilters}>Clear Filters</button>
            </div>
          </div>
        )}
      </div>

      <div className="card history-results">
        <div className="history-header">
          <div className="history-count">{filtered.length} of {rows.length} Assessments</div>
          <button className="button secondary muted-button" onClick={exportPdf} disabled={filtered.length === 0}>Export as PDF</button>
        </div>
        {loading ? (
          <div>Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="muted">No assessments found.</div>
        ) : (
          filtered.map((item) => (
            <Link className="history-item" key={item.id} to={`/history/${item.id}`}>
              {item.photo_uri ? <img className="thumb" src={item.photo_uri} alt="thumb" /> : <div className="thumb placeholder">🧾</div>}
              <div className="history-item-content">
                <div className="history-title">{item.category} - {item.element}</div>
                <div className="history-meta">
                  📅 {new Date(item.created_at).toLocaleDateString()} · ⏰ {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <span className="history-chevron">›</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}


