import React, { useState } from 'react';

export default function Signup() {
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Registration is disabled. Please contact an admin.');
  };

  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h2>Sign Up</h2>
        <p className="small">Registration is managed by admins.</p>
        {message && <div className="error">{message}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <div className="label">Display Name</div>
            <input className="input" disabled />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="label">Email</div>
            <input className="input" disabled />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="label">Password</div>
            <input className="input" type="password" disabled />
          </div>
          <button className="button primary" type="submit">Request Access</button>
        </form>
      </div>
    </div>
  );
}
