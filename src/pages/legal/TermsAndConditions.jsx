// src/pages/legal/TermsAndConditions.jsx
//
// Content transcribed verbatim from "Qala Studio - Terms & Conditions"
// (last updated 1 June 2026) — wording is not altered, only laid out as
// HTML (headings, numbered sections, lists) instead of PDF paragraphs.
import LegalPageLayout, { LegalSection, LegalList } from './LegalPageLayout';

export default function TermsAndConditions() {
  return (
    <LegalPageLayout
      title="Terms &amp; Conditions"
      lastUpdated="1 June 2026"
      otherPolicy={{ to: '/refund-policy', label: 'Refund & Cancellation Policy' }}
    >
      <p style={{ fontSize: 14.5, lineHeight: 1.75, color: 'var(--ink-warm-mid)' }}>
        These Terms &amp; Conditions govern your use of qala.studio and any order placed through it.
        Qala is operated by Qala Technologies Private Limited (CIN U46411KA2024PTC194774), a company
        incorporated in India (&ldquo;Qala&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an
        account, placing an order or making a payment, you (&ldquo;Buyer&rdquo;, &ldquo;you&rdquo;) agree
        to these terms.
      </p>

      <LegalSection n={1} title="Our services">
        <p>
          Qala is a platform for custom, small-batch manufacturing. We connect fashion and lifestyle
          brands with independent, designer-led craft studios in India (&ldquo;Studios&rdquo;). We match
          your brief to suitable Studios and manage the process from design and sampling through
          production, quality checks, payments, export and delivery.
        </p>
        <p style={{ marginTop: 10 }}>
          Studios manufacture the products. Qala coordinates the order, handles communication and
          payments, and arranges logistics.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Accounts">
        <p>
          You must give accurate business details and keep your login secure. You are responsible for
          all activity on your account. We may suspend accounts that break these terms.
        </p>
      </LegalSection>

      <LegalSection n={3} title="How orders work">
        <LegalList ordered items={[
          <><strong>Brief:</strong> you share your requirements, designs and reference material.</>,
          <><strong>Proposal:</strong> we propose one or more Studios, with pricing, minimums and timelines.</>,
          <><strong>Design and sampling:</strong> once you accept a proposal and pay the sampling fee or deposit, the Studio develops samples with you.</>,
          <><strong>Design lock:</strong> you approve the final sample. The approved sample becomes the quality standard for production.</>,
          <><strong>Production, quality check and delivery:</strong> the Studio produces your order, we check it against the approved sample, and we ship it to you.</>,
        ]} />
        <p style={{ marginTop: 14 }}>
          Each order is confirmed by a proforma invoice or purchase order stating the products, quantities,
          prices, payment milestones and expected delivery date.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Pricing and billing">
        <LegalList ordered items={[
          'Prices are quoted in US Dollars (USD) unless the proforma invoice says otherwise.',
          <>Quoted prices include Qala&rsquo;s service fee. The proforma invoice states what else is included, such as shipping, duties and taxes. Anything not stated as included is your responsibility, including import duties and taxes in your country.</>,
          'Payments are made in milestones set out in your proforma invoice, typically a deposit to start and the balance before dispatch. Sampling fees are payable before sampling begins.',
          'Payments are processed through third-party payment gateways. We do not store your card or bank details.',
          'We issue a final commercial invoice once the order is fully paid.',
        ]} />
      </LegalSection>

      <LegalSection n={5} title="Production and delivery">
        <LegalList ordered items={[
          'Delivery dates are estimates and run from design lock and receipt of the relevant payment.',
          'We will tell you promptly about any expected delay. If production is delayed more than 30 days beyond the stated delivery date for reasons within the Studio\u2019s control, you may cancel for a refund of amounts paid for the undelivered items.',
          'Handmade and hand-finished products may show small variations in colour, weave, print or embroidery. These are a natural feature of the craft and are not defects.',
        ]} />
      </LegalSection>

      <LegalSection n={6} title="Cancellations and refunds">
        <p>
          Cancellations, returns and refunds are governed by our{' '}
          <a href="/refund-policy" style={{ color: 'var(--qw)', textDecoration: 'underline' }}>Refund &amp; Cancellation Policy</a>,
          which forms part of these terms.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Intellectual property">
        <LegalList ordered items={[
          'Your designs, tech packs, mood boards and brand assets remain yours. Studios may use them only to fulfil your order.',
          'New designs developed for you during the order belong to you once the order is fully paid, unless your proforma invoice or purchase order says otherwise.',
          'Studios keep ownership of their existing craft techniques and production methods.',
          'Content on qala.studio, including Studio profiles and images, belongs to Qala or the Studios and may not be copied.',
        ]} />
      </LegalSection>

      <LegalSection n={8} title="Confidentiality">
        <p>
          We and the Studios keep your designs and order details confidential. You agree to keep Studio
          pricing, production methods and contact details shared through Qala confidential.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Working through Qala">
        <p>
          For 12 months after we introduce you to a Studio, you agree to place orders with that Studio
          through Qala and not directly.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Limitation of liability">
        <p>
          To the extent permitted by law, our total liability for any order is limited to the amount you
          paid for that order. We are not liable for indirect or consequential losses, including lost
          profits or lost sales.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Events outside our control">
        <p>
          We are not responsible for delays or failures caused by events outside our reasonable control,
          including natural disasters, strikes, pandemics, government action, customs holds or carrier
          disruptions.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Governing law and disputes">
        <p>
          These terms are governed by the laws of India. The courts at Bengaluru, Karnataka have exclusive
          jurisdiction. We encourage you to contact us first so we can try to resolve any concern directly.
        </p>
      </LegalSection>

      <LegalSection n={13} title="Changes to these terms">
        <p>
          We may update these terms from time to time. The version in force when you place an order
          applies to that order.
        </p>
      </LegalSection>

      <LegalSection n={14} title="Contact us">
        <p style={{ margin: 0 }}>
          Qala Technologies Private Limited<br />
          1001, Block D, Amoda Valmark, Ramanshree Nagar Phase 2, Gottigere, Bangalore 560083, Karnataka, India<br />
          Email: <a href="mailto:business@qala.global" style={{ color: 'var(--qw)' }}>business@qala.global</a><br />
          Phone: +91 99030 87801<br />
          Grievance Officer: Roshan Joshi (<a href="mailto:business@qala.global" style={{ color: 'var(--qw)' }}>business@qala.global</a>)
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}