type LegalPageKind = 'privacy' | 'terms' | 'returns'

type PolicySection = { heading: string; body: string }
type Policy = { title: string; updated: string; sections: PolicySection[] }

const policies: Record<LegalPageKind, Policy> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: April 2026',
    sections: [
      { heading: '1. Information We Collect', body: 'We collect information you provide directly to us when you submit inquiry forms, contact us by phone or email, or otherwise communicate with us. This includes your name, email address, phone number, and any other information you choose to provide.' },
      { heading: '2. How We Use Your Information', body: 'We use the information we collect to respond to your inquiries, process orders, send transactional and promotional communications, and improve our services. We do not sell your personal information to third parties.' },
      { heading: '3. Cookies', body: 'Our website uses essential browser storage only for features such as saved inventory settings and form interactions. You may clear this data in your browser settings.' },
      { heading: '4. Data Security', body: 'We implement industry-standard security measures to protect your information. All form submissions are handled via SSL-encrypted connections.' },
      { heading: '5. Contact', body: 'Questions? Contact the RetroDrive USA team through the contact details listed on our About page.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: April 2026',
    sections: [
      { heading: '1. Acceptance of Terms', body: 'By accessing and using this website, you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use this site.' },
      { heading: '2. Product Availability', body: 'RetroDrive USA reserves the right to modify inventory, pricing, and availability without prior notice. All listed vehicles are subject to prior sale.' },
      { heading: '3. Accurate Information', body: 'All specifications and pricing are sourced from manufacturers and verified at time of listing. We are not liable for typographical errors or manufacturer-level changes.' },
      { heading: '4. Payment & Orders', body: 'Order confirmation is subject to payment verification and stock availability. We reserve the right to cancel orders, with a full refund issued.' },
      { heading: '5. Governing Law', body: 'These terms are governed by the laws of the State of Washington, USA.' },
      { heading: '6. Contact', body: 'For questions about these terms, contact the RetroDrive USA team through the contact details listed on our About page.' },
    ],
  },
  returns: {
    title: 'Return & Refund Policy',
    updated: 'Last updated: April 2026',
    sections: [
      { heading: '7-Day Return Window', body: 'All vehicles purchased from RetroDrive USA are eligible for a full refund within 7 calendar days of confirmed delivery, provided the vehicle has not been driven and is returned in the same condition as delivered.' },
      { heading: 'Condition Requirements', body: 'Returned vehicles must be in original condition with no significant additional mileage, no damage, and include all original documentation, keys, and accessories.' },
      { heading: 'How to Initiate a Return', body: 'Contact us within 7 days of delivery using the contact details listed on our About page. Our team will coordinate pickup within 1–2 business days.' },
      { heading: 'Refund Processing', body: 'Once the vehicle is received and inspected, your refund will be processed within 5–7 business days to your original payment method.' },
      { heading: 'Technical Support', body: 'For any questions or technical assistance with your classic vehicle, our service specialists are available to guide you.' },
    ],
  },
}

export default function LegalPage({ page, go }: { page: LegalPageKind; go: (href: string) => void }) {
  const policy = policies[page]

  return <section className="hollywood-legal-page">
    <div className="hollywood-legal wrap-wide">
      <header className="hollywood-legal-heading">
        <p>Legal</p>
        <h1>{policy.title}</h1>
        <span>{policy.updated}</span>
      </header>
      <div className="hollywood-legal-copy">
        {policy.sections.map((section) => <section key={section.heading}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </section>)}
      </div>
      <div className="hollywood-legal-back"><button onClick={() => go('/')}>← Back to Home</button></div>
    </div>
  </section>
}
