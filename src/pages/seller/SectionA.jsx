import { useState, useEffect, useRef, useCallback } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const API = onboardingAPI;

/* ── shared input/textarea styles — exported for other sections ── */
export const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #D8D4CF', borderRadius: 5,
  background: '#fff', color: '#1A1A1A',
  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
  outline: 'none', transition: 'border-color .15s',
  appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'textfield',
};
export const textareaStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid #D8D4CF', borderRadius: 5,
  background: '#fff', color: '#1A1A1A',
  fontSize: 13, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7,
  outline: 'none', transition: 'border-color .15s', resize: 'vertical',
};

/*
 * TrashIcon — inline SVG, no external icon library needed.
 * Exported so SectionD, SectionF, SectionG can import it too.
 * Uses a clean 24×24 trash bin path — not oval, renders correctly at any size.
 */
export function TrashIcon({ size = 16, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

/* Shared button wrapper — square, no border by default, just the icon */
export function TrashBtn({ onClick, label = 'Remove', size = 16 }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text4)', padding: 4, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        lineHeight: 1,
      }}>
      <TrashIcon size={size} />
    </button>
  );
}

function SectionHeader({ letter, title, desc }) {
  return (
    <div className="fade-up" style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Section {letter}</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 500, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1.1 }}>{title}</h1>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginTop: 8 }}>{desc}</p>
    </div>
  );
}

function CardSection({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 500, fontStyle: 'italic', color: 'var(--text)', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text4)', marginTop: 4, display: 'block' }}>{hint}</span>}
    </div>
  );
}

function FlagBanner({ reason }) {
  if (!reason) return null;
  return (
    <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,85,85,0.25)', borderLeft: '3px solid var(--red)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>
      Admin flagged: {reason}
    </div>
  );
}

function SavedPulse({ show }) {
  if (!show) return null;
  return <span style={{ fontSize: 11, color: 'var(--text4)' }}>Saved</span>;
}

