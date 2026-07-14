import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  SectionHeader, QCard, SectionFooter, ExpertiseButtons,
  TrashIcon, AddButton, EXPERTISE_TOOLTIPS, useAutosave, textareaStyle,
} from './_ui';
import { mediaUrl } from '../../utils/mediaUrl';

const API = onboardingAPI;

/* Five technique buckets, in prototype order. `key` maps to CraftDetail.technique_type. */
const TYPES = [
  { key: 'spinning', ref: 'D.1', label: 'Spinning', desc: 'Hand spinning, charkha, ring spinning, yarn-making — any yarn or thread preparation your studio does.', cta: '+ Add Spinning Technique', empty: 'No spinning techniques added yet.' },
  { key: 'weaving',  ref: 'D.2', label: 'Weaving / Knitting',  desc: 'Does your studio weave or knit, or work closely with weavers and knitters? Add any weaving or knitting techniques here.', cta: '+ Add Weaving / Knitting Technique', empty: 'No weaving / knitting techniques added yet.', hint: 'e.g. Plain weave, Ikat, Jamdani, Dobby, Jacquard, Khadi handspun, Patola, Kanjivaram, hand-knit, machine-knit…' },
  { key: 'dyeing',   ref: 'D.3', label: 'Dyeing',   desc: 'Add each dyeing technique your studio practises. Mark expertise and note any distinctive innovation.', cta: '+ Add Dyeing Technique', empty: 'No dyeing techniques added yet.' },
  { key: 'printing', ref: 'D.4', label: 'Printing', desc: 'Block printing, screen printing, digital printing — any technique used to apply pattern or colour to fabric.', cta: '+ Add Printing Technique', empty: 'No printing techniques added yet.' },
  { key: 'surface',  ref: 'D.5', label: 'Surface Work', desc: 'Embroidery, appliqué, crochet, patchwork, beadwork, mirror work — anything applied to the surface of the fabric.', cta: '+ Add Surface Technique', empty: 'No surface techniques added yet.' },
];

