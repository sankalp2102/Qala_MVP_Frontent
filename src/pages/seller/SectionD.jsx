import { useState, useEffect, useRef } from 'react';
import { onboardingAPI, extractErrorMessage } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import ImageCropModal from '../../components/ImageCropModal';
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

function TechniqueCard({ craft, onUpdate, onDelete, onImageUpload, onImageRemove, onCropClick }) {
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

      {/* Bug fix (Aug 2026): "timeline only reflecting for 2 crafts" —
          traced to the actual root cause: this field renders on the
          public studio profile (StudioProfile.jsx's craftStats()) but
          had NO input anywhere in this form. A seller had no way to fill
          it in for any craft through the normal onboarding flow — the
          handful that did show a timeline got it through some other
          channel (bulk import, direct edit), not this form. Added here
          so every craft can actually have this filled in going forward.

          Sampling Time (weeks) removed on request — Production Time only
          from here on. The underlying sampling_time_weeks field/column
          is untouched (still readable if ever needed again), this just
          removes the input. */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--border-l)', fontWeight: 600, marginBottom: 4 }}>Production time for 50 units (months)</div>
        <input
          type="number" min="0" step="0.5"
          value={craft.production_timeline_months_50units ?? ''}
          onChange={e => onUpdate({ production_timeline_months_50units: e.target.value === '' ? null : e.target.value })}
          placeholder="e.g. 1"
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
              {/* Feature (Aug 2026): crop tool — works the same for a
                  brand-new photo and one that's been on the profile for
                  months, since both are just "an image at a URL" from
                  here. Sits opposite the existing remove (×) button so
                  neither one needs to move. */}
              <button onClick={onCropClick} aria-label="Adjust crop" title="Adjust crop" style={{ position: 'absolute', bottom: 3, right: 3, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
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
  // Feature (Aug 2026): crop tool state. { type, idx, imageUrl } for the
  // craft currently being cropped, or null when the modal is closed.
  // Populated automatically right after a successful upload (so cropping
  // is the natural next step, not a separate thing someone has to think
  // to go do), and also settable directly from the existing-image ✎
  // button for a photo that's been on the profile since before this
  // feature existed.
  const [cropTarget, setCropTarget] = useState(null);

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
    // Bug fix (Aug 2026): this removed the card from local state
    // unconditionally, even when the backend delete failed silently
    // (bare catch {}) — the card would visually disappear while still
    // existing on the server, and the seller had no idea anything went
    // wrong. Now only removes it locally once the delete actually
    // succeeds, and shows why when it doesn't.
    if (card.id) {
      try { await API.delCraft(profileId, card.id); }
      catch (e) { error(extractErrorMessage(e, 'Could not delete — please try again.')); return; }
    }
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
      // Feature (Aug 2026): upload flow itself is unchanged (the file
      // still uploads immediately, exactly as before) — cropping is a
      // follow-up step on the result, not a gate in front of the
      // upload. Opens the crop modal automatically right after, so
      // adjusting the crop is the natural next thing rather than a
      // separate action someone has to remember exists.
      const uploadedUrl = mediaUrl(r.data?.image);
      setCropTarget({ type, idx, imageUrl: uploadedUrl });
    } catch (err) {
      // Bug fix (Aug 2026) — same silent-catch issue already fixed in
      // SectionF.jsx's coordinator photo upload: this showed the exact
      // same generic message regardless of what actually went wrong,
      // so a HEIC photo (rejected by the backend — now auto-converted
      // to JPEG server-side, see seller_profile/serializers.py) failed
      // with no way to tell why. Uses the shared extractErrorMessage
      // helper — the flat err.response?.data?.image?.[0] this used to
      // read never actually matched what the backend returns (field
      // errors are nested under `details`), on top of a separate
      // backend bug that made every field error unreadable regardless
      // (see core/utils.py) — both fixed together.
      error(extractErrorMessage(err, 'Image upload failed — please try again.'));
    }
  };

  // Feature (Aug 2026): confirm handler for ImageCropModal — re-uses the
  // exact same patchCraft(image) upload path uploadImage() already uses
  // above, just with the cropped Blob instead of the raw File. The
  // backend has no idea (or need to know) whether what arrives is a
  // fresh photo or a re-crop of an existing one — it's just an image
  // upload either way.
  const handleCropConfirm = async (blob) => {
    if (!cropTarget) return;
    const { type, idx } = cropTarget;
    const card = crafts[type][idx];
    try {
      const id = card.id || await ensureCraftId(type, card);
      const fd = new FormData(); fd.append('image', blob, 'cropped.jpg');
      const r = await API.patchCraft(profileId, id, fd);
      patchCardByKey(type, { tempId: card._tempId, id }, { id, image: r.data?.image, _images: [{ url: r.data?.image }] });
      setCropTarget(null);
      success('Photo updated');
    } catch (err) {
      error(extractErrorMessage(err, 'Could not save that crop — please try again.'));
    }
  };

  const removeImage = async (type, idx) => {
    const card = crafts[type][idx];
    if (card.id) { try { await API.patchCraft(profileId, card.id, { image: null }); } catch (e) { error(extractErrorMessage(e, 'Could not remove image — please try again.')); return; } }
    patchCardByKey(type, { tempId: card._tempId, id: card.id }, { image: null, _images: [] });
  };

  const persist = async () => {
    // Bug fix (Aug 2026) — carried over from an earlier diagnosis of "D.2
    // techniques not saving": this loop had no per-card error isolation.
    // `crafts` is keyed { spinning, weaving, dyeing, printing, surface }
    // in that insertion order — if any single card in an earlier bucket
    // failed to save, the exception aborted the WHOLE loop, so every
    // later bucket was never even attempted in that autosave pass. Every
    // subsequent autosave cycle would hit the same early failure again,
    // so a later section could look permanently broken even though
    // nothing was wrong with it specifically. Isolating each card's save
    // means one failure never blocks any other card, and every failure
    // is reported by name instead of one early failure hiding the rest.
    const snapshot = Object.keys(crafts).map(type => [type, crafts[type]]);
    const failures = [];
    for (const [type, list] of snapshot) {
      for (let i = 0; i < list.length; i++) {
        const card = list[i];
        if (!card.craft_name?.trim()) continue;
        try {
          // Ensure the row exists (de-duplicated), then PATCH its fields. We
          // never push the server response back into state, so text typed
          // during the request survives; the next autosave pass reconciles
          // any later edits.
          const id = card.id || await ensureCraftId(type, card);
          if (!id) continue;
          await API.patchCraft(profileId, id, {
            craft_name: card.craft_name, technique_type: type,
            expertise_level: card.expertise_level, specialization: card.specialization,
            sampling_time_weeks: card.sampling_time_weeks,
            production_timeline_months_50units: card.production_timeline_months_50units,
            order: i + 1,
          });
        } catch (e) {
          // Bug fix (Aug 2026): now uses the shared extractErrorMessage
          // helper — the flat e.response?.data?.craft_name?.[0] this used
          // to read never actually matched the real (details-nested)
          // response shape.
          const typeLabel = TYPES.find(t => t.key === type)?.label || type;
          const detail = extractErrorMessage(e, '');
          failures.push(detail ? `${typeLabel}: ${card.craft_name} — ${detail}` : `${typeLabel}: ${card.craft_name}`);
        }
      }
    }
    await API.patchStudio(profileId, { craft_notes: craftNotes });
    if (failures.length) {
      throw new Error(`Couldn't save: ${failures.join('; ')}`);
    }
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
      // Bug fix (Aug 2026): persist() above already throws a plain Error
      // with a specific, readable message when techniques fail — e.message
      // is checked first for that case; extractErrorMessage covers a raw
      // axios error from anything else that might reach here.
      error(e.message || extractErrorMessage(e, 'Save failed'));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      {cropTarget && (
        <ImageCropModal
          imageUrl={cropTarget.imageUrl}
          aspect={3 / 2}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropTarget(null)}
        />
      )}
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
                onCropClick={() => {
                  const url = card._images?.[0]?.url || card.image;
                  if (url) setCropTarget({ type: t.key, idx, imageUrl: mediaUrl(url) });
                }}
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