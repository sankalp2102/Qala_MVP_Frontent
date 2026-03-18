import { useState, useEffect } from 'react';
import { onboardingAPI } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';

function CardSection({ title, children }) {
  return (
    <div className="card fade-up" style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}

function FlagBanner({ reason }) {
  if (!reason) return null;
  return <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,85,85,0.25)', borderLeft: '3px solid var(--red)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>Admin flagged: {reason}</div>;
}

function YesNoField({ label, hint, flagReason, value, onChange }) {
  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: hint ? 6 : 12, lineHeight: 1.6 }}>{label}</div>
      {hint && <p style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.7 }}>{hint}</p>}
      <FlagBanner reason={flagReason} />
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
          <button key={l} onClick={() => onChange(v)} style={{
            padding: '10px 28px', borderRadius: 'var(--radius)',
            border: `1px solid ${value === v ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`,
            background: value === v ? 'var(--gold-dim)' : 'var(--surface2)',
            color: value === v ? 'var(--gold)' : 'var(--text2)',
            fontWeight: value === v ? 700 : 400, cursor: 'pointer', fontSize: 14,
            fontFamily: 'var(--font-body)', transition: 'all .15s',
          }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export default function SectionD({ profileId, onSave }) {
  const { toasts, success, error } = useToast();
  const [form, setForm] = useState({
    has_fashion_designer: null,
    can_develop_from_references: null,
    max_sampling_iterations: '',
  });
  const [flags, setFlags] = useState({});
  const [reqs, setReqs]   = useState([{ order: 1, question: '' }, { order: 2, question: '' }]);
  const [coordinator, setCoordinator] = useState({ name: '', position: '', writeup: '' });
  const [coordImg, setCoordImg]       = useState(null);
  const [coordExisting, setCoordExisting] = useState(null); // existing file_name from server
  const [savingCoord, setSavingCoord] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    onboardingAPI.getCollab(profileId).then(r => {
      const d = r.data;
      if (!d) return;
      setForm({
        has_fashion_designer: d.has_fashion_designer,
        can_develop_from_references: d.can_develop_from_references,
        max_sampling_iterations: d.max_sampling_iterations ?? '',
      });
      setFlags({
        designer: d.designer_flagged ? d.designer_flag_reason : null,
        references: d.references_flagged ? d.references_flag_reason : null,
        iterations: d.iterations_flagged ? d.iterations_flag_reason : null,
      });
      if (d.buyer_requirements?.length) {
        setReqs(d.buyer_requirements.map(r => ({ order: r.order, question: r.question })));
      }
      if (d.buyer_coordinator) {
        setCoordinator({
          name: d.buyer_coordinator.name || '',
          position: d.buyer_coordinator.position || '',
          writeup: d.buyer_coordinator.writeup || '',
        });
        setCoordExisting(d.buyer_coordinator.file_name || null);
      }
    }).catch(() => {});
  }, [profileId]);

  const saveCoordinator = async () => {
    if (!coordinator.name.trim()) { error('Coordinator name is required'); return; }
    setSavingCoord(true);
    try {
      const fd = new FormData();
      fd.append('name', coordinator.name);
      fd.append('position', coordinator.position);
      fd.append('writeup', coordinator.writeup);
      if (coordImg) fd.append('image', coordImg);
      const r = await onboardingAPI.putCoordinator(profileId, fd);
      setCoordExisting(r.data.file_name || null);
      setCoordImg(null);
      success('Coordinator saved!');
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Failed to save coordinator');
    } finally { setSavingCoord(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onboardingAPI.putCollab(profileId, form);
      const rData = reqs.filter(r => r.question.trim());
      if (rData.length) await onboardingAPI.putBuyerReqs(profileId, rData);
      success('Section D saved!');
      onSave?.();
    } catch (e) {
      error(e.response?.data ? JSON.stringify(e.response.data) : 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '40px 48px', maxWidth: 760 }}>
      <Toast toasts={toasts} />
      <div className="fade-up" style={{ marginBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}></div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Section D</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>Collaboration &amp; Design Support</h1>
          </div>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginLeft: 56 }}>How you collaborate with buyers on design, sampling, and pre-production.</p>
      </div>

      {/* D.1 */}
      <CardSection title="D.1 — In-House Fashion Designer">
        <YesNoField
          label="Does your studio have an in-house fashion designer?"
          hint="A dedicated designer who can create original garment designs, develop tech packs, or adapt buyer references into production-ready specs."
          flagReason={flags.designer}
          value={form.has_fashion_designer}
          onChange={v => setForm(f => ({ ...f, has_fashion_designer: v }))}
        />
      </CardSection>

      {/* D.2 */}
      <CardSection title="D.2 — Developing from Buyer References">
        <YesNoField
          label="Can you develop designs from buyer references or mood boards?"
          hint="e.g. A buyer sends you a Pinterest board, a reference garment, or a rough sketch — can your team translate that into a finished sample?"
          flagReason={flags.references}
          value={form.can_develop_from_references}
          onChange={v => setForm(f => ({ ...f, can_develop_from_references: v }))}
        />
      </CardSection>

      {/* D.3 */}
      <CardSection title="D.3 — Sampling Iterations">
        <FlagBanner reason={flags.iterations} />
        <div className="field" style={{ maxWidth: 260 }}>
          <label>How many rounds of sampling do you offer before charging extra?</label>
          <input type="number" min="1" max="20" value={form.max_sampling_iterations}
            onChange={e => setForm(f => ({ ...f, max_sampling_iterations: e.target.value }))}
            placeholder="e.g. 3" />
          <span className="hint">e.g. enter 3 if you offer 3 free sampling rounds before additional charges apply</span>
        </div>
      </CardSection>

      {/* D.4 */}
      <CardSection title="D.4 — Pre-Call Questions for Buyers">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16, lineHeight: 1.7 }}>
          What information do you need from a buyer <em>before</em> you get on a discovery call?
          These questions are shown to buyers when they try to connect with you — they must answer them first.
          Add up to 5 questions.
        </p>
        {reqs.map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <input className="input-raw" style={{ flex: 1 }}
              placeholder={[
                'e.g. What is the target market for your collection?',
                'e.g. Can you share a moodboard or reference images?',
                'e.g. What is your approximate order quantity?',
                'e.g. What is your required delivery timeline?',
                'e.g. Do you have existing tech packs or just references?',
              ][i] || `Question #${i + 1}`}
              value={r.question}
              onChange={e => setReqs(a => a.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} />
            {reqs.length > 1 && (
              <button onClick={() => setReqs(a => a.filter((_, j) => j !== i))}
                style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: '4px', marginTop: 2 }}>×</button>
            )}
          </div>
        ))}
        {reqs.length < 5 && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={() => setReqs(a => [...a, { order: a.length + 1, question: '' }])}>
            + Add Question
          </button>
        )}
      </CardSection>

      {/* D.5 Buyer Coordinator */}
      <CardSection title="D.5 — Buyer Coordinator">
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6, lineHeight: 1.7 }}>
          Who from your team is typically responsible for coordinating &amp; working with the buyers?
        </p>
        <p style={{ fontSize: 12, color: 'var(--text4)', marginBottom: 16 }}>
          Tell us their name, position in your organisation and a little bit about them — their background, working style etc.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="field">
            <label>Name *</label>
            <input value={coordinator.name} onChange={e => setCoordinator(c => ({ ...c, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
          </div>
          <div className="field">
            <label>Position</label>
            <input value={coordinator.position} onChange={e => setCoordinator(c => ({ ...c, position: e.target.value }))} placeholder="e.g. Studio Manager / Head of Production" />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>About them</label>
          <textarea
            value={coordinator.writeup}
            onChange={e => setCoordinator(c => ({ ...c, writeup: e.target.value }))}
            rows={4}
            placeholder="e.g. Priya has 12 years of experience in textile production. She manages all buyer relationships from initial brief through to final delivery. She's detail-oriented, responsive, and prefers WhatsApp for quick updates and email for formal communication."
            style={{
              width: '100%', padding: '12px 16px',
              border: '1.5px solid var(--border)', borderRadius: 'var(--radius)',
              background: 'var(--surface)', color: 'var(--text)',
              fontSize: 14, fontFamily: 'var(--font-body)', lineHeight: 1.7, resize: 'vertical',
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Photo</div>
          {coordExisting && !coordImg && (
            <div style={{ fontSize: 12, color: 'var(--teal)', marginBottom: 6 }}>Current: {coordExisting}</div>
          )}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setCoordImg(e.target.files?.[0] || null)} style={{ display: 'none' }} />
            <span className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
              {coordImg ? coordImg.name : coordExisting ? '↺ Replace Photo' : '+ Upload Photo'}
            </span>
          </label>
          <p style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>JPG · PNG · WEBP up to 10 MB</p>
        </div>

        <button className="btn btn-outline btn-sm" onClick={saveCoordinator} disabled={savingCoord}>
          {savingCoord ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : coordExisting || coordinator.name ? 'Update Coordinator' : 'Save Coordinator'}
        </button>
      </CardSection>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save Section D'}
      </button>
    </div>
  );
}
