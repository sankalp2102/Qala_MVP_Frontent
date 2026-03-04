import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const API = onboardingAPI;

function SectionHeader({ icon, letter, title, desc }) {
  return (
    <div className="fade-up" style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Section {letter}</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>{title}</h1>
        </div>
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginLeft: 56 }}>{desc}</p>
    </div>
  );
}

function CardSection({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>{title}</div>
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
      🚩 Admin flagged: {reason}
    </div>
  );
}

export default function SectionA({ profileId, onSave }) {
  const { toasts, success, error } = useToast();

  const [form, setForm] = useState({
    studio_name: '', location_city: '', location_state: '',
    years_in_operation: '', website_url: '', instagram_url: '', poc_working_style: ''
  });
  const [flags, setFlags] = useState({});
  const [contacts, setContacts]     = useState([]);
  const [usps, setUsps]             = useState([{ order: 1, strength: '' }, { order: 2, strength: '' }, { order: 3, strength: '' }]);
  const [heroMedia, setHeroMedia]   = useState(null);
  const [workMedia, setWorkMedia]   = useState([]);
  const [newContact, setNewContact] = useState({ name: '', role: '', email: '', phone: '' });
  const [addingC, setAddingC]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [uploading, setUploading]   = useState('');

  useEffect(() => {
    if (!profileId) return;
    API.getStudio(profileId).then(r => {
      const d = r.data;
      if (!d) return;
      setForm({
        studio_name: d.studio_name || '',
        location_city: d.location_city || '',
        location_state: d.location_state || '',
        years_in_operation: d.years_in_operation || '',
        website_url: d.website_url || '',
        instagram_url: d.instagram_url || '',
        poc_working_style: d.poc_working_style || '',
      });
      setFlags({
        studio_name: d.studio_name_flagged ? d.studio_name_flag_reason : null,
        location: d.location_flagged ? d.location_flag_reason : null,
        years: d.years_flagged ? d.years_flag_reason : null,
        website: d.website_flagged ? d.website_flag_reason : null,
        poc: d.poc_flagged ? d.poc_flag_reason : null,
      });
      if (d.contacts?.length) setContacts(d.contacts);
      if (d.usps?.length) setUsps(d.usps.map(u => ({ order: u.order, strength: u.strength })));
      const media = d.media_files || [];
      setHeroMedia(media.find(m => m.media_type === 'hero') || null);
      setWorkMedia(media.filter(m => m.media_type === 'work_dump'));
    }).catch(() => {});
  }, [profileId]);

  const autosave = async (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    try { await API.patchStudio(profileId, { [field]: val }); } catch {}
  };

  const save = async () => {
    setSaving(true);
    try {
      await API.putStudio(profileId, form);
      const uspData = usps.filter(u => u.strength.trim());
      if (uspData.length) await API.putUSPs(profileId, uspData);
      success('Section A saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.role) { error('Name and role required'); return; }
    try {
      const r = await API.addContact(profileId, { ...newContact, order: contacts.length + 1 });
      setContacts(c => [...c, r.data]);
      setNewContact({ name: '', role: '', email: '', phone: '' });
      setAddingC(false);
      success('Contact added');
    } catch { error('Failed to add contact'); }
  };

  const delContact = async id => {
    try { await API.delContact(profileId, id); setContacts(c => c.filter(x => x.id !== id)); }
    catch { error('Failed'); }
  };

  const uploadMedia = async (e, mediaType) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(mediaType);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('media_type', mediaType);
      fd.append('order', 1);
      const r = await API.uploadStudioMedia(profileId, fd);
      if (mediaType === 'hero') setHeroMedia(r.data);
      else setWorkMedia(m => [...m, r.data]);
      success('Uploaded!');
    } catch { error('Upload failed'); }
    finally { setUploading(''); }
  };

  const delMedia = async (mediaId, mediaType) => {
    try {
      await API.delStudioMedia(profileId, mediaId);
      if (mediaType === 'hero') setHeroMedia(null);
      else setWorkMedia(m => m.filter(x => x.id !== mediaId));
    } catch { error('Failed'); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <SectionHeader icon="🏛️" letter="A" title="Studio Details" desc="Your studio's identity, location, media, and point of contact." />

      {/* A.1 Studio Name */}
      <CardSection title="A.1 — Studio / Brand Name">
        <FlagBanner reason={flags.studio_name} />
        <Field label="What is the name of your studio or brand? *">
          <input value={form.studio_name} onChange={e => autosave('studio_name', e.target.value)} placeholder="e.g. Priya Craft Studio" />
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

      {/* A.3 Years in operation */}
      <CardSection title="A.3 — Years in Operation">
        <FlagBanner reason={flags.years} />
        <Field label="How many years has your studio been operating?" hint="You can enter a decimal, e.g. 2.5 for 2½ years">
          <input type="number" step="0.5" min="0" value={form.years_in_operation}
            onChange={e => autosave('years_in_operation', e.target.value)}
            placeholder="e.g. 8" style={{ maxWidth: 200 }} />
        </Field>
      </CardSection>

      {/* A.4 Website + Instagram */}
      <CardSection title="A.4 — Online Presence">
        <FlagBanner reason={flags.website} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Website URL" hint="Include https://">
            <input type="url" value={form.website_url} onChange={e => autosave('website_url', e.target.value)} placeholder="https://yourstudio.com" />
          </Field>
          <Field label="Instagram URL" hint="Your studio's public profile">
            <input type="url" value={form.instagram_url} onChange={e => autosave('instagram_url', e.target.value)} placeholder="https://instagram.com/yourstudio" />
          </Field>
        </div>
      </CardSection>

      {/* A.6 Contacts */}
      <CardSection title="A.5 — Studio Contacts">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Who should buyers contact at your studio? Add the key people (owner, designer, production manager, etc.)
        </p>
        {contacts.map(c => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: 8, border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{c.name}</div>
              <div style={{ fontSize: 13, color: 'var(--gold)', marginTop: 2 }}>{c.role}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
                {c.email && <span>{c.email}</span>}
                {c.email && c.phone && <span> · </span>}
                {c.phone && <span>{c.phone}</span>}
              </div>
              {c.is_flagged && !c.flag_resolved && (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>🚩 {c.flag_reason}</div>
              )}
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => delContact(c.id)}>Remove</button>
          </div>
        ))}
        {addingC ? (
          <div style={{ padding: 16, border: '1px solid var(--border2)', borderRadius: 'var(--radius)', marginTop: 8, background: 'var(--surface2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="Name *"><input value={newContact.name} onChange={e => setNewContact(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Priya Sharma" /></Field>
              <Field label="Role *"><input value={newContact.role} onChange={e => setNewContact(c => ({ ...c, role: e.target.value }))} placeholder="e.g. Studio Owner" /></Field>
              <Field label="Email"><input type="email" value={newContact.email} onChange={e => setNewContact(c => ({ ...c, email: e.target.value }))} placeholder="priya@studio.com" /></Field>
              <Field label="Phone"><input value={newContact.phone} onChange={e => setNewContact(c => ({ ...c, phone: e.target.value }))} placeholder="+91 98765 43210" /></Field>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-teal btn-sm" onClick={addContact}>Save Contact</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setAddingC(false); setNewContact({ name: '', role: '', email: '', phone: '' }); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => setAddingC(true)}>+ Add Contact</button>
        )}
      </CardSection>

      {/* A.7 USPs */}
      <CardSection title="A.6 — Studio Strengths / USPs">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          What makes your studio stand out? List your top strengths (up to 5). These are shown prominently to buyers.
        </p>
        {usps.map((u, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            <input className="input-raw" style={{ flex: 1 }}
              placeholder={['e.g. 20+ years of hand block printing expertise', 'e.g. GOTS-certified natural dyes only', 'e.g. Exclusively work with heritage weavers from Chanderi'][i] || `Strength #${i + 1}`}
              value={u.strength}
              onChange={e => setUsps(arr => arr.map((x, j) => j === i ? { ...x, strength: e.target.value } : x))} />
          </div>
        ))}
        {usps.length < 5 && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setUsps(a => [...a, { order: a.length + 1, strength: '' }])}>+ Add Strength</button>
        )}
      </CardSection>

      {/* A.8 Hero Image */}
      <CardSection title="A.7 — Hero / Cover Image">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Upload one hero image that best represents your studio — this is your first impression. It appears at the top of your profile.
        </p>
        {heroMedia ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>🖼️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{heroMedia.file_name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{heroMedia.mime_type} · {heroMedia.file_size_kb} KB</div>
            </div>
            <button className="btn btn-danger btn-sm" onClick={() => delMedia(heroMedia.id, 'hero')}>Remove</button>
          </div>
        ) : null}
        <label style={{ display: 'inline-block' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => uploadMedia(e, 'hero')} style={{ display: 'none' }} />
          <span className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {uploading === 'hero' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : heroMedia ? '↺ Replace Hero Image' : '+ Upload Hero Image'}
          </span>
        </label>
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>JPG · PNG · WEBP up to 10 MB. Only 1 hero image allowed.</p>
      </CardSection>

      {/* A.9 Work Dump */}
      <CardSection title="A.8 — Work Portfolio / Image Dump">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
          Upload images or videos showing your products, craftspeople, techniques, and studio space. The more, the better — buyers love to see your work in depth.
        </p>
        {workMedia.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {workMedia.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: 12 }}>
                <span>{m.mime_type?.startsWith('video') ? '🎥' : '🖼️'}</span>
                <span style={{ color: 'var(--text2)' }}>{m.file_name}</span>
                <button onClick={() => delMedia(m.id, 'work_dump')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <label style={{ display: 'inline-block' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" onChange={e => uploadMedia(e, 'work_dump')} style={{ display: 'none' }} />
          <span className="btn btn-outline btn-sm" style={{ cursor: 'pointer' }}>
            {uploading === 'work_dump' ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Uploading…</> : '+ Upload Image / Video'}
          </span>
        </label>
        <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 8 }}>Images: JPG · PNG · WEBP up to 10 MB · Videos: MP4 · MOV up to 100 MB</p>
      </CardSection>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : '✓ Save Section A'}
      </button>
    </div>
  );
}
