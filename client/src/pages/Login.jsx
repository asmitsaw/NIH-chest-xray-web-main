import { useState } from 'react';
import { useAuth } from '../auth';
import { ErrorBox } from '../ui';
import { Link } from 'react-router-dom';

export default function Login() {
  const { login } = useAuth();
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('ADMIN');
  const go = async (user, pass) => { setBusy(true); setErr(''); try { await login(user, pass); } catch (e) { setErr(e.message); setBusy(false); } };
  const roles = [
    { id: 'DOCTOR', label: 'Doctor', username: 'dr.sharma', password: 'doctor123' },
    { id: 'PATIENT', label: 'Patient', username: 'patient.aarav', password: 'patient123' },
    { id: 'ADMIN', label: 'Admin', username: 'admin', password: 'admin123' },
  ];
  const selectedRole = roles.find((item) => item.id === role) || roles[2];
  const selectRole = (item) => {
    setRole(item.id);
    setU(item.username);
    setP(item.password);
    setErr('');
  };
  return (
    <div className="login">
      <section className="login-art" aria-hidden="false">
        <div className="login-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/chestx-logo.png" alt="Chest-X AI" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        </div>
        <div className="login-art-copy">
          <h1>Read the film. See why the model flagged it.</h1>
          <p>Fourteen NIH findings scored on every chest radiograph, with Grad-CAM showing where the model looked. A physician reviews and signs every report.</p>
        </div>
        <div className="login-chips">
          <span>Explainable Grad-CAM</span>
          <span>Radiologist sign-off</span>
          <span>Audited amendments</span>
          <span>Role-based access</span>
        </div>
        <div className="login-disclaimer">For research and education. Not a diagnostic device.</div>
      </section>
      <section className="login-form">
        <div className="login-card">
          <div className="login-roles" aria-label="Select account role">
            {roles.map((item) => (
              <button type="button" key={item.id} className={role === item.id ? 'active' : ''} onClick={() => selectRole(item)}>
                <span>{item.id === 'DOCTOR' ? '♧' : item.id === 'PATIENT' ? '♙' : '♢'}</span>
                {item.label}
              </button>
            ))}
          </div>
          <div className="login-card-title">
            <h1>{selectedRole.label} sign in</h1>
            <p>{selectedRole.id === 'ADMIN' ? 'Manage users, review the audit log and check system health.' : selectedRole.id === 'DOCTOR' ? 'Review studies, findings and physician reports.' : 'View reports, studies and appointments.'}</p>
          </div>
          <ErrorBox error={err} />
          <form className="login-fields" onSubmit={(e) => { e.preventDefault(); go(u, p); }}>
            <label className="field"><span>{selectedRole.label} username</span><input type="text" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} required /></label>
            <label className="field"><span>Password</span><input type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} required /></label>
            <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : `Sign in as ${selectedRole.label}`}</button>
          </form>
          {selectedRole.id === 'PATIENT' && <Link className="register-link" to="/register">New patient? Create an account</Link>}
          <Link className="back-link" to="/">← Back to the overview page</Link>
        </div>
      </section>
    </div>
  );
}
