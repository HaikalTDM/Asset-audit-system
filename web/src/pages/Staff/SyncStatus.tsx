import React, { useEffect, useState } from 'react';
import { useOffline } from '../../lib/offline/network';
import { listPending } from '../../lib/offline/db';

export default function SyncStatus() {
  const { isOnline, pendingCount, isSyncing, manualSync, retryAllFailed } = useOffline();
  const [message, setMessage] = useState<string>('');
  const [pending, setPending] = useState<any[]>([]);
  const [failed, setFailed] = useState<any[]>([]);

  const refresh = async () => {
    const p = await listPending('pending');
    const f = await listPending('failed');
    setPending(p);
    setFailed(f);
  };

  useEffect(() => { refresh(); }, [pendingCount]);

  const runSync = async () => {
    const result = await manualSync();
    setMessage(`Synced: ${result.syncedCount}, Failed: ${result.failedCount}`);
    await refresh();
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Sync</div>
        <div className={`status-icon ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}>
  <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M5.3 12.7a10 10 0 0 1 13.4 0" />
  <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
  <path d="M12 19a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3Z" />
</svg></div>
      </div>
      <div className="card">
        <div className="card-title">Sync Status</div>
        <div className="row">
          <div className="col"><div className="label">Network</div>{isOnline ? 'Online' : 'Offline'}</div>
          <div className="col"><div className="label">Pending Items</div>{pendingCount}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Actions</div>
        <div className="row">
          <button className="button primary" onClick={runSync} disabled={!isOnline || isSyncing || pendingCount === 0}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button className="button secondary muted-button" onClick={retryAllFailed} disabled={!isOnline || isSyncing}>
            Retry Failed
          </button>
        </div>
        {message && <div className="small" style={{ marginTop: 8 }}>{message}</div>}
      </div>

      <div className="card">
        <div className="card-title">Pending Assessments</div>
        {pending.length === 0 ? (
          <div className="muted">No pending items.</div>
        ) : pending.map((item) => (
          <div className="list-row" key={item.id}>
            <div>
              <div><strong>{item.assessmentData.category} - {item.assessmentData.element}</strong></div>
              <div className="small">{new Date(item.createdAt).toLocaleString()}</div>
            </div>
            <span className="badge">Pending</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Failed Assessments</div>
        {failed.length === 0 ? (
          <div className="muted">No failed items.</div>
        ) : failed.map((item) => (
          <div className="list-row" key={item.id}>
            <div>
              <div><strong>{item.assessmentData.category} - {item.assessmentData.element}</strong></div>
              <div className="small">{item.errorMessage || 'Unknown error'}</div>
            </div>
            <span className="badge">Failed</span>
          </div>
        ))}
      </div>
    </div>
  );
}


