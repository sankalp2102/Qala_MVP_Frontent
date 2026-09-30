// src/pages/legal/RefundCancellationPolicy.jsx
//
// Content transcribed verbatim from "Qala Studio - Refund & Cancellation
// Policy" (last updated 1 June 2026) — wording is not altered, only laid
// out as HTML (headings, a real table, numbered/bulleted lists) instead
// of PDF paragraphs.
import LegalPageLayout, { LegalSection, LegalList } from './LegalPageLayout';

const cancelRows = [
  ['Before sampling starts', 'Full refund of amounts paid'],
  ['After sampling starts, before design lock', 'Everything except design and sampling costs incurred'],
  ['After design lock, before dispatch', 'Amounts paid, minus materials bought, work completed, and a 15% cancellation fee on the remaining order value'],
  ['After dispatch', 'Order cannot be cancelled'],
];

function CancelTable() {
  return (
    <div style={{ overflowX: 'auto', margin: '16px 0', border: '0.5px solid var(--border-warm-s)', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr style={{ background: 'var(--surface, #F7F5F2)' }}>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: 'var(--ink-warm)', borderBottom: '0.5px solid var(--border-warm-s)' }}>When you cancel</th>
            <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: 'var(--ink-warm)', borderBottom: '0.5px solid var(--border-warm-s)' }}>What you get back</th>
          </tr>
        </thead>
        <tbody>
          {cancelRows.map(([when, back], i) => (
            <tr key={i} style={{ borderBottom: i < cancelRows.length - 1 ? '0.5px solid var(--border-warm-s)' : 'none' }}>
              <td style={{ padding: '12px 16px', color: 'var(--ink-warm)', fontWeight: 500, verticalAlign: 'top', width: '38%' }}>{when}</td>
              <td style={{ padding: '12px 16px', color: 'var(--ink-warm-mid)', verticalAlign: 'top' }}>{back}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RefundCancellationPolicy() {
  return (
    <LegalPageLayout
      title="Refund &amp; Cancellation Policy"
      lastUpdated="1 June 2026"
      otherPolicy={{ to: '/terms', label: 'Terms & Conditions' }}
    >
      <p style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--ink-warm-mid)' }}>
        This policy applies to custom manufacturing orders placed through qala.studio, operated by Qala
        Technologies Private Limited. It forms part of our{' '}
        <a href="/terms" style={{ color: 'var(--qw)', textDecoration: 'underline' }}>Terms &amp; Conditions</a>.
      </p>

      <LegalSection n={1} title="Cancelling an order">
        <CancelTable />
        <p>
          Design lock is when you approve the final sample for production. Materials bought for your order
          stay with the Studio.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Cancellation by the Studio or by us">
        <p>
          If a Studio cancels for reasons within its control, you receive a full refund of all payments for
          that order. We will also help you find an alternative Studio.
        </p>
        <p style={{ marginTop: 10 }}>
          If we cannot fulfil your order for any other reason, we refund everything paid for the
          undelivered items.
        </p>
      </LegalSection>

      <LegalSection n={3} title="Damaged or defective goods">
        <LegalList ordered items={[
          <><strong>Damage in transit:</strong> report within 48 hours of delivery, with photos of the packaging and the items.</>,
          <><strong>Defects:</strong> report within 7 days of delivery, with photos showing how the items differ from the approved sample.</>,
          'After reviewing your claim, we will arrange rework, replacement, a credit note or a refund for the affected items.',
        ]} />
        <p style={{ marginTop: 14 }}>
          Small variations in colour, weave, print or embroidery are a natural feature of handmade products
          and are not defects.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Returns">
        <p>
          As every order is made to your specification, we do not accept returns for change of mind,
          over-ordering or unsold stock. Items must not be returned without our written approval.
        </p>
      </LegalSection>

      <LegalSection n={5} title="How refunds are paid">
        <LegalList ordered items={[
          'Approved refunds are processed within 7 business days of approval.',
          'Refunds go to the original payment method. Your bank or card issuer may take a further 5 to 10 business days to show the amount.',
          'Refunds are made in the currency of the original payment. We are not responsible for exchange-rate differences or charges applied by your bank.',
        ]} />
      </LegalSection>

      <LegalSection n={6} title="How to request a cancellation or refund">
        <p>
          Email <a href="mailto:business@qala.global" style={{ color: 'var(--qw)' }}>business@qala.global</a> with
          your order details, the items affected and the reason. Include photos for damage or defect
          claims. We acknowledge requests within 2 business days.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Contact us">
        <p style={{ margin: 0 }}>
          Qala Technologies Private Limited<br />
          1001, Block D, Amoda Valmark, Ramanshree Nagar Phase 2, Gottigere, Bangalore 560083, Karnataka, India<br />
          Email: <a href="mailto:business@qala.global" style={{ color: 'var(--qw)' }}>business@qala.global</a><br />
          Phone: +91 99030 87801
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}