import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Civil', 'Electrical', 'Mechanical'];
const ELEMENTS_BY_CATEGORY: Record<string, string[]> = {
  Civil: ['Roof', 'Wall', 'Floor', 'Foundation', 'Ceiling', 'Door', 'Window', 'Staircase'],
  Electrical: ['Wiring', 'Panel', 'Outlet', 'Switch', 'Lighting', 'Earthing', 'Generator'],
  Mechanical: ['HVAC', 'Plumbing', 'Elevator', 'Fire System', 'Ventilation', 'Pump'],
};

export default function StaffCapture() {
  const navigate = useNavigate();
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [room, setRoom] = useState('');
  const [category, setCategory] = useState('');
  const [element, setElement] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
    setCameraActive(true);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return;
    setPhotoBlob(blob);
    setPhotoMime('image/jpeg');
    setPhotoUrl(URL.createObjectURL(blob));
    stopCamera();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoBlob(file);
    setPhotoMime(file.type || 'image/jpeg');
    setPhotoUrl(URL.createObjectURL(file));
    stopCamera();
  };

  const canProceed = building && floor && room && category && element && photoBlob;

  const handleContinue = () => {
    if (!canProceed) return;
    const createdAt = Date.now();
    navigate('/staff/assess', {
      state: {
        building,
        floor,
        room,
        category,
        element,
        photoBlob,
        photoMime,
        photoUrl,
        createdAt,
        coords,
      },
    });
  };

  const elements = category ? ELEMENTS_BY_CATEGORY[category] || [] : [];

  return (
    <div className="capture">
      <div className="capture-header">
        <div className="capture-icon">📋</div>
        <div className="section-title">New Asset Audit</div>
        <div className="muted">Complete all sections to begin assessment</div>
      </div>

      <div className="card">
        <div className="step-header">
          <div className={`step-badge ${category ? 'active' : ''}`}>1</div>
          <div className="card-title">Asset Information</div>
        </div>
        <div className="section-content">
          <div className="readonly-row">
            <div className="label">ID</div>
            <div className="readonly-value">Auto-generated on save</div>
          </div>
          <div className="field">
            <div className="label">Building *</div>
            <input className="input" value={building} placeholder="Enter building name" onChange={(e) => setBuilding(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Floor *</div>
            <input className="input" value={floor} placeholder="Enter floor" onChange={(e) => setFloor(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Room *</div>
            <input className="input" value={room} placeholder="Enter room" onChange={(e) => setRoom(e.target.value)} />
          </div>

          <div className="label">Category *</div>
          <button
            className={`select-button ${category ? 'active' : ''}`}
            onClick={() => setShowCategoryModal(true)}
          >
            <span className="select-icon">🧩</span>
            <span className={`select-text ${category ? '' : 'muted'}`}>{category || 'Select Category'}</span>
            <span className="select-caret">▾</span>
          </button>

          <div className="label">Element *</div>
          <button
            className={`select-button ${element ? 'active' : ''} ${!category ? 'disabled' : ''}`}
            onClick={() => category && setShowElementModal(true)}
            disabled={!category}
          >
            <span className="select-icon">🧱</span>
            <span className={`select-text ${element ? '' : 'muted'}`}>{element || (category ? 'Select Element' : 'Select category first')}</span>
            <span className="select-caret">▾</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="step-header">
          <div className={`step-badge ${photoBlob ? 'active' : ''}`}>2</div>
          <div className="card-title">Photo Documentation</div>
        </div>
        <div className="section-content">
          {!photoUrl ? (
            <div className="photo-placeholder">
              {!cameraActive ? (
                <>
                  <div className="photo-icon">📷</div>
                  <div className="muted">Capture or upload asset photo</div>
                  <div className="row">
                    <button className="button primary" onClick={startCamera}>Take Photo</button>
                    <label className="button secondary muted-button">
                      Upload
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFileChange} />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <video className="video-preview" ref={videoRef} playsInline muted />
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="button secondary" onClick={stopCamera}>Cancel</button>
                    <button className="button primary" onClick={capturePhoto}>Capture</button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div>
              <img className="img-preview" src={photoUrl} alt="Preview" />
              <button className="button secondary muted-button" onClick={() => { setPhotoUrl(null); setPhotoBlob(null); }}>Change Photo</button>
            </div>
          )}
        </div>
      </div>

      <button className="button primary full" disabled={!canProceed} onClick={handleContinue}>
        {canProceed ? 'Begin Assessment' : 'Complete Steps 1-2 to Continue'}
      </button>
      <div className="small center">* Required fields must be completed</div>

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Select Category</div>
              <button className="button secondary" onClick={() => setShowCategoryModal(false)}>Close</button>
            </div>
            <div className="modal-list">
              {CATEGORIES.map((c) => {
                const icon = c === 'Civil' ? '🏗️' : c === 'Electrical' ? '⚡' : '⚙️';
                return (
                  <button
                    key={c}
                    className={`modal-option ${category === c ? 'active' : ''}`}
                    onClick={() => { setCategory(c); setElement(''); setShowCategoryModal(false); }}
                  >
                    <span className="modal-option-icon">{icon}</span>
                    <span className="modal-option-text">{c}</span>
                    {category === c ? <span className="modal-option-check">✅</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showElementModal && (
        <div className="modal-overlay" onClick={() => setShowElementModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Select Element</div>
              <button className="button secondary" onClick={() => setShowElementModal(false)}>Close</button>
            </div>
            <div className="modal-list">
              {elements.map((e) => (
                <button
                  key={e}
                  className={`modal-option ${element === e ? 'active' : ''}`}
                  onClick={() => { setElement(e); setShowElementModal(false); }}
                >
                  <span className="modal-option-icon">🧱</span>
                  <span className="modal-option-text">{e}</span>
                  {element === e ? <span className="modal-option-check">✅</span> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
