import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const API = onboardingAPI;

const MODES = [
  {
    key: 'catalogue_collab', name: 'Catalogue Collaboration',
    desc: 'Buyer picks from your existing catalogue and orders it — same design, adapted to their colour, fabric, or quantity.',
    pills: ['Buyer label', 'Studio retains design', 'Non-exclusive'],
  },
  {
    key: 'co_creation', name: 'Co-creation',
    desc: 'Buyer arrives with a vision or direction. Your studio designers shape it into a product — fabrics, silhouettes, construction. Design fee applies.',
    pills: ['Buyer label', 'Buyer owns design', 'Exclusive'],
  },
  {
    key: 'production_house', name: 'Production House',
    desc: 'Buyer brings a finished tech pack or sample. Your studio manufactures exactly to spec.',
    pills: ['Buyer label', 'Buyer owns design', 'Exclusive'],
  },
];

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

function YNToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
        <button key={l} onClick={() => onChange(v)} style={{
          padding: '8px 28px', borderRadius: 5,
          border: `1px solid ${value === v ? '#D97520' : '#D8D4CF'}`,
          background: value === v ? '#D97520' : '#fff',
          color: value === v ? '#fff' : '#555',
          fontWeight: value === v ? 600 : 400, cursor: 'pointer', fontSize: 13,
        }}>{l}</button>
      ))}
    </div>
  );
}

function CollabModeCard({ mode, value, onChange }) {
  return (
    <div style={{ border: '1px solid #E4E0DB', borderRadius: 8, padding: '16px 18px', background: '#fff', marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>{mode.name}</div>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.6 }}>{mode.desc}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {mode.pills.map(p => (
          <span key={p} style={{ fontSize: 10, color: '#666', background: '#F2F0EC', border: '1px solid #E5E1DB', borderRadius: 20, padding: '2px 8px' }}>{p}</span>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #F0EDE8', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', fontWeight: 600, minWidth: 90 }}>Do you offer this?</span>
        <YNToggle value={value} onChange={onChange} />
      </div>
    </div>
  );
}

function CheckboxRow({ label, desc, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );
}

export default function SectionE({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [form, setForm] = useState({
    catalogue_collab: null, co_creation: null, production_house: null,
    has_fashion_designer: null, has_textile_design: null, has_design_from_scratch: null,
  });
  const [saving, setSaving] = useState(false);

  const populateFromData = (d) => {
    if (!d) return;
    setForm({
      catalogue_collab: d.catalogue_collab,
      co_creation: d.co_creation,
      production_house: d.production_house,
      has_fashion_designer: d.has_fashion_designer,
      has_textile_design: d.has_textile_design,
      has_design_from_scratch: d.has_design_from_scratch,
    });
  };

  useEffect(() => { if (initialData) populateFromData(initialData); }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getCollab(profileId).then(r => populateFromData(r.data)).catch(() => {});
  }, [profileId]);

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await API.putCollab(profileId, form);
      success('Section E saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="E" title="Collaboration" desc="How you work with buyers — from the way you receive briefs to the creative support you offer." />

      <CardSection title="E.1 — Collaboration Modes">
        {MODES.map(m => (
          <CollabModeCard key={m.key} mode={m} value={form[m.key]} onChange={v => setForm(f => ({ ...f, [m.key]: v }))} />
        ))}
      </CardSection>

      <CardSection title="E.2 — Design Capabilities" desc="What design capabilities does your studio have in-house? Select all that apply.">
        <CheckboxRow
          label="Fashion Design"
          desc="Garment design, silhouette development, tech pack creation"
          checked={!!form.has_fashion_designer}
          onChange={e => setForm(f => ({ ...f, has_fashion_designer: e.target.checked }))}
        />
        <CheckboxRow
          label="Textile Design"
          desc="Surface treatment, print pattern development, fabric construction"
          checked={!!form.has_textile_design}
          onChange={e => setForm(f => ({ ...f, has_textile_design: e.target.checked }))}
        />
        <CheckboxRow
          label="Design from Scratch"
          desc="Creates original designs with no buyer reference — design fee applies separately"
          checked={!!form.has_design_from_scratch}
          onChange={e => setForm(f => ({ ...f, has_design_from_scratch: e.target.checked }))}
        />
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