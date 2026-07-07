import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { TrashIcon } from './SectionA';
import { mediaUrl } from '../../utils/mediaUrl';

const API = onboardingAPI;

const TYPES = [
  { key: 'weaving',  label: 'Weaving Techniques',           desc: 'Does your studio weave, or work closely with weavers? Add any weaving techniques here.', cta: '+ Add Weaving Technique', hint: 'e.g. Plain weave, Ikat, Jamdani, Dobby, Jacquard, Khadi handspun.' },
  { key: 'printing', label: 'Printing & Dyeing Techniques', desc: 'Add each printing and dyeing technique your studio practices. Mark expertise and note any distinctive innovation.', cta: '+ Add Printing / Dyeing Technique' },
  { key: 'surface',  label: 'Surface Techniques',           desc: 'Embroidery, applique, crochet, patchwork, beadwork, mirror work — anything applied to the surface of the fabric.', cta: '+ Add Surface Technique' },
];

const LEVELS_ORDERED = [
  { value: 'low',    label: 'Moderate', bg: '#EBF5E8', text: '#5C845C', border: '#9EC09E' },
  { value: 'medium', label: 'High',     bg: '#A8D4A8', text: '#2A5E2A', border: '#7AB47A' },
  { value: 'high',   label: 'Pro',      bg: '#4A7C4A', text: '#FFFFFF', border: '#4A7C4A' },
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
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {LEVELS_ORDERED.map(l => {
        const selected = value === l.value;
        return (
          <button key={l.value} onClick={() => onChange(l.value)}
            style={{
              fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 5,
              border: `1px solid ${selected ? l.border : 'var(--border2)'}`,
              background: selected ? l.bg : 'var(--surface2)',
              color: selected ? l.text : 'var(--text3)',
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
  const [imgHover, setImgHover] = useState(false);
  const rawUrl = craft._images?.[0]?.url || craft.image || null;
  const imgSrc = rawUrl ? mediaUrl(rawUrl) : null;

  return (
    <div style={{ border: '1px solid #E4E0DB', borderRadius: 6, padding: '14px 16px', background: '#FAFAF8', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          value={craft.craft_name}
          onChange={e => onUpdate({ craft_name: e.target.value })}
          placeholder="Technique name"
          style={{ flex: 1, minWidth: 160, fontWeight: 600, fontSize: 14, padding: '9px 12px', border: '1px solid #D8D4CF', borderRadius: 5, background: '#fff', color: '#1A1A1A', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
        <ExpertiseButtons value={craft.innovation_level || 'low'} onChange={lvl => onUpdate({ innovation_level: lvl })} />
        <button
          aria-label="Delete technique"
          onClick={onDelete}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: '4px 6px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
          onMouseLeave={e => e.currentTarget.style.color = '#CCC'}>
          <TrashIcon size={13} />
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CCCCCC', fontWeight: 600, marginBottom: 4 }}>Innovation / Specialization</div>
        <input
          value={craft.specialization || ''}
          onChange={e => onUpdate({ specialization: e.target.value })}
          placeholder="Optional — what makes your approach distinctive?"
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #D8D4CF', borderRadius: 5, background: '#fff', color: '#1A1A1A', fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
      </div>

      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CCCCCC', fontWeight: 600, marginBottom: 6 }}>Photo</div>
        <div
          onMouseEnter={() => setImgHover(true)}
          onMouseLeave={() => setImgHover(false)}
          style={{ width: 76, height: 76, borderRadius: 5, border: `1px ${imgSrc ? 'solid #E4E0DB' : 'dashed #C8C4BF'}`, background: imgSrc ? 'transparent' : imgHover ? '#FEF8F0' : '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: imgSrc ? 'default' : 'pointer', transition: 'border-color .15s, background .15s', ...(imgHover && !imgSrc ? { borderColor: '#D97520' } : {}) }}>
          {imgSrc ? (
            <>
              <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
              <button onClick={onImageRemove} aria-label="Remove image" style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
            </>
          ) : (
            <label style={{ cursor: 'pointer', fontSize: 20, color: '#CCC', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              +
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onImageUpload} />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SectionD({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [crafts, setCrafts] = useState({ printing: [], surface: [], weaving: [] });
  const [saving, setSaving] = useState(false);

  const populateCrafts = (rows) => {
    const grouped = { printing: [], surface: [], weaving: [] };
    (rows || []).forEach(c => {
      const type = c.technique_type || 'printing';
      if (grouped[type]) grouped[type].push(c);
    });
    setCrafts(grouped);
  };

  useEffect(() => { if (initialData) populateCrafts(initialData); }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getCrafts(profileId).then(r => populateCrafts(r.data)).catch(() => {});
  }, [profileId]);

  const addCard = type => {
    setCrafts(prev => ({
      ...prev,
      [type]: [...prev[type], { _local: true, _tempId: Date.now(), craft_name: '', specialization: '', innovation_level: 'low', technique_type: type, is_primary: true }],
    }));
  };

  const updateCard = (type, idx, patch) => {
    setCrafts(prev => ({ ...prev, [type]: prev[type].map((c, i) => i === idx ? { ...c, ...patch } : c) }));
  };

  const deleteCard = async (type, idx) => {
    const card = crafts[type][idx];
    if (card.id) { try { await API.delCraft(profileId, card.id); } catch {} }
    setCrafts(prev => ({ ...prev, [type]: prev[type].filter((_, i) => i !== idx) }));
  };

  const uploadImage = async (type, idx, e) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    const card = crafts[type][idx];
    try {
      let saved;
      if (card.id) {
        const fd = new FormData(); fd.append('image', file);
        const r = await API.patchCraft(profileId, card.id, fd); saved = r.data;
      } else {
        const fd = new FormData();
        fd.append('craft_name', card.craft_name || 'Untitled');
        fd.append('technique_type', type);
        fd.append('innovation_level', card.innovation_level || 'low');
        fd.append('specialization', card.specialization || '');
        fd.append('is_primary', true);
        fd.append('image', file);
        const r = await API.addCraft(profileId, fd); saved = r.data;
      }
      /* Store the raw path from the API — mediaUrl() is applied at render time */
      updateCard(type, idx, { ...saved, _images: [{ url: saved.image }] });
      success('Image uploaded');
    } catch { error('Image upload failed'); }
  };

  const removeImage = async (type, idx) => {
    const card = crafts[type][idx];
    if (card.id) { try { await API.patchCraft(profileId, card.id, { image: null }); } catch {} }
    updateCard(type, idx, { image: null, _images: [] });
  };

  const saveAll = async (andNext = false) => {
    setSaving(true);
    try {
      for (const type of Object.keys(crafts)) {
        for (let i = 0; i < crafts[type].length; i++) {
          const card = crafts[type][i];
          if (!card.craft_name?.trim()) continue;
          if (card.id) {
            await API.patchCraft(profileId, card.id, { craft_name: card.craft_name, technique_type: type, innovation_level: card.innovation_level, specialization: card.specialization });
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
      if (andNext) onNext?.();
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
              {t.hint || 'No techniques added yet.'}
            </p>
          )}
          {crafts[t.key].map((card, idx) => (
            <TechniqueCard
              key={card.id || card._tempId}
              craft={card}
              onUpdate={patch => updateCard(t.key, idx, patch)}
              onDelete={() => deleteCard(t.key, idx)}
              onImageUpload={e => uploadImage(t.key, idx, e)}
              onImageRemove={() => removeImage(t.key, idx)}
            />
          ))}
          <button
            onClick={() => addCard(t.key)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: '1px dashed #C8C4BF', borderRadius: 5, fontSize: 12, color: '#888', cursor: 'pointer', background: 'transparent', fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}>
            {t.cta}
          </button>
        </CardSection>
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-primary btn-lg fade-up" onClick={() => saveAll(true)} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
        </button>
        <button className="btn btn-ghost fade-up" onClick={() => saveAll(false)} disabled={saving}>Save</button>
      </div>
    </div>
  );
}