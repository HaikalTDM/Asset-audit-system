import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { openAssessmentPdf } from '../../lib/pdf';

function grade(total: number) {
  if (total <= 5) return { grade: 'A', label: 'Very Good', color: '#3b82f6' };
  if (total <= 10) return { grade: 'B', label: 'Good', color: '#3b82f6' };
  if (total <= 15) return { grade: 'C', label: 'Fair', color: '#f59e0b' };
  return { grade: 'D', label: 'Poor', color: '#ef4444' };
}

export default function StaffHistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      const data = await api.getAssessment(id);
      setItem(data.assessment);
      setNotes(data.assessment.notes || '');
      setLoading(false);
    })();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!id) return;
    setSaving(true);
    await api.updateAssessment(id, { notes });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Delete this assessment?')) return;
    await api.deleteAssessment(id);
    if (user?.role === 'admin') {
      navigate('/admin/assessments');
    } else {
      navigate('/staff/history');
    }
  };

  if (loading) return <div className="center">Loading...</div>;
  if (!item) return <div className="center">Not found</div>;

  const condition = item.condition_rating || item.condition;
  const priority = item.priority_rating || item.priority;
  const total = condition * priority;
  const g = grade(total);
  const mapUrl = item.latitude != null && item.longitude != null
    ? `https://maps.google.com/?q=${item.latitude},${item.longitude}`
    : '';

  return (
    <div className="detail">
      {item.photo_uri && <img className="detail-photo" src={item.photo_uri} alt="Assessment" />}

      <div className="detail-score-card">
        <div className="detail-score-badge" style={{ background: g.color }}>{g.grade}</div>
        <div>
          <div className="detail-score-title">Overall Score</div>
          <div className="detail-score-sub">{total} - {g.label}</div>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">Assessment Details</div>
        <div className="detail-list">
          <div className="detail-list-item"><span className="detail-icon">🏢</span><span className="detail-key">Building</span><span className="detail-val">{item.building || '-'}</span></div>
          <div className="detail-list-item"><span className="detail-icon">🧱</span><span className="detail-key">Floor</span><span className="detail-val">{item.floor || item.floorLevel || '-'}</span></div>
          <div className="detail-list-item"><span className="detail-icon">🚪</span><span className="detail-key">Room</span><span className="detail-val">{item.room || '-'}</span></div>
          <div className="detail-list-item"><span className="detail-icon">📂</span><span className="detail-key">Category</span><span className="detail-val">{item.category || '-'}</span></div>
          <div className="detail-list-item"><span className="detail-icon">🧩</span><span className="detail-key">Element</span><span className="detail-val">{item.element || '-'}</span></div>
        </div>
        <div className="detail-chips">
          <div className="detail-chip">Condition {condition}/5</div>
          <div className="detail-chip">Priority {priority}/5</div>
        </div>
      </div>

      {(item.damage_category || item.root_cause || item.root_cause_details) && (
        <div className="card">
          <div className="section-heading">Damage Analysis</div>
          <div className="detail-list">
            <div className="detail-list-item"><span className="detail-icon">⚠️</span><span className="detail-key">Damage Type</span><span className="detail-val">{item.damage_category || '-'}</span></div>
            <div className="detail-list-item"><span className="detail-icon">🔎</span><span className="detail-key">Root Cause</span><span className="detail-val">{item.root_cause || '-'}</span></div>
            {item.root_cause_details && (
              <div className="detail-note">
                <div className="detail-key">Details</div>
                <div className="detail-val">{item.root_cause_details}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-heading">Location and Time</div>
        <div className="detail-list">
          <div className="detail-list-item"><span className="detail-icon">📍</span><span className="detail-key">GPS Coordinates</span><span className="detail-val">{item.latitude && item.longitude ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}` : 'Not recorded'}</span></div>
          <div className="detail-list-item"><span className="detail-icon">🗓️</span><span className="detail-key">Date and Time</span><span className="detail-val">{new Date(item.created_at).toLocaleString()}</span></div>
        </div>
      </div>

      <div className="card">
        <div className="section-heading">Notes</div>
        <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="No notes added yet." />
        <button className="button primary" onClick={handleSaveNotes} disabled={saving}>
          {saving ? 'Saving...' : 'Save Notes'}
        </button>
      </div>

      <div className="detail-actions">
        {mapUrl ? <a className="button secondary muted-button" href={mapUrl} target="_blank" rel="noreferrer">Open in Maps</a> : null}
        <button className="button primary" onClick={() => openAssessmentPdf(item)}>Export PDF</button>
      </div>
      <button className="button danger full" onClick={handleDelete}>Delete Assessment</button>
    </div>
  );
}