function TechniqueCard({ craft, onUpdate, onDelete, onImageUpload, onImageRemove }) {
  const [imgHover, setImgHover] = useState(false);
  const rawUrl = craft._images?.[0]?.url || craft.image || null;
  const imgSrc = rawUrl ? mediaUrl(rawUrl) : null;

  return (
    <div style={{ border: '1px solid #E4E0DB', borderRadius: 6, padding: '14px 16px', background: '#FAFAF8', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          value={craft.craft_name}
          onChange={e => onUpdate({ craft_name: e.target.value })}
          placeholder="Technique name"
          style={{ flex: 1, minWidth: 160, fontWeight: 600, fontSize: 14, border: 'none', background: 'transparent', padding: 0, color: '#1A1A1A', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <ExpertiseButtons value={craft.expertise_level} onChange={lvl => onUpdate({ expertise_level: lvl })} tooltips={EXPERTISE_TOOLTIPS.technique} />
          <button aria-label="Delete technique" onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: '4px 6px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
            onMouseLeave={e => e.currentTarget.style.color = '#CCC'}>
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CCCCCC', fontWeight: 600, marginBottom: 4 }}>About this technique — specialities, innovations, or what makes your approach unique (optional)</div>
        <input
          value={craft.specialization || ''}
          onChange={e => onUpdate({ specialization: e.target.value })}
          placeholder="e.g. What's distinctive about how your studio does this — a speciality, a signature method, or an innovation"
          style={{ width: '100%', padding: '7px 10px', border: '1px solid #D8D4CF', borderRadius: 5, background: '#fff', color: '#1A1A1A', fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
      </div>

      <div style={{ paddingTop: 10, borderTop: '1px solid #F0EDE8' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#CCCCCC', fontWeight: 600, marginBottom: 6 }}>Thumbnail image (optional)</div>
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
  const [crafts, setCrafts] = useState({ spinning: [], weaving: [], dyeing: [], printing: [], surface: [] });
  const [craftNotes, setCraftNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const populateCrafts = (rows) => {
    const grouped = { spinning: [], weaving: [], dyeing: [], printing: [], surface: [] };
    (rows || []).forEach(c => {
      const type = c.technique_type || 'printing';
      if (grouped[type]) grouped[type].push(c);
      else grouped.printing.push(c);
    });
    setCrafts(grouped);
  };

  useEffect(() => { if (initialData) populateCrafts(initialData); }, [initialData]);

  useEffect(() => {
    if (!profileId || initialData) return;
    API.getCrafts(profileId).then(r => populateCrafts(r.data)).catch(() => {});
  }, [profileId]);

  // craft_notes (D.6) lives on StudioDetails; this section only receives the
  // crafts array, so fetch the note separately.
  useEffect(() => {
    if (!profileId) return;
    API.getStudio(profileId).then(r => setCraftNotes(r.data?.craft_notes || '')).catch(() => {});
  }, [profileId]);

  const addCard = type => {
    setCrafts(prev => ({
      ...prev,
      [type]: [...prev[type], { _local: true, _tempId: Date.now(), craft_name: '', specialization: '', expertise_level: null, technique_type: type, is_primary: true }],
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
        if (card.expertise_level) fd.append('expertise_level', card.expertise_level);
        fd.append('specialization', card.specialization || '');
        fd.append('is_primary', true);
        fd.append('image', file);
        const r = await API.addCraft(profileId, fd); saved = r.data;
      }
      updateCard(type, idx, { ...saved, _images: [{ url: saved.image }] });
      success('Image uploaded');
    } catch { error('Image upload failed'); }
  };

  const removeImage = async (type, idx) => {
    const card = crafts[type][idx];
    if (card.id) { try { await API.patchCraft(profileId, card.id, { image: null }); } catch {} }
    updateCard(type, idx, { image: null, _images: [] });
  };

  const persist = async () => {
    for (const type of Object.keys(crafts)) {
      for (let i = 0; i < crafts[type].length; i++) {
        const card = crafts[type][i];
        if (!card.craft_name?.trim()) continue;
        if (card.id) {
          await API.patchCraft(profileId, card.id, {
            craft_name: card.craft_name, technique_type: type,
            expertise_level: card.expertise_level, specialization: card.specialization,
          });
        } else {
          const fd = new FormData();
          fd.append('craft_name', card.craft_name);
          fd.append('technique_type', type);
          if (card.expertise_level) fd.append('expertise_level', card.expertise_level);
          fd.append('specialization', card.specialization || '');
          fd.append('is_primary', true);
          fd.append('order', i + 1);
          const r = await API.addCraft(profileId, fd);
          updateCard(type, i, r.data);
        }
      }
    }
    await API.patchStudio(profileId, { craft_notes: craftNotes });
  };

  const autoSaving = useAutosave(persist, [crafts, craftNotes]);

  const saveAll = async (andNext = false) => {
    setSaving(true);
    try {
      await persist();
      success('Section D saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="D" title="Crafts & Techniques" desc="The craft techniques your studio works with and is expert at — the more detail you add, the better your buyer matches." />

      {TYPES.map(t => (
        <QCard key={t.key} qref={t.ref} title={t.label} desc={t.desc}>
          {t.hint && crafts[t.key].length === 0 && (
            <div style={{ fontSize: 12, color: '#BBBBBB', marginBottom: 12 }}>{t.hint}</div>
          )}
          {crafts[t.key].length === 0 ? (
            <div style={{ color: '#BBB', fontSize: 13, fontStyle: 'italic', padding: '8px 0' }}>{t.empty}</div>
          ) : (
            crafts[t.key].map((card, idx) => (
              <TechniqueCard
                key={card.id || card._tempId}
                craft={card}
                onUpdate={patch => updateCard(t.key, idx, patch)}
                onDelete={() => deleteCard(t.key, idx)}
                onImageUpload={e => uploadImage(t.key, idx, e)}
                onImageRemove={() => removeImage(t.key, idx)}
              />
            ))
          )}
          <AddButton onClick={() => addCard(t.key)}>{t.cta}</AddButton>
        </QCard>
      ))}

      <QCard qref="D.6" title="More About Crafts & Techniques" desc="Context that the cards above don't capture — traditions you work in, methods passed down, regional specialities, or how you combine techniques.">
        <textarea rows={3} style={textareaStyle} value={craftNotes} onChange={e => setCraftNotes(e.target.value)}
          placeholder="e.g. Our block printing follows a four-generation family tradition from Bagru, using hand-carved teak blocks and fermented natural dyes. We often combine it with our own hand embroidery for layered surface work." />
      </QCard>

      <SectionFooter onNext={() => saveAll(true)} saving={saving} autoSaving={autoSaving} />
    </div>
  );
}