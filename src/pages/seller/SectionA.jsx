import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const API = onboardingAPI;

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
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function FlagBanner({ reason }) {
  if (!reason) return null;
  return (
    <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,85,85,0.25)', borderLeft: '3px solid var(--red)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>
      Admin flagged: {reason}
    </div>
  );
}

export default function SectionA({ profileId, onSave }) {
  const { toasts, success, error } = useToast();

  const [form, setForm] = useState({
    studio_name: '', studio_slug: '', location_city: '', location_state: '',
    years_in_operation: '', website_url: '', instagram_url: '',
    short_description: '',   // A.6 one-liner (v3)
  });
  const [flags, setFlags]   = useState({});
  const [usps, setUsps]     = useState([{ order: 1, strength: '' }, { order: 2, strength: '' }, { order: 3, strength: '' }]);
  const [heroMedia, setHeroMedia] = useState(null);

  // A.7 Certifications — v3: tag input instead of textarea
  const [certTags, setCertTags] = useState([]);
  const [certInput, setCertInput] = useState('');

  // A.8 Awards
  const [awards, setAwards]     = useState([]);
  const [newAward, setNewAward] = useState({ award_name: '', link: '' });

  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    if (!profileId) return;
    API.getStudio(profileId).then(r => {
      const d = r.data;
      if (!d) return;
      setForm({
        studio_name: d.studio_name || '',
        studio_slug: d.studio_slug || '',
        location_city: d.location_city || '',
        location_state: d.location_state || '',
        years_in_operation: d.years_in_operation || '',
        website_url: d.website_url || '',
        instagram_url: d.instagram_url || '',
        short_description: d.short_description || '',
      });
      setFlags({
        studio_name: d.studio_name_flagged ? d.studio_name_flag_reason : null,
        location: d.location_flagged ? d.location_flag_reason : null,
        years: d.years_flagged ? d.years_flag_reason : null,
        website: d.website_flagged ? d.website_flag_reason : null,
      });
      // certifications stored as comma-separated text — parse into tags
      if (d.certifications) {
        try {
          const parsed = JSON.parse(d.certifications);
          setCertTags(Array.isArray(parsed) ? parsed : d.certifications.split(',').map(s => s.trim()).filter(Boolean));
        } catch {
          setCertTags(d.certifications.split(',').map(s => s.trim()).filter(Boolean));
        }
      }
      API.getAwards(profileId).then(r => setAwards(r.data || [])).catch(() => {});
      const loaded = (d.usps || []).slice(0, 3).map(u => ({ order: u.order, strength: u.strength }));
      while (loaded.length < 3) loaded.push({ order: loaded.length + 1, strength: '' });
      setUsps(loaded);
      const media = d.media_files || [];
      setHeroMedia(media.find(m => m.media_type === 'hero') || null);
    }).catch(() => {});
  }, [profileId]);

  const autosave = async (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    try { await API.patchStudio(profileId, { [field]: val }); } catch {}
  };

  const saveCerts = async tags => {
    setCertTags(tags);
    try { await API.patchStudio(profileId, { certifications: JSON.stringify(tags) }); } catch {}
  };

  const addCertTag = () => {
    const v = certInput.trim();
    if (!v) return;
    const next = [...certTags, v];
    saveCerts(next);
    setCertInput('');
  };

  const removeCertTag = i => {
    const next = certTags.filter((_, j) => j !== i);
    saveCerts(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      await API.putStudio(profileId, { ...form, certifications: JSON.stringify(certTags) });
      const uspData = usps.slice(0, 3).map((u, i) => ({ order: i + 1, strength: u.strength }));
      await API.putUSPs(profileId, uspData);
      success('Section A saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  const uploadHero = async e => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    const file = files[files.length - 1];
    setUploading('hero');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('media_type', 'hero');
      fd.append('order', 1);
      const r = await API.uploadStudioMedia(profileId, fd);
      setHeroMedia(r.data);
      success('Uploaded!');
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

      {/* A.1 Studio Name */}
      <CardSection title="A.1 — Studio / Brand Name">
        <FlagBanner reason={flags.studio_name} />
        <Field label="What is the name of your studio or brand? *">
          <input value={form.studio_name} onChange={e => autosave('studio_name', e.target.value)} placeholder="e.g. Kullvi Whims" />
        </Field>
        <Field label="Studio URL" hint="Your profile URL on Qala — auto-generated from your studio name, you can edit it.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text4)', whiteSpace: 'nowrap' }}>qala.studio/</span>
            <input
              value={form.studio_slug}
              onChange={e => {
                const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
                autosave('studio_slug', slug);
              }}
              placeholder="e.g. kullvi-whims"
              style={{ flex: 1 }}
            />
          </div>
        </Field>
      </CardSection>

      {/* A.2 Location */}
      <CardSection title="A.2 — Location">
        <FlagBanner reason={flags.location} />
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Where is your studio based?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="City *">
            <input value={form.location_city} onChange={e => autosave('location_city', e.target.value)} placeholder="e.g. Jaipur" />
          </Field>
          <Field label="State *">
            <input value={form.location_state} onChange={e => autosave('location_state', e.target.value)} placeholder="e.g. Rajasthan" />
          </Field>
        </div>
      </CardSection>

      {/* A.3 Year of Establishment */}
      <CardSection title="A.3 — Year of Establishment">
        <FlagBanner reason={flags.years} />
        <Field label="In which year was your studio established? *" hint="Enter the 4-digit calendar year, e.g. 2014">
          <input type="number" min="1900" max="2030" step="1"
            value={form.years_in_operation}
            onChange={e => autosave('years_in_operation', e.target.value)}
            placeholder="e.g. 2014" style={{ maxWidth: 160 }} />
        </Field>
      </CardSection>

      {/* A.4 Online Presence */}
      <CardSection title="A.4 — Online Presence">
        <FlagBanner reason={flags.website} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Website URL" hint="Include https://">
            <input type="url" value={form.website_url} onChange={e => autosave('website_url', e.target.value)} placeholder="https://yourstudio.com" />
          </Field>
          <Field label="Instagram URL" hint="Make sure this is the studio account, not a personal page.">
            <input type="url" value={form.instagram_url} onChange={e => autosave('instagram_url', e.target.value)} placeholder="https://instagram.com/yourstudio" />
          </Field>
        </div>
      </CardSection>

      {/* A.5 Studio Strengths — exactly 3 */}
      <CardSection title="A.5 — Studio Strengths">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          What makes your studio stand out? List your top 3 strengths. Exactly 3 are required.
        </p>
        {usps.slice(0, 3).map((u, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <input className="input-raw" style={{ flex: 1 }}
              placeholder={[
                'e.g. Fastest sampling turnaround in block printing — 10 days flat',
                'e.g. Own natural dye garden, 40+ plant sources',
                'e.g. GI-certified artisan cluster',
              ][i]}
              value={u.strength}
              onChange={e => setUsps(arr => arr.map((x, j) => j === i ? { ...x, strength: e.target.value } : x))} />
          </div>
        ))}
      </CardSection>

      {/* A.6 One-liner */}
      <CardSection title="A.6 — One-liner">
        <Field label="Describe your studio in one sentence" hint="Be specific. Avoid premium, unique, passionate.">
          <textarea rows={2} value={form.short_description} onChange={e => autosave('short_description', e.target.value)}
            placeholder="Specialists in hand block printing on natural fabrics, based in Kutch for 12 years."
            style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.7, resize: 'vertical' }}
          />
        </Field>
      </CardSection>

      {/* A.7 Certifications — tag input */}
      <CardSection title="A.7 — Certifications">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14 }}>Press Enter to add. e.g. GOTS, Fair Trade, OEKO-TEX, SA8000, Craftmark, GI tag</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {certTags.map((tag, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 12px', border: '1px solid var(--border2)', borderRadius: 20, fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)' }}>
              {tag}
              <button onClick={() => removeCertTag(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text4)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
        <input
          value={certInput}
          onChange={e => setCertInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCertTag(); } }}
          placeholder="Type a certification and press Enter"
          style={{ maxWidth: 360 }}
        />
      </CardSection>

      {/* A.8 Awards & Press */}
      <CardSection title="A.8 — Awards &amp; Press Mentions">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Have you been featured in any press, won any awards, or been part of any recognised programmes?</p>
        {awards.map(aw => (
          <div key={aw.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 8, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{aw.award_name}</div>
              {aw.link && <a href={aw.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--gold)' }}>View →</a>}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => API.delAward(profileId, aw.id).then(() => setAwards(x => x.filter(y => y.id !== aw.id)))}>Remove</button>
          </div>
        ))}
        <div style={{ padding: 16, border: '1px solid var(--border2)', borderRadius: 'var(--radius)', marginTop: 8, background: 'var(--surface2)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, marginBottom: 10 }}>
            <div className="field"><label>Award / Press Mention</label>
              <input value={newAward.award_name} onChange={e => setNewAward(a => ({ ...a, award_name: e.target.value }))} placeholder="e.g. Featured in Vogue India — March 2023" />
            </div>
            <div className="field"><label>URL (optional)</label>
              <input type="url" value={newAward.link} onChange={e => setNewAward(a => ({ ...a, link: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={async () => {
            if (!newAward.award_name) return;
            try { const r = await API.addAward(profileId, { ...newAward, order: awards.length + 1 }); setAwards(x => [...x, r.data]); setNewAward({ award_name: '', link: '' }); } catch {}
          }}>Save Award / Mention</button>
        </div>
      </CardSection>

      {/* A.9 Hero Image */}
      <CardSection title="A.9 — Hero / Cover Image">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Upload one hero image that best represents your studio — this is your first impression.
        </p>
        {heroMedia && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{heroMedia.file_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{heroMedia.mime_type} · {heroMedia.file_size_kb} KB</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={delHero}>Remove</button>
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

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save & Next'}
      </button>
    </div>
  );
}