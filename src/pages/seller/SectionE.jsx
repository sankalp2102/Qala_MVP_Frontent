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

export default function SectionE({ profileId, onSave }) {
  const { toasts, success, error } = useToast();
  const [form, setForm] = useState({ monthly_capacity_units: '', has_strict_minimums: null });
  const [flags, setFlags] = useState({});
  const [moqs, setMoqs]   = useState([{ order: 1, craft_or_category: '', moq_condition: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    onboardingAPI.getProduction(profileId).then(r => {
      const d = r.data;
      if (!d) return;
      setForm({ monthly_capacity_units: d.monthly_capacity_units ?? '', has_strict_minimums: d.has_strict_minimums });
      setFlags({
        capacity: d.capacity_flagged ? d.capacity_flag_reason : null,
        minimums: d.minimums_flagged ? d.minimums_flag_reason : null,
      });
      if (d.moq_entries?.length) setMoqs(d.moq_entries.map(m => ({ order: m.order, craft_or_category: m.craft_or_category, moq_condition: m.moq_condition })));
    }).catch(() => {});
  }, [profileId]);

  const save = async () => {
    setSaving(true);
    try {
      await onboardingAPI.putProduction(profileId, form);
      const moqData = moqs.filter(m => m.craft_or_category.trim() && m.moq_condition.trim());
      if (moqData.length) await onboardingAPI.putMOQ(profileId, moqData);
      success('Section E saved!');
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
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Section E</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 700, color: 'var(--text)' }}>Production Scale</h1>
          </div>
        </div>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginLeft: 56 }}>Your production capacity and minimum order requirements — key filters buyers use.</p>
      </div>

      {/* E.1 Monthly Capacity */}
      <CardSection title="E.1 — Monthly Production Capacity">
        <FlagBanner reason={flags.capacity} />
        <div className="field" style={{ maxWidth: 280 }}>
          <label>How many total units can your studio produce per month across all orders?</label>
          <input type="number" min="1" value={form.monthly_capacity_units}
            onChange={e => setForm(f => ({ ...f, monthly_capacity_units: e.target.value }))}
            placeholder="e.g. 500" />
          <span className="hint">This is your total capacity across all crafts and product types combined. It is used as a primary filter when matching you with buyers — only count what your studio can realistically deliver.</span>
        </div>
      </CardSection>

      {/* E.2 Strict minimums */}
      <CardSection title="E.2 — Minimum Order Quantities (MOQ)">
        <FlagBanner reason={flags.minimums} />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 8, lineHeight: 1.6 }}>Do you enforce strict minimum order quantities?</div>
          <p style={{ fontSize: 12.5, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.7 }}>
            i.e. Will you decline an order if a buyer's quantity is below your minimum, without exception?
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[{ v: true, l: 'Yes — I have non-negotiable MOQs' }, { v: false, l: 'No — I can be flexible based on the project' }].map(({ v, l }) => (
              <button key={l} onClick={() => setForm(f => ({ ...f, has_strict_minimums: v }))} style={{
                padding: '10px 18px', borderRadius: 'var(--radius)',
                border: `1px solid ${form.has_strict_minimums === v ? 'rgba(200,165,90,0.4)' : 'var(--border2)'}`,
                background: form.has_strict_minimums === v ? 'var(--gold-dim)' : 'var(--surface2)',
                color: form.has_strict_minimums === v ? 'var(--gold)' : 'var(--text2)',
                fontWeight: form.has_strict_minimums === v ? 600 : 400, cursor: 'pointer', fontSize: 13.5,
                fontFamily: 'var(--font-body)', transition: 'all .15s', textAlign: 'left',
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* E.3 MOQ per craft */}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>E.3 — MOQ Conditions Per Craft / Category</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 14, lineHeight: 1.7 }}>
            For each craft or product category you offer, specify your minimum order condition. Be as specific as possible — e.g. "Min 30 pcs per colourway for Hand Block Print on Mulmul."
          </p>
          {moqs.map((m, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 8 }}>
              <input className="input-raw" placeholder="Craft or category (e.g. Hand Block Printing)" value={m.craft_or_category}
                onChange={e => setMoqs(a => a.map((x, j) => j === i ? { ...x, craft_or_category: e.target.value } : x))} />
              <input className="input-raw" placeholder="MOQ condition (e.g. Min 30 pcs per colourway)" value={m.moq_condition}
                onChange={e => setMoqs(a => a.map((x, j) => j === i ? { ...x, moq_condition: e.target.value } : x))} />
              <button onClick={() => setMoqs(a => a.filter((_, j) => j !== i))}
                style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,85,85,0.2)', color: 'var(--red)', borderRadius: 'var(--radius)', cursor: 'pointer', padding: '0 10px', fontSize: 16 }}>×</button>
            </div>
          ))}
          <button className="btn btn-outline btn-sm" style={{ marginTop: 4 }} onClick={() => setMoqs(a => [...a, { order: a.length + 1, craft_or_category: '', moq_condition: '' }])}>
            + Add MOQ Row
          </button>
        </div>
      </CardSection>

      <button className="btn btn-primary btn-lg fade-up" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</> : 'Save Section E'}
      </button>
    </div>
  );
}
