import { useState, useEffect, useRef } from 'react';
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
    <div style={{ border: '1px solid var(--surface4)', borderRadius: 'var(--r)', padding: '14px 16px', background: 'var(--bg)', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <input
          value={craft.craft_name}
          onChange={e => onUpdate({ craft_name: e.target.value })}
          placeholder="Technique name"
          style={{ flex: 1, minWidth: 160, fontWeight: 600, fontSize: 14, border: 'none', background: 'transparent', padding: 0, color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <ExpertiseButtons value={craft.expertise_level} onChange={lvl => onUpdate({ expertise_level: lvl })} tooltips={EXPERTISE_TOOLTIPS.technique} />
          <button aria-label="Delete technique" onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CCC', padding: '4px 6px', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red-d)'}
            onMouseLeave={e => e.currentTarget.style.color = '#CCC'}>
            <TrashIcon size={13} />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--border-l)', fontWeight: 600, marginBottom: 4 }}>About this technique — specialities, innovations, or what makes your approach unique (optional)</div>
        <input
          value={craft.specialization || ''}
          onChange={e => onUpdate({ specialization: e.target.value })}
          placeholder="e.g. What's distinctive about how your studio does this — a speciality, a signature method, or an innovation"
          style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-l)', borderRadius: 'var(--r-5)', background: '#fff', color: 'var(--text)', fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
      </div>

      <div style={{ paddingTop: 10, borderTop: '1px solid var(--surface2)' }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--border-l)', fontWeight: 600, marginBottom: 6 }}>Thumbnail image (optional)</div>
        <div
          onMouseEnter={() => setImgHover(true)}
          onMouseLeave={() => setImgHover(false)}
          style={{ width: 76, height: 76, borderRadius: 'var(--r-5)', border: `1px ${imgSrc ? 'solid var(--surface4)' : 'dashed var(--warm-gray)'}`, background: imgSrc ? 'transparent' : imgHover ? 'var(--surface)' : 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', flexShrink: 0, cursor: imgSrc ? 'default' : 'pointer', transition: 'border-color .15s, background .15s', ...(imgHover && !imgSrc ? { borderColor: 'var(--sage)' } : {}) }}>
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

  // Hydrate local state from the server exactly ONCE. Re-populating on every
  // initialData change (e.g. after a refresh triggered by Save/Next) would
  // overwrite edits typed since the last load — the "data gets erased" bug.
  const hydrated = useRef(false);
  // Per-card creation registry: a new craft is POSTed only once even when
  // autosave and an image upload race to create the same card.
  const creating = useRef({});

  const populateCrafts = (rows) => {
    const grouped = { spinning: [], weaving: [], dyeing: [], printing: [], surface: [] };
    (rows || []).forEach(c => {
      const type = c.technique_type || 'printing';
      if (grouped[type]) grouped[type].push(c);
      else grouped.printing.push(c);
    });
    setCrafts(grouped);
    hydrated.current = true;
  };

  useEffect(() => { if (initialData && !hydrated.current) populateCrafts(initialData); }, [initialData]);

  useEffect(() => {
    if (!profileId || hydrated.current || initialData) return;
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

  // Patch a single card matched by a STABLE key (_tempId or id), never by array
  // index — async write-backs must not depend on position, which can shift while
  // a request is in flight.
  const patchCardByKey = (type, { tempId, id }, patch) => {
    setCrafts(prev => ({
      ...prev,
      [type]: prev[type].map(c =>
        (tempId != null && c._tempId === tempId) || (id != null && c.id === id)
          ? { ...c, ...patch } : c
      ),
    }));
  };

  // Ensure a craft row exists on the server and return its id. De-duplicated by
  // _tempId so concurrent callers (autosave + image upload) share ONE POST and
  // can't create duplicate rows. Only the new id is written back to state — never
  // the server response over the user's in-progress text.
  const ensureCraftId = (type, card) => {
    if (card.id) return Promise.resolve(card.id);
    const tempId = card._tempId;
    if (!creating.current[tempId]) {
      creating.current[tempId] = (async () => {
        const fd = new FormData();
        fd.append('craft_name', card.craft_name?.trim() || 'Untitled');
        fd.append('technique_type', type);
        if (card.expertise_level) fd.append('expertise_level', card.expertise_level);
        fd.append('specialization', card.specialization || '');
        fd.append('is_primary', true);
        const r = await API.addCraft(profileId, fd);
        const id = r.data?.id;
        patchCardByKey(type, { tempId }, { id });   // write back ONLY the id
        return id;
      })().finally(() => { delete creating.current[tempId]; });
    }
    return creating.current[tempId];
  };

  const uploadImage = async (type, idx, e) => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    const card = crafts[type][idx];
    try {
      // Create the craft once (shared with autosave via ensureCraftId), then
      // attach the image to that single row — no duplicate craft is created.
      const id = await ensureCraftId(type, card);
      const fd = new FormData(); fd.append('image', file);
      const r = await API.patchCraft(profileId, id, fd);
      // Update ONLY the image fields, keyed by id/_tempId — never overwrite the
      // craft_name / specialization the user may still be typing.
      patchCardByKey(type, { tempId: card._tempId, id }, { id, image: r.data?.image, _images: [{ url: r.data?.image }] });
      success('Image uploaded');
    } catch { error('Image upload failed — please try again.'); }
  };

  const removeImage = async (type, idx) => {
    const card = crafts[type][idx];
    if (card.id) { try { await API.patchCraft(profileId, card.id, { image: null }); } catch { error('Could not remove image — please try again.'); return; } }
    patchCardByKey(type, { tempId: card._tempId, id: card.id }, { image: null, _images: [] });
  };

  const persist = async () => {
    // Snapshot up-front; ids are written back by key, so index shifts during the
    // async loop are harmless.
    const snapshot = Object.keys(crafts).map(type => [type, crafts[type]]);
    for (const [type, list] of snapshot) {
      for (let i = 0; i < list.length; i++) {
        const card = list[i];
        if (!card.craft_name?.trim()) continue;
        // Ensure the row exists (de-duplicated), then PATCH its fields. We never
        // push the server response back into state, so text typed during the
        // request survives; the next autosave pass reconciles any later edits.
        const id = card.id || await ensureCraftId(type, card);
        if (!id) continue;
        await API.patchCraft(profileId, id, {
          craft_name: card.craft_name, technique_type: type,
          expertise_level: card.expertise_level, specialization: card.specialization,
          order: i + 1,
        });
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