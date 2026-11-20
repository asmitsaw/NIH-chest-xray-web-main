import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorBox, Loading, Status, fdate, label, useAsync } from '../ui';

export function Patients() {
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.patients(), []);
  const [q, setQ] = useState(''); const [adding, setAdding] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [editingPatient, setEditingPatient] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [f, setF] = useState({ full_name: '', mrn: '', age: '', gender: 'Female', blood_group: 'Unknown', contact_phone: '', emergency_contact: '', medical_history_notes: '', email: '', username: '' });
  const [editF, setEditF] = useState({ full_name: '', age: '', gender: 'Female', blood_group: 'Unknown', contact_phone: '', emergency_contact: '', medical_history_notes: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setE = (k) => (e) => setEditF({ ...editF, [k]: e.target.value });

  const startEdit = (p, e) => {
    e.stopPropagation();
    setEditingPatient(p);
    setEditF({
      full_name: p.full_name,
      age: p.age,
      gender: p.gender,
      blood_group: p.blood_group || 'Unknown',
      contact_phone: p.contact_phone || '',
      emergency_contact: p.emergency_contact || '',
      medical_history_notes: p.medical_history_notes || '',
    });
    setErr('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.editPatient(editingPatient.id, editF);
      setEditingPatient(null);
      reload();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await api.deletePatient(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (x) {
      alert(`Could not delete patient: ${x.message}`);
    } finally {
      setBusy(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await api.addPatient(f);
      if (r.temporary_password) {
        setCreatedAccount(r);
        reload();
      } else {
        nav(`/patients/${r.id}`);
      }
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <Loading />;
  const rows = (data || []).filter((p) => (p.full_name + p.mrn).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="page-head">
        <div><h1>Patients</h1></div>
        <button className="btn primary right" onClick={() => { setAdding(!adding); setCreatedAccount(null); setEditingPatient(null); }}>
          {adding ? 'Close' : 'Register patient'}
        </button>
      </div>
      <ErrorBox error={error} />
      {createdAccount && (
        <div className="panel" style={{ marginBottom: 18, borderLeft: '4px solid var(--green)' }}>
          <div className="bd stack">
            <h3 style={{ color: 'var(--green)' }}>Patient & Portal Account Provisioned</h3>
            <p>Patient <b>{createdAccount.full_name}</b> ({createdAccount.mrn}) has been registered and provisioned with a secure portal login.</p>
            <div style={{ background: 'var(--paper-2)', padding: 12, borderRadius: 4, fontFamily: 'monospace', fontSize: 13 }}>
              <div><b>Username:</b> {createdAccount.username}</div>
              <div><b>Temporary Password:</b> {createdAccount.temporary_password}</div>
              <div><b>Email:</b> {createdAccount.email}</div>
            </div>
            <p className="small muted">Please provide these credentials to the patient for their first sign-in.</p>
            <div><button className="btn primary" onClick={() => nav(`/patients/${createdAccount.id}`)}>Go to Patient Profile</button></div>
          </div>
        </div>
      )}
      {editingPatient && (
        <form className="panel" onSubmit={saveEdit} style={{ marginBottom: 18, borderLeft: '4px solid var(--cobalt)' }}>
          <div className="hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Edit Patient: {editingPatient.full_name} ({editingPatient.mrn})</h2>
            <button type="button" className="btn" onClick={() => setEditingPatient(null)}>Cancel</button>
          </div>
          <div className="bd stack">
            <ErrorBox error={err} />
            <div className="form-grid">
              <label className="field"><span>Full name</span><input type="text" value={editF.full_name} onChange={setE('full_name')} required /></label>
              <label className="field"><span>Age</span><input type="number" min="0" max="120" value={editF.age} onChange={setE('age')} required /></label>
              <label className="field"><span>Sex</span><select value={editF.gender} onChange={setE('gender')}><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label className="field"><span>Blood group</span><select value={editF.blood_group} onChange={setE('blood_group')}>{['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</select></label>
              <label className="field"><span>Phone</span><input type="text" value={editF.contact_phone} onChange={setE('contact_phone')} /></label>
              <label className="field"><span>Emergency contact</span><input type="text" value={editF.emergency_contact} onChange={setE('emergency_contact')} /></label>
            </div>
            <label className="field"><span>Medical history</span><textarea value={editF.medical_history_notes} onChange={setE('medical_history_notes')} /></label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn primary" disabled={busy}>{busy ? 'Saving changes…' : 'Save changes'}</button>
              <button type="button" className="btn" onClick={() => setEditingPatient(null)}>Cancel</button>
            </div>
          </div>
        </form>
      )}
      {adding && !createdAccount && (
        <form className="panel" onSubmit={add} style={{ marginBottom: 18 }}>
          <div className="hd"><h2>Register patient</h2></div>
          <div className="bd stack"><ErrorBox error={err} />
            <div className="form-grid">
              <label className="field"><span>Full name</span><input type="text" value={f.full_name} onChange={set('full_name')} required /></label>
              <label className="field"><span>Medical record number</span><input type="text" value={f.mrn} onChange={set('mrn')} placeholder="MRN-10046" required /></label>
              <label className="field"><span>Age</span><input type="number" min="0" max="120" value={f.age} onChange={set('age')} required /></label>
              <label className="field"><span>Sex</span><select value={f.gender} onChange={set('gender')}><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label className="field"><span>Blood group</span><select value={f.blood_group} onChange={set('blood_group')}>{['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</select></label>
              <label className="field"><span>Phone</span><input type="text" value={f.contact_phone} onChange={set('contact_phone')} /></label>
              <label className="field"><span>Email (optional)</span><input type="email" value={f.email} onChange={set('email')} placeholder="patient@example.com" /></label>
              <label className="field"><span>Portal Username (optional)</span><input type="text" value={f.username} onChange={set('username')} placeholder="Auto-generated if empty" /></label>
            </div>
            <label className="field"><span>Medical history</span><textarea value={f.medical_history_notes} onChange={set('medical_history_notes')} /></label>
            <div><button className="btn primary" disabled={busy}>{busy ? 'Provisioning account…' : 'Save patient & provision login'}</button></div>
          </div>
        </form>)}
      <section className="panel">
        <div className="hd"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or MRN" aria-label="Search patients" style={{ maxWidth: 320 }} /></div>
        {rows.length === 0 ? <Empty title="No patients match">Try a different name or MRN.</Empty> : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>MRN</th>
                  <th>Age / sex</th>
                  <th>Studies</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr className="click" key={p.id} onClick={() => nav(`/patients/${p.id}`)}>
                    <td><Link to={`/patients/${p.id}`} onClick={(e) => e.stopPropagation()}><b>{p.full_name}</b></Link></td>
                    <td>{p.mrn}</td>
                    <td>{p.age} · {p.gender}</td>
                    <td>{p.study_count}</td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <button className="btn small" style={{ marginRight: 6 }} onClick={(e) => startEdit(p, e)}>Edit</button>
                      <button className="btn small danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ maxWidth: 440, width: '90%', margin: 20 }}>
            <div className="hd"><h2>Delete Patient Record?</h2></div>
            <div className="bd stack">
              <p>Are you sure you want to delete <b>{deleteTarget.full_name}</b> (MRN: {deleteTarget.mrn})?</p>
              <p className="warn">This action will delete all linked radiograph studies, reports, predictions, and appointments.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn" disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn danger" disabled={busy} onClick={confirmDelete}>{busy ? 'Deleting…' : 'Delete Patient'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PatientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data, error, loading, reload } = useAsync(() => api.patient(id), [id]);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [editF, setEditF] = useState({ full_name: '', age: '', gender: 'Female', blood_group: 'Unknown', contact_phone: '', emergency_contact: '', medical_history_notes: '' });

  const startEdit = () => {
    if (!data?.patient) return;
    const p = data.patient;
    setEditF({
      full_name: p.full_name,
      age: p.age,
      gender: p.gender,
      blood_group: p.blood_group || 'Unknown',
      contact_phone: p.contact_phone || '',
      emergency_contact: p.emergency_contact || '',
      medical_history_notes: p.medical_history_notes || '',
    });
    setEditing(true);
    setErr('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.editPatient(id, editF);
      setEditing(false);
      reload();
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await api.deletePatient(id);
      nav('/patients');
    } catch (x) {
      alert(`Could not delete patient: ${x.message}`);
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { patient: p, studies, appointments } = data;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{p.full_name}</h1>
          <p>{p.mrn} · {p.age} years · {p.gender} · Blood group {p.blood_group}</p>
        </div>
        <div className="right" style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={startEdit}>Edit Details</button>
          <button className="btn danger" onClick={() => setConfirmDelete(true)}>Delete Patient</button>
          <Link className="btn primary" to={`/new?patient=${p.id}`}>New study</Link>
        </div>
      </div>

      {editing && (
        <form className="panel" onSubmit={saveEdit} style={{ marginBottom: 18, borderLeft: '4px solid var(--cobalt)' }}>
          <div className="hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Edit Patient: {p.full_name} ({p.mrn})</h2>
            <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
          <div className="bd stack">
            <ErrorBox error={err} />
            <div className="form-grid">
              <label className="field"><span>Full name</span><input type="text" value={editF.full_name} onChange={(e) => setEditF({ ...editF, full_name: e.target.value })} required /></label>
              <label className="field"><span>Age</span><input type="number" min="0" max="120" value={editF.age} onChange={(e) => setEditF({ ...editF, age: e.target.value })} required /></label>
              <label className="field"><span>Sex</span><select value={editF.gender} onChange={(e) => setEditF({ ...editF, gender: e.target.value })}><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label className="field"><span>Blood group</span><select value={editF.blood_group} onChange={(e) => setEditF({ ...editF, blood_group: e.target.value })}>{['Unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b}>{b}</option>)}</select></label>
              <label className="field"><span>Phone</span><input type="text" value={editF.contact_phone} onChange={(e) => setEditF({ ...editF, contact_phone: e.target.value })} /></label>
              <label className="field"><span>Emergency contact</span><input type="text" value={editF.emergency_contact} onChange={(e) => setEditF({ ...editF, emergency_contact: e.target.value })} /></label>
            </div>
            <label className="field"><span>Medical history</span><textarea value={editF.medical_history_notes} onChange={(e) => setEditF({ ...editF, medical_history_notes: e.target.value })} /></label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn primary" disabled={busy}>{busy ? 'Saving changes…' : 'Save changes'}</button>
              <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ maxWidth: 440, width: '90%', margin: 20 }}>
            <div className="hd"><h2>Delete Patient Record?</h2></div>
            <div className="bd stack">
              <p>Are you sure you want to permanently delete <b>{p.full_name}</b> ({p.mrn})?</p>
              <p className="warn">This will remove all associated radiograph studies, predictions, and reports.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button>
                <button className="btn danger" disabled={busy} onClick={handleDelete}>{busy ? 'Deleting…' : 'Delete Patient'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="cols">
        <section className="panel">
          <div className="hd"><h2>Imaging timeline</h2></div>
          {studies.length === 0 ? <Empty title="No studies yet">Upload the first radiograph for this patient.</Empty> : (
            <div className="timeline">{studies.map((s) => (
              <div key={s.id}>
                <div className="muted small">{fdate(s.study_date)}</div>
                <div><Link to={`/study/${s.id}`}><b>{s.study_type}</b></Link>
                  <div style={{ marginTop: 4 }}>{s.prediction ? (s.prediction.primary.length ? s.prediction.primary.map((f) => <span className="chip" key={f.disease}>{label(f.disease)} {f.score_pct.toFixed(0)}%</span>) : <span className="small muted">Nothing above threshold</span>) : <span className="small faint">Not analysed</span>}</div>
                  {s.report && !s.report.is_draft && <div className="small muted">Impression: {s.report.final_impression}</div>}</div>
                <Status value={s.status} />
              </div>))}</div>)}
        </section>
        <aside className="stack">
          <section className="panel"><div className="hd"><h3>History</h3></div><div className="bd small">{p.medical_history_notes || 'None on file.'}</div></section>
          <section className="panel"><div className="hd"><h3>Appointments</h3></div>
            {appointments.length === 0 ? <div className="bd small muted">None booked.</div> : <div className="divide">{appointments.map((a) => <div key={a.id} className="small" style={{ padding: '10px 16px' }}><b>{a.appointment_date}, {a.appointment_time}</b> · {a.status.toLowerCase()}<div className="muted">{a.doctor_name}</div></div>)}</div>}
          </section>
        </aside>
      </div>
    </>
  );
}
