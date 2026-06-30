import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const API = onboardingAPI;

const TYPES = [
  { key: 'printing', label: 'Printing & Dyeing Techniques', desc: 'Add each printing and dyeing technique your studio practices. Mark expertise and note any distinctive innovation.', cta: '+ Add Printing / Dyeing Technique' },
  { key: 'surface',  label: 'Surface Techniques',           desc: 'Embroidery, applique, crochet, patchwork, beadwork, mirror work — anything applied to the surface of the fabric.', cta: '+ Add Surface Technique' },
  { key: 'weaving',  label: 'Weaving Techniques',           desc: 'Does your studio weave, or work closely with weavers? Add any weaving techniques here.', cta: '+ Add Weaving Technique', hint: 'e.g. Plain weave, Ikat, Jamdani, Dobby, Jacquard, Khadi handspun.' },
];

const LEVELS = [
  { value: 'high',   label: 'Pro' },     // spec: Mod/High/Pro maps to innovation_level low/medium/high in backend
  { value: 'medium', label: 'High' },
  { value: 'low',    label: 'Moderate' },
];
// Display order should read Moderate, High, Pro left-to-right
const LEVELS_ORDERED = [
  { value: 'low',    label: 'Moderate' },
  { value: 'medium', label: 'High' },
  { value: 'high',   label: 'Pro' },
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

function ExpertiseButtons({ value, onChange }) {
  const colors = {
    low:    { bg: '#EBF5E8', text: '#5C845C', border: '#9EC09E' },
    medium: { bg: '#A8D4A8', text: '#2A5E2A', border: '#7AB47A' },
    high:   { bg: '#4A7C4A', text: '#FFFFFF', border: '#4A7C4A' },
  };
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {LEVELS_ORDERED.map(l => {
        const selected = value === l.value;
        const c = colors[l.value];
        return (
          <button key={l.value} onClick={() => onChange(l.value)}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 5,
              border: `1px solid ${selected ? c.border : 'var(--border2)'}`,
              background: selected ? c.bg : 'var(--surface2)',
              color: selected ? c.text : 'var(--text3)',
              cursor: 'pointer',
            }}>
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

function TechniqueCard({ craft, onUpdate, onDelete, onImageUpload, onImageRemove }) {
  return (
    <div style={{ border: '1px solid var(--border2)', borderRadius: 6, padding: '14px 16px', background: 'var(--surface2)', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          value={craft.craft_name}
          onChange={e => onUpdate({ craft_name: e.target.value })}
          placeholder="Technique name"
          style={{ flex: 1, minWidth: 160, fontWeight: 600, fontSize: 14 }}
        />
        <ExpertiseButtons value={craft.innovation_level || 'low'} onChange={lvl => onUpdate({ innovation_level: lvl })} />
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
      </div>
      <input
        value={craft.specialization || ''}
        onChange={e => onUpdate({ specialization: e.target.value })}
        placeholder="Innovation / specialization (optional)"
        style={{ width: '100%', marginBottom: 10 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        {[0, 1, 2].map(i => {
          const img = craft._images?.[i];
          return (
            <div key={i} style={{ width: 76, height: 76, border: '1px dashed var(--border2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              {img ? (
                <>
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => onImageRemove(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 4, width: 18, height: 18, fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>×</button>
                </>
              ) : (
                <label style={{ cursor: 'pointer', fontSize: 18, color: 'var(--text4)' }}>
                  +
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onImageUpload(e, i)} />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SectionD({ profileId, onSave }) {
  const { toasts, success, error } = useToast();
  const [crafts, setCrafts] = useState({ printing: [], surface: [], weaving: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    API.getCrafts(profileId).then(r => {
      const all = r.data || [];
      const grouped = { printing: [], surface: [], weaving: [] };
      all.forEach(c => {
        const type = c.technique_type || 'printing';
        if (grouped[type]) grouped[type].push(c);
      });
      setCrafts(grouped);
    }).catch(() => {});
  }, [profileId]);

  const addCard = type => {
    setCrafts(prev => ({
      ...prev,
      [type]: [...prev[type], {
        _local: true, _tempId: Date.now(),
        craft_name: '', specialization: '', innovation_level: 'low',
        technique_type: type, is_primary: true,
      }],
    }));
  };

  const updateCard = (type, idx, patch) => {
    setCrafts(prev => ({
      ...prev,
      [type]: prev[type].map((c, i) => i === idx ? { ...c, ...patch } : c),
    }));
  };

  const deleteCard = async (type, idx) => {
    const card = crafts[type][idx];
    if (card.id) {
      try { await API.delCraft(profileId, card.id); } catch {}
    }
    setCrafts(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
  };

  const uploadImage = async (type, idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const card = crafts[type][idx];

    try {
      const fd = new FormData();
      fd.append('craft_name', card.craft_name || 'Untitled');
      fd.append('technique_type', type);
      fd.append('innovation_level', card.innovation_level || 'low');
      fd.append('specialization', card.specialization || '');
      fd.append('is_primary', true);
      fd.append('image', file);

      let saved;
      if (card.id) {
        const fdPatch = new FormData();
        fdPatch.append('image', file);
        const r = await API.patchCraft(profileId, card.id, fdPatch);
        saved = r.data;
      } else {
        const r = await API.addCraft(profileId, fd);
        saved = r.data;
      }
      updateCard(type, idx, { ...saved, _images: [{ url: saved.image }] });
      success('Image uploaded');
    } catch {
      error('Image upload failed');
    }
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const type of Object.keys(crafts)) {
        for (let i = 0; i < crafts[type].length; i++) {
          const card = crafts[type][i];
          if (!card.craft_name?.trim()) continue;

          if (card.id) {
            await API.patchCraft(profileId, card.id, {
              craft_name: card.craft_name,
              technique_type: type,
              innovation_level: card.innovation_level,
              specialization: card.specialization,
            });
          } else {
            const fd = new FormData();
            fd.append('craft_name', card.craft_name);
            fd.append('technique_type', type);
            fd.append('innovation_level', card.innovation_level || 'low');
            fd.append('specialization', card.specialization || '');
            fd.append('is_primary', true);
            fd.append('order', i + 1);
            const r = await API.addCraft(profileId, fd);
            updateCard(type, i, r.data);
          }
        }
      }
      success('Section D saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="D" title="Crafts & Techniques" desc="This is the most important section — the richer your craft data, the better your buyer matches." />

      {TYPES.map(t => (
        <CardSection key={t.key} title={`D.${TYPES.indexOf(t) + 1} — ${t.label}`} desc={t.desc}>
          {crafts[t.key].length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text4)', fontStyle: 'italic', marginBottom: 12 }}>
              {t.hint ? t.hint : 'No techniques added yet.'}
            </p>
          )}
          {crafts[t.key].map((card, idx) => (
            <TechniqueCard
              key={card.id || card._tempId}
              craft={card}
              onUpdate={patch => updateCard(t.key, idx, patch)}
              onDelete={() => deleteCard(t.key, idx)}
              onImageUpload={(e, slot) => uploadImage(t.key, idx, e)}
              onImageRemove={() => {}}
            />
          ))}
          <button className="btn btn-outline btn-sm" onClick={() => addCard(t.key)}>{t.cta}</button>
        </CardSection>
      ))}

      <button className="btn btn-primary btn-lg fade-up" onClick={saveAll} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
      </button>
    </div>
  );
}