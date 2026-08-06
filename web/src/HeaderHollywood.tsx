import { useEffect, useState } from 'react'
import { getSiteSettings } from './api'

type Page = 'home' | 'inventory' | 'detail' | 'finance' | 'shipping' | 'tradein' | 'about' | 'privacy' | 'terms' | 'returns' | 'admin'
type Props = { page: Page; go: (href: string) => void }

function phoneHref(value: string) {
  const number = value.replace(/[^\d+]/g, '')
  return number.replace(/\D/g, '').length >= 7 ? `tel:${number}` : undefined
}

function compactHours(value: string) {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  return lines.join(' · ') || 'By appointment'
}

export default function HeaderHollywood({ page, go }: Props) {
  const [phone, setPhone] = useState('')
  const [showroomHours, setShowroomHours] = useState('By appointment')
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    void getSiteSettings().then((settings) => {
      setPhone(settings.phone)
      setShowroomHours(compactHours(settings.showroomHours))
    }).catch(() => undefined)
  }, [])
  const active = (pages: Page[]) => pages.includes(page) ? 'active' : ''
  const callLink = phoneHref(phone)
  const navigate = (href: string) => { setMenuOpen(false); go(href) }

  return <header className="site-header">
    <div className="utility-bar"><div><span className="utility-dot" />Nationwide delivery</div><div title={showroomHours}><span className="utility-dot" />{showroomHours}</div><div className="utility-right"><span>Verified history available</span><span>Classic · Muscle · Performance</span></div></div>
    <div className="main-nav wrap-wide">
      <button className="garage-mark" onClick={() => navigate('/')} aria-label="RetroDrive USA home"><span>RETRO</span>DRIVE<small>USA · CLASSIC MOTOR CARS</small></button>
      <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="primary-navigation" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}><span /><span /><span /></button>
      <nav id="primary-navigation" className={menuOpen ? 'open' : ''} aria-label="Primary navigation"><button className={active(['home'])} onClick={() => navigate('/')}>Home</button><button className={active(['inventory', 'detail'])} onClick={() => navigate('/inventory')}>Inventory</button><button className={active(['finance'])} onClick={() => navigate('/financing')}>Financing</button><button className={active(['shipping'])} onClick={() => navigate('/shipping')}>Shipping</button><button className={active(['tradein'])} onClick={() => navigate('/trade-in')}>Trade-In</button><button className={active(['about'])} onClick={() => navigate('/about')}>About</button><div className="mobile-nav-actions">{callLink && <a className="header-phone" href={callLink}>Call {phone}</a>}<button className="header-cta" onClick={() => navigate('/financing')}>Get pre-approved <span>→</span></button></div></nav>
      <div className="header-actions">{callLink && <a className="header-phone" href={callLink} aria-label={`Call RetroDrive at ${phone}`}><i className="call-mark" aria-hidden="true" /><span>{phone}</span></a>}<button className="header-cta" onClick={() => navigate('/financing')}>Get pre-approved <span>→</span></button></div>
    </div>
  </header>
}
