import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

const emptyDraft = () => ({
  craft_name: '', specialization: '', is_primary: true,
  innovation_level: 'medium', limitations: '', fabric_limitations: '',
  sampling_time_weeks: '', production_timeline_months_50units: '',
  delay_likelihood: 'low', delay_common_reasons: '',
  image: null,
});

function Field({ label, hint, children, style }) {
  return (
    <div className="field" style={style}>
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

const INNOV_OPTS = [
  { value: 'high',   label: 'High',   desc: 'Pushing the boundaries of the craft — experimental, unique' },
  { value: 'medium', label: 'Medium', desc: 'Adapting traditional craft with some modern interpretations' },
  { value: 'low',    label: 'Low',    desc: 'Traditional / classic execution — pure, unchanged heritage' },
];

const DELAY_OPTS = [
  { value: 'low',    label: 'Low',    desc: 'Rarely face delays — predictable, stable process' },
  { value: 'medium', label: 'Medium', desc: 'Occasional delays possible, usually recoverable' },
  { value: 'high',   label: 'High',   desc: 'Delays are likely — process is complex or weather-dependent' },
];

export default function SectionC({ profileId, onSave }) {
  const { toasts, success, error } = useToast();
  const [crafts, setCrafts]       = useState([]);
  const [adding, setAdding]       = useState(false);
  const [draft, setDraft]         = useState(emptyDraft());
  const [saving, setSaving]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    onboardingAPI.getCrafts(profileId).then(r => setCrafts(r.data || [])).catch(() => {});
  }, [profileId]);

  const saveCraft = async () => {
    if (!draft.craft_name.trim()) { error('Craft name is required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('craft_name', draft.craft_name);
      fd.append('is_primary', draft.is_primary);
      fd.append('order', crafts.length + 1);
      if (draft.specialization) fd.append('specialization', draft.specialization);
      if (draft.innovation_level) fd.append('innovation_level', draft.innovation_level);
      if (draft.limitations) fd.append('limitations', draft.limitations);
      if (draft.fabric_limitations) fd.append('fabric_limitations', draft.fabric_limitations);
      if (draft.sampling_time_weeks) fd.append('sampling_time_weeks', draft.sampling_time_weeks);
      if (draft.production_timeline_months_50units) fd.append('production_timeline_months_50units', draft.production_timeline_months_50units);
      if (draft.delay_likelihood) fd.append('delay_likelihood', draft.delay_likelihood);
      if (draft.delay_common_reasons) fd.append('delay_common_reasons', draft.delay_common_reasons);
      if (draft.image) fd.append('image', draft.image);

      const r = await onboardingAPI.addCraft(profileId, fd);
      setCrafts(c => [...c, r.data]);
      setDraft(emptyDraft());
      setAdding(false);
      success('Craft added!');
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to save craft');
    } finally { setSaving(false); }
  };

  const delCraft = async id => {
    try { await onboardingAPI.delCraft(profileId, id); setCrafts(x => x.filter(y => y.id !== id)); }
    catch { error('Failed to remove craft'); }
  };

  const submit = async () => {
    setSubmitting(true);
    try { await onboardingAPI.submitCrafts(profileId); success('Section C submitted!'); onSave?.(); }
    catch (e) { error(e.response?.data?.error || 'Add at least 1 craft first'); }
    finally { setSubmitting(false); }
  };

  const innovColor = { high: 'var(--green)', medium: 'var(--amber)', low: 'var(--text3)' };
  const delayColor = { high: 'var(--red)', medium: 'var(--amber)', low: 'var(--green)' };

  const RadioGroup = ({ label, options, value, onChange, hint }) => (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: hint ? 4 : 10 }}>{label}</div>
      {hint && <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 10 }}>{hint}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {options.map(opt => (
          <label key={opt.value} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '10px 12px', borderRadius: 'var(--radius)', border: `1px solid ${value === opt.value ? 'rgba(200,165,90,0.35)' : 'var(--border)'}`, background: value === opt.value ? 'var(--gold-dim)' : 'var(--surface2)', transition: 'all .15s' }}>
            <input type="radio" value={opt.value} checked={value === opt.value} onChange={() => onChange(opt.value)}
              style={{ accentColor: 'var(--gold)', marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: value === opt.value ? 'var(--gold)' : 'var(--text)' }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{opt.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: '40px 48px', maxWidth: 780 }}>
      <Toast toasts={toasts} />
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}></div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Section C</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>Crafts & Specializations</h1>
          </div>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginLeft: 56 }}>This is the most important section — the richer your craft data, the better your buyer matches.</p>
      </div>

      {/* Existing crafts */}
      {crafts.map(c => (
        <div key={c.id} className="card fade-up" style={{ marginBottom: 14, borderLeft: `3px solid ${c.is_primary ? 'var(--gold)' : 'var(--border2)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{c.craft_name}</span>
                {c.is_primary && <span className="badge badge-gold">Primary</span>}
              </div>
              {c.specialization && <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10, lineHeight: 1.6 }}>{c.specialization}</p>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
                {c.innovation_level && <span style={{ color: innovColor[c.innovation_level] }}>◆ {c.innovation_level} innovation</span>}
                {c.sampling_time_weeks && <span style={{ color: 'var(--text3)' }}>{c.sampling_time_weeks} wk sampling</span>}
                {c.production_timeline_months_50units && <span style={{ color: 'var(--text3)' }}>{c.production_timeline_months_50units} mo for 50 units</span>}
                {c.delay_likelihood && <span style={{ color: delayColor[c.delay_likelihood] }}>{c.delay_likelihood} delay risk</span>}
              </div>
              {c.limitations && <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 4 }}>Technique limits: {c.limitations}</p>}
              {c.fabric_limitations && <p style={{ fontSize: 12, color: 'var(--text4)', marginTop: 2 }}>Fabric limits: {c.fabric_limitations}</p>}
              {c.file_name && <p style={{ fontSize: 11, color: 'var(--teal)', marginTop: 6 }}>{c.file_name}</p>}
              {c.is_flagged && !c.flag_resolved && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>Admin flagged: {c.flag_reason}</div>}
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginLeft: 16 }} onClick={() => delCraft(c.id)}>Remove</button>
          </div>
        </div>
      ))}

      {/* Add form */}
      {adding ? (
        <div className="card fade-up" style={{ marginBottom: 24, borderColor: 'rgba(200,165,90,0.25)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--gold)', marginBottom: 20 }}>Add a Craft</div>
          <div style={{ display: 'grid', gap: 18 }}>

            {/* C.1 Craft Name */}
            <Field label="C.1 — Craft Name *" hint="Be specific: 'Hand Block Printing' is better than 'Printing'">
              <input value={draft.craft_name} onChange={e => setDraft(d => ({ ...d, craft_name: e.target.value }))} placeholder="e.g. Hand Block Printing, Kantha Embroidery, Bandhani, Chikankari…" />
            </Field>

            {/* C.1 Specialization */}
            <Field label="C.1 — Specialization / Technique Details" hint="Describe the specific sub-techniques, regional variations, or design styles you practice">
              <textarea value={draft.specialization} onChange={e => setDraft(d => ({ ...d, specialization: e.target.value }))} rows={3}
                placeholder="e.g. Specialise in dabu resist printing (mud-resist) on Mulmul and Chanderi. Work with both vegetable and mineral dyes. Known for Bagru-style motifs." />
            </Field>

            {/* Primary toggle */}
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', padding: '12px 14px', borderRadius: 'var(--radius)', border: `1px solid ${draft.is_primary ? 'rgba(200,165,90,0.35)' : 'var(--border2)'}`, background: draft.is_primary ? 'var(--gold-dim)' : 'var(--surface2)' }}>
              <input type="checkbox" checked={draft.is_primary} onChange={e => setDraft(d => ({ ...d, is_primary: e.target.checked }))}
                style={{ accentColor: 'var(--gold)', width: 15, height: 15, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Mark as Primary Craft</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Primary crafts are the crafts that you are expert in and mostly work with. Secondary crafts could be ones that you have tried a few times, but you don't always work with them.</div>
              </div>
            </label>

            {/* Innovation Level */}
            <RadioGroup
              label="C.1 — Innovation Level"
              hint="How would you describe your approach to this craft?"
              options={INNOV_OPTS}
              value={draft.innovation_level}
              onChange={v => setDraft(d => ({ ...d, innovation_level: v }))}
            />

            {/* Timelines */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="C.1 — Sampling Time (weeks)" hint="How long does it take to deliver 1 sample from brief to door?">
                <input type="number" step="0.5" min="0" value={draft.sampling_time_weeks}
                  onChange={e => setDraft(d => ({ ...d, sampling_time_weeks: e.target.value }))} placeholder="e.g. 2" />
              </Field>
              <Field label="C.1 — Production: 50 units (months)" hint="How many months to produce 50 finished units of this craft?">
                <input type="number" step="0.5" min="0" value={draft.production_timeline_months_50units}
                  onChange={e => setDraft(d => ({ ...d, production_timeline_months_50units: e.target.value }))} placeholder="e.g. 1.5" />
              </Field>
            </div>

            {/* Delay Likelihood */}
            <RadioGroup
              label="C.1 — Delay Likelihood"
              hint="How likely are delays in this craft's production?"
              options={DELAY_OPTS}
              value={draft.delay_likelihood}
              onChange={v => setDraft(d => ({ ...d, delay_likelihood: v }))}
            />

            {/* Delay Reasons — always shown */}
            <Field label="C.1 — Common Delay Reasons" hint="What typically causes delays for this craft? Leave blank if delays are rare.">
              <input value={draft.delay_common_reasons}
                onChange={e => setDraft(d => ({ ...d, delay_common_reasons: e.target.value }))}
                placeholder="e.g. Monsoon season affects drying time, sourcing raw materials from a single village, master artisan availability" />
            </Field>

            {/* Limitations — 2 columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="C.1 — Well Known Limitations" hint="Are there specific design elements, materials, or techniques that don't work well with this craft?">
                <textarea value={draft.fabric_limitations} onChange={e => setDraft(d => ({ ...d, fabric_limitations: e.target.value }))} rows={3}
                  placeholder="e.g. Does not adhere well on synthetic blends or polyester. Colour fastness issues on georgette. Not recommended for stretch fabrics." />
              </Field>
            </div>

            {/* Craft Image Upload */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>C.1 — Craft Reference Image (optional)</div>
              <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 10 }}>Upload one photo that best shows this craft technique or your work in it.</p>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setDraft(d => ({ ...d, image: e.target.files[0] }))} style={{ display: 'none' }} />
                <span className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
                  {draft.image ? draft.image.name : '+ Attach Image'}
                </span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-primary" onClick={saveCraft} disabled={saving}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save Craft'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setAdding(false); setDraft(emptyDraft()); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-outline" style={{ marginBottom: 28 }} onClick={() => setAdding(true)}>
          + Add Craft / Specialization
        </button>
      )}

      {crafts.length > 0 && !adding && (
        <button className="btn btn-primary btn-lg" onClick={submit} disabled={submitting}>
          {submitting ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</> : 'Submit Section C'}
        </button>
      )}
    </div>
  );
}
