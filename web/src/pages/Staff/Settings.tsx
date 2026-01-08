import React, { useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useOffline } from '../../lib/offline/network';
import { useTheme } from '../../lib/theme';
import DateFilterModal from '../../components/DateFilterModal';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function csvEscape(value: string | number | null) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needs = str.includes(',') || str.includes('\n') || str.includes('"');
  const out = str.replace(/"/g, '""');
  return needs ? `"${out}"` : out;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let i = 0;
  let field = '';
  let inQuotes = false;
  const cur: string[] = [];
  while (i < text.length) {
    const ch = text[i++];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i] === '\n') i++;
        if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push([...cur]); cur.length = 0; field = ''; }
      } else field += ch;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

export default function Settings() {
  const { user, signOut, refresh } = useAuth();
  const { isOnline } = useOffline();
  const { preference, setPreference } = useTheme();
  const [metrics, setMetrics] = useState<{ assessmentCount: number; imageCount: number; storageBytes: number; lastCalculated: number } | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  const [showNameModal, setShowNameModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = useMemo(() => (user?.displayName || 'U').split(' ').map((p) => p[0]).slice(0, 2).join(''), [user?.displayName]);
  const appVersion = '1.0.0';
  const platformLabel = 'Web App';

  const loadMetrics = async () => {
    if (!user) return;
    setLoadingMetrics(true);
    const data = await api.getMetrics(user.id);
    setMetrics(data);
    setLoadingMetrics(false);
  };

  React.useEffect(() => { loadMetrics(); }, [user]);

  const exportCsv = async (filters: { month?: number; year?: number } | null) => {
    if (!user) return;
    const data = await api.listAssessments(user.id);
    let rows = data.assessments || [];

    if (filters?.month && filters?.year) {
      rows = rows.filter((r) => {
        const d = new Date(r.created_at);
        return d.getMonth() + 1 === filters.month && d.getFullYear() === filters.year;
      });
    }

    const header = [
      'Assessment ID', 'Date Created', 'Building', 'Floor', 'Room', 'Category', 'Element',
      'Condition', 'Priority', 'Latitude', 'Longitude', 'Notes', 'Photo URL', 'User ID'
    ];
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        csvEscape(r.id),
        csvEscape(new Date(r.created_at).toLocaleString()),
        csvEscape(r.building || ''),
        csvEscape(r.floor || ''),
        csvEscape(r.room || ''),
        csvEscape(r.category),
        csvEscape(r.element),
        csvEscape(r.condition_rating || r.condition),
        csvEscape(r.priority_rating || r.priority),
        csvEscape(r.latitude),
        csvEscape(r.longitude),
        csvEscape(r.notes || ''),
        csvEscape(r.photo_uri || ''),
        csvEscape(r.user_id || r.userId || ''),
      ].join(','));
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-audit-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    if (!user) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) return;
    const [header, ...dataRows] = rows;
    const idx = (name: string) => {
      const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const index = header.findIndex((h) => normalized(h) === normalized(name));
      return index >= 0 ? index : header.indexOf(name);
    };

    for (const row of dataRows) {
      if (!row || row.length === 0) continue;
      const dateStr = row[idx('Date Created')] || row[idx('created_at')];
      const created_at = dateStr ? (isNaN(Number(dateStr)) ? new Date(dateStr).getTime() : Number(dateStr)) : Date.now();
      const latitude = row[idx('Latitude')] ? Number(row[idx('Latitude')]) : null;
      const longitude = row[idx('Longitude')] ? Number(row[idx('Longitude')]) : null;
      const category = row[idx('Category')] || row[idx('category')] || '';
      const element = row[idx('Element')] || row[idx('element')] || '';
      const condition = Number(row[idx('Condition')] || row[idx('condition')] || 1);
      const priority = Number(row[idx('Priority')] || row[idx('priority')] || 1);
      const notes = row[idx('Notes')] || row[idx('notes')] || '';
      const photo_uri = row[idx('Photo URL')] || row[idx('photo_uri')] || '';
      const building = row[idx('Building')] || row[idx('building')] || '';
      const floor = row[idx('Floor')] || row[idx('floor')] || '';
      const room = row[idx('Room')] || row[idx('room')] || '';

      if (!category || !element || !photo_uri) continue;

      const form = new FormData();
      form.append('created_at', String(created_at));
      form.append('building', building);
      form.append('floor', floor);
      form.append('room', room);
      form.append('category', category);
      form.append('element', element);
      form.append('condition', String(condition));
      form.append('priority', String(priority));
      form.append('notes', notes);
      if (latitude != null) form.append('latitude', String(latitude));
      if (longitude != null) form.append('longitude', String(longitude));
      form.append('photo_uri', photo_uri);
      await api.createAssessment(form);
    }
    await loadMetrics();
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setError('Please enter a display name.');
      return;
    }
    if (newName.trim().length < 2) {
      setError('Display name must be at least 2 characters.');
      return;
    }
    setUpdating(true);
    await api.updateMe({ displayName: newName.trim() });
    await refresh();
    setUpdating(false);
    setShowNameModal(false);
    setError(null);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setUpdating(true);
    await api.changePassword(currentPassword, newPassword);
    setUpdating(false);
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const uploadPhoto = async (file: File) => {
    setPhotoUploading(true);
    await api.uploadProfilePhoto(file);
    await refresh();
    setPhotoUploading(false);
  };

  const clearMyData = async () => {
    if (!user) return;
    if (!confirm('Delete all your assessments?')) return;
    const data = await api.listAssessments(user.id);
    for (const item of data.assessments || []) {
      await api.deleteAssessment(item.id);
    }
    await loadMetrics();
  };

  return (
    <div className="settings">
      {error && <div className="card"><div className="error">{error}</div></div>}

      <div className="page-header">
        <div className="page-title">Settings</div>
        <div className={`status-icon ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.3 12.7a10 10 0 0 1 13.4 0" />
  <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
  <path d="M12 19a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z" />
</svg></div>
      </div>

      <div className="card">
        <div className="settings-profile">
          <div className="settings-avatar">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt="Profile" />
            ) : (
              <span>{initials || 'U'}</span>
            )}
            <label className="avatar-edit">
              {photoUploading ? '...' : '📷'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            </label>
          </div>
          <div className="settings-profile-info">
            <div className="settings-name">{user?.displayName || 'User'}</div>
            <div className="small">{user?.email}</div>
            <div className="role-pill">
              <span className="role-pill-icon">👤</span>
              {user?.role === 'admin' ? 'Admin' : 'Staff'}
            </div>
          </div>
        </div>

        <div className="settings-info">
          <div className="settings-info-row">
            <div className="settings-info-head">
              <div className="settings-label">Display Name</div>
              <button className="icon-button" onClick={() => { setNewName(user?.displayName || ''); setShowNameModal(true); }}>✏️</button>
            </div>
            <div className="settings-value">{user?.displayName || 'Not set'}</div>
          </div>
          <div className="settings-info-row">
            <div className="settings-info-head">
              <div className="settings-label">Email Address</div>
              <span className="lock-icon">🔒</span>
            </div>
            <div className="settings-value">{user?.email || 'Unknown'}</div>
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-section">
          <div className="settings-label">Security</div>
          <button className="button secondary muted-button full" onClick={() => setShowPasswordModal(true)}>Change Password</button>
          <button className="button danger full" onClick={signOut}>Sign Out</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Appearance</div>
        <div className="settings-stack">
          <button className={`button ${preference === 'light' ? 'primary' : 'secondary muted-button'}`} onClick={() => setPreference('light')}>{preference === 'light' ? 'Light *' : 'Light'}</button>
          <button className={`button ${preference === 'dark' ? 'primary' : 'secondary muted-button'}`} onClick={() => setPreference('dark')}>{preference === 'dark' ? 'Dark *' : 'Dark'}</button>
          <button className={`button ${preference === 'system' ? 'primary' : 'secondary muted-button'}`} onClick={() => setPreference('system')}>{preference === 'system' ? 'System *' : 'System'}</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Data Management</div>
        {loadingMetrics || !metrics ? (
          <div className="muted">Calculating storage usage...</div>
        ) : (
          <div className="metrics-table">
            <div className="metric-row"><span>Total Assessments:</span><strong>{metrics.assessmentCount}</strong></div>
            <div className="metric-row"><span>Images Stored:</span><strong>{metrics.imageCount}</strong></div>
            <div className="metric-row"><span>Database Data:</span><strong>{formatBytes(metrics.storageBytes)}</strong></div>
            <div className="metric-row total"><span>Total Storage:</span><strong>{formatBytes(metrics.storageBytes)}</strong></div>
            <div className="small">Last updated: {metrics?.lastCalculated ? new Date(metrics.lastCalculated).toLocaleString() : '-'}</div>
          </div>
        )}

        <div className="settings-stack" style={{ marginTop: 12 }}>
          <button className="button primary" onClick={() => setShowDateModal(true)}>Export Data to CSV</button>
          <label className="button secondary muted-button">
            Import Data from CSV
            <input type="file" accept="text/csv" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
          </label>
          <button className="button danger" onClick={clearMyData}>Clear My Data</button>
        </div>
      </div>

      <div className="card">
        <div className="card-title">About Asset Audit</div>
        <div className="settings-info-row settings-info-row-inline">
          <div className="settings-label">Version</div>
          <div className="pill-green">{appVersion}</div>
        </div>
        <div className="settings-info-row settings-info-row-inline">
          <div className="settings-label">Platform</div>
          <div className="settings-value">{platformLabel}</div>
        </div>
      </div>

      <DateFilterModal open={showDateModal} onClose={() => setShowDateModal(false)} onApply={exportCsv} />

      {showNameModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Edit Display Name</div>
              <button className="button secondary" onClick={() => setShowNameModal(false)}>Close</button>
            </div>
            <div className="section">
              <div className="label">Display Name</div>
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <button className="button primary" onClick={handleUpdateName} disabled={updating}>Save</button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Change Password</div>
              <button className="button secondary" onClick={() => setShowPasswordModal(false)}>Close</button>
            </div>
            <div className="section">
              <div className="label">Current Password</div>
              <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="section">
              <div className="label">New Password</div>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="section">
              <div className="label">Confirm Password</div>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button className="button primary" onClick={handleChangePassword} disabled={updating}>Update Password</button>
          </div>
        </div>
      )}
    </div>
  );
}