export default function SectionA({ profileId, initialData, onSave, onNext }) {
  const { toasts, success, error } = useToast();
  const [savedPulse, setSavedPulse] = useState(false);

  const [form, setForm] = useState({
    studio_name: '', studio_slug: '', location_city: '', location_state: '',
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
  const debounceRef               = useRef({});

  /* Populate from snapshot initialData immediately — no API call needed */
  const populateFromData = (d) => {
    if (!d) return;
    setForm({
      studio_name: d.studio_name || '', studio_slug: d.studio_slug || '',
      location_city: d.location_city || '', location_state: d.location_state || '',
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

  /* If snapshot data arrives (or changes), use it immediately */
  useEffect(() => {
    if (initialData) {
      populateFromData(initialData);
    }
  }, [initialData]);

  /* Only fall back to direct API call if no snapshot data available */
  useEffect(() => {
    if (!profileId || initialData) return;
    API.getStudio(profileId).then(r => populateFromData(r.data)).catch(() => {});
  }, [profileId]);

  /* Awards are not in snapshot — always fetch separately, but only once */
  useEffect(() => {
    if (!profileId) return;
    API.getAwards(profileId).then(r => setAwards(r.data || [])).catch(() => {});
  }, [profileId]);

  const debouncedPatch = useCallback((field, val) => {
    clearTimeout(debounceRef.current[field]);
    debounceRef.current[field] = setTimeout(async () => {
      try {
        await API.patchStudio(profileId, { [field]: val });
        setSavedPulse(true);
        setTimeout(() => setSavedPulse(false), 1500);
      } catch {}
    }, 600);
  }, [profileId]);

  const handleField = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    debouncedPatch(field, val);
  };

  const saveCerts = async tags => {
    setCertTags(tags);
    try { await API.patchStudio(profileId, { certifications: JSON.stringify(tags) }); } catch {}
  };
  const addCertTag = () => {
    const v = certInput.trim(); if (!v) return;
    saveCerts([...certTags, v]); setCertInput('');
  };
  const removeCertTag = i => saveCerts(certTags.filter((_, j) => j !== i));

  const save = async (andNext = false) => {
    setSaving(true);
    try {
      await API.putStudio(profileId, { ...form, certifications: JSON.stringify(certTags) });
      await API.putUSPs(profileId, usps.slice(0,3).map((u,i) => ({ order: i+1, strength: u.strength })));
      success('Section A saved!');
      onSave?.();
      if (andNext) onNext?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  const uploadHero = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = '';
    setUploading('hero');
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('media_type', 'hero'); fd.append('order', 1);
      const r = await API.uploadStudioMedia(profileId, fd);
      setHeroMedia(r.data); success('Uploaded!');
    } catch { error('Upload failed'); }
    finally { setUploading(''); }
  };

  const delHero = async () => {
    try { await API.delStudioMedia(profileId, heroMedia.id); setHeroMedia(null); }
    catch { error('Failed'); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader letter="A" title="Introduction" desc="Your studio core information, contacts, strengths, and recognition." />

      <CardSection title="A.1 — Studio / Brand Name">
        <FlagBanner reason={flags.studio_name} />
        <Field label="Studio or brand name *">
          <input style={inputStyle} value={form.studio_name} onChange={e => handleField('studio_name', e.target.value)} placeholder="e.g. Kullvi Whims" />
        </Field>
        <Field label="Studio URL" hint="Auto-generated from your studio name — you can edit it.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text4)', whiteSpace: 'nowrap' }}>qala.studio/</span>
            <input style={{ ...inputStyle, flex: 1 }}
              value={form.studio_slug}
              onChange={e => {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                handleField('studio_slug', slug);
              }}
              placeholder="e.g. kullvi-whims" />
          </div>
        </Field>
      </CardSection>

      <CardSection title="A.2 — Location">
        <FlagBanner reason={flags.location} />
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Where is your studio based?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="City *"><input style={inputStyle} value={form.location_city} onChange={e => handleField('location_city', e.target.value)} placeholder="e.g. Jaipur" /></Field>
          <Field label="State *"><input style={inputStyle} value={form.location_state} onChange={e => handleField('location_state', e.target.value)} placeholder="e.g. Rajasthan" /></Field>
        </div>
      </CardSection>

      <CardSection title="A.3 — Year of Establishment">
        <FlagBanner reason={flags.years} />
        <Field label="Year established *" hint="4-digit year, e.g. 2014">
          <input
            style={{ ...inputStyle, maxWidth: 160 }}
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4}
            value={form.years_in_operation}
            onChange={e => handleField('years_in_operation', e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="e.g. 2014" />
        </Field>
      </CardSection>

      <CardSection title="A.4 — Online Presence">
        <FlagBanner reason={flags.website} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Website URL" hint="Include https://">
            <input style={inputStyle} type="url" value={form.website_url} onChange={e => handleField('website_url', e.target.value)} placeholder="https://yourstudio.com" />
          </Field>
          <Field label="Instagram URL" hint="Studio account, not personal.">
            <input style={inputStyle} type="url" value={form.instagram_url} onChange={e => handleField('instagram_url', e.target.value)} placeholder="https://instagram.com/yourstudio" />
          </Field>
        </div>
      </CardSection>

      <CardSection title="A.5 — Studio Strengths">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>What makes your studio stand out? Exactly 3 required.</p>
        {usps.slice(0, 3).map((u, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#CCC', minWidth: 16, flexShrink: 0 }}>{i + 1}</div>
            <input style={{ ...inputStyle, flex: 1 }}
              placeholder={['e.g. Fastest sampling turnaround in block printing — 10 days flat', 'e.g. Own natural dye garden, 40+ plant sources', 'e.g. GI-certified artisan cluster'][i]}
              value={u.strength}
              onChange={e => setUsps(arr => arr.map((x, j) => j === i ? { ...x, strength: e.target.value } : x))} />
          </div>
        ))}
      </CardSection>

      <CardSection title="A.6 — One-liner">
        <Field label="Describe your studio in one sentence" hint="Be specific. Avoid premium, unique, passionate.">
          <textarea style={textareaStyle} rows={2}
            value={form.short_description}
            onChange={e => handleField('short_description', e.target.value)}
            placeholder="Specialists in hand block printing on natural fabrics, based in Kutch for 12 years." />
        </Field>
      </CardSection>

      <CardSection title="A.7 — Certifications">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Press Enter to add. e.g. GOTS, Fair Trade, OEKO-TEX, SA8000, Craftmark, GI tag</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {certTags.map((tag, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid #E4E0DB', borderRadius: 20, fontSize: 12, color: '#555', background: '#FAFAF8' }}>
              {tag}
              <button onClick={() => removeCertTag(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
        <input style={{ ...inputStyle, maxWidth: 360 }}
          value={certInput}
          onChange={e => setCertInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCertTag(); } }}
          placeholder="Type a certification and press Enter" />
      </CardSection>

      <CardSection title="A.8 — Awards & Press Mentions">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Recognised programmes, press features, industry awards.</p>
        {awards.map(aw => (
          <div key={aw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{aw.award_name}</div>
              {aw.link && <a href={aw.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)' }}>View →</a>}
            </div>
            <TrashBtn label="Remove award" onClick={() => API.delAward(profileId, aw.id).then(() => setAwards(x => x.filter(y => y.id !== aw.id)))} />
          </div>
        ))}
        <div style={{ padding: 16, border: '1px solid var(--border2)', borderRadius: 8, marginTop: 8, background: 'var(--surface2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
            <Field label="Award / Press Mention">
              <input style={inputStyle} value={newAward.award_name} onChange={e => setNewAward(a => ({ ...a, award_name: e.target.value }))} placeholder="e.g. Featured in Vogue India — March 2023" />
            </Field>
            <Field label="URL (optional)">
              <input style={inputStyle} type="url" value={newAward.link} onChange={e => setNewAward(a => ({ ...a, link: e.target.value }))} placeholder="https://..." />
            </Field>
          </div>
          <button className="btn btn-outline btn-sm" onClick={async () => {
            if (!newAward.award_name) return;
            try { const r = await API.addAward(profileId, { ...newAward, order: awards.length + 1 }); setAwards(x => [...x, r.data]); setNewAward({ award_name: '', link: '' }); } catch {}
          }}>Save Award / Mention</button>
        </div>
      </CardSection>

      <CardSection title="A.9 — Hero / Cover Image">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Upload one hero image that best represents your studio.</p>
        {heroMedia && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{heroMedia.file_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{heroMedia.mime_type} · {heroMedia.file_size_kb} KB</div>
            </div>
            <TrashBtn label="Remove hero image" onClick={delHero} />
          </div>
        )}
        <label style={{ display: 'inline-block' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadHero} style={{ display: 'none' }} />
          <span className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {uploading === 'hero' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : heroMedia ? '↺ Replace Hero Image' : '+ Upload Hero Image'}
          </span>
        </label>
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>JPG · PNG · WEBP up to 10 MB.</p>
      </CardSection>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button className="btn btn-primary btn-lg fade-up" onClick={() => save(true)} disabled={saving}>
          {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
        </button>
        <button className="btn btn-ghost fade-up" onClick={() => save(false)} disabled={saving}>Save</button>
        <SavedPulse show={savedPulse} />
      </div>
    </div>
  );
}