// src/pages/seller/SellerProfile.jsx
//
// Rebuilt against seller-console__2_.html's My Profile view — studio
// header, profile-strength meter, Overview/Portfolio/Crafts tabs. Reads
// and writes the SAME backend data as the existing Section A-H onboarding
// wizard (studio_details, crafts, studio_collections via the snapshot
// already loaded by SellerDashboard) — this is a different UI shape over
// real, existing data, not a new data source.
//
// This is deliberately NOT a replacement for the Section A-H wizard —
// that flow still exists for step-by-step onboarding. This page is the
// prototype's "browse and quick-edit your profile" view. Whether both
// should coexist long-term or one should redirect to the other is still
// the open call flagged back in the original parity plan (Phase 5) —
// nothing here forces that decision, both routes just work independently.
//
// "Certifications" tab IS included — StudioDetails.certifications is a
// real TextField (JSON-array-as-text, backward-compat pattern per the
// model's own comment), parsed on load and re-stringified on save.
// (An earlier pass wrongly assumed no certifications data existed —
// corrected once the field was actually found in models.py.)
//
// Profile Strength % is computed live from which real fields are
// actually filled in — not a hardcoded 78% like the prototype's demo data.

import { useState } from 'react';
import { onboardingAPI } from '../../api/client';

const S = {
  topbar: { height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between' },
  content: { padding: 28 },
  header: { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 },
  logoLg: { width: 56, height: 56, borderRadius: 10, background: 'var(--gold-dim)', border: '1px solid var(--gold-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--gold)', flexShrink: 0 },
  metaChip: { fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border2)', color: 'var(--text3)', marginRight: 6, marginTop: 6, display: 'inline-block' },
  metaChipGold: { background: 'var(--gold-dim)', borderColor: 'var(--gold-l)', color: 'var(--gold)' },
  progressBar: { width: 120, height: 6, borderRadius: 4, background: 'var(--surface2)', overflow: 'hidden' },
  progressFill: (pct) => ({ height: '100%', width: `${pct}%`, background: 'var(--gold)' }),

  tabs: { display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 },
  tab: (active) => ({ padding: '10px 4px', marginRight: 20, fontSize: 13, fontWeight: active ? 600 : 500, color: active ? 'var(--text)' : 'var(--text3)', borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent', cursor: 'pointer' }),

  formCard: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  formCardHeader: { padding: '14px 20px', borderBottom: '1px solid var(--border)' },
  formCardBody: { padding: 20 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  fg: { marginBottom: 0 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 },
  input: { width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 13, color: 'var(--text)', padding: '8px 11px', outline: 'none', boxSizing: 'border-box' },

  card: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { padding: '14px 20px', borderBottom: '1px solid var(--border)' },
  activityItem: { display: 'flex', gap: 10, padding: '8px 0' },

  infoBox: { display: 'flex', gap: 9, background: 'var(--admin-dim, var(--gold-dim))', border: '1px solid var(--gold-l)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--gold-d)', lineHeight: 1.6 },

  portGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 },
  portCard: { border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  portImg: { height: 140, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text4)', fontSize: 28 },

  chip: (active) => ({ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: `1px solid ${active ? 'var(--gold-l)' : 'var(--border2)'}`, background: active ? 'var(--gold-dim)' : 'transparent', color: active ? 'var(--gold)' : 'var(--text2)', marginRight: 6, marginBottom: 6, display: 'inline-block' }),
};

export default function SellerProfile({ snapshot, profileId, onSave }) {
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const sd = snapshot?.studio_details || {};
  const [form, setForm] = useState(sd);
  const crafts = snapshot?.crafts || [];
  const collections = snapshot?.studio_collections || [];
  const [certifications, setCertifications] = useState(() => {
    try { return JSON.parse(sd.certifications || '[]'); } catch { return []; }
  });
  const [newCert, setNewCert] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await onboardingAPI.patchStudio(profileId, {
        studio_name: form.studio_name, founded_year: form.founded_year,
        location_city: form.location_city, location_state: form.location_state,
        studio_notes: form.studio_notes, monthly_production_capacity: form.monthly_production_capacity,
        contact_person_name: form.contact_person_name, contact_designation: form.contact_designation,
        contact_whatsapp: form.contact_whatsapp,
        certifications: JSON.stringify(certifications),
      });
      onSave?.();
    } finally { setSaving(false); }
  };

  // Real completeness score — not a hardcoded demo number.
  const checklistFields = [
    ['Studio identity & story', !!(form.studio_name && form.studio_notes)],
    [`Portfolio — ${collections.length} project${collections.length !== 1 ? 's' : ''} uploaded`, collections.length > 0],
    ['Craft capabilities listed', crafts.length > 0],
    ['Production capacity added', !!form.monthly_production_capacity],
    ['Contact details added', !!(form.contact_person_name && form.contact_whatsapp)],
  ];
  const strength = Math.round((checklistFields.filter(([, done]) => done).length / checklistFields.length) * 100);

  const embellishment = crafts.filter(c => c.technique_type === 'surface');
  const printing = crafts.filter(c => c.technique_type === 'printing');
  const initials = (form.studio_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div>
      <div style={S.topbar}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>My Profile</div>
        <button className="btn btn-primary btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
      <div style={S.content}>
        <div style={S.header}>
          <div style={S.logoLg}>{initials}</div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{form.studio_name || 'Your studio'}</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>
              {[form.location_city, form.location_state].filter(Boolean).join(', ')}
              {form.founded_year ? ` · Founded ${form.founded_year}` : ''}
              {sd.artisan_count ? ` · ${sd.artisan_count} artisans` : ''}
            </p>
            <div style={{ marginTop: 6 }}>
              {crafts.slice(0, 3).map(c => <span key={c.id} style={{ ...S.metaChip, ...S.metaChipGold }}>{c.craft_name}</span>)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', marginBottom: 6 }}>Profile Strength</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={S.progressBar}><div style={S.progressFill(strength)} /></div>
              <span style={{ fontWeight: 500, color: 'var(--gold)' }}>{strength}%</span>
            </div>
          </div>
        </div>

        <div style={S.tabs}>
          {['overview', 'portfolio', 'crafts', 'certifications'].map(t => (
            <div key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>{t === 'overview' ? 'Overview' : t === 'portfolio' ? 'Portfolio' : t === 'crafts' ? 'Crafts & Capabilities' : 'Certifications'}</div>
          ))}
        </div>

        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
            <div>
              <div style={S.formCard}>
                <div style={S.formCardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Studio Identity</h3><p style={{ fontSize: 12, color: 'var(--text3)' }}>Your brand as buyers will see it</p></div>
                <div style={S.formCardBody}>
                  <div style={S.row2}>
                    <div><label style={S.label}>Studio Name</label><input style={S.input} type="text" value={form.studio_name || ''} onChange={e => set('studio_name', e.target.value)} /></div>
                    <div><label style={S.label}>Founded</label><input style={S.input} type="number" value={form.founded_year || ''} onChange={e => set('founded_year', e.target.value)} /></div>
                  </div>
                  <div style={S.row2}>
                    <div><label style={S.label}>City</label><input style={S.input} type="text" value={form.location_city || ''} onChange={e => set('location_city', e.target.value)} /></div>
                    <div><label style={S.label}>State</label><input style={S.input} type="text" value={form.location_state || ''} onChange={e => set('location_state', e.target.value)} /></div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label style={S.label}>Studio Story <span style={{ color: 'var(--text4)', fontWeight: 400 }}>(shown on public profile)</span></label>
                    <textarea style={{ ...S.input, minHeight: 100, resize: 'vertical' }} value={form.studio_notes || ''} onChange={e => set('studio_notes', e.target.value)} />
                  </div>
                  <div style={S.row2}>
                    <div><label style={S.label}>Number of Artisans</label><input style={S.input} type="number" value={sd.artisan_count || ''} disabled title="Edit in onboarding — Production section" /></div>
                    <div><label style={S.label}>Monthly Production Capacity</label><input style={S.input} type="text" placeholder="e.g. 2,000 units/month" value={form.monthly_production_capacity || ''} onChange={e => set('monthly_production_capacity', e.target.value)} /></div>
                  </div>
                </div>
              </div>

              <div style={S.formCard}>
                <div style={S.formCardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Contact Details</h3><p style={{ fontSize: 12, color: 'var(--text3)' }}>Used for order communication</p></div>
                <div style={S.formCardBody}>
                  <div style={S.row2}>
                    <div><label style={S.label}>Primary Contact</label><input style={S.input} type="text" value={form.contact_person_name || ''} onChange={e => set('contact_person_name', e.target.value)} /></div>
                    <div><label style={S.label}>Designation</label><input style={S.input} type="text" value={form.contact_designation || ''} onChange={e => set('contact_designation', e.target.value)} /></div>
                  </div>
                  <div style={S.row2}>
                    <div><label style={S.label}>WhatsApp</label><input style={S.input} type="text" value={form.contact_whatsapp || ''} onChange={e => set('contact_whatsapp', e.target.value)} /></div>
                    <div></div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div style={{ ...S.card, marginBottom: 16 }}>
                <div style={S.cardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Profile Completeness</h3></div>
                <div style={{ padding: '10px 20px 16px' }}>
                  {checklistFields.map(([label, done]) => (
                    <div key={label} style={S.activityItem}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: done ? 'var(--green)' : 'var(--amber)', marginTop: 4, flexShrink: 0 }} />
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.infoBox}>Studios with complete profiles receive more enquiries on Qala.</div>
            </div>
          </div>
        )}

        {tab === 'portfolio' && (
          <div>
            <div style={{ ...S.infoBox, marginBottom: 16 }}>Portfolio projects are shown on your public profile and can be linked to proposals.</div>
            <div style={S.portGrid}>
              {collections.map(c => (
                <div key={c.id} style={S.portCard}>
                  <div style={S.portImg}>🧵</div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{(c.products || []).length} pieces</div>
                  </div>
                </div>
              ))}
              <div style={{ border: '2px dashed var(--border2)', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--text4)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>+</div>
                <div style={{ fontSize: 13 }}>Add project in onboarding</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'crafts' && (
          <div style={S.formCard}>
            <div style={S.formCardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Crafts & Techniques</h3><p style={{ fontSize: 12, color: 'var(--text3)' }}>This data drives matchmaking</p></div>
            <div style={S.formCardBody}>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Embellishment Techniques</label>
                <div>{embellishment.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text4)' }}>None listed — edit in onboarding, Crafts section</span> : embellishment.map(c => <span key={c.id} style={S.chip(true)}>{c.craft_name}</span>)}</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={S.label}>Printing Techniques</label>
                <div>{printing.length === 0 ? <span style={{ fontSize: 12, color: 'var(--text4)' }}>None listed — edit in onboarding, Crafts section</span> : printing.map(c => <span key={c.id} style={S.chip(true)}>{c.craft_name}</span>)}</div>
              </div>
              <div style={S.row2}>
                <div><label style={S.label}>Minimum Order Quantity</label><input style={S.input} type="text" value={sd.moq_per_batch ? `${sd.moq_per_batch} units` : ''} disabled title="Edit in onboarding — Production section" /></div>
                <div><label style={S.label}>Typical Lead Time (Sampling)</label><input style={S.input} type="text" value={sd.production_time_weeks ? `${sd.production_time_weeks} weeks` : ''} disabled title="Edit in onboarding — Production section" /></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'certifications' && (
          <div style={S.formCard}>
            <div style={S.formCardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Certifications</h3><p style={{ fontSize: 12, color: 'var(--text3)' }}>Shown on your public profile</p></div>
            <div style={S.formCardBody}>
              {certifications.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text4)', marginBottom: 14 }}>No certifications added yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {certifications.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                      <span style={{ fontSize: 13 }}>{c}</span>
                      <span style={{ fontSize: 16, color: 'var(--text4)', cursor: 'pointer' }} onClick={() => setCertifications(certifications.filter((_, j) => j !== i))}>×</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={S.input} type="text" placeholder="e.g. GOTS Certified, Fair Trade" value={newCert}
                  onChange={e => setNewCert(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newCert.trim()) { setCertifications([...certifications, newCert.trim()]); setNewCert(''); } }} />
                <button className="btn btn-outline btn-sm" onClick={() => { if (newCert.trim()) { setCertifications([...certifications, newCert.trim()]); setNewCert(''); } }}>+ Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}