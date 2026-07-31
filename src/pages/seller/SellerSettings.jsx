// src/pages/seller/SellerSettings.jsx
//
// Rebuilt against seller-console__2_.html's Settings view — Banking &
// Payouts, Compliance Status, Account. Banking + compliance fields are
// real (StudioDetails.bank_*/gstin/pan_number/iec_code, added this
// session) and save through the same onboardingAPI.patchStudio endpoint
// used elsewhere.
//
// Honest gap: "Notification Preferences" has no backing at all — no
// notification-settings model or endpoint exists anywhere in the
// backend. Rather than fake toggles that look saved but do nothing, this
// section is shown with a clear "not yet available" note instead of
// silently-broken buttons. Same for "Delete Account" — no account
// deletion endpoint exists; the button is present but disabled with an
// explanation rather than pretending to work.

import { useState } from 'react';
import { onboardingAPI } from '../../api/client';

const S = {
  topbar: { height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px' },
  content: { padding: 28 },
  h1: { fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginBottom: 6 },
  sub: { fontSize: 13, color: 'var(--text3)', marginBottom: 20 },

  formCard: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  formCardHeader: { padding: '14px 20px', borderBottom: '1px solid var(--border)' },
  formCardBody: { padding: 20 },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 },
  input: { width: '100%', background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 7, fontSize: 13, color: 'var(--text)', padding: '8px 11px', outline: 'none', boxSizing: 'border-box' },

  card: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' },
  cardHeader: { padding: '14px 20px', borderBottom: '1px solid var(--border)' },

  accountRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' },
  accountRowInfo: { fontSize: 13 },

  complianceItem: { display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 0', borderBottom: '1px solid var(--border)' },
  complianceIcon: (ok) => ({ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, background: ok ? 'var(--green-dim)' : 'var(--amber-dim)', color: ok ? 'var(--green)' : 'var(--amber)' }),

  infoNote: { fontSize: 11, color: 'var(--text4)', padding: '10px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', lineHeight: 1.5 },
};

export default function SellerSettings({ snapshot, profileId, onSave, userEmail }) {
  const sd = snapshot?.studio_details || {};
  const [form, setForm] = useState(sd);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await onboardingAPI.patchStudio(profileId, {
        bank_name: form.bank_name, bank_branch: form.bank_branch,
        bank_account_number: form.bank_account_number, bank_ifsc: form.bank_ifsc,
        bank_account_holder: form.bank_account_holder,
        gstin: form.gstin, pan_number: form.pan_number, iec_code: form.iec_code,
      });
      onSave?.();
    } finally { setSaving(false); }
  };

  const compliance = [
    ['GSTIN', form.gstin],
    ['PAN', form.pan_number],
    ['Bank Account', form.bank_account_number],
    ['Master Studio Contract', form.master_contract_signed_at],
    ['IEC Export Code', form.iec_code],
  ];

  return (
    <div>
      <div style={S.topbar}><div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Settings</div></div>
      <div style={S.content}>
        <h1 style={S.h1}>Account Settings</h1>
        <p style={S.sub}>Manage your banking and compliance details.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
          <div>
            <div style={S.formCard}>
              <div style={S.formCardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Banking & Payouts</h3><p style={{ fontSize: 12, color: 'var(--text3)' }}>Qala pays you in INR to your registered account</p></div>
              <div style={S.formCardBody}>
                <div style={S.row2}>
                  <div><label style={S.label}>Bank Name</label><input style={S.input} type="text" value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} /></div>
                  <div><label style={S.label}>Branch</label><input style={S.input} type="text" value={form.bank_branch || ''} onChange={e => set('bank_branch', e.target.value)} /></div>
                </div>
                <div style={S.row2}>
                  <div><label style={S.label}>Account Number</label><input style={S.input} type="text" value={form.bank_account_number || ''} onChange={e => set('bank_account_number', e.target.value)} /></div>
                  <div><label style={S.label}>IFSC Code</label><input style={S.input} type="text" value={form.bank_ifsc || ''} onChange={e => set('bank_ifsc', e.target.value)} /></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>Account Holder Name</label>
                  <input style={S.input} type="text" value={form.bank_account_holder || ''} onChange={e => set('bank_account_holder', e.target.value)} />
                </div>
                <div style={S.row2}>
                  <div><label style={S.label}>GSTIN</label><input style={S.input} type="text" value={form.gstin || ''} onChange={e => set('gstin', e.target.value)} /></div>
                  <div><label style={S.label}>PAN</label><input style={S.input} type="text" value={form.pan_number || ''} onChange={e => set('pan_number', e.target.value)} /></div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={S.label}>IEC Export Code <span style={{ color: 'var(--text4)', fontWeight: 400 }}>(recommended)</span></label>
                  <input style={S.input} type="text" value={form.iec_code || ''} onChange={e => set('iec_code', e.target.value)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-outline btn-sm" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Update Details'}</button>
                </div>
              </div>
            </div>

            <div style={S.formCard}>
              <div style={S.formCardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Notification Preferences</h3><p style={{ fontSize: 12, color: 'var(--text3)' }}>Choose how Qala reaches you</p></div>
              {['New enquiry alerts', 'Proposal status updates', 'Payment notifications', 'Dispatch reminders'].map(label => (
                <div key={label} style={{ ...S.accountRow, padding: '14px 20px' }}>
                  <div style={S.accountRowInfo}><strong>{label}</strong></div>
                  <button className="btn btn-sm btn-outline" disabled title="Not yet available — no notification-preferences system exists in the backend yet">Not available</button>
                </div>
              ))}
              <div style={S.infoNote}>Notification preferences aren't backed by a real system yet — these controls are shown for reference but don't save anything. Needs a notification-settings model before they can be made real.</div>
            </div>
          </div>

          <div>
            <div style={{ ...S.card, marginBottom: 16 }}>
              <div style={S.cardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Compliance Status</h3></div>
              <div style={{ padding: '4px 20px 16px' }}>
                {compliance.map(([label, val]) => (
                  <div key={label} style={S.complianceItem}>
                    <div style={S.complianceIcon(!!val)}>{val ? '✓' : '!'}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{val ? 'On file' : 'Not added yet'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={S.card}>
              <div style={S.cardHeader}><h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>Account</h3></div>
              <div style={{ padding: '4px 20px 16px' }}>
                <div style={S.accountRow}>
                  <div style={S.accountRowInfo}><strong>Login Email</strong><div style={{ fontSize: 12, color: 'var(--text3)' }}>{userEmail || '—'}</div></div>
                </div>
                <div style={{ ...S.accountRow, borderBottom: 'none' }}>
                  <div style={S.accountRowInfo}><strong>Delete Account</strong><div style={{ fontSize: 12, color: 'var(--text3)' }}>Remove your studio from Qala</div></div>
                  <button className="btn btn-sm" style={{ background: 'transparent', color: 'var(--text4)', border: '1px solid var(--border2)' }} disabled title="Not yet available — no account-deletion endpoint exists in the backend yet">Not available</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}