import { useState } from 'react';
import { api } from '../api';
import { ErrorBox, Loading, useAsync } from '../ui';

export default function Doctors() {
  const { data, error, loading, reload } = useAsync(() => api.doctors(), []);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editF, setEditF] = useState({ full_name: '', specialization: '', qualification: '', experience_years: '', hospital_clinic: '', availability_schedule: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const startEdit = (d) => {
    setEditingDoctor(d);
    setEditF({
      full_name: d.full_name || '',
      specialization: d.specialization || '',
      qualification: d.qualification || '',
      experience_years: d.experience_years || 5,
      hospital_clinic: d.hospital_clinic || '',
      availability_schedule: d.availability_schedule || 'Mon-Fri 09:00 - 17:00',
    });
    setErr('');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await api.editDoctor(editingDoctor.id, editF);
      setEditingDoctor(null);
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
      await api.deleteDoctor(deleteTarget.id);
      setDeleteTarget(null);
      reload();
    } catch (x) {
      alert(`Could not delete doctor: ${x.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Doctors</h1>
          <p>Profiles marked Demo are sample clinical staff accounts for this installation.</p>
        </div>
      </div>
      <ErrorBox error={error} />

      {editingDoctor && (
        <form className="panel" onSubmit={saveEdit} style={{ marginBottom: 18, borderLeft: '4px solid var(--cobalt)' }}>
          <div className="hd" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Edit Doctor Profile: {editingDoctor.full_name}</h2>
            <button type="button" className="btn" onClick={() => setEditingDoctor(null)}>Cancel</button>
          </div>
          <div className="bd stack">
            <ErrorBox error={err} />
            <div className="form-grid">
              <label className="field"><span>Full Name & Degree</span><input type="text" value={editF.full_name} onChange={(e) => setEditF({ ...editF, full_name: e.target.value })} required /></label>
              <label className="field"><span>Specialization</span><input type="text" value={editF.specialization} onChange={(e) => setEditF({ ...editF, specialization: e.target.value })} required /></label>
              <label className="field"><span>Qualifications</span><input type="text" value={editF.qualification} onChange={(e) => setEditF({ ...editF, qualification: e.target.value })} required /></label>
              <label className="field"><span>Experience (Years)</span><input type="number" min="0" max="60" value={editF.experience_years} onChange={(e) => setEditF({ ...editF, experience_years: e.target.value })} required /></label>
              <label className="field"><span>Hospital / Clinic Affiliation</span><input type="text" value={editF.hospital_clinic} onChange={(e) => setEditF({ ...editF, hospital_clinic: e.target.value })} required /></label>
              <label className="field"><span>Availability Schedule</span><input type="text" value={editF.availability_schedule} onChange={(e) => setEditF({ ...editF, availability_schedule: e.target.value })} required /></label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn primary" disabled={busy}>{busy ? 'Saving changes…' : 'Save changes'}</button>
              <button type="button" className="btn" onClick={() => setEditingDoctor(null)}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      <section className="panel divide">
        {data?.map((d) => (
          <div key={d.id} className="row wrap" style={{ padding: '16px 18px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="grow" style={{ minWidth: 260 }}>
              <h2>
                {d.full_name} {d.is_demo ? <span className="pill pending" style={{ marginLeft: 6 }}>Demo</span> : null}
              </h2>
              <div className="muted">{d.specialization}</div>
              <div className="small faint" style={{ marginTop: 2 }}>{d.qualification}</div>
            </div>
            <div className="small muted" style={{ minWidth: 240, margin: '8px 0' }}>
              {d.hospital_clinic}<br />
              {d.experience_years} years of experience<br />
              Available {d.availability_schedule}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn small" onClick={() => startEdit(d)}>Edit Details</button>
              <button className="btn small danger" onClick={() => setDeleteTarget(d)}>Delete</button>
            </div>
          </div>
        ))}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ maxWidth: 440, width: '90%', margin: 20 }}>
            <div className="hd"><h2>Delete Doctor Profile?</h2></div>
            <div className="bd stack">
              <p>Are you sure you want to remove <b>{deleteTarget.full_name}</b> from the medical directory?</p>
              <p className="warn">This will unbind future appointment bookings and unlink profile data.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button className="btn" disabled={busy} onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn danger" disabled={busy} onClick={confirmDelete}>{busy ? 'Deleting…' : 'Delete Doctor'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
