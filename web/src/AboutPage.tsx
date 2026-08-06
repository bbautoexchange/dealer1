import { useEffect, useState } from 'react'
import { getAboutContent, getSiteSettings, getTrustedNetwork } from './api'
import type { AboutContent, SiteSettingsContent, TrustedNetworkContent } from './types'

type Props = { go: (href: string) => void }
const trustIconSources: Record<string, string> = { licensed: '/trust-icons/licensed.svg', authorized: '/trust-icons/authorized.svg', certified: '/trust-icons/certified.svg', '01': '/trust-icons/licensed.svg', '02': '/trust-icons/authorized.svg', '03': '/trust-icons/certified.svg' }

const fallback: AboutContent = {
  eyebrow: 'Who we are',
  title: 'ABOUT RETRODRIVE USA',
  intro: 'A classic-car buying experience built around clear information, responsive communication, and nationwide coordination.',
  story: {
    title: 'Our Story',
    paragraphs: ['RetroDrive USA is built for people who care about the character, history, and driving feel that make a classic vehicle memorable.', 'We focus on clear vehicle information, direct answers, and a purchase process that works whether you are nearby or across the country.', 'Each conversation starts with the details that matter to you: the vehicle, its condition, your timeline, and the next step.'],
    imageCaption: 'The RetroDrive standard: clear details and a thoughtful buying experience.',
    licenseTitle: 'Classic vehicle specialists',
    licenseDetail: 'Vehicle, documentation, and delivery details are reviewed with you before the next step.',
  },
  contact: {
    title: 'Contact & Location', addressLabel: 'Showroom address', address: 'Contact RetroDrive for showroom details and appointments.', phoneLabel: 'Phone', phone: 'Call us to discuss a vehicle', phoneDetail: 'Appointments and calls are coordinated directly with the RetroDrive team.', emailLabel: 'Email', email: 'info@retrodriveusa.com', emailDetail: 'We respond as soon as possible during business hours.', hoursLabel: 'Business hours', hours: 'By appointment · Monday–Saturday',
  },
  stats: [{ value: 'Collector focused', label: 'Vehicle selection', detail: 'Classic, muscle & performance' }, { value: 'Nationwide', label: 'Delivery coordination', detail: 'Across the United States' }, { value: 'Direct', label: 'Specialist support', detail: 'Clear answers at every step' }, { value: 'Documented', label: 'Vehicle details', detail: 'History and condition context' }],
}

function phoneHref(value: string) {
  const number = value.replace(/[^\d+]/g, '')
  return number.replace(/\D/g, '').length >= 7 ? `tel:${number}` : undefined
}

export default function AboutPage({ go }: Props) {
  const [content, setContent] = useState<AboutContent | null>(null)
  const [trustedNetwork, setTrustedNetwork] = useState<TrustedNetworkContent | null>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettingsContent | null>(null)
  useEffect(() => { void getAboutContent().then(setContent).catch(() => setContent(fallback)); void getTrustedNetwork().then(setTrustedNetwork); void getSiteSettings().then(setSiteSettings) }, [])
  if (!content) return <section className="about-loading">Loading RetroDrive story…</section>
  const { story, contact: aboutContact } = content
  const address = siteSettings?.showroomAddress ?? aboutContact.address
  const phoneValue = siteSettings?.phone ?? aboutContact.phone
  const hours = siteSettings?.showroomHours ?? aboutContact.hours
  const contact = { ...aboutContact, address, phone: phoneValue, hours }
  const hasMap = !address.toLowerCase().startsWith('contact retrodrive')
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
  const phone = phoneHref(phoneValue)
  const addressLines = address.split(/\n|<br\s*\/?\s*>/i)
  const credential = trustedNetwork?.credentials[0]
  const credentialIcon = credential ? trustIconSources[credential.icon.trim().toLowerCase()] : undefined

  return <main className="hollywood-about">
    <section className="about-hero wrap-wide"><p className="garage-kicker">{content.eyebrow}</p><h1>{content.title}</h1><p>{content.intro}</p></section>
    <section className="about-main wrap-wide">
      <article className="about-story"><h2>{story.title}</h2>{story.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}<figure><img src="/about/classic-warehouse.jpg" alt="Classic vehicles in the RetroDrive collection" /><figcaption>{story.imageCaption}</figcaption></figure><div className="about-license"><span className="about-license-icon">{credentialIcon ? <img src={credentialIcon} alt="" /> : '✓'}</span><div><strong>{credential?.title ?? story.licenseTitle}</strong><p>{credential?.detail ?? story.licenseDetail}</p></div><b>{credential?.status ?? 'Verified'}</b></div></article>
      <aside className="about-contact"><h2>{contact.title}</h2><ContactItem icon="⌖" title={contact.addressLabel}><p>{addressLines.map((line, index) => <span key={`${index}-${line}`}>{line}{index < addressLines.length - 1 && <br />}</span>)}</p>{hasMap && <a href={mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps →</a>}</ContactItem><ContactItem icon="☎" title={contact.phoneLabel}>{phone ? <a href={phone}>{contact.phone}</a> : <p>{contact.phone}</p>}<small>{contact.phoneDetail}</small></ContactItem><ContactItem icon="@" title={contact.emailLabel}><a href={`mailto:${contact.email}`}>{contact.email}</a><small>{contact.emailDetail}</small></ContactItem><ContactItem icon="◷" title={contact.hoursLabel}><p>{contact.hours}</p></ContactItem>{(phone || contact.email) && <div className="about-contact-actions">{phone && <a className="amber-button" href={phone}>Call now <span>→</span></a>}<a className="about-email-button" href={`mailto:${contact.email}`}>Email us</a></div>}</aside>
    </section>
    <section className="about-map wrap-wide">{hasMap ? <><header><strong>{content.title}</strong><span>{contact.address}</span></header><iframe title={`${content.title} location`} src={mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></> : <div className="about-map-placeholder">Set your showroom address in Render to display the location map.</div>}</section>
    <div className="about-browse wrap-wide"><button className="amber-button" onClick={() => go('/inventory')}>Browse our inventory <span>→</span></button></div>
  </main>
}

function ContactItem({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return <div className="about-contact-row"><span>{icon}</span><div><strong>{title}</strong>{children}</div></div>
}
