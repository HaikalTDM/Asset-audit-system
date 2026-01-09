import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const DAMAGE_CATEGORIES = [
  'Structural Damage',
  'Water Damage',
  'Surface Defects',
  'Functional Issues',
  'Safety Hazard',
  'Wear and Tear',
];

const ROOT_CAUSES = [
  'Poor Waterproofing',
  'Construction Defect',
  'Material Deterioration',
  'Poor Maintenance',
  'Weather or Natural Wear',
  'Improper Installation',
  'Design Flaw',
  'Overloading or Misuse',
  'Age of Structure',
  'Water Seepage',
];

type CaptureState = {
  building: string;
  floor: string;
  room: string;
  category: string;
  element: string;
  photoBlob: Blob;
  photoMime: string;
  photoUrl: string;
  createdAt: number;
  coords?: { latitude: number; longitude: number } | null;
};

export default function StaffAssess() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as CaptureState | undefined;
  const [condition, setCondition] = useState(3);
  const [priority, setPriority] = useState(3);
  const [damageCategory, setDamageCategory] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [rootCauseDetails, setRootCauseDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [showRootModal, setShowRootModal] = useState(false);

  useEffect(() => {
    if (!state) navigate('/staff/capture');
  }, [state, navigate]);

  if (!state) return null;

  const handleContinue = () => {
    navigate('/staff/review', {
      state: {
        ...state,
        condition,
        priority,
        damageCategory,
        rootCause,
        rootCauseDetails,
        notes,
      },
    });
  };

  const conditionMeta = (v: number) => {
    if (v === 1) return { label: 'Excellent', color: '#2563eb' };
    if (v === 2) return { label: 'Good', color: '#0ea5e9' };
    if (v === 3) return { label: 'Plan', color: '#f59e0b' };
    if (v === 4) return { label: 'Poor', color: '#fb923c' };
    return { label: 'Replace', color: '#ef4444' };
  };

  const priorityMeta = (v: number) => {
    if (v === 1) return { label: 'Very Low', color: '#2563eb' };
    if (v === 2) return { label: 'Low', color: '#0ea5e9' };
    if (v === 3) return { label: 'Medium', color: '#f59e0b' };
    if (v === 4) return { label: 'High', color: '#fb923c' };
    return { label: 'Very High', color: '#ef4444' };
  };

  const createdAtLabel = new Date(state.createdAt).toLocaleString();
  const mapUrl = state.coords ? `https://maps.google.com/?q=${state.coords.latitude},${state.coords.longitude}` : '';

  return (
    <div className="assess">
      {state.photoUrl ? <img className="assess-photo" src={state.photoUrl} alt="Preview" /> : null}

      <div className="card">
        <div className="section-bar-title">
          <span className="section-bar" />
          Asset Information
        </div>
        <div className="detail-row">
          <div className="detail-label">Building</div>
          <div className="detail-value">{state.building || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Floor</div>
          <div className="detail-value">{state.floor || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Room</div>
          <div className="detail-value">{state.room || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Category</div>
          <div className="detail-value">{state.category || '-'}</div>
        </div>
        <div className="detail-row">
          <div className="detail-label">Building Element</div>
          <div className="detail-value">{state.element || '-'}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-bar-title">
          <span className="section-bar" />
          Condition Rating
        </div>
        <div className="muted small" style={{ marginBottom: 10 }}>1=Excellent, 2=Good, 3=Plan, 4=Poor, 5=Replace</div>
        <div className="score-row">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={`c-${v}`}
              className={`score-tile ${condition === v ? 'active' : ''}`}
              style={condition === v ? { background: conditionMeta(v).color } : undefined}
              onClick={() => setCondition(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="score-pill" style={{ background: conditionMeta(condition).color }}>
          {conditionMeta(condition).label}
        </div>

        <div className="section-bar-title" style={{ marginTop: 16 }}>
          <span className="section-bar" />
          Priority Level
        </div>
        <div className="muted small" style={{ marginBottom: 10 }}>1=Very Low, 2=Low, 3=Medium, 4=High, 5=Very High</div>
        <div className="score-row">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={`p-${v}`}
              className={`score-tile ${priority === v ? 'active' : ''}`}
              style={priority === v ? { background: priorityMeta(v).color } : undefined}
              onClick={() => setPriority(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="score-pill" style={{ background: priorityMeta(priority).color }}>
          {priorityMeta(priority).label}
        </div>
      </div>

      <div className="card">
        <div className="section-bar-title">
          <span className="section-bar" />
          Damage Analysis
        </div>
        <div className="label">Damage Type *</div>
        <button className="select-button" onClick={() => setShowDamageModal(true)}>
          <span className="select-icon">⚠️</span>
          <span className={`select-text ${damageCategory ? '' : 'muted'}`}>{damageCategory || 'Select damage type'}</span>
          <span className="select-caret">▾</span>
        </button>

        <div className="label" style={{ marginTop: 12 }}>Root Cause</div>
        <button className="select-button" onClick={() => setShowRootModal(true)}>
          <span className="select-icon">🔎</span>
          <span className={`select-text ${rootCause ? '' : 'muted'}`}>{rootCause || 'Select root cause (optional)'}</span>
          <span className="select-caret">▾</span>
        </button>

        {rootCause && (
          <div style={{ marginTop: 12 }}>
            <div className="label">Cause Details</div>
            <textarea rows={3} value={rootCauseDetails} onChange={(e) => setRootCauseDetails(e.target.value)} />
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-bar-title">
          <span className="section-bar" />
          Notes and Observations
        </div>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional observations, recommendations, or comments..." />
      </div>

      <div className="card">
        <div className="gps-header">
          <div className="gps-title"><span>📍</span> GPS and Time</div>
          {mapUrl ? (
            <a className="gps-open" href={mapUrl} target="_blank" rel="noreferrer">Open</a>
          ) : null}
        </div>
        <div className="map-preview">
          <div className="map-pin">📍</div>
          <div className="muted small">Map preview</div>
        </div>
        {state.coords ? (
          <div className="gps-coords">
            <div className="detail-row">
              <div className="detail-label">Latitude:</div>
              <div className="detail-value">{state.coords.latitude.toFixed(6)}</div>
            </div>
            <div className="detail-row">
              <div className="detail-label">Longitude:</div>
              <div className="detail-value">{state.coords.longitude.toFixed(6)}</div>
            </div>
          </div>
        ) : (
          <div className="muted">GPS unavailable</div>
        )}
        <div className="gps-time">
          <div className="detail-label">Time:</div>
          <div className="detail-value">{createdAtLabel}</div>
        </div>
      </div>

      <div className="bottom-bar">
        <button className="button primary full" onClick={handleContinue}>
          Continue to Review →
        </button>
      </div>

      {showDamageModal && (
        <div className="modal-overlay" onClick={() => setShowDamageModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Select Damage Type</div>
              <button className="button secondary" onClick={() => setShowDamageModal(false)}>Close</button>
            </div>
            <div className="modal-list">
              {DAMAGE_CATEGORIES.map((item) => (
                <button
                  key={item}
                  className={`modal-option ${damageCategory === item ? 'active' : ''}`}
                  onClick={() => { setDamageCategory(item); setShowDamageModal(false); }}
                >
                  <span className="modal-option-icon">⚠️</span>
                  <span className="modal-option-text">{item}</span>
                  {damageCategory === item ? <span className="modal-option-check">✅</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRootModal && (
        <div className="modal-overlay" onClick={() => setShowRootModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Select Root Cause</div>
              <button className="button secondary" onClick={() => setShowRootModal(false)}>Close</button>
            </div>
            <div className="modal-list">
              {ROOT_CAUSES.map((item) => (
                <button
                  key={item}
                  className={`modal-option ${rootCause === item ? 'active' : ''}`}
                  onClick={() => { setRootCause(item); setShowRootModal(false); }}
                >
                  <span className="modal-option-icon">🔎</span>
                  <span className="modal-option-text">{item}</span>
                  {rootCause === item ? <span className="modal-option-check">✅</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


