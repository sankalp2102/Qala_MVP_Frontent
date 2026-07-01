import { useState, useEffect, useCallback } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { inputStyle, textareaStyle, TrashIcon } from './SectionA';

const API = onboardingAPI;

function SectionHeader({ letter, title, desc }) {
  return (
    <div className="fade-up" style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Section {letter}</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1.1 }}>{title}</h1>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 8 }}>{desc}</p>
    </div>
  );
}

function CardSection({ title, desc, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, fontStyle: 'italic', color: 'var(--text)', marginBottom: 6 }}>{title}</div>
      {desc && <p style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.7 }}>{desc}</p>}
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4, display: 'block' }}>{hint}</span>}
    </div>
  );
}

function TrashBtn({ onClick, label = 'Remove' }) {
  return (
    <button aria-label={label} onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }}>
      <TrashIcon size={16} />
    </button>
  );
}

export default function SectionF({ profileId, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [contacts, setContacts]         = useState([]);
  const [addingC, setAddingC]           = useState(false);
  const [newContact, setNewContact]     = useState({ name: '', role: '', email: '', phone: '' });
  const [editingContact, setEditingContact] = useState(null);

  const [coordinator, setCoordinator] = useState({ name: '', position: '', writeup: '' });
  const [coordSaved, setCoordSaved]   = useState(false);

  const [form, setForm] = useState({
    artisan_count: '', monthly_capacity_units: '',
    sampling_time_weeks: '', production_time_weeks: '',
    moq_per_batch: '', moq_flexible: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    API.getStudio(profileId).then(r => { if (r.data?.contacts) setContacts(r.data.contacts); }).catch(() => {});
    API.getCoordinator(profileId).then(r => {
      const d = r.data;
      if (d) setCoordinator({ name: d.name || '', position: d.position || '', writeup: d.writeup || '' });
    }).catch(() => {});
    API.getProduction(profileId).then(r => {
      const d = r.data; if (!d) return;
      setForm(f => ({
        ...f,
        artisan_count: d.artisan_count ?? '',
        monthly_capacity_units: d.monthly_capacity_units ?? '',
        production_time_weeks: d.production_time_weeks ?? '',
        moq_per_batch: d.moq_per_batch ?? '',
        moq_flexible: !!d.moq_flexible,
      }));
    }).catch(() => {});
    API.getCrafts(profileId).then(r => {
      const first = (r.data || []).find(c => c.sampling_time_weeks != null);
      if (first) setForm(f => ({ ...f, sampling_time_weeks: first.sampling_time_weeks }));
    }).catch(() => {});
  }, [profileId]);

  const saveCoordinatorSilent = useCallback(async (updated) => {
    try {
      const fd = new FormData();
      fd.append('name', updated.name);
      fd.append('position', updated.position);
      fd.append('writeup', updated.writeup);
      await API.putCoordinator(profileId, fd);
      setCoordSaved(true);
      setTimeout(() => setCoordSaved(false), 1500);
    } catch {}
  }, [profileId]);

  const handleCoordBlur = () => saveCoordinatorSilent(coordinator);

  const uploadCoordPhoto = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    try {
      const fd = new FormData();
      fd.append('name', coordinator.name);
      fd.append('position', coordinator.position);
      fd.append('writeup', coordinator.writeup);
      fd.append('image', file);
      await API.putCoordinator(profileId, fd);
      setCoordSaved(true); setTimeout(() => setCoordSaved(false), 1500);
      success('Photo uploaded');
    } catch { error('Upload failed'); }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.role) { error('Name and role required'); return; }
    try {
      const r = await API.addContact(profileId, { ...newContact, order: contacts.length + 1 });
      setContacts(c => [...c, r.data]);
      setNewContact({ name: '', role: '', email: '', phone: '' });
      setAddingC(false); success('Team member added');
    } catch { error('Failed to add'); }
  };

  const saveEditContact = async () => {
    if (!editingContact.name || !editingContact.role) { error('Name and role required'); return; }
    try {
      const r = await API.patchContact(profileId, editingContact.id, {
        name: editingContact.name, role: editingContact.role,
        email: editingContact.email, phone: editingContact.phone,
      });
      setContacts(c => c.map(x => x.id === editingContact.id ? r.data : x));
      setEditingContact(null); success('Updated');
    } catch { error('Failed to update'); }
  };

  const delContact = async id => {
    try { await API.delContact(profileId, id); setContacts(c => c.filter(x => x.id !== id)); }
    catch { error('Failed'); }
  };

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await API.putProduction(profileId, {
        artisan_count: form.artisan_count || null,
        monthly_capacity_units: form.monthly_capacity_units || null,
        production_time_weeks: form.production_time_weeks || null,
        moq_per_batch: form.moq_per_batch || null,
        moq_flexible: form.moq_flexible,
      });
      success('Section F saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="F" title="Team & Capacity" desc="Who is in your studio, how many people, and what you can realistically deliver — and when." />

      <CardSection title="F.1 — Key Team Members" desc="Add the key people — whoever runs design, production, and client communication.">
        {contacts.map(c => (
          editingContact?.id === c.id ? (
            <div key={c.id} style={{ padding: 16, border: '1px solid rgba(200,165,90,0.35)', borderRadius: 8, marginBottom: 8, background: 'var(--gold-dim)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Name *"><input style={inputStyle} value={editingContact.name} onChange={e => setEditingContact(x => ({ ...x, name: e.target.value }))} /></Field>
                <Field label="Role *"><input style={inputStyle} value={editingContact.role} onChange={e => setEditingContact(x => ({ ...x, role: e.target.value }))} /></Field>
                <Field label="Email"><input style={inputStyle} type="email" value={editingContact.email || ''} onChange={e => setEditingContact(x => ({ ...x, email: e.target.value }))} /></Field>
                <Field label="Phone"><input style={inputStyle} value={editingContact.phone || ''} onChange={e => setEditingContact(x => ({ ...x, phone: e.target.value }))} /></Field>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-teal btn-sm" onClick={saveEditContact}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingContact(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{c.role}{c.email && ` · ${c.email}`}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingContact({ id: c.id, name: c.name, role: c.role, email: c.email || '', phone: c.phone || '' })}>Edit</button>
                <TrashBtn label="Remove team member" onClick={() => delContact(c.id)} />
              </div>
            </div>
          )
        ))}
        {addingC ? (
          <div style={{ padding: 16, border: '1px solid var(--border2)', borderRadius: 8, marginTop: 8, background: 'var(--surface2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="Name *"><input style={inputStyle} value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))} /></Field>
              <Field label="Role *"><input style={inputStyle} value={newContact.role} onChange={e => setNewContact(c => ({ ...c, role: e.target.value }))} /></Field>
              <Field label="Email"><input style={inputStyle} type="email" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} /></Field>
              <Field label="Phone"><input style={inputStyle} value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-teal btn-sm" onClick={addContact}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddingC(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => setAddingC(true)}>+ Add Team Member</button>
        )}
      </CardSection>

      <CardSection title="F.2 — Buyer Coordinator" desc="Who typically coordinates with buyers?">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, minHeight: 18 }}>
          {coordSaved && <span style={{ fontSize: 11, color: 'var(--text4)' }}>Saved</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Name">
            <input style={inputStyle} value={coordinator.name}
              onChange={e => setCoordinator(c => ({ ...c, name: e.target.value }))}
              onBlur={handleCoordBlur} />
          </Field>
          <Field label="Position">
            <input style={inputStyle} value={coordinator.position}
              onChange={e => setCoordinator(c => ({ ...c, position: e.target.value }))}
              onBlur={handleCoordBlur} />
          </Field>
        </div>
        <Field label="About Them">
          <textarea style={textareaStyle} rows={3}
            value={coordinator.writeup}
            onChange={e => setCoordinator(c => ({ ...c, writeup: e.target.value }))}
            onBlur={handleCoordBlur} />
        </Field>
        <label style={{ display: 'inline-block', marginTop: 8, cursor: 'pointer' }}>
          <input type="file" accept="image/*" onChange={uploadCoordPhoto} style={{ display: 'none' }} />
          <span className="btn btn-outline btn-sm">+ Upload Photo</span>
        </label>
      </CardSection>

      <CardSection title="F.3 — Total Artisan / Worker Count">
        <Field label="How many people work on production?" hint="Include everyone on production — artisans, tailors, embroiderers, helpers.">
          <input style={{ ...inputStyle, maxWidth: 160 }} type="text" inputMode="numeric" pattern="[0-9]*"
            value={form.artisan_count}
            onChange={e => setForm(f => ({ ...f, artisan_count: e.target.value.replace(/\D/g, '') }))}
            placeholder="e.g. 24" />
        </Field>
      </CardSection>

      <CardSection title="F.4 — Monthly Production Capacity">
        <Field label="Total units per month" hint="Total units across all crafts and product types combined.">
          <input style={{ ...inputStyle, maxWidth: 200 }} type="text" inputMode="numeric" pattern="[0-9]*"
            value={form.monthly_capacity_units}
            onChange={e => setForm(f => ({ ...f, monthly_capacity_units: e.target.value.replace(/\D/g, '') }))}
            placeholder="e.g. 500 units" />
        </Field>
      </CardSection>

      <CardSection title="F.5 — Timelines">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Sampling Time (weeks)" hint="From brief to sample in buyer's hands">
            <input style={inputStyle} type="text" inputMode="numeric"
              value={form.sampling_time_weeks}
              onChange={e => setForm(f => ({ ...f, sampling_time_weeks: e.target.value.replace(/\D/g, '') }))}
              placeholder="e.g. 3" />
          </Field>
          <Field label="Production Time for 100 pcs (weeks)" hint="From approved sample to goods dispatched">
            <input style={inputStyle} type="text" inputMode="numeric"
              value={form.production_time_weeks}
              onChange={e => setForm(f => ({ ...f, production_time_weeks: e.target.value.replace(/\D/g, '') }))}
              placeholder="e.g. 6" />
          </Field>
        </div>
      </CardSection>

      <CardSection title="F.6 — Minimum Order Quantity">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <input style={{ ...inputStyle, width: 140 }} type="text" inputMode="numeric"
            value={form.moq_per_batch}
            onChange={e => setForm(f => ({ ...f, moq_per_batch: e.target.value.replace(/\D/g, '') }))}
            placeholder="e.g. 50" />
          <span style={{ fontSize: 13, color: 'var(--text3)' }}>pieces per batch</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.moq_flexible} onChange={e => setForm(f => ({ ...f, moq_flexible: e.target.checked }))} />
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>I am flexible with this MOQ — buyers can discuss quantities with me in the proposal.</span>
        </label>
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 10 }}>This number is a baseline shown on your profile.</p>
      </CardSection>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-primary btn-lg fade-up" onClick={() => save(true)} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
        </button>
        <button className="btn btn-ghost fade-up" onClick={() => save(false)} disabled={saving}>Save</button>
      </div>
    </div>
  );
}