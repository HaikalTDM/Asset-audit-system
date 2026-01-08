import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { savePendingAssessment } from '../../lib/offline/db';
import { useOffline } from '../../lib/offline/network';

function riskInfo(score: number) {
  if (score <= 6) return { label: 'Low', color: '#3b82f6' };
  if (score <= 12) return { label: 'Medium', color: '#f59e0b' };
  if (score <= 18) return { label: 'High', color: '#fb923c' };
  return { label: 'Critical', color: '#ef4444' };
}

export default function StaffReview() {
  const { user } = useAuth();
  const { isOnline, refreshPendingCount } = useOffline();
  const location = useLocation();
  const navigate = useNavigate();
  const state: any = location.state;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!state || !user) {
    return <div className="center">Missing data. Go back to capture.</div>;
  }

  const total = state.condition * state.priority;
  const risk = riskInfo(total);
  const createdAtLabel = new Date(state.createdAt || Date.now()).toLocaleString();

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        userId: user.id,
        created_at: state.createdAt,
        building: state.building,
        floor: state.floor,
        room: state.room,
        category: state.category,
        element: state.element,
        condition: state.condition,
        priority: state.priority,
        damageCategory: state.damageCategory,
        rootCause: state.rootCause,
        rootCauseDetails: state.rootCauseDetails,
        notes: state.notes || '',
        latitude: state.coords?.latitude ?? null,
        longitude: state.coords?.longitude ?? null,
      };

      if (isOnline) {
        const form = new FormData();
        form.append('created_at', String(payload.created_at));
        form.append('building', payload.building || '');
        form.append('floor', payload.floor || '');
        form.append('room', payload.room || '');
        form.append('category', payload.category);
        form.append('element', payload.element);
        form.append('condition', String(payload.condition));
        form.append('priority', String(payload.priority));
        form.append('damageCategory', payload.damageCategory || '');
        form.append('rootCause', payload.rootCause || '');
        form.append('rootCauseDetails', payload.rootCauseDetails || '');
        form.append('notes', payload.notes || '');
        if (payload.latitude != null) form.append('latitude', String(payload.latitude));
        if (payload.longitude != null) form.append('longitude', String(payload.longitude));
        if (state.photoBlob) {
          form.append('photo', state.photoBlob, 'assessment.jpg');
        }
        await api.createAssessment(form);
      } else {
        const pendingId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await savePendingAssessment({
          id: pendingId,
          assessmentData: payload,
          photoBlob: state.photoBlob,
          photoMime: state.photoMime,
          createdAt: Date.now(),
          syncStatus: 'pending',
          retryCount: 0,
        });
        await refreshPendingCount();
      }

      setShowSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="review">
      {state.photoUrl && <img className="review-photo" src={state.photoUrl} alt="Preview" />}

      <div className="review-title">Assessment Summary</div>

      <div className="risk-card" style={{ borderColor: risk.color, background: `${risk.color}15` }}>
        <div className="risk-badge" style={{ background: risk.color }}>{total}</div>
        <div className="risk-info">
          <div className="risk-level" style={{ color: risk.color }}>{risk.label} Risk</div>
          <div className="small">Condition ({state.condition}) x Priority ({state.priority})</div>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">Asset Information</div>
        <div className="detail-row">
          <div className="detail-label">ID:</div>
          <div className="detail-value">Auto-generated on save</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Building:</div>
          <div className="detail-value">{state.building || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Floor:</div>
          <div className="detail-value">{state.floor || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Room:</div>
          <div className="detail-value">{state.room || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Category:</div>
          <div className="detail-value">{state.category || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Element:</div>
          <div className="detail-value">{state.element || '-'}</div>
        </div>
      </div>

      {(state.damageCategory || state.rootCause || state.rootCauseDetails) && (
        <div className="card">
          <div className="section-heading">Damage Analysis</div>
          <div className="detail-row">
            <div className="detail-label">Damage Type:</div>
            <div className="detail-value">{state.damageCategory || '-'}</div>
          </div>
          <div className="detail-row">
            <div className="detail-label">Root Cause:</div>
            <div className="detail-value">{state.rootCause || '-'}</div>
          </div>
          {state.rootCauseDetails && (
            <div className="detail-row" style={{ alignItems: 'flex-start' }}>
              <div className="detail-label">Details:</div>
              <div className="detail-value">{state.rootCauseDetails}</div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="section-heading">Audit Metadata</div>
        <div className="detail-row">
          <div className="detail-label">Time:</div>
          <div className="detail-value">{createdAtLabel}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">GPS:</div>
          <div className="detail-value">
            {state.coords ? `${state.coords.latitude.toFixed(6)}, ${state.coords.longitude.toFixed(6)}` : 'Unavailable'}
          </div>
        </div>
      </div>

      {state.notes ? (
        <div className="card">
          <div className="section-heading">Notes and Observations</div>
          <div>{state.notes}</div>
        </div>
      ) : null}

      {error && <div className="error">{error}</div>}

      <div className="review-actions">
        <button className="button secondary muted-button" onClick={() => navigate(-1)} disabled={saving}>Back to Edit</button>
        <button className="button primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : (isOnline ? 'Save Assessment' : 'Save Offline')}
        </button>
      </div>

      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal success-modal">
            <div className="success-icon">✅</div>
            <div className="modal-title">Success!</div>
            <div className="section">
              {isOnline ? 'Assessment saved successfully!' : 'Assessment saved offline and will sync when connected.'}
            </div>
            <button className="button primary full" onClick={() => navigate('/staff')}>
              🏠 Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
