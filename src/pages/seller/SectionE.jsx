import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { SectionHeader, QCard, SectionFooter, YNToggle } from './_ui';

const API = onboardingAPI;

const MODES = [
  {
    key: 'catalogue_collab', name: 'Catalogue Collaboration',
    desc: 'Buyer picks from your existing catalogue and makes minor customisations — like silhouette edit, adaptation to different colour, fabric, or quantity.',
    pills: ['🏷 Buyer\u2019s label', '✦ Studio retains design IP', '🔓 Non-exclusive'],
  },
  {
    key: 'co_creation', name: 'Co-creation',
    desc: 'Buyer arrives with a vision. Your studio\u2019s designers shape it into a product — fabrics, silhouettes, construction. The design is developed together.',
    pills: ['🏷 Buyer\u2019s label', '✦ Buyer owns design IP', '🔒 Exclusive to buyer'],
  },
  {
    key: 'production_house', name: 'Production House',
    desc: 'Buyer brings a finished tech pack or reference sample. Your studio manufactures it exactly — no design input needed.',
    pills: ['🏷 Buyer\u2019s label', '✦ Buyer owns design IP', '🔒 Exclusive to buyer'],
  },
];

const CAPABILITIES = [
  { key: 'has_fashion_designer',    name: 'Fashion Design',       desc: 'Garment design, silhouette development, tech pack creation' },
  { key: 'has_textile_design',      name: 'Textile Design',       desc: 'Surface treatment, print pattern development, fabric construction' },
  { key: 'has_design_from_scratch', name: 'Design as a Service',  desc: 'Your studio offers design as a paid service — creating original pieces from a brief, mood board, or concept, with no existing buyer reference needed' },
];

function CollabModeCard({ mode, value, onChange }) {
  return (
    <div style={{ border: '1px solid #E4E0DB', borderRadius: 8, padding: '16px 18px', background: '#fff', marginBottom: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>{mode.name}</div>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 8, lineHeight: 1.55 }}>{mode.desc}</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {mode.pills.map(p => (
          <span key={p} style={{ fontSize: 10, color: '#666', background: '#F2F0EC', border: '1px solid #E5E1DB', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{p}</span>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #F0EDE8', paddingTop: 10, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', fontWeight: 600, minWidth: 90 }}>Do you offer this?</span>
        <div style={{ marginLeft: 'auto' }}>
          <YNToggle value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

function CapabilityRow({ cap, checked, onChange, isLast }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 0', borderBottom: isLast ? 'none' : '1px solid #F5F3EF', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 2, width: 'auto' }} />
      <div>
        <strong style={{ fontSize: 13, color: '#1A1A1A' }}>{cap.name}</strong>
        <span style={{ display: 'block', fontSize: 11, color: '#888', marginTop: 2, lineHeight: 1.5 }}>{cap.desc}</span>
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
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="E" title="Collaboration" desc="How you work with buyers — from the way you receive briefs to the creative support you offer." />

      <QCard qref="E.1" title="How Buyers Work With You" desc="Buyers engage studios in different ways. Indicate which modes you offer.">
        {MODES.map(m => (
          <CollabModeCard key={m.key} mode={m} value={form[m.key]} onChange={v => setForm(f => ({ ...f, [m.key]: v }))} />
        ))}
      </QCard>

      <QCard qref="E.2" title="Design Capabilities" desc="What design capabilities does your studio have in-house? Select all that apply.">
        {CAPABILITIES.map((cap, i) => (
          <CapabilityRow key={cap.key} cap={cap}
            checked={!!form[cap.key]}
            onChange={e => setForm(f => ({ ...f, [cap.key]: e.target.checked }))}
            isLast={i === CAPABILITIES.length - 1} />
        ))}
      </QCard>

      <SectionFooter onNext={() => save(true)} onSave={() => save(false)} saving={saving} />
    </div>
  );
}