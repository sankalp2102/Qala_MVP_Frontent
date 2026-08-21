import { useState, useEffect, useCallback, useRef } from 'react';
import { onboardingAPI, extractErrorMessage } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  SectionHeader, QCard, Field, SectionFooter, InfoBox, TrashBtn,
  useAutosave, mergeAutosave, inputStyle, textareaStyle,
} from './_ui';

const API = onboardingAPI;

/** Two numeric inputs with a dash — a min–max week range (F.5). */
function RangeInput({ min, max, onMin, onMax, phMin, phMax }) {
  const num = v => v.replace(/[^\d.]/g, '');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input style={{ ...inputStyle, textAlign: 'center' }} type="text" inputMode="numeric"
        value={min} onChange={e => onMin(num(e.target.value))} placeholder={phMin} />
      <span style={{ color: '#999', fontSize: 15 }}>–</span>
      <input style={{ ...inputStyle, textAlign: 'center' }} type="text" inputMode="numeric"
        value={max} onChange={e => onMax(num(e.target.value))} placeholder={phMax} />
      <span style={{ color: '#888', fontSize: 12, whiteSpace: 'nowrap' }}>weeks</span>
    </div>
  );
}

export default function SectionF({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [contacts, setContacts]             = useState([]);
  const [addingC, setAddingC]               = useState(false);
  const [newContact, setNewContact]         = useState({ name: '', role: '', email: '', phone: '' });
  const [editingContact, setEditingContact] = useState(null);

  const [coordinator, setCoordinator] = useState({ name: '', position: '', writeup: '', image: '' });
  const [coordSaved, setCoordSaved]   = useState(false);

  const [form, setForm] = useState({
    artisan_count: '', monthly_capacity_units: '',
    sampling_time_weeks_min: '', sampling_time_weeks_max: '',
    production_time_weeks_min: '', production_time_weeks_max: '',
    moq_per_batch: '', moq_flexible: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    const { production: d, collab, studio } = initialData;
    if (studio?.contacts) setContacts(studio.contacts);
    if (collab?.buyer_coordinator) {
      const bc = collab.buyer_coordinator;
      // Bug fix (Aug 2026): `image` was never read out of the API
      // response here, on the refetch below, or after a successful
      // upload — so even a photo that saved correctly on the backend
      // never showed anywhere in this section. The seller had no way to
      // tell a working upload from a silently failed one; both looked
      // identical (the static "+ Upload Photo" button, forever).
      setCoordinator({ name: bc.name || '', position: bc.position || '', writeup: bc.writeup || '', image: bc.image || '' });
    }
    if (d) {
      setForm(f => ({
        ...f,
        artisan_count: d.artisan_count ?? '',
        monthly_capacity_units: d.monthly_capacity_units ?? '',
        // v4: sampling_time_weeks now lives on ProductionScale and round-trips.
        // v5: ranges — seed min from the old single value for back-compat
        sampling_time_weeks_min: d.sampling_time_weeks_min ?? d.sampling_time_weeks ?? '',
        sampling_time_weeks_max: d.sampling_time_weeks_max ?? '',
        production_time_weeks_min: d.production_time_weeks_min ?? d.production_time_weeks ?? '',
        production_time_weeks_max: d.production_time_weeks_max ?? '',
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
      if (d) setCoordinator({ name: d.name || '', position: d.position || '', writeup: d.writeup || '', image: d.image || '' });
    }).catch(() => {});
    API.getProduction(profileId).then(r => {
      const d = r.data; if (!d) return;
      setForm(f => ({
        ...f,
        artisan_count: d.artisan_count ?? '',
        monthly_capacity_units: d.monthly_capacity_units ?? '',
        // v5: ranges — seed min from the old single value for back-compat
        sampling_time_weeks_min: d.sampling_time_weeks_min ?? d.sampling_time_weeks ?? '',
        sampling_time_weeks_max: d.sampling_time_weeks_max ?? '',
        production_time_weeks_min: d.production_time_weeks_min ?? d.production_time_weeks ?? '',
        production_time_weeks_max: d.production_time_weeks_max ?? '',
        moq_per_batch: d.moq_per_batch ?? '',
        moq_flexible: !!d.moq_flexible,
      }));
    }).catch(() => {});
  }, [profileId]);

  // F.2 coordinator. This used to save on blur only, and was not part of any
  // autosave: the fields weren't in the deps below, weren't registered with the
  // autosave registry, and had no page-lifecycle coverage. Typing a writeup and
  // then refreshing, closing the tab or logging out while the field still had
  // focus lost the text outright — while the footer claimed "Changes saved
  // automatically". It now goes through the shared hook like everything else.
  const persistCoordinator = useCallback(() => {
    // Bug fix (Aug 2026): BuyerCoordinator.name is required (non-blank)
    // on the backend, but this used to attempt the save unconditionally
    // on every autosave cycle — so a coordinator whose name simply
    // hadn't been filled in yet (position/writeup edited first, or the
    // seller working on MOQ further down this same combined section)
    // guaranteed a repeating validation failure. Since this section
    // merges the coordinator and production autosave indicators into
    // one (see mergeAutosave), that failure showed as a generic
    // "Couldn't save your changes" even while the seller was looking at
    // and had correctly filled in a completely different, unrelated
    // part of the page (MOQ/pieces-per-batch) — no way to connect the
    // error to "the coordinator's name field, elsewhere, is empty."
    // Matches the same "don't save an incomplete row" guard already
    // used for craft cards in SectionD.jsx.
    if (!coordinator.name?.trim()) return Promise.resolve();
    const fd = new FormData();
    fd.append('name', coordinator.name || '');
    fd.append('position', coordinator.position || '');
    fd.append('writeup', coordinator.writeup || '');
    return API.putCoordinator(profileId, fd);
  }, [profileId, coordinator]);

  const uploadCoordPhoto = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    try {
      const fd = new FormData();
      fd.append('name', coordinator.name);
      fd.append('position', coordinator.position);
      fd.append('writeup', coordinator.writeup);
      fd.append('image', file);
      const r = await API.putCoordinator(profileId, fd);
      // Bug fix (Aug 2026): the response was discarded entirely — even a
      // fully successful upload never updated `coordinator.image`, so
      // the UI still showed nothing. Store it now, the same way any
      // other field update would.
      setCoordinator(c => ({ ...c, image: r.data?.image || c.image }));
      setCoordSaved(true); setTimeout(() => setCoordSaved(false), 1500);
      success('Photo uploaded');
    } catch (err) {
      // Bug fix (Aug 2026) — "unable to upload photos": this used to
      // show the exact same generic message no matter what actually
      // went wrong, so a HEIC photo from an iPhone (rejected by the
      // backend — now fixed separately by auto-converting HEIC to JPEG
      // server-side, see seller_profile/serializers.py) failed with no
      // way for the seller to know why. Uses the shared
      // extractErrorMessage helper — the flat field lookup this used to
      // do never actually matched what the backend returns, on top of a
      // separate backend bug that made every field error unreadable
      // regardless (see core/utils.py) — both fixed together.
      error(extractErrorMessage(err, 'Upload failed — please try again.'));
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.role) { error('Name and role required'); return; }
    try {
      const r = await API.addContact(profileId, { ...newContact, order: contacts.length + 1 });
      setContacts(c => [...c, r.data]);
      setNewContact({ name: '', role: '', email: '', phone: '' });
      setAddingC(false); success('Team member added');
    } catch (e) { error(extractErrorMessage(e, 'Failed to add')); }
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
    } catch (e) { error(extractErrorMessage(e, 'Failed to update')); }
  };

  const delContact = async id => {
    try { await API.delContact(profileId, id); setContacts(c => c.filter(x => x.id !== id)); }
    catch (e) { error(extractErrorMessage(e, 'Could not remove — please try again.')); }
  };

  const persist = () => API.putProduction(profileId, {
    artisan_count: form.artisan_count || null,
    monthly_capacity_units: form.monthly_capacity_units || null,
    // v5: timeline ranges (single fields kept in sync = min, for back-compat)
    sampling_time_weeks_min: form.sampling_time_weeks_min || null,
    sampling_time_weeks_max: form.sampling_time_weeks_max || null,
    production_time_weeks_min: form.production_time_weeks_min || null,
    production_time_weeks_max: form.production_time_weeks_max || null,
    sampling_time_weeks: form.sampling_time_weeks_min || null,
    production_time_weeks: form.production_time_weeks_min || null,
    moq_per_batch: form.moq_per_batch || null,
    moq_flexible: form.moq_flexible,
  });

  const productionAutoSave  = useAutosave(persist, [form]);
  const coordinatorAutoSave = useAutosave(persistCoordinator, [coordinator]);
  const autoSaving = mergeAutosave(productionAutoSave, coordinatorAutoSave);

  // Keep the small "Saved" pulse next to the coordinator card driven by the
  // autosave rather than by a blur handler. The ref matters: without it the
  // effect runs on mount — when nothing has been saved — and flashes "Saved"
  // at a seller who hasn't typed anything yet.
  const coordSaveSeen = useRef(false);
  useEffect(() => {
    if (coordinatorAutoSave.saving) { coordSaveSeen.current = true; return; }
    if (!coordSaveSeen.current || coordinatorAutoSave.error) return;
    coordSaveSeen.current = false;
    setCoordSaved(true);
    const t = setTimeout(() => setCoordSaved(false), 1500);
    return () => clearTimeout(t);
  }, [coordinatorAutoSave.saving, coordinatorAutoSave.error]);

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await persist();
      success('Section F saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(extractErrorMessage(e, 'Save failed'));
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
            <div key={c.id} style={{ padding: 16, border: '1px solid var(--surface4)', borderRadius: 'var(--r)', marginBottom: 8, background: 'var(--bg)' }}>
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
            <div key={c.id} style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 8 }}>
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
          <div style={{ padding: 16, border: '1px solid var(--surface4)', borderRadius: 'var(--r)', marginTop: 8, background: 'var(--bg)' }}>
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
          <span style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 500 }}>This will be shown to buyers on your studio page.</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 16 }}>
          {coordSaved && <span style={{ fontSize: 11, color: '#AAA' }}>Saved</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Name *"><input style={inputStyle} value={coordinator.name} onChange={e => setCoordinator(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Priya Sharma" /></Field>
          <Field label="Position"><input style={inputStyle} value={coordinator.position} onChange={e => setCoordinator(c => ({ ...c, position: e.target.value }))} placeholder="e.g. Studio Manager / Founder" /></Field>
        </div>
        <Field label="About Them">
          <textarea style={textareaStyle} rows={3} value={coordinator.writeup} onChange={e => setCoordinator(c => ({ ...c, writeup: e.target.value }))}
            placeholder="e.g. Priya has 12 years in textile production. She manages all buyer relationships from brief to delivery. Prefers WhatsApp for quick updates." />
        </Field>
        <Field label="Photo" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Bug fix (Aug 2026): this never rendered the current photo
                at all — on load OR after a successful upload — so a
                working upload and a silently failed one looked
                completely identical: the same static button, forever.
                Now shows the real thumbnail whenever one exists. */}
            {coordinator.image && (
              <img
                src={coordinator.image}
                alt={coordinator.name || 'Coordinator photo'}
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
              />
            )}
            <label style={{ display: 'inline-block', cursor: 'pointer' }}>
              <input type="file" accept="image/*" onChange={uploadCoordPhoto} style={{ display: 'none' }} />
              <span className="btn btn-outline btn-sm">{coordinator.image ? 'Change Photo' : '+ Upload Photo'}</span>
            </label>
          </div>
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

      {/* F.5 — Timelines (ranges) */}
      <QCard qref="F.5" title="Timelines" desc="Typical timelines buyers can expect — assuming fabric is available and sourcing is not required. Give a range.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Sampling Time (weeks)" hint="From brief or reference to sample in buyer's hands">
            <RangeInput
              min={form.sampling_time_weeks_min} max={form.sampling_time_weeks_max}
              onMin={v => setForm(f => ({ ...f, sampling_time_weeks_min: v }))}
              onMax={v => setForm(f => ({ ...f, sampling_time_weeks_max: v }))}
              phMin="2" phMax="4" />
          </Field>
          <Field label="Production Time for 100 pcs (weeks)" hint="From approved sample to finished goods dispatched">
            <RangeInput
              min={form.production_time_weeks_min} max={form.production_time_weeks_max}
              onMin={v => setForm(f => ({ ...f, production_time_weeks_min: v }))}
              onMax={v => setForm(f => ({ ...f, production_time_weeks_max: v }))}
              phMin="4" phMax="6" />
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
            placeholder="e.g. 25" />
          <span style={{ fontSize: 13, color: '#888' }}>pieces per batch</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.moq_flexible} onChange={e => setForm(f => ({ ...f, moq_flexible: e.target.checked }))} style={{ marginTop: 2, width: 'auto' }} />
          <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>I'm flexible with this MOQ — buyers can discuss quantities with me in the proposal</span>
        </label>
        <InfoBox>💡 If a buyer requests customisation or has special requirements, you can quote your MOQ in the proposal — this number is just a general baseline shown on your profile.</InfoBox>
      </QCard>

      <SectionFooter onNext={() => save(true)} saving={saving} autoSaving={autoSaving} />
    </div>
  );
}