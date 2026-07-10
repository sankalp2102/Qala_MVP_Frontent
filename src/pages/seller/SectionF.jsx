import { useState, useEffect, useCallback } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  SectionHeader, QCard, Field, SectionFooter, InfoBox, TrashBtn,
  inputStyle, textareaStyle,
} from './_ui';

const API = onboardingAPI;

export default function SectionF({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [contacts, setContacts]             = useState([]);
  const [addingC, setAddingC]               = useState(false);
  const [newContact, setNewContact]         = useState({ name: '', role: '', email: '', phone: '' });
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
    if (!initialData) return;
    const { production: d, collab, studio } = initialData;
    if (studio?.contacts) setContacts(studio.contacts);
    if (collab?.buyer_coordinator) {
      const bc = collab.buyer_coordinator;
      setCoordinator({ name: bc.name || '', position: bc.position || '', writeup: bc.writeup || '' });
    }
    if (d) {
      setForm(f => ({
        ...f,
        artisan_count: d.artisan_count ?? '',
        monthly_capacity_units: d.monthly_capacity_units ?? '',
        // v4: sampling_time_weeks now lives on ProductionScale and round-trips.
        sampling_time_weeks: d.sampling_time_weeks ?? '',
        production_time_weeks: d.production_time_weeks ?? '',
        moq_per_batch: d.moq_per_batch ?? '',
        moq_flexible: !!d.moq_flexible,
      }));
    }
  }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
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
        sampling_time_weeks: d.sampling_time_weeks ?? '',
        production_time_weeks: d.production_time_weeks ?? '',
        moq_per_batch: d.moq_per_batch ?? '',
        moq_flexible: !!d.moq_flexible,
      }));
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
        sampling_time_weeks: form.sampling_time_weeks || null,   // v4: now persisted
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
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="F" title="Team & Capacity" desc="Who's in your studio, how many people, and what you can realistically deliver — and when." />

      {/* F.1 — Key Team Members */}
      <QCard qref="F.1" title="Key Team Members" desc="Add the key people — whoever runs design, production, and client communication.">
        {contacts.map(c => (
          editingContact?.id === c.id ? (
            <div key={c.id} style={{ padding: 16, border: '1px solid #E4E0DB', borderRadius: 6, marginBottom: 8, background: '#FAFAF8' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <Field label="Name *"><input style={inputStyle} value={editingContact.name} onChange={e => setEditingContact(x => ({ ...x, name: e.target.value }))} /></Field>
                <Field label="Role *"><input style={inputStyle} value={editingContact.role} onChange={e => setEditingContact(x => ({ ...x, role: e.target.value }))} /></Field>
                <Field label="Email"><input style={inputStyle} type="email" value={editingContact.email || ''} onChange={e => setEditingContact(x => ({ ...x, email: e.target.value }))} /></Field>
                <Field label="Phone"><input style={inputStyle} value={editingContact.phone || ''} onChange={e => setEditingContact(x => ({ ...x, phone: e.target.value }))} /></Field>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={saveEditContact}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditingContact(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div key={c.id} style={{ border: '1px solid #E4E0DB', borderRadius: 6, padding: '14px 16px', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{c.role}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingContact({ id: c.id, name: c.name, role: c.role, email: c.email || '', phone: c.phone || '' })}>Edit</button>
                  <TrashBtn label="Remove team member" size={13} danger onClick={() => delContact(c.id)} />
                </div>
              </div>
              {(c.email || c.phone) && (
                <div style={{ fontSize: 12, color: '#888' }}>{[c.email, c.phone].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          )
        ))}
        {addingC ? (
          <div style={{ padding: 16, border: '1px solid #E4E0DB', borderRadius: 6, marginTop: 8, background: '#FAFAF8' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="Name *"><input style={inputStyle} value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))} /></Field>
              <Field label="Role *"><input style={inputStyle} value={newContact.role} onChange={e => setNewContact(c => ({ ...c, role: e.target.value }))} /></Field>
              <Field label="Email"><input style={inputStyle} type="email" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} /></Field>
              <Field label="Phone"><input style={inputStyle} value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))} /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={addContact}>Save</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setAddingC(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" onClick={() => setAddingC(true)}>+ Add Team Member</button>
        )}
      </QCard>

      {/* F.2 — Buyer Coordinator */}
      <QCard qref="F.2" title="Buyer Coordinator">
        <div className="q-desc">
          Who typically coordinates with buyers — takes requirements, sends proposals, manages the relationship?{' '}
          <span style={{ fontSize: 11, color: '#7A8C6E', fontWeight: 500 }}>This will be shown to buyers on your studio page.</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 16 }}>
          {coordSaved && <span style={{ fontSize: 11, color: '#AAA' }}>Saved</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Name *"><input style={inputStyle} value={coordinator.name} onChange={e => setCoordinator(c => ({ ...c, name: e.target.value }))} onBlur={handleCoordBlur} placeholder="e.g. Priya Sharma" /></Field>
          <Field label="Position"><input style={inputStyle} value={coordinator.position} onChange={e => setCoordinator(c => ({ ...c, position: e.target.value }))} onBlur={handleCoordBlur} placeholder="e.g. Studio Manager / Founder" /></Field>
        </div>
        <Field label="About Them">
          <textarea style={textareaStyle} rows={3} value={coordinator.writeup} onChange={e => setCoordinator(c => ({ ...c, writeup: e.target.value }))} onBlur={handleCoordBlur}
            placeholder="e.g. Priya has 12 years in textile production. She manages all buyer relationships from brief to delivery. Prefers WhatsApp for quick updates." />
        </Field>
        <Field label="Photo" style={{ marginBottom: 0 }}>
          <label style={{ display: 'inline-block', cursor: 'pointer' }}>
            <input type="file" accept="image/*" onChange={uploadCoordPhoto} style={{ display: 'none' }} />
            <span className="btn btn-outline btn-sm">+ Upload Photo</span>
          </label>
        </Field>
      </QCard>

      {/* F.3 — Total Production Team Size */}
      <QCard qref="F.3" title="Total Production Team Size" desc="How many people work in your studio in total?">
        <input style={{ ...inputStyle, maxWidth: 160 }} type="text" inputMode="numeric" pattern="[0-9]*"
          value={form.artisan_count}
          onChange={e => setForm(f => ({ ...f, artisan_count: e.target.value.replace(/\D/g, '') }))}
          placeholder="e.g. 24" />
        <div className="field-hint" style={{ marginTop: 4 }}>Include everyone — artisans, tailors, embroiderers, helpers.</div>
      </QCard>

      {/* F.4 — Monthly Production Capacity */}
      <QCard qref="F.4" title="Monthly Production Capacity">
        <input style={{ ...inputStyle, maxWidth: 200 }} type="text" inputMode="numeric" pattern="[0-9]*"
          value={form.monthly_capacity_units}
          onChange={e => setForm(f => ({ ...f, monthly_capacity_units: e.target.value.replace(/\D/g, '') }))}
          placeholder="e.g. 500 units" />
        <div className="field-hint" style={{ marginTop: 4 }}>Total units across all crafts and product types combined.</div>
      </QCard>

      {/* F.5 — Timelines */}
      <QCard qref="F.5" title="Timelines" desc="Typical timelines buyers can expect — assuming fabric is available and sourcing is not required.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Sampling Time (weeks)" hint="From brief or reference to sample in buyer's hands">
            <input style={inputStyle} type="text" inputMode="numeric"
              value={form.sampling_time_weeks}
              onChange={e => setForm(f => ({ ...f, sampling_time_weeks: e.target.value.replace(/[^\d.]/g, '') }))}
              placeholder="e.g. 3" />
          </Field>
          <Field label="Production Time for 100 pcs (weeks)" hint="From approved sample to finished goods dispatched">
            <input style={inputStyle} type="text" inputMode="numeric"
              value={form.production_time_weeks}
              onChange={e => setForm(f => ({ ...f, production_time_weeks: e.target.value.replace(/[^\d.]/g, '') }))}
              placeholder="e.g. 6" />
          </Field>
        </div>
        <InfoBox>💡 These are your baseline timelines. If a buyer has a custom brief or complex requirements, you can share revised timelines in the proposal.</InfoBox>
      </QCard>

      {/* F.6 — Minimum Order Quantity */}
      <QCard qref="F.6" title="Minimum Order Quantity" desc="What is the minimum number of pieces you typically take — given fabric is available?">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <input style={{ ...inputStyle, width: 140 }} type="text" inputMode="numeric"
            value={form.moq_per_batch}
            onChange={e => setForm(f => ({ ...f, moq_per_batch: e.target.value.replace(/\D/g, '') }))}
            placeholder="e.g. 50" />
          <span style={{ fontSize: 13, color: '#888' }}>pieces per batch</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.moq_flexible} onChange={e => setForm(f => ({ ...f, moq_flexible: e.target.checked }))} style={{ marginTop: 2, width: 'auto' }} />
          <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>I'm flexible with this MOQ — buyers can discuss quantities with me in the proposal</span>
        </label>
        <InfoBox>💡 If a buyer requests customisation or has special requirements, you can quote your MOQ in the proposal — this number is just a general baseline shown on your profile.</InfoBox>
      </QCard>

      <SectionFooter onNext={() => save(true)} onSave={() => save(false)} saving={saving} />
    </div>
  );
}