type LegalPageKind = 'privacy' | 'terms' | 'returns'

type PolicySection = { heading: string; body: string }
type Policy = { title: string; updated: string; sections: PolicySection[] }

const policies: Record<LegalPageKind, Policy> = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: August 2026',
    sections: [
      { heading: '1. Information We Collect', body: 'We collect the information you choose to provide when you submit an inquiry, request financing or transport information, join the arrival list, or contact B & B Auto Exchange. This can include your name, email address, phone number, and vehicle-related message.' },
      { heading: '2. How We Use Your Information', body: 'We use this information to respond to your request, discuss a vehicle or transaction, provide requested updates, and improve our service. We do not sell your personal information.' },
      { heading: '3. Browser Storage', body: 'This website uses essential browser storage for features such as saved inventory and form interactions. You can clear this data through your browser settings.' },
      { heading: '4. Data Security', body: 'We use reasonable technical safeguards for information submitted through this website. Do not send sensitive payment or identity documents through general website forms unless B & B gives you a secure method to do so.' },
      { heading: '5. Contact', body: 'Questions about privacy can be sent to B & B Auto Exchange through the contact details on the About page.' },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: August 2026',
    sections: [
      { heading: '1. Website Use', body: 'By using this website, you agree to use it lawfully and to provide accurate contact information when submitting a request.' },
      { heading: '2. Vehicle Availability', body: 'B & B Auto Exchange may update inventory, pricing, descriptions, and availability at any time. Every vehicle is subject to prior sale and is available only when confirmed directly by B & B.' },
      { heading: '3. Listing Information', body: 'Vehicle information is provided for general reference. Buyers should review the details for the specific vehicle and ask any questions before entering into a transaction.' },
      { heading: '4. Financing and Transport', body: 'Payment estimates and delivery estimates are planning tools, not offers of credit, final quotes, or guarantees. Final terms are confirmed for the specific transaction.' },
      { heading: '5. Transaction Documents', body: 'A purchase is governed by the final written documents provided for that vehicle. Those documents control if they differ from website information.' },
      { heading: '6. Contact', body: 'For questions about these terms, contact B & B Auto Exchange through the contact details on the About page.' },
    ],
  },
  returns: {
    title: 'Purchase & Delivery Terms',
    updated: 'Last updated: August 2026',
    sections: [
      { heading: 'Vehicle-Specific Terms', body: 'Retro and classic vehicles are unique. Deposit, purchase, cancellation, title, delivery, and any return terms are provided and agreed for the specific vehicle transaction.' },
      { heading: 'Before You Commit', body: 'Review the available vehicle information, ask questions about condition and documentation, and make sure the agreed terms are reflected in the final transaction documents.' },
      { heading: 'Delivery Coordination', body: 'If transport is arranged, the confirmed carrier, route, timing, and handoff details are provided for the specific vehicle. Website delivery estimates are starting points only.' },
      { heading: 'Questions About an Agreement', body: 'Contact B & B Auto Exchange promptly if you have questions about a vehicle, a deposit, delivery, or the documents for your transaction.' },
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
