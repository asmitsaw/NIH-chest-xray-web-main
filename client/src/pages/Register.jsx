import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { api } from '../api';
import { ErrorBox } from '../ui';

export default function Register() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '', confirm_password: '',
    age: '', gender: '', contact_phone: '',
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setErr('');
    if (form.password !== form.confirm_password) {
      setErr('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.register(form);
      await login(form.username, form.password);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-art" aria-hidden="false">
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.03em' }}>Chest-X</div>
        <div>
          <h1>Create your patient account.</h1>
          <p>Register securely to view reports, appointments and chest radiograph results.</p>
        </div>
        <div className="small" style={{ color: '#8d99aa' }}>For research and education. Not a diagnostic device.</div>
      </section>
      <section className="login-form register-form">
        <div>
          <h1 style={{ fontSize: 26 }}>Patient registration</h1>
          <p className="muted" style={{ marginTop: 6 }}>Create a secure portal account.</p>
        </div>
        <ErrorBox error={err} />
        <form className="stack" onSubmit={submit}>
          <label className="field"><span>Full name</span><input type="text" value={form.full_name} onChange={set('full_name')} required /></label>
          <div className="form-grid">
            <label className="field"><span>Username</span><input type="text" autoComplete="username" value={form.username} onChange={set('username')} required /></label>
            <label className="field"><span>Email address</span><input type="text" autoComplete="email" value={form.email} onChange={set('email')} required /></label>
          </div>
          <div className="form-grid">
            <label className="field"><span>Age</span><input type="number" min="0" max="150" value={form.age} onChange={set('age')} required /></label>
            <label className="field">
              <span>Gender</span>
              <select value={form.gender} onChange={set('gender')} required>
                <option value="">Select gender</option>
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <label className="field"><span>Phone number</span><input type="text" autoComplete="tel" value={form.contact_phone} onChange={set('contact_phone')} /></label>
          <div className="form-grid">
            <label className="field"><span>Password</span><input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required /></label>
            <label className="field"><span>Confirm password</span><input type="password" autoComplete="new-password" value={form.confirm_password} onChange={set('confirm_password')} required /></label>
          </div>
          <button className="btn primary" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <div style={{ textAlign: 'center' }}>
          <span className="muted small">Already have an account? </span>
          <Link to="/login" className="small" style={{ fontWeight: 600 }}>Sign in</Link>
        </div>
      </section>
    </div>
  );
}
