import { useEffect, useState } from 'react'
import { getSiteSettings, subscribeVip } from './api'
import type { SiteSettingsContent } from './types'

type Props = { go: (href: string) => void }
type Status = { type: 'idle' | 'sending' | 'success' | 'error'; message: string }

const fallback: SiteSettingsContent = {
  showroomAddress: 'Contact B & B Auto Exchange for appointment details',
  phone: 'Set showroom phone in Render',
  email: 'sales@bbautoexchange.com',
  showroomHours: 'By appointment',
}

function phoneHref(value: string) {
  const number = value.replace(/[^\d+]/g, '')
  return number.replace(/\D/g, '').length >= 7 ? `tel:${number}` : undefined
}

function HourRows({ hours }: { hours: string }) {
  return <div className="hollywood-footer-hours">{hours.split(/\r?\n/).filter(Boolean).map((line) => {
    const splitAt = line.indexOf(': ')
    return splitAt > 0
      ? <div key={line}><span>{line.slice(0, splitAt)}</span><b>{line.slice(splitAt + 2)}</b></div>
      : <div key={line}><b>{line}</b></div>
  })}</div>
}

export default function FooterHollywood({ go }: Props) {
  const [settings, setSettings] = useState<SiteSettingsContent>(fallback)
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' })
  useEffect(() => { void getSiteSettings().then(setSettings).catch(() => undefined) }, [])

  const phone = phoneHref(settings.phone)
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.showroomAddress)}`
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus({ type: 'sending', message: 'Joining...' })
    try {
      setStatus({ type: 'success', message: await subscribeVip({ fullName, phone: phoneNumber, email, pageUrl: window.location.href }) })
      setFullName('')
      setPhoneNumber('')
      setEmail('')
    } catch {
      setStatus({ type: 'error', message: 'Please try again in a moment.' })
    }
  }

  return <footer className="hollywood-footer">
    <div className="hollywood-footer-grid wrap-wide">
      <section className="hollywood-footer-company">
        <button className="garage-mark footer-mark" onClick={() => go('/')}><span>B &amp; B</span> AUTO<small>EXCHANGE / RETRO &amp; CLASSIC VEHICLES</small></button>
        <p>B & B Auto Exchange is focused exclusively on retro and classic vehicles, supported by clear information and personal coordination.</p>
        <div className="hollywood-footer-contact">
          <strong>Showroom Address</strong>
          <a href={mapsUrl} target="_blank" rel="noreferrer">{settings.showroomAddress}</a>
          {phone ? <a href={phone}>{settings.phone}</a> : <span>{settings.phone}</span>}
          <a href={`mailto:${settings.email}`}>{settings.email}</a>
        </div>
      </section>
      <section>
        <h2>Showroom Hours</h2>
        <HourRows hours={settings.showroomHours} />
      </section>
      <section className="hollywood-footer-links">
        <h2>Operations</h2>
        <button onClick={() => go('/inventory')}>Classic Collection</button>
        <button onClick={() => go('/financing')}>Financing</button>
        <button onClick={() => go('/shipping')}>Transport & Delivery</button>
        <button onClick={() => go('/about')}>About B & B</button>
        <hr />
        <button onClick={() => go('/privacy')}>Privacy Policy</button>
        <button onClick={() => go('/terms')}>Terms of Service</button>
        <button onClick={() => go('/returns')}>Purchase Terms</button>
      </section>
      <section className="hollywood-footer-vip">
        <h2>Private VIP List</h2>
        <p>Receive alerts when a retro or classic vehicle joins the collection.</p>
        <form onSubmit={submit}>
          <input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Full name" aria-label="Full name" />
          <input required type="tel" autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Phone number" aria-label="Phone number" />
          <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" aria-label="Email address" />
          <button disabled={status.type === 'sending'}>{status.type === 'sending' ? 'Joining...' : 'Join'}</button>
        </form>
        {status.type !== 'idle' && <small className={`hollywood-footer-status ${status.type}`}>{status.message}</small>}
      </section>
    </div>
    <div className="hollywood-footer-bottom">
      <span>&copy; {new Date().getFullYear()} B &amp; B Auto Exchange. All rights reserved.</span>
      <div><button onClick={() => go('/privacy')}>Privacy Policy</button><button onClick={() => go('/terms')}>Terms of Service</button><button onClick={() => go('/returns')}>Purchase Terms</button><button onClick={() => go('/admin')}>Admin Access</button></div>
    </div>
  </footer>
}
