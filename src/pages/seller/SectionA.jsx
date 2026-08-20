import { useState, useEffect, useRef } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import {
  SectionHeader, QCard, Field, FlagBanner, SectionFooter,
  CertTag, MediaDropzone, TrashBtn, inputStyle, textareaStyle, useAutosave,
} from './_ui';

const API = onboardingAPI;

export default function SectionA({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();

  const [form, setForm] = useState({
    studio_name: '', studio_slug: '',
    address_line1: '', locality: '', location_city: '', location_state: '',
    pincode: '', google_maps_url: '',
    years_in_operation: '', website_url: '', instagram_url: '', short_description: '',
  });
  const [flags, setFlags]         = useState({});
  const [usps, setUsps]           = useState([{ order:1, strength:'' }, { order:2, strength:'' }, { order:3, strength:'' }]);
  const [heroMedia, setHeroMedia] = useState(null);
  const [certTags, setCertTags]   = useState([]);
  const [certInput, setCertInput] = useState('');
  const [awards, setAwards]       = useState([]);
  const [newAward, setNewAward]   = useState({ award_name: '', link: '' });
  const [saving, setSaving]       = useState(false);
  const [uploading, setUploading] = useState('');

  const populateFromData = (d) => {
    if (!d) return;
    setForm({
      studio_name: d.studio_name || '', studio_slug: d.studio_slug || '',
      address_line1: d.address_line1 || '', locality: d.locality || '',
      location_city: d.location_city || '', location_state: d.location_state || '',
      pincode: d.pincode || '', google_maps_url: d.google_maps_url || '',
      years_in_operation: d.years_in_operation || '',
      website_url: d.website_url || '', instagram_url: d.instagram_url || '',
      short_description: d.short_description || '',
    });
    setFlags({
      studio_name: d.studio_name_flagged ? d.studio_name_flag_reason : null,
      location: d.location_flagged ? d.location_flag_reason : null,
      years: d.years_flagged ? d.years_flag_reason : null,
      website: d.website_flagged ? d.website_flag_reason : null,
    });
    if (d.certifications) {
      try {
        const p = JSON.parse(d.certifications);
        setCertTags(Array.isArray(p) ? p : d.certifications.split(',').map(s => s.trim()).filter(Boolean));
      } catch { setCertTags(d.certifications.split(',').map(s => s.trim()).filter(Boolean)); }
    }
    const loaded = (d.usps || []).slice(0, 3).map(u => ({ order: u.order, strength: u.strength }));
    while (loaded.length < 3) loaded.push({ order: loaded.length + 1, strength: '' });
    setUsps(loaded);
    setHeroMedia((d.media_files || []).find(m => m.media_type === 'hero') || null);
  };

  // Hydrate from the server exactly ONCE. Now that this section autosaves, a
  // re-populate mid-edit would both overwrite what's typed and persist the
  // stale values on the next debounce tick.
  const hydrated = useRef(false);

  useEffect(() => {
    if (initialData && !hydrated.current) { populateFromData(initialData); hydrated.current = true; }
  }, [initialData]);

  useEffect(() => {
    if (!profileId || hydrated.current || initialData) return;
    API.getStudio(profileId).then(r => { populateFromData(r.data); hydrated.current = true; }).catch(() => {});
  }, [profileId]);

  useEffect(() => {
    if (!profileId) return;
    API.getAwards(profileId).then(r => setAwards(r.data || [])).catch(() => {});
  }, [profileId]);

  // Section A used to fire a per-field PATCH on a 600ms debounce AND a full PUT
  // via useAutosave on 900ms, so every keystroke produced two competing writes
  // and an in-flight PATCH could land after the PUT and revert a neighbouring
  // field. Those per-field timers were also never cleared on unmount. The
  // autosave below already sends the whole form, so the field handler now just
  // updates state.
  const handleField = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const saveCerts = async tags => {
    setCertTags(tags);
    try { await API.patchStudio(profileId, { certifications: JSON.stringify(tags) }); } catch {}
  };
  const addCertTag = () => {
    const v = certInput.trim(); if (!v) return;
    saveCerts([...certTags, v]); setCertInput('');
  };
  const removeCertTag = i => saveCerts(certTags.filter((_, j) => j !== i));

  const addAward = async () => {
    if (!newAward.award_name.trim()) return;
    try {
      const r = await API.addAward(profileId, { ...newAward, order: awards.length + 1 });
      setAwards(x => [...x, r.data]);
      setNewAward({ award_name: '', link: '' });
    } catch {}
  };

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await persist();
      success('Section A saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  // Shared by the explicit Save button and the debounced autosave below.
  const persist = async () => {
    await API.putStudio(profileId, { ...form, certifications: JSON.stringify(certTags) });
    // Only send USPs that actually have text. The three rows start empty, and
    // StudioUSP.strength is non-blank on the backend — sending untouched rows
    // made every autosave fail with "This field may not be blank."
    await API.putUSPs(profileId, usps.slice(0, 3)
      .filter(u => (u.strength || '').trim())
      .map((u, i) => ({ order: i + 1, strength: u.strength.trim() })));
  };

  // Section A previously had NO autosave at all, while its footer still showed
  // "Changes saved automatically" — anything typed here was lost unless the
  // seller clicked Save & Next. Autosave silently (no toast); the explicit
  // save above keeps its confirmation.
  const autoSaving = useAutosave(persist, [form, certTags, usps]);

  const uploadHero = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    setUploading('hero');
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('media_type', 'hero'); fd.append('order', 1);
      const r = await API.uploadStudioMedia(profileId, fd);
      setHeroMedia(r.data); success('Uploaded!');
    } catch (err) {
      // Bug fix (Aug 2026) — "some studios reported photo upload not
      // working": same silent-catch pattern already fixed for craft and
      // coordinator photos. Surface the backend's real reason instead of
      // a one-size-fits-all message.
      const msg = err.response?.data?.file?.[0] || err.response?.data?.detail
        || 'Upload failed — please try again.';
      error(msg);
    }
    finally { setUploading(''); }
  };

  const delHero = async () => {
    try { await API.delStudioMedia(profileId, heroMedia.id); setHeroMedia(null); }
    catch { error('Failed'); }
  };

  return (
    <div style={{ padding: '40px 48px 80px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="A" title="Introduction" desc="Your studio's core information, strengths, and recognition." />

      {/* A.1 — Studio Name (+ slug, retained) */}
      <QCard qref="A.1" title="Studio Name">
        <FlagBanner reason={flags.studio_name} />
        <input style={inputStyle} value={form.studio_name} onChange={e => handleField('studio_name', e.target.value)} placeholder="e.g. Kullvi Whims" />
        <div style={{ marginTop: 12 }}>
          <Field label="Studio URL" hint="Auto-generated from your studio name — you can edit it." style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#AAA', whiteSpace: 'nowrap' }}>qala.studio/</span>
              <input style={{ ...inputStyle, flex: 1 }}
                value={form.studio_slug}
                onChange={e => handleField('studio_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))}
                placeholder="e.g. kullvi-whims" />
            </div>
          </Field>
        </div>
      </QCard>

      {/* A.2 — Location (expanded) */}
      <QCard qref="A.2" title="Location">
        <FlagBanner reason={flags.location} />
        <Field label="Street Address">
          <input style={inputStyle} value={form.address_line1} onChange={e => handleField('address_line1', e.target.value)} placeholder="e.g. 12, Artisan Colony, Near Bus Stand" />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Area / Locality"><input style={inputStyle} value={form.locality} onChange={e => handleField('locality', e.target.value)} placeholder="e.g. Sanganer" /></Field>
          <Field label="City *"><input style={inputStyle} value={form.location_city} onChange={e => handleField('location_city', e.target.value)} placeholder="e.g. Jaipur" /></Field>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="State *"><input style={inputStyle} value={form.location_state} onChange={e => handleField('location_state', e.target.value)} placeholder="e.g. Rajasthan" /></Field>
          <Field label="Pincode"><input style={{ ...inputStyle, maxWidth: 140 }} value={form.pincode} onChange={e => handleField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="e.g. 302029" /></Field>
        </div>
        <Field label="Google Maps Link" hint="Share your location pin — makes it easy for buyers to find you." style={{ marginBottom: 0 }}>
          <input style={inputStyle} type="url" value={form.google_maps_url} onChange={e => handleField('google_maps_url', e.target.value)} placeholder="Paste your Google Maps URL here" />
        </Field>
      </QCard>

      {/* A.3 — Year of Establishment */}
      <QCard qref="A.3" title="Year of Establishment" desc="The year your studio was founded or formally started operations.">
        <FlagBanner reason={flags.years} />
        <input
          style={{ ...inputStyle, maxWidth: 160 }}
          type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
          value={form.years_in_operation}
          onChange={e => handleField('years_in_operation', e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="e.g. 2014" />
      </QCard>

      {/* A.4 — Online Presence */}
      <QCard qref="A.4" title="Online Presence">
        <FlagBanner reason={flags.website} />
        <Field label="Website URL">
          <input style={inputStyle} type="url" value={form.website_url} onChange={e => handleField('website_url', e.target.value)} placeholder="https://" />
        </Field>
        <Field label="Instagram URL" hint="Make sure this is the studio account, not a personal or retail brand page." style={{ marginBottom: 0 }}>
          <input style={inputStyle} type="url" value={form.instagram_url} onChange={e => handleField('instagram_url', e.target.value)} placeholder="Your studio's public profile" />
        </Field>
      </QCard>

      {/* A.5 — Studio Strengths (now above the one-liner, per prototype order) */}
      <QCard qref="A.5" title="Studio Strengths" desc="Up to 3 things that make your studio stand out — shown prominently to buyers.">
        {usps.slice(0, 3).map((u, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#CCC', fontWeight: 600, minWidth: 16 }}>{i + 1}</span>
            <input style={{ ...inputStyle, flex: 1 }}
              placeholder={[
                'e.g. Fastest sampling turnaround in block printing — 10 days flat',
                'e.g. Own natural dye garden on premises, 40+ plant sources',
                'e.g. GI-certified artisan cluster — all workers local to region',
              ][i]}
              value={u.strength}
              onChange={e => setUsps(arr => arr.map((x, j) => j === i ? { ...x, strength: e.target.value } : x))} />
          </div>
        ))}
      </QCard>

      {/* A.6 — One-liner */}
      <QCard qref="A.6" title="One-liner" desc="One sentence that captures what your studio does and who it's for — shown at the top of your profile.">
        <textarea style={textareaStyle} rows={2}
          value={form.short_description}
          onChange={e => handleField('short_description', e.target.value)}
          placeholder="e.g. Specialists in hand block printing on natural fabrics, based in Kutch for 12 years." />
      </QCard>

      {/* A.7 — Certifications */}
      <QCard qref="A.7" title="Certifications" desc="Any certifications your studio holds — quality, sustainability, heritage.">
        {certTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {certTags.map((tag, i) => <CertTag key={i} label={tag} onRemove={() => removeCertTag(i)} />)}
          </div>
        )}
        <input style={inputStyle}
          value={certInput}
          onChange={e => setCertInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCertTag(); } }}
          placeholder="e.g. GOTS, Fair Trade, OEKO-TEX, SA8000, Craftmark, GI tag…" />
        <div className="field-hint" style={{ marginTop: 4 }}>Press Enter to add. Leave blank if none.</div>
      </QCard>

      {/* A.8 — Awards & Press Mentions */}
      <QCard qref="A.8" title="Awards & Press Mentions" desc="Press features, awards, government recognition, editorial features of your work or your brand.">
        {awards.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {awards.map(aw => (
              <CertTag key={aw.id} label={aw.award_name} href={aw.link || undefined}
                onRemove={() => API.delAward(profileId, aw.id).then(() => setAwards(x => x.filter(y => y.id !== aw.id)))} />
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <input style={{ ...inputStyle, flex: 2 }} value={newAward.award_name}
            onChange={e => setNewAward(a => ({ ...a, award_name: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAward(); } }}
            placeholder="Award or press mention" />
          <input style={{ ...inputStyle, flex: 1.2 }} type="url" value={newAward.link}
            onChange={e => setNewAward(a => ({ ...a, link: e.target.value }))}
            placeholder="URL (optional)" />
          <button className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={addAward}>Add</button>
        </div>
      </QCard>

      {/* A.9 — Hero / Cover Image */}
      <QCard qref="A.9" title="Hero / Cover Image">
        {heroMedia && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--r)', border: '1px solid var(--surface4)', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{heroMedia.file_name}</div>
              <div style={{ fontSize: 11, color: '#999' }}>{heroMedia.mime_type} · {heroMedia.file_size_kb} KB</div>
            </div>
            <TrashBtn label="Remove hero image" onClick={delHero} />
          </div>
        )}
        <label style={{ display: 'block', cursor: uploading === 'hero' ? 'default' : 'pointer' }}>
          {/* Bug fix (Aug 2026): "some studios reported photo upload not
              working" — a narrow explicit accept list like this can filter
              HEIC files out of the browser's own file picker dialog
              entirely on desktop, before the file ever reaches any code
              here — no error to catch, because the file was never
              selectable. Broadened to image/* (matches SectionD/F, both
              already fixed the same way) so HEIC is at least selectable;
              the backend converts it to JPEG automatically once it is. */}
          <input type="file" accept="image/*" onChange={uploadHero} style={{ display: 'none' }} disabled={uploading === 'hero'} />
          <MediaDropzone icon="🖼" uploading={uploading === 'hero'}
            label={heroMedia ? 'Replace hero image' : 'Upload hero image'}
            hint="JPG · PNG · WEBP up to 10 MB. One image only." />
        </label>
      </QCard>

      <SectionFooter onNext={() => save(true)} saving={saving} autoSaving={autoSaving} />
    </div>
  );
}