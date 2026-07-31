import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, onboardingAPI } from '../../api/client';
import {
  calcLandingCost, fetchForex, sanitizeForex,
  fmtUSD, fmtINR, fmtPct,
} from '../../utils/calculator';
import LineItemCards, { normalizeItems, summarize } from '../../components/proposals/LineItemCards';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkBox() {
  return { _id: Date.now() + Math.random(), label: 'Custom', length_cm: '', width_cm: '', height_cm: '', qty: 1 };
}

const STD_BOXES = [
  { label: 'XS', length_cm: 30, width_cm: 20, height_cm: 20, vol: 2.4,  box: 0.4 },
  { label: 'S',  length_cm: 45, width_cm: 30, height_cm: 25, vol: 6.75, box: 0.7 },
  { label: 'M',  length_cm: 50, width_cm: 40, height_cm: 30, vol: 12.0, box: 1.0 },
  { label: 'L',  length_cm: 60, width_cm: 40, height_cm: 40, vol: 19.2, box: 1.4 },
];

const SHIP_OPTIONS    = [['dhl','Express'],['shipglobal','Economical']];

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
}

// ── Shared components ─────────────────────────────────────────────────────────

function Toggle({ opts, val, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: val === v ? 600 : 400, transition: 'all 0.15s',
          background: val === v ? 'var(--gold)' : 'var(--surface2)',
          color:      val === v ? '#fff' : 'var(--text2)',
        }}>{l}</button>
      ))}
    </div>
  );
}

function SLabel({ children, required }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
      {children}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
    </div>
  );
}

// ── STEP NAVIGATOR ────────────────────────────────────────────────────────────

// Buyer's Brief removed as a step here — it's redundant with
// EnquiryDetail.jsx, which already shows the full brief before "Start
// Proposal" is even clicked. The prototype (studio-proposal.html) only
// ever has 6 sections, not 7 — confirmed by its own section IDs (sec-1
// through sec-6) and its section-header numbers (01, 03, 04, 05, 06, 07 —
// note the deliberate gap at 02, which is the prototype's OWN numbering,
// not something to "fix"). Internal step ids below are kept as 2-7,
// matching those header numbers exactly, so none of the case/header code
// below needed to change — only navNumber is new, giving the sidebar a
// clean 1-6 display distinct from the internal step id.
const STEPS = [
  { n: 2, navNumber: 1, label: 'Concept' },
  { n: 3, navNumber: 2, label: 'Past projects' },
  { n: 4, navNumber: 3, label: 'Offerings & costing', required: true },
  { n: 5, navNumber: 4, label: 'Timelines', required: true },
  { n: 6, navNumber: 5, label: 'Terms (SOW)' },
  { n: 7, navNumber: 6, label: 'Review & submit' },
];

function StepNav({ current, onChange, completedSteps }) {
  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Proposal sections</div>
      {STEPS.map(s => {
        const done    = completedSteps.has(s.n);
        const active  = current === s.n;
        return (
          <div key={s.n} onClick={() => onChange(s.n)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 8, marginBottom: 4, cursor: 'pointer',
            background: active ? 'var(--gold-dim)' : 'transparent',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: done ? 'var(--green)' : active ? 'var(--gold)' : 'var(--surface3)',
              color: done || active ? '#fff' : 'var(--text3)',
            }}>
              {done ? '✓' : s.navNumber}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--gold)' : 'var(--text2)' }}>{s.label}</div>
              {s.required && <div style={{ fontSize: 10, color: 'var(--text4)' }}>Required</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── LIVE CALC PANEL ───────────────────────────────────────────────────────────

// ── RIGHT PANEL — carbon copy of studio-proposal.html's #right-panel ──────────
// Three states exactly matching the prototype's #calc-right / #tl-right /
// #default-right divs, swapped by current step rather than JS show/hide.
function PayTrack({ pct, onChange, disabled }) {
  return (
    <div style={{ position: 'relative', height: 5, background: 'var(--surface3)', borderRadius: 3, margin: '4px 0 6px', cursor: disabled ? 'default' : 'pointer' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: 'var(--gold)', borderRadius: 3, pointerEvents: 'none', transition: 'width .05s', width: `${pct}%` }} />
      <input type="range" min="0" max="100" step="5" value={pct} disabled={disabled} onChange={onChange}
        style={{ position: 'absolute', width: '100%', top: -6, left: 0, margin: 0, opacity: 0, cursor: disabled ? 'default' : 'pointer', height: 18 }} />
    </div>
  );
}

const PHASE_META = {
  designing:  { label: 'Design',     color: '#7A8C6E' },
  sampling:   { label: 'Sampling',   color: '#C4953A' },
  production: { label: 'Production', color: '#5B4B8A' },
};

function RightPanel({ step, result, forex, currency, setCurrency, exp, toggleExp, advPctDesign, setAdvPctDesign, advPctProduction, setAdvPctProduction, enquiry, brief, designDate, sampleDate, bulkDate }) {
  const c = (usd, inr) => currency === 'usd' ? fmtUSD(usd) : fmtINR(inr ?? usd * forex);
  const unitHdr = currency === 'usd' ? 'Unit ($)' : 'Unit (₹)';
  const totHdr  = currency === 'usd' ? 'Total ($)' : 'Total (₹)';

  const Row = ({ label, value, sub, clickable, expandKey, bold }) => (
    <div className={`br${sub ? ' sub' : ''}${bold ? ' tot' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: sub ? '4px 0 4px 14px' : bold ? '10px 0 0' : '7px 0', borderBottom: bold ? 'none' : sub ? '1px dashed var(--border)' : '1px solid var(--border)', borderTop: bold ? '1px solid var(--border2)' : 'none', fontSize: sub ? 11 : bold ? 13 : 12, fontWeight: bold ? 500 : 400, cursor: clickable ? 'pointer' : 'default' }}
      onClick={clickable ? () => toggleExp(expandKey) : undefined}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, color: sub ? 'var(--text3)' : 'var(--text2)' }}>
        {clickable && <span style={{ fontSize: 11, color: 'var(--text3)', display: 'inline-block', transform: exp[expandKey] ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>}
        {label}
      </span>
      <span style={{ color: bold ? 'var(--gold)' : 'var(--text)', whiteSpace: 'nowrap', marginLeft: 8 }}>{value}</span>
    </div>
  );

  if (step === 4 || step === 7) {
    const items = result.items || [];
    return (
      <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', position: 'sticky', top: 52, height: 'calc(100vh - 52px)', overflowY: 'auto', background: 'var(--bg)' }}>
        {/* Proforma card */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text4)' }}>Buyer landing cost</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 10, color: 'var(--terra, #D4836A)', background: 'rgba(212,131,106,.08)', border: '1px solid rgba(212,131,106,.2)', borderRadius: 4, padding: '2px 7px' }}>1 USD = ₹{forex.toFixed(2)}</div>
              <div style={{ display: 'flex', border: '1px solid var(--border2)', borderRadius: 8, overflow: 'hidden' }}>
                <button onClick={() => setCurrency('usd')} style={{ padding: '4px 10px', fontSize: 11, border: 'none', cursor: 'pointer', background: currency === 'usd' ? 'var(--gold)' : 'var(--bg)', color: currency === 'usd' ? '#fff' : 'var(--text2)' }}>USD</button>
                <button onClick={() => setCurrency('inr')} style={{ padding: '4px 10px', fontSize: 11, border: 'none', borderLeft: '1px solid var(--border2)', cursor: 'pointer', background: currency === 'inr' ? 'var(--gold)' : 'var(--bg)', color: currency === 'inr' ? '#fff' : 'var(--text2)' }}>INR</button>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderLeft: '3px solid var(--terra, #D4836A)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text4)', marginBottom: 4 }}>Landing cost</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, color: 'var(--terra, #D4836A)', lineHeight: 1 }}>{result.hasItems ? c(result.landingCostUSD) : '—'}</div>
            </div>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text4)', padding: 12, fontSize: 11 }}>Add items to see pricing</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'left', paddingBottom: 4 }}>#</th>
                  <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'left', paddingBottom: 4 }}>Item</th>
                  <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'right', paddingBottom: 4 }}>Qty</th>
                  <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'right', paddingBottom: 4 }}>{unitHdr}</th>
                  <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'right', paddingBottom: 4 }}>{totHdr}</th>
                </tr></thead>
                <tbody>
                  {['designing', 'sampling', 'production'].flatMap((phaseKey) => {
                    const phaseItems = items.filter(it => it.itemType === phaseKey);
                    if (phaseItems.length === 0) return [];
                    const phaseSubtotal = result.byPhase?.[phaseKey]?.subtotal || 0;
                    const phaseProdUSD  = phaseItems.reduce((s, it) => s + it.prodUSD, 0);
                    const meta = PHASE_META[phaseKey];
                    const rows = [
                      <tr key={`${phaseKey}-hdr`}>
                        <td colSpan={5} style={{ padding: '10px 0 3px', borderTop: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.5px', color: meta.color, textTransform: 'uppercase' }}>{meta.label}</span>
                        </td>
                      </tr>,
                      ...phaseItems.map((it, i) => {
                        const landing = phaseProdUSD > 0 ? it.prodUSD * (phaseSubtotal / phaseProdUSD) : 0;
                        return (
                          <tr key={`${phaseKey}-${i}`}>
                            <td style={{ fontSize: 11, padding: '3px 0', color: 'var(--text4)', paddingLeft: 6 }}>{i + 1}</td>
                            <td style={{ fontSize: 11, padding: '3px 0', color: 'var(--text2)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.name}>{it.name || '—'}</td>
                            <td style={{ fontSize: 11, padding: '3px 0', textAlign: 'right', color: 'var(--text3)' }}>{it.qty}</td>
                            <td style={{ fontSize: 12, padding: '3px 0', textAlign: 'right', fontWeight: 500 }}>{c(it.qty > 0 ? landing / it.qty : 0)}</td>
                            <td style={{ fontSize: 12, padding: '3px 0', textAlign: 'right', fontWeight: 600, color: 'var(--terra, #D4836A)' }}>{c(landing)}</td>
                          </tr>
                        );
                      }),
                    ];
                    const note = phaseKey === 'sampling'
                      ? 'Shipping & duties — to be charged on actuals'
                      : 'All inclusive · excl. payment gateway charges';
                    rows.push(
                      <tr key={`${phaseKey}-note`}>
                        <td colSpan={5} style={{ padding: '3px 6px 6px' }}>
                          <span style={{ fontSize: 10, color: 'var(--text4)', fontStyle: 'italic' }}>{note}</span>
                        </td>
                      </tr>
                    );
                    return rows;
                  })}
                </tbody>
              </table>
            )}
            {result.hasItems && (
              <div style={{ marginTop: 8, borderTop: '1px solid var(--border2)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
                <span>Total</span><span style={{ color: 'var(--terra, #D4836A)' }}>{c(result.landingCostUSD)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cost breakup */}
        <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text4)', marginBottom: 12, display: 'block' }}>Cost breakup</span>

          <Row label="Studio charges" value={c(result.totalProdUSD)} clickable expandKey="prod" />
          {exp.prod && (
            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 4px' }}>
              <tbody>
                {items.length === 0 ? <tr><td style={{ fontSize: 11, color: 'var(--text4)', padding: 6 }}>Add items</td></tr> :
                  items.map((it, i) => (
                    <tr key={i}><td style={{ fontSize: 11, color: 'var(--text2)', padding: '3px 0' }}>{it.name}</td><td style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>{it.qty}</td><td style={{ fontSize: 11, color: 'var(--text)', textAlign: 'right', fontWeight: 500 }}>{c(it.prodUSD)}</td></tr>
                  ))}
              </tbody>
            </table>
          )}

          <Row label={`Shipping · ${result.isSG ? 'Economical' : 'Express'}`} value={c(result.shippingUSD)} clickable expandKey="ship" />
          {exp.ship && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text4)', margin: '8px 0 5px' }}>Weight</div>
              {[['Items actual', result.itemsActWt], ['Carton', result.cartWt], ['Actual total', result.totalActWt], ['Volumetric', result.volWt], ['Chargeable (higher)', result.chargeBase], ['+ 10% error margin', result.chargeMgn], ['Final chargeable', result.chargeFin]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', borderBottom: '1px dashed var(--border)', fontSize: 11 }}>
                  <span style={{ color: 'var(--text3)' }}>{l}</span><span style={{ color: 'var(--text3)' }}>{(v || 0).toFixed(2)} kg</span>
                </div>
              ))}
              <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text4)', fontStyle: 'italic', lineHeight: 1.5 }}>Estimate for production only · Sampling charged at actuals</div>
            </div>
          )}

          {!result.isSG && (
            <>
              <Row label="Import duties" sub={false} value={c(result.totalDutyUSD)} clickable expandKey="duty" />
              {exp.duty && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 4px' }}>
                    <thead><tr>
                      <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'left', paddingBottom: 4 }}>Item</th>
                      <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'right', paddingBottom: 4 }}>Cost</th>
                      <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'right', paddingBottom: 4 }}>Rate</th>
                      <th style={{ fontSize: 9, fontWeight: 600, color: 'var(--text4)', textAlign: 'right', paddingBottom: 4 }}>Duty</th>
                    </tr></thead>
                    <tbody>
                      {items.filter(it => it.itemType === 'production').map((it, i) => (
                        <tr key={i}><td style={{ fontSize: 11, color: 'var(--text2)', padding: '3px 0' }}>{it.name}</td><td style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>{c(it.dutyBase)}</td><td style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right' }}>{(it.dutyPct * 100).toFixed(1)}%</td><td style={{ fontSize: 11, color: 'var(--text)', textAlign: 'right', fontWeight: 500 }}>{c(it.dutyBase * it.dutyPct)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11 }}>
                    <span style={{ color: 'var(--text3)' }}>
                      {result.totalDutyBase < 2500 || !result.procFee ? 'Processing fee — $2.00 flat' : 'Processing fee — 0.35% (min $33.58)'}
                    </span>
                    <span style={{ color: 'var(--text3)' }}>{c(result.procFee)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11, fontWeight: 500 }}>
                    <span style={{ color: 'var(--text2)' }}>Total duties</span>
                    <span style={{ color: 'var(--text)' }}>{c(result.totalDutyUSD)}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text4)', fontStyle: 'italic', lineHeight: 1.5 }}>Estimate for production only · Sampling charged at actuals</div>
                </div>
              )}
            </>
          )}

          <Row label="Qala platform services" value={c(result.pfTotalFinal)} clickable expandKey="pf" />
          {exp.pf && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', fontSize: 11 }}>
                <span style={{ color: 'var(--text3)' }}>Platform & IP Protection <span style={{ color: 'var(--text4)', fontSize: 10 }}>(4%)</span></span>
                <span style={{ color: 'var(--text3)' }}>{c(result.ipAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', fontSize: 11 }}>
                <span style={{ color: 'var(--text3)' }}>Managed Production <span style={{ color: 'var(--text4)', fontSize: 10 }}>(+6%)</span></span>
                <span style={{ color: 'var(--text3)' }}>{c(result.mpAmt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', fontSize: 11 }}>
                <span style={{ color: 'var(--text3)' }}>Trade & Compliance <span style={{ color: 'var(--text4)', fontSize: 10 }}>(+5%)</span></span>
                <span style={{ color: 'var(--text3)' }}>{c(result.tcAmt)}</span>
              </div>
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: 10, color: 'var(--text3)', lineHeight: 1.6 }}>
                Fee applies per phase — Design 4% · Sampling 10% · Production 15%
              </div>
            </div>
          )}

          <Row label="Landing cost" value={c(result.landingCostUSD)} bold />
        </div>

        {/* Payment schedule / payout */}
        <div style={{ padding: '20px 20px 20px' }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text4)', marginBottom: 12, display: 'block' }}>Payment schedule (INR)</span>
          <div onClick={() => toggleExp('payout')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: 6, marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', display: 'inline-block', transform: exp.payout ? 'rotate(90deg)' : 'none' }}>›</span>
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--terra, #D4836A)' }}>Your payout</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)' }}>{fmtINR(result.payoutTotalINR)}</span>
          </div>
          {exp.payout && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', fontSize: 11 }}><span style={{ color: 'var(--text3)' }}>Base (excl. GST)</span><span style={{ color: 'var(--text3)' }}>{fmtINR(result.payoutBaseINR)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', fontSize: 11 }}><span style={{ color: 'var(--text3)' }}>GST</span><span style={{ color: 'var(--text3)' }}>{fmtINR(result.payoutGSTINR)}</span></div>
              <div style={{ height: 6 }} />
              {['designing', 'sampling', 'production'].map(k => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0 4px 14px', fontSize: 11, color: PHASE_META[k].color }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{PHASE_META[k].label}</span><span>{fmtINR(result.payoutByPhase?.[k])}</span>
                </div>
              ))}
            </div>
          )}

          {/* Design payment split */}
          {result.payoutByPhase?.designing > 0 && (
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.5px', color: PHASE_META.designing.color, textTransform: 'uppercase' }}>Design</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{fmtINR(result.payoutByPhase.designing)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text4)', display: 'block' }}>Advance</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{Math.round(advPctDesign * 100)}%</span><span style={{ fontSize: 11, fontWeight: 500, color: 'var(--terra, #D4836A)', display: 'block' }}>{fmtINR(result.payoutByPhase.designing * advPctDesign)}</span></div>
                <div style={{ textAlign: 'right' }}><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text4)', display: 'block' }}>On approval</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{Math.round((1 - advPctDesign) * 100)}%</span><span style={{ fontSize: 11, fontWeight: 500, color: 'var(--terra, #D4836A)', display: 'block' }}>{fmtINR(result.payoutByPhase.designing * (1 - advPctDesign))}</span></div>
              </div>
              <PayTrack pct={Math.round(advPctDesign * 100)} onChange={e => setAdvPctDesign(parseInt(e.target.value) / 100)} />
            </div>
          )}

          {/* Sampling — fixed 100/0, not editable */}
          {result.payoutByPhase?.sampling > 0 && (
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.5px', color: PHASE_META.sampling.color, textTransform: 'uppercase' }}>Sampling</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{fmtINR(result.payoutByPhase.sampling)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text4)', display: 'block' }}>Advance</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>100%</span><span style={{ fontSize: 11, fontWeight: 500, color: 'var(--terra, #D4836A)', display: 'block' }}>{fmtINR(result.payoutByPhase.sampling)}</span></div>
                <div style={{ textAlign: 'right' }}><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text4)', display: 'block' }}>On dispatch</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>0%</span><span style={{ fontSize: 11, fontWeight: 500, color: 'var(--terra, #D4836A)', display: 'block' }}>{fmtINR(0)}</span></div>
              </div>
              <PayTrack pct={100} disabled />
              <div style={{ fontSize: 10, color: 'var(--text4)', marginTop: 4 }}>Paid in full before sampling begins</div>
            </div>
          )}

          {/* Production payment split */}
          {result.payoutByPhase?.production > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.5px', color: PHASE_META.production.color, textTransform: 'uppercase' }}>Production</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{fmtINR(result.payoutByPhase.production)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                <div><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text4)', display: 'block' }}>Advance</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{Math.round(advPctProduction * 100)}%</span><span style={{ fontSize: 11, fontWeight: 500, color: 'var(--terra, #D4836A)', display: 'block' }}>{fmtINR(result.payoutByPhase.production * advPctProduction)}</span></div>
                <div style={{ textAlign: 'right' }}><span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text4)', display: 'block' }}>On dispatch</span><span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{Math.round((1 - advPctProduction) * 100)}%</span><span style={{ fontSize: 11, fontWeight: 500, color: 'var(--terra, #D4836A)', display: 'block' }}>{fmtINR(result.payoutByPhase.production * (1 - advPctProduction))}</span></div>
              </div>
              <PayTrack pct={Math.round(advPctProduction * 100)} onChange={e => setAdvPctProduction(parseInt(e.target.value) / 100)} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 5) {
    const rows = [
      ['Design handover', designDate],
      ['Sample dispatch', sampleDate],
      ['Bulk dispatch', bulkDate],
    ].filter(([, d]) => d);
    return (
      <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', position: 'sticky', top: 52, height: 'calc(100vh - 52px)', overflowY: 'auto', background: 'var(--bg)', padding: '20px 20px 16px' }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text4)', marginBottom: 12, display: 'block' }}>Timeline overview</span>
        {rows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text4)' }}>Enter dispatch dates to see estimated delivery</div>
        ) : rows.map(([l, d]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <span style={{ color: 'var(--text3)' }}>{l}</span><span style={{ color: 'var(--text)', fontWeight: 500 }}>{fmtDate(d)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--border)', position: 'sticky', top: 52, height: 'calc(100vh - 52px)', overflowY: 'auto', background: 'var(--bg)', padding: '20px 20px 16px' }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text4)', marginBottom: 8, display: 'block' }}>This proposal</span>
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{enquiry?.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>{brief?.buyer_brand_name || enquiry?.buyer_name}</div>
    </div>
  );
}

// ── LINE ITEMS TABLE ──────────────────────────────────────────────────────────

// ── BOXES TABLE ───────────────────────────────────────────────────────────────

function BoxesTable({ boxes, onChange }) {
  const [unit, setUnit] = useState('cm');
  const upd = (id, k, v) => onChange(boxes.map(b => b._id === id ? {...b, [k]: v} : b));
  const rm  = (id) => onChange(boxes.filter(b => b._id !== id));
  const add = (std) => onChange([...boxes, { ...mkBox(), ...std, qty: 1 }]);
  const addCustom = () => onChange([...boxes, mkBox()]);
  const inp = (w) => ({ padding:'5px 6px',borderRadius:5,border:'1px solid var(--border)',background:'var(--surface2)',fontSize:11,color:'var(--text)',fontFamily:'var(--font-body)',width:w });

  // Display/input conversion only — boxes[].length_cm etc always stay in
  // cm internally (the volumetric weight formula L×W×H÷5000 is cm-based),
  // so switching the toggle never changes what's actually calculated.
  const toDisplay = (cm) => unit === 'in' ? (parseFloat(cm) || 0) / 2.54 : (parseFloat(cm) || 0);
  const fromDisplay = (val) => unit === 'in' ? (parseFloat(val) || 0) * 2.54 : (parseFloat(val) || 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--text4)' }}>Standard sizes — 5-ply corrugated</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Unit:</span>
          <div style={{ display: 'flex', border: '1px solid var(--border2)', borderRadius: 8, overflow: 'hidden' }}>
            <button onClick={() => setUnit('cm')} style={{ padding: '3px 10px', fontSize: 11, border: 'none', cursor: 'pointer', background: unit === 'cm' ? 'var(--gold)' : 'var(--bg)', color: unit === 'cm' ? '#fff' : 'var(--text2)' }}>cm</button>
            <button onClick={() => setUnit('in')} style={{ padding: '3px 10px', fontSize: 11, border: 'none', borderLeft: '1px solid var(--border2)', cursor: 'pointer', background: unit === 'in' ? 'var(--gold)' : 'var(--bg)', color: unit === 'in' ? '#fff' : 'var(--text2)' }}>inch</button>
          </div>
        </div>
      </div>
      {/* Standard sizes quick-add */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STD_BOXES.map(b => (
            <button key={b.label} onClick={() => add(b)} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left' }}>
              <div style={{ fontWeight: 600 }}>{b.label} — {unit === 'in' ? `${(b.length_cm/2.54).toFixed(1)}×${(b.width_cm/2.54).toFixed(1)}×${(b.height_cm/2.54).toFixed(1)} in` : `${b.length_cm}×${b.width_cm}×${b.height_cm} cm`}</div>
              <div style={{ fontSize: 10, color: 'var(--text4)' }}>Vol {b.vol} kg · Box {b.box} kg</div>
            </button>
          ))}
          <button onClick={addCustom} style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, border: '1px dashed var(--border)', background: 'none', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            Custom size
          </button>
        </div>
      </div>

      {boxes.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text4)', fontStyle: 'italic', padding: '8px 0' }}>No boxes added</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Size', `L (${unit})`, `W (${unit})`, `H (${unit})`, 'Vol. wt', 'Box wt', 'Qty', ''].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text3)', fontSize: 10 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {boxes.map(b => {
              const l = parseFloat(b.length_cm) || 0, w = parseFloat(b.width_cm) || 0, h = parseFloat(b.height_cm) || 0;
              const vol = l && w && h ? (l*w*h/5000).toFixed(2)+' kg' : '—';
              const bwt = l && w && h ? (Math.round(2*(l*w+l*h+w*h)/10000*1.1*10)/10).toFixed(1)+' kg' : '—';
              return (
                <tr key={b._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '5px 6px' }}><input value={b.label} onChange={e => upd(b._id,'label',e.target.value)} style={inp(60)} /></td>
                  {['length_cm','width_cm','height_cm'].map(k => (
                    <td key={k} style={{ padding: '5px 6px' }}><input type="number" value={toDisplay(b[k]).toFixed(unit === 'in' ? 2 : 1).replace(/\.0+$/, '')} onChange={e => upd(b._id,k,fromDisplay(e.target.value))} min="0" style={inp(56)} /></td>
                  ))}
                  <td style={{ padding: '5px 8px', color: 'var(--text3)' }}>{vol}</td>
                  <td style={{ padding: '5px 8px', color: 'var(--text3)' }}>{bwt}</td>
                  <td style={{ padding: '5px 6px' }}><input type="number" value={b.qty} onChange={e => upd(b._id,'qty',Math.max(1,parseInt(e.target.value)||1))} min="1" style={inp(46)} /></td>
                  <td style={{ padding: '5px 6px' }}><button onClick={() => rm(b._id)} style={{ background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:16 }}>×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={{ display: 'flex', gap: 8, background: 'rgba(201,168,76,.08)', border: '1px solid rgba(201,168,76,.20)', borderRadius: 6, padding: '9px 11px', fontSize: 12, color: '#C9A84C', marginTop: 10, lineHeight: 1.5 }}>
        <span>ⓘ</span>
        <span>Vol. wt = L×W×H ÷ 5000 · Chargeable = max(actual, vol) + 10% margin · Rounds to 0.5 kg (≤30 kg) or 1 kg (&gt;30 kg)</span>
      </div>
    </div>
  );
}

// ── MAIN PROPOSALBUILDER ──────────────────────────────────────────────────────

export default function ProposalBuilder() {
  const { projectId, proposalId } = useParams();
  const nav  = useNavigate();
  const pdfRef = useRef();

  const [enquiry,    setEnquiry]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [saveError,  setSaveError]  = useState(null);
  const [step,       setStep]       = useState(2);
  const [completed,  setCompleted]  = useState(new Set());
  const [forex,      setForex]      = useState(91.62);

  // Form state
  const [orderType,    setOrderType]    = useState('production');
  const [domain,       setDomain]       = useState('apparel');
  const [shipping,     setShipping]     = useState('dhl');
  const [lineItems,    setLineItems]    = useState([]);
  const [boxes,        setBoxes]        = useState([]);
  const [designDate,   setDesignDate]   = useState('');
  const [sampleDate,   setSampleDate]   = useState('');
  const [bulkDate,     setBulkDate]     = useState('');
  const [conceptPdf,   setConceptPdf]   = useState(null);
  const [conceptPdfName, setConceptPdfName] = useState('');
  const [conceptTitle, setConceptTitle] = useState('');
  const [conceptDesc,  setConceptDesc]  = useState('');
  const [pastProjects, setPastProjects] = useState([]);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [showCreateColl, setShowCreateColl] = useState(false);
  const [rpCurrency, setRpCurrency] = useState('usd');
  const [rpExpanded, setRpExpanded] = useState({});
  const [advPctDesign, setAdvPctDesign] = useState(0.5);
  const [advPctProduction, setAdvPctProduction] = useState(0.5);
  const [phaseNotes, setPhaseNotes] = useState({ designing: '', sampling: '', production: '' });
  const setPhaseNote = (key, val) => setPhaseNotes(n => ({ ...n, [key]: val }));
  const toggleRpExpand = (key) => setRpExpanded(e => ({ ...e, [key]: !e[key] }));
  const [sowClauses,   setSowClauses]   = useState([]);
  const [clarNotes,    setClarNotes]    = useState('');

  const numItems = lineItems.map(it => ({
    ...it,
    qty:              parseFloat(it.qty)              || 0,
    cost_per_pc_inr:  parseFloat(it.cost_per_pc_inr)  || 0,
    weight_per_pc:    parseFloat(it.weight_per_pc)    || 0,
    declared_value_usd: parseFloat(it.declared_value_usd) || 0,
  }));
  const numBoxes = boxes.map(b => ({
    ...b, length_cm: parseFloat(b.length_cm)||0, width_cm: parseFloat(b.width_cm)||0,
    height_cm: parseFloat(b.height_cm)||0, qty: parseInt(b.qty)||1,
  }));
  const result = calcLandingCost({ lineItems: numItems, boxes: numBoxes, domain, orderType, shipping, forex, pfPctByPhase: { designing: 0.04, sampling: 0.10, production: 0.15 }, advancePct: 0.5 });

  // Which order types are present across configured items — drives which
  // sections (boxes, timelines) show.
  const configuredTypes = lineItems.filter(it => it._configured).map(it => it.order_type);
  const hasShippable = configuredTypes.some(t => t && t !== 'designing');
  const hasDesigning = configuredTypes.some(t => t === 'designing');
  const hasProduction = configuredTypes.some(t => t === 'production');

  const reloadCollections = () => {
    setCollectionsLoading(true);
    onboardingAPI.getSellerCollections()
      .then(r => setCollections(r.data || []))
      .catch(() => {})
      .finally(() => setCollectionsLoading(false));
  };

  useEffect(() => {
    fetchForex().then(setForex);
    reloadCollections();
    projectsAPI.getEnquiry(projectId).then(r => {
      const e = r.data.enquiry;
      setEnquiry(e);
      const p = (e.my_proposals || []).find(x => x.id === proposalId);
      if (p) {
        const legacyType   = p.order_type    && p.order_type    !== 'mixed' ? p.order_type    : 'production';
        const legacyDomain = p.product_domain && p.product_domain !== 'mixed' ? p.product_domain : 'apparel';
        setOrderType(legacyType);
        setDomain(legacyDomain);
        setShipping(p.shipping_method     || 'dhl');
        setAdvPctDesign(p.advance_pct_design != null ? parseFloat(p.advance_pct_design) : 0.5);
        setAdvPctProduction(p.advance_pct_production != null ? parseFloat(p.advance_pct_production) : 0.5);
        setPhaseNotes({ designing: '', sampling: '', production: '', ...(p.phase_notes || {}) });
        setLineItems(normalizeItems(p.line_items, legacyType, legacyDomain));
        setBoxes(p.boxes                  || []);
        setDesignDate(p.design_handover_date || '');
        setSampleDate(p.sample_dispatch_date || '');
        setBulkDate(p.bulk_dispatch_date     || '');
        setConceptTitle(p.concept_title      || '');
        setConceptDesc(p.concept_description || '');
        setConceptPdfName(p.concept_pdf_name || '');
        setPastProjects(p.past_projects   || []);
        setSowClauses(p.sow_clauses       || []);
        setClarNotes(p.clarification_notes || '');
        if (p.forex_rate_usd_inr) setForex(sanitizeForex(p.forex_rate_usd_inr));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [projectId, proposalId]);

  const markComplete = (n) => setCompleted(c => new Set([...c, n]));

  const r2 = (v) => v != null ? Math.round(v * 100) / 100 : null;

  const buildPayload = () => ({
    order_type:           summarize(lineItems, 'order_type', orderType),
    product_domain:       summarize(lineItems, 'product_domain', domain),
    shipping_method:      shipping,
    line_items:           lineItems,
    boxes,
    forex_rate_usd_inr:   Math.round(forex * 10000) / 10000,
    calculated_landing_cost_usd: result.hasItems ? r2(result.landingCostUSD) : null,
    studio_payout_inr:    result.hasItems ? r2(result.payoutTotalINR) : null,
    studio_payout_base_inr: result.hasItems ? r2(result.payoutBaseINR) : null,
    studio_payout_gst_inr:  result.hasItems ? r2(result.payoutGSTINR)  : null,
    design_handover_date: designDate || null,
    sample_dispatch_date: sampleDate || null,
    bulk_dispatch_date:   bulkDate   || null,
    concept_title:        conceptTitle,
    concept_description:  conceptDesc,
    past_projects:        pastProjects,
    sow_clauses:          sowClauses,
    clarification_notes:  clarNotes,
    advance_pct:          0.5,
    advance_pct_design:     advPctDesign,
    advance_pct_production: advPctProduction,
    phase_notes:            phaseNotes,
  });

  const saveDraft = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = buildPayload();
      if (conceptPdf) {
        // Has file — use FormData
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== null && v !== undefined)
            fd.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
        });
        fd.append('concept_pdf', conceptPdf);
        await projectsAPI.updateProposal(projectId, proposalId, fd);
      } else {
        // No file — send as JSON so JSONFields parse correctly
        await projectsAPI.updateProposalJSON(projectId, proposalId, payload);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return true;
    } catch (e) {
      // Previously: catch {} swallowed this completely, so submit() below
      // had no way to know the save had failed and proceeded to flip the
      // proposal's status to "submitted" anyway — a submitted proposal
      // with none of the studio's actual data, since it was never
      // persisted. Now surfaced so submit() can stop, and the studio can
      // actually see and retry instead of believing it went through.
      setSaveError(e?.response?.data?.message || e?.response?.data?.errors ? JSON.stringify(e.response.data.errors) : 'Could not save — check your connection and try again.');
      return false;
    } finally { setSaving(false); }
  };

  const goNext = async (n) => {
    const ok = await saveDraft();
    if (!ok) return;
    markComplete(n);
    setStep(n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = (n) => {
    setStep(n - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async () => {
    if (!lineItems.some(it => it.qty && it.cost_per_pc_inr)) {
      alert('Please add at least one item with quantity and cost before submitting.');
      return;
    }
    if (!window.confirm('Submit this proposal to Qala for review? You cannot edit it after submission.')) return;
    setSubmitting(true);
    const saved_ok = await saveDraft();
    if (!saved_ok) {
      setSubmitting(false);
      alert('Your changes could not be saved, so this was not submitted. ' + (saveError || 'Please try again.'));
      return;
    }
    try {
      await projectsAPI.submitProposal(projectId, proposalId);
      nav(`/dashboard/enquiries/${projectId}`);
    } catch { setSubmitting(false); }
  };

  const addPP = () => setPastProjects([...pastProjects, { name: '', description: '', year: '' }]);
  const updPP = (i, k, v) => setPastProjects(pastProjects.map((p, pi) => pi === i ? {...p, [k]: v} : p));
  const rmPP  = (i) => setPastProjects(pastProjects.filter((_, pi) => pi !== i));
  const addSOW = () => setSowClauses([...sowClauses, '']);
  const updSOW = (i, v) => setSowClauses(sowClauses.map((c, ci) => ci === i ? v : c));
  const rmSOW  = (i) => setSowClauses(sowClauses.filter((_, ci) => ci !== i));

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)', fontSize: 14 }}>Loading…</div>;
  if (!enquiry) return <div style={{ padding: 40, color: 'var(--red)', fontSize: 14 }}>Not found.</div>;

  const brief = enquiry.brief || {};
  const stepBtn = { fontSize: 13, padding: '10px 20px' };

  const NavBtns = ({ n, skipLabel, onSkip, continueLabel, onContinue, disableContinue }) => (
    <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', alignItems: 'center' }}>
      {n > 2 && <button onClick={() => goBack(n)} className="btn btn-ghost" style={stepBtn}>← Back</button>}
      {onSkip && <button onClick={onSkip} className="btn btn-ghost" style={{ ...stepBtn, color: 'var(--text3)' }}>{skipLabel || 'Skip for now'}</button>}
      {/* Change 4: save draft available on every step */}
      <button onClick={saveDraft} disabled={saving} className="btn btn-ghost" style={{ ...stepBtn, color: 'var(--text3)', fontSize: 12 }}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save draft'}
      </button>
      <div style={{ flex: 1 }} />
      <button onClick={onContinue || (() => goNext(n))} disabled={disableContinue} className="btn btn-primary" style={stepBtn}>
        {continueLabel || 'Continue →'}
      </button>
    </div>
  );

  // Step content
  const renderStep = () => {
    switch (step) {
      case 2: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>01 — Concept</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Share your creative vision. Upload a PDF — mood references, fabric direction, colour palette, silhouettes.</div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12 }}>Concept title (optional)</label>
            <input value={conceptTitle} onChange={e => setConceptTitle(e.target.value)} placeholder="e.g. Earth Memory" style={{ fontSize: 13 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <SLabel>Concept description</SLabel>
            <textarea rows={4} value={conceptDesc} onChange={e => setConceptDesc(e.target.value)}
              placeholder="Describe your creative direction, materials, mood, colour story…"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div>
            <SLabel>Concept PDF / moodboard</SLabel>
            <input ref={pdfRef} type="file" accept=".pdf,image/*" onChange={e => { const f = e.target.files?.[0]; if(f) { setConceptPdf(f); setConceptPdfName(f.name); } }} style={{ display: 'none' }} />
            {conceptPdfName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{conceptPdfName}</div>
                  {conceptPdf && <div style={{ fontSize: 11, color: 'var(--text4)' }}>{(conceptPdf.size/1024/1024).toFixed(1)} MB · Uploaded</div>}
                </div>
                <button onClick={() => { setConceptPdf(null); setConceptPdfName(''); }} style={{ background: 'none', border: 'none', color: 'var(--text4)', cursor: 'pointer', fontSize: 18 }}>×</button>
              </div>
            ) : (
              <button onClick={() => pdfRef.current?.click()} style={{ width: '100%', padding: '24px', borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--surface2)', color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 13, textAlign: 'center' }}>
                📎 Drop your concept PDF here, or browse<br/>
                <span style={{ fontSize: 11, color: 'var(--text4)' }}>PDF up to 20 MB</span>
              </button>
            )}
          </div>

          <NavBtns n={2} onSkip={() => { markComplete(2); setStep(3); }} />
        </div>
      );

      // ── Step 3: Past projects ──────────────────────────────────────────────
      case 3: {
        // Match-highlight collections against the brief's structured
        // preferences (same fields projects/matching.py scores studios
        // against) — a collection whose products mention a fabric/dye/
        // technique the buyer asked for gets a green "✓ match" tag,
        // matching studio-proposal.html's coll-mtag treatment.
        const briefTerms = [
          ...(brief.preferred_fabrics || []),
          ...(brief.preferred_dyes || []),
          ...(brief.embellishment_required || []),
          ...(brief.printing_required || []),
          ...(brief.weaving_required || []),
          ...(brief.dyeing_techniques_required || []),
          ...(brief.spinning_required || []),
        ].map(t => t.toLowerCase()).filter(Boolean);

        const collectionTags = (coll) => {
          const products = coll.products || [];
          const haystack = products.map(p => [p.fabrics_used, p.dyes_used, p.craft_techniques_used].filter(Boolean).join(' ')).join(' ').toLowerCase();
          const tagSet = new Set();
          products.forEach(p => {
            [p.fabrics_used, p.dyes_used, p.craft_techniques_used].forEach(field => {
              (field || '').split(/[,·]/).map(s => s.trim()).filter(Boolean).forEach(t => tagSet.add(t));
            });
          });
          const tags = Array.from(tagSet).slice(0, 4);
          return tags.map(tag => ({ tag, matched: briefTerms.some(bt => tag.toLowerCase().includes(bt) || bt.includes(tag.toLowerCase())) }));
        };

        const selectedIds = new Set(pastProjects.filter(p => p._collection_id).map(p => p._collection_id));
        const atCap = pastProjects.length >= 3;

        const toggleCollection = (coll) => {
          if (selectedIds.has(coll.id)) {
            setPastProjects(pastProjects.filter(p => p._collection_id !== coll.id));
            return;
          }
          if (atCap) return;
          const products = coll.products || [];
          const firstPhoto = products.find(p => p.photos?.length > 0)?.photos?.[0]?.file || products.find(p => p.photos?.length > 0)?.photos?.[0]?.thumbnail || null;
          const techSummary = [...new Set(products.flatMap(p => [p.fabrics_used, p.craft_techniques_used].filter(Boolean)))].slice(0, 3).join(' · ');
          setPastProjects(prev => [...prev, {
            _collection_id: coll.id,
            name: coll.name,
            year: '',
            description: coll.about || techSummary || `${products.length} piece${products.length !== 1 ? 's' : ''}`,
            image_url: firstPhoto,
          }]);
        };

        return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>03 — Past work</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Show buyer your past work closest to this project. Select from your existing collections, or add a project manually.</div>

          <div style={{ display: 'flex', gap: 10, background: 'var(--admin-dim, var(--gold-dim))', border: '1px solid var(--gold-dim2, var(--border))', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🗂</span>
            <span>Collections and products you add here become part of your <strong>portfolio</strong> — visible to buyers browsing the platform. You can control visibility per item: keep it <strong>private</strong> (only you see it) or mark it <strong>open for collaboration</strong> (buyers can pitch projects around it).</span>
          </div>

          {collectionsLoading ? (
            <div style={{ fontSize: 12, color: 'var(--text4)', padding: '20px 0' }}>Loading your portfolio…</div>
          ) : collections.length > 0 ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Collections</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {collections.map(coll => {
                  const isSelected = selectedIds.has(coll.id);
                  const products = coll.products || [];
                  const thumbs = products.slice(0, 3);
                  const tags = collectionTags(coll);
                  return (
                    <div
                      key={coll.id}
                      onClick={() => toggleCollection(coll)}
                      style={{
                        position: 'relative', border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 12,
                        padding: 14, cursor: atCap && !isSelected ? 'not-allowed' : 'pointer', background: 'var(--surface)',
                        opacity: atCap && !isSelected ? 0.5 : 1, transition: 'border-color .15s',
                      }}
                    >
                      {/* Stacked thumbnails, matching coll-thumbs in the prototype */}
                      <div style={{ position: 'relative', height: 64, marginBottom: 10 }}>
                        {thumbs.length > 0 ? thumbs.map((p, i) => {
                          const photoUrl = p.photos?.[0]?.thumbnail || p.photos?.[0]?.file;
                          return (
                            <div key={p.id} style={{
                              position: 'absolute', left: i * 28, top: 0, width: 56, height: 56, borderRadius: 8,
                              background: photoUrl ? `url(${photoUrl}) center/cover` : 'var(--surface3)',
                              border: '2px solid var(--surface)', zIndex: 3 - i,
                            }} />
                          );
                        }) : (
                          <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧵</div>
                        )}
                      </div>

                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{coll.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 8 }}>{products.length} piece{products.length !== 1 ? 's' : ''}</div>

                      {tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {tags.map(({ tag, matched }, i) => (
                            <span key={i} style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 20,
                              background: matched ? 'var(--green-dim)' : 'var(--surface2)',
                              color: matched ? 'var(--green)' : 'var(--text3)',
                              fontWeight: matched ? 600 : 400,
                            }}>
                              {tag}{matched ? ' ✓' : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {(() => {
                        const vis = coll.visibility || (coll.is_hidden ? 'private' : 'public');
                        const label = vis === 'open_for_collaboration' ? 'Open for collaboration' : vis === 'private' ? 'Private' : 'Public';
                        const bg = vis === 'open_for_collaboration' ? 'var(--green-dim)' : vis === 'private' ? 'var(--surface2)' : 'var(--gold-dim)';
                        const color = vis === 'open_for_collaboration' ? 'var(--green)' : vis === 'private' ? 'var(--text4)' : 'var(--gold)';
                        return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: bg, color }}>{label}</span>;
                      })()}

                      {isSelected && (
                        <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
              {atCap && <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 10 }}>Up to 3 selected — remove one to add another.</div>}
              <button onClick={() => setShowCreateColl(true)} className="btn btn-ghost" style={{ fontSize: 12, marginTop: 14 }}>+ Create new collection</button>
            </div>
          ) : (
            <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '16px 18px', marginBottom: 20, fontSize: 12, color: 'var(--text3)' }}>
              You don't have any portfolio collections yet — add products and collections from your Past Work section, or add a project manually below.
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setShowCreateColl(true)} className="btn btn-ghost" style={{ fontSize: 12 }}>+ Create new collection</button>
              </div>
            </div>
          )}

          {/* Selected / manual entries — still editable after picking from a collection */}
          {pastProjects.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Added to this proposal</div>
              {pastProjects.map((p, i) => (
                <div key={i} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '16px 18px', border: '1px solid var(--border)', position: 'relative', display: 'flex', gap: 14 }}>
                  {p.image_url && (
                    <div style={{ width: 56, height: 56, borderRadius: 8, background: `url(${p.image_url}) center/cover`, flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {p._collection_id && (
                      <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        From portfolio — editable
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 10 }}>
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: 10 }}>Project name</label>
                        <input value={p.name} onChange={e => updPP(i,'name',e.target.value)} placeholder="Project name" style={{ fontSize: 12 }} />
                      </div>
                      <div className="field" style={{ margin: 0 }}>
                        <label style={{ fontSize: 10 }}>Year</label>
                        <input type="number" value={p.year} onChange={e => updPP(i,'year',e.target.value)} placeholder="2024" style={{ fontSize: 12 }} />
                      </div>
                      <button onClick={() => rmPP(i)} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 20, paddingBottom: 4 }}>×</button>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label style={{ fontSize: 10 }}>Brief description / materials / technique</label>
                      <input value={p.description} onChange={e => updPP(i,'description',e.target.value)} placeholder="e.g. Natural dyes · Linen · Handblock print" style={{ fontSize: 12 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pastProjects.length < 3 && (
            <button onClick={addPP} style={{ fontSize: 13, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              + Add a project manually
            </button>
          )}

          <NavBtns n={3} onSkip={() => { markComplete(3); setStep(4); }} />
        </div>
      );}

      // ── Step 4: Costing ────────────────────────────────────────────────────
      case 4: return (
        <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>04 — Offerings & costing</h2>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>Add the items you'll produce and your costs. The buyer's landing cost — including shipping, duties, and Qala's fee — updates live on the right.</div>
            {brief.target_landing_price_usd && (
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>
                Buyer's target landing price <strong>{fmtUSD(parseFloat(brief.target_landing_price_usd))}</strong> per set ≈ <strong>{fmtINR(parseFloat(brief.target_landing_price_usd) * forex)}</strong> at current rate
              </div>
            )}

            {/* Order config — only shipping is global now */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
              <div><SLabel>Shipping method</SLabel><Toggle opts={SHIP_OPTIONS} val={shipping} onChange={setShipping} /></div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text4)', background: 'var(--surface2)', borderRadius: 7, padding: '8px 12px' }}>
                ℹ Shipping, import duties, and insurance are handled end-to-end by Qala. Enter your studio costs only — the calculator adds everything else automatically. Order type and product domain are set per item below.
              </div>
            </div>

            {/* Line items */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
              <SLabel required>Items & costing</SLabel>
              <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 12 }}>Add each product. For every item, pick its order type and domain first, then fill the details. You can mix types and domains in one proposal.</div>
              <LineItemCards items={lineItems} onChange={setLineItems} phaseNotes={phaseNotes} onPhaseNoteChange={setPhaseNote} />
            </div>

            {/* Boxes — shown when any item ships (i.e. not all designing) */}
            {hasShippable && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 16 }}>
                <SLabel>Shipping box details</SLabel>
                <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 12 }}>Box dimensions determine volumetric weight, which affects shipping cost.</div>
                <BoxesTable boxes={boxes} onChange={setBoxes} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, background: 'rgba(91,75,138,0.06)', border: '1px solid rgba(91,75,138,0.18)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              <span style={{ fontSize: 16, flexShrink: 0, color: '#5B4B8A' }}>ℹ</span>
              <span><strong style={{ color: '#5B4B8A' }}>Note —</strong> Shipping and duties are estimated here for <strong>production only</strong>. For sampling, both are billed at actuals after dispatch and are not included in this quote.</span>
            </div>

            <NavBtns n={4}
              disableContinue={!lineItems.some(it => it._configured && it.qty && it.cost_per_pc_inr)}
              continueLabel="Continue →"
            />
        </div>
      );

      // ── Step 5: Timelines ──────────────────────────────────────────────────
      case 5: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>05 — Timelines</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 8 }}>Enter dispatch dates — when goods leave your studio. Qala adds 7 days shipping + 3 days buffer to show estimated delivery.</div>
          <div style={{ fontSize: 12, color: 'var(--text4)', background: 'var(--surface2)', borderRadius: 7, padding: '10px 14px', marginBottom: 24 }}>
            📦 Dates you commit to are <strong>dispatch dates</strong> (when goods leave your studio). Qala handles transit.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {hasDesigning && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Designing</div>
                <div className="field">
                  <label style={{ fontSize: 12 }}>Design completion / handover date</label>
                  <input type="date" value={designDate} onChange={e => setDesignDate(e.target.value)} style={{ fontSize: 13 }} />
                </div>
              </div>
            )}

            {hasShippable && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                  Sampling (all pieces)
                </div>
                {brief.target_sample_delivery_date && (
                  <div style={{ fontSize: 11, color: 'var(--text4)' }}>Buyer's target delivery: {fmtDate(brief.target_sample_delivery_date)}</div>
                )}
              </div>
              <div className="field">
                <label style={{ fontSize: 12 }}>Sample dispatch date (committed)</label>
                <input type="date" value={sampleDate} onChange={e => setSampleDate(e.target.value)} style={{ fontSize: 13 }} />
              </div>
              {sampleDate && (
                <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>
                  Estimated delivery to buyer: {fmtDate(new Date(new Date(sampleDate).getTime() + 10*86400000).toISOString())}
                </div>
              )}
            </div>
            )}

            {hasProduction && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                    Bulk production ({brief.bulk_quantity ? `${brief.bulk_quantity} sets` : ''})
                  </div>
                  {brief.target_bulk_delivery_date && (
                    <div style={{ fontSize: 11, color: 'var(--text4)' }}>Buyer's target delivery: {fmtDate(brief.target_bulk_delivery_date)}</div>
                  )}
                </div>
                <div className="field">
                  <label style={{ fontSize: 12 }}>Bulk dispatch date (committed)</label>
                  <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} style={{ fontSize: 13 }} />
                </div>
                {bulkDate && (
                  <div style={{ fontSize: 11, color: 'var(--teal)', marginTop: 4 }}>
                    Estimated delivery to buyer: {fmtDate(new Date(new Date(bulkDate).getTime() + 10*86400000).toISOString())}
                  </div>
                )}
              </div>
            )}
          </div>

          <NavBtns n={5}
            disableContinue={!sampleDate && !bulkDate && !designDate}
            continueLabel="Continue →"
          />
        </div>
      );

      // ── Step 6: SOW ────────────────────────────────────────────────────────
      case 6: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>06 — Terms (SOW)</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>A standard Qala SOW applies to all engagements. Add project-specific clauses here if needed.</div>

          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>Qala standard SOW</div>
              <span style={{ fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', padding: '2px 8px', borderRadius: 10 }}>Auto-included</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
              The standard Qala Statement of Work governs all projects — covering payment milestones, quality standards, dispute resolution, IP ownership, and delivery obligations. It is automatically attached to every proposal.
            </div>
          </div>

          <SLabel>Project-specific clauses (optional)</SLabel>
          <div style={{ fontSize: 11, color: 'var(--text4)', marginBottom: 14 }}>Add terms specific to this project — material behaviour, craft limitations, process disclosures.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {sowClauses.map((clause, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <textarea rows={2} value={clause} onChange={e => updSOW(i, e.target.value)}
                  placeholder="e.g. Indigo-dyed fabric may exhibit colour bleeding in initial washes, characteristic of natural indigo…"
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical' }} />
                <button onClick={() => rmSOW(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, paddingTop: 6 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={addSOW} style={{ fontSize: 13, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid rgba(200,165,90,0.2)', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            + Add
          </button>

          <NavBtns n={6} onSkip={() => { markComplete(6); setStep(7); }} continueLabel="Review proposal →" />
        </div>
      );

      // ── Step 7: Review & Submit ────────────────────────────────────────────
      case 7: return (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>07 — Review & submit</h2>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Review your proposal before submitting to Qala.</div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            {[
              ['Concept',       conceptTitle || (conceptPdfName ? conceptPdfName : '—')],
              ['Past projects', pastProjects.length > 0 ? `${pastProjects.length} added` : 'Not added'],
              ['Items',         lineItems.filter(it=>it.qty&&it.cost_per_pc_inr).length > 0
                ? `${lineItems.filter(it=>it.qty&&it.cost_per_pc_inr).length} items added`
                : '⚠ None — required'],
              ['Dispatch dates', sampleDate || bulkDate || designDate ? 'Added' : '⚠ None — required'],
              ['Landing cost',   result.hasItems ? fmtUSD(result.landingCostUSD) : '—'],
              ['Studio payout',  result.hasItems ? fmtINR(result.payoutTotalINR) : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 14, color: v.startsWith('⚠') ? 'var(--red)' : 'var(--text)', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Clarifications */}
          <div style={{ marginBottom: 20 }}>
            <SLabel>Clarifications / Questions for Qala</SLabel>
            <textarea rows={3} value={clarNotes} onChange={e => setClarNotes(e.target.value)}
              placeholder="Any questions about the brief, or notes you'd like Qala to pass on to the buyer…"
              style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <button onClick={() => goBack(7)} className="btn btn-ghost" style={stepBtn}>← Back</button>
            <button onClick={saveDraft} disabled={saving} className="btn btn-ghost" style={stepBtn}>
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save draft'}
            </button>
            <button onClick={submit} disabled={submitting || !lineItems.some(it=>it.qty&&it.cost_per_pc_inr)} className="btn btn-primary" style={{ ...stepBtn, padding: '10px 28px' }}>
              {submitting ? 'Submitting…' : 'Submit proposal →'}
            </button>
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ padding: 'clamp(16px,3vw,36px) clamp(14px,4vw,44px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <button onClick={() => nav(`/dashboard/enquiries/${projectId}`)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 10 }}>
            ← Enquiries
          </button>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Qala</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Create Proposal</h1>
          <div style={{ fontSize: 12, color: 'var(--text4)' }}>
            {saving ? '↺ Saving…' : saved ? '✓ Draft saved' : 'Draft'}
          </div>
        </div>
      </div>

      {saveError && (
        <div style={{ background: 'var(--red-dim)', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: 8, padding: '10px 16px', fontSize: 13, marginBottom: 20 }}>
          ⚠ {saveError}
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        {/* Step navigator */}
        <StepNav current={step} onChange={setStep} completedSteps={completed} />

        {/* Step content */}
        <div style={{ flex: 1, minWidth: 0, padding: '0 32px' }}>
          {renderStep()}
        </div>

        {/* Right panel — carbon copy of the prototype's #right-panel */}
        <RightPanel
          step={step} result={result} forex={forex}
          currency={rpCurrency} setCurrency={setRpCurrency}
          exp={rpExpanded} toggleExp={toggleRpExpand}
          advPctDesign={advPctDesign} setAdvPctDesign={setAdvPctDesign}
          advPctProduction={advPctProduction} setAdvPctProduction={setAdvPctProduction}
          enquiry={enquiry} brief={brief}
          designDate={designDate} sampleDate={sampleDate} bulkDate={bulkDate}
        />
      </div>

      {showCreateColl && (
        <CreateCollectionModal
          onClose={() => setShowCreateColl(false)}
          onCreated={() => { setShowCreateColl(false); reloadCollections(); }}
        />
      )}
    </div>
  );
}

// ── Create a new collection — studio-proposal.html's "Create a new
// collection" modal. Real, functional version: name/description/
// visibility plus one or more brand-new pieces added inline (each saved
// via the real addStudioProduct endpoint, then the collection is created
// referencing them via product_ids). This is a genuine gap-fill, not a
// styling pass — this flow did not exist in the builder at all before.
//
// Deliberately trimmed vs. the full prototype: no "pick from your
// existing product library" picker grid here (that needs a separate
// getStudioProducts() fetch this pass didn't wire up), and the optional
// fields section (gender/occasion/season/silhouette/sustainability/care)
// is collapsed-and-omitted rather than built out, to ship the core
// (create collection with new real pieces) rather than nothing. Both are
// straightforward follow-ups against the same real endpoints.
const GARMENT_TYPES = ['Kurta', 'Dress', 'Kaftan', 'Co-ord set', 'Top', 'Jacket', 'Trousers', 'Dupatta', 'Shirt', 'Skirt'];

function CreateCollectionModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [pieces, setPieces] = useState([{ name: '', garment_type: '', fabrics_used: '', dyes_used: '', craft_techniques_used: '' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updatePiece = (i, field, val) => setPieces(ps => ps.map((p, j) => j === i ? { ...p, [field]: val } : p));
  const addPiece = () => setPieces(ps => [...ps, { name: '', garment_type: '', fabrics_used: '', dyes_used: '', craft_techniques_used: '' }]);
  const removePiece = (i) => setPieces(ps => ps.length > 1 ? ps.filter((_, j) => j !== i) : ps);

  const save = async () => {
    if (!name.trim()) { setError('Collection name is required.'); return; }
    const validPieces = pieces.filter(p => p.name.trim() && p.garment_type);
    if (validPieces.length === 0) { setError('Add at least one piece with a name and garment type.'); return; }
    setSaving(true);
    setError('');
    try {
      const productIds = [];
      for (const p of validPieces) {
        const r = await onboardingAPI.addStudioProduct(undefined, {
          name: p.name.trim(),
          garment_type: p.garment_type,
          fabrics_used: p.fabrics_used || null,
          dyes_used: p.dyes_used || null,
          craft_techniques_used: p.craft_techniques_used || null,
        });
        productIds.push(r.data.id);
      }
      await onboardingAPI.addCollection(undefined, {
        name: name.trim(),
        about: about.trim() || null,
        visibility,
        product_ids: productIds,
      });
      onCreated();
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not create the collection — please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 14, maxWidth: 560, width: '100%', maxHeight: '86vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Create a new collection</div>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20, color: 'var(--text4)' }}>×</span>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Collection name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SS26 Resort Collection"
            style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 13, marginBottom: 18, boxSizing: 'border-box' }} />

          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Pieces in this collection</div>
          {pieces.map((p, i) => (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>Piece {i + 1}</span>
                {pieces.length > 1 && <span onClick={() => removePiece(i)} style={{ cursor: 'pointer', color: 'var(--red)', fontSize: 12 }}>Remove</span>}
              </div>
              <input value={p.name} onChange={e => updatePiece(i, 'name', e.target.value)} placeholder="Product name *"
                style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid var(--border2)', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {GARMENT_TYPES.map(g => (
                  <span key={g} onClick={() => updatePiece(i, 'garment_type', g)}
                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, cursor: 'pointer', border: `1px solid ${p.garment_type === g ? 'var(--gold-d)' : 'var(--border2)'}`, background: p.garment_type === g ? 'var(--gold)' : '#fff', color: p.garment_type === g ? '#fff' : 'var(--text2)' }}>
                    {g}
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input value={p.fabrics_used} onChange={e => updatePiece(i, 'fabrics_used', e.target.value)} placeholder="Fabrics used"
                  style={{ padding: '8px 11px', borderRadius: 7, border: '1px solid var(--border2)', fontSize: 13, boxSizing: 'border-box' }} />
                <input value={p.dyes_used} onChange={e => updatePiece(i, 'dyes_used', e.target.value)} placeholder="Dyes used"
                  style={{ padding: '8px 11px', borderRadius: 7, border: '1px solid var(--border2)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <input value={p.craft_techniques_used} onChange={e => updatePiece(i, 'craft_techniques_used', e.target.value)} placeholder="Craft techniques used"
                style={{ width: '100%', padding: '8px 11px', borderRadius: 7, border: '1px solid var(--border2)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          ))}
          <button onClick={addPiece} className="btn btn-ghost" style={{ fontSize: 12, marginBottom: 18 }}>+ Add another piece</button>

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Description <span style={{ fontWeight: 400, color: 'var(--text4)' }}>(optional)</span></label>
          <textarea value={about} onChange={e => setAbout(e.target.value)} rows={3} placeholder="What makes this collection special? Describe the craft process, inspiration, materials…"
            style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 13, marginBottom: 18, resize: 'vertical', boxSizing: 'border-box' }} />

          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>Visibility</label>
          <select value={visibility} onChange={e => setVisibility(e.target.value)}
            style={{ width: '100%', padding: '10px 13px', borderRadius: 8, border: '1px solid var(--border2)', fontSize: 13 }}>
            <option value="public">Public — visible to any buyer</option>
            <option value="private">Private — proposal-only</option>
            <option value="open_for_collaboration">Open for collaboration</option>
          </select>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? 'Creating…' : 'Create collection'}</button>
        </div>
      </div>
    </div>
  );
}