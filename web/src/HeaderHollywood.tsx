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
  return lines.join(' / ') || 'By appointment'
}

export default function HeaderHollywood({ page, go }: Props) {
  const [phone, setPhone] = useState('')
  const [showroomHours, setShowroomHours] = useState('By appointment')
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    void getSiteSettings().then((settings) => {
      setPhone(settings.phone)
      setShowroomHours(compactHours(settings.showroomHours))
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    const updateScrolled = () => {
      const scrollY = window.scrollY

      setScrolled((isCompact) => {
        if (!isCompact && scrollY > 140) return true
        if (isCompact && scrollY < 8) return false
        return isCompact
      })
    }

    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  const active = (pages: Page[]) => pages.includes(page) ? 'active' : ''
  const callLink = phoneHref(phone)
  const navigate = (href: string) => { setMenuOpen(false); go(href) }

  return <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
    <div className="utility-bar"><div><span className="utility-dot" />Nationwide delivery</div><div title={showroomHours}><span className="utility-dot" />{showroomHours}</div><div className="utility-right"><span>Detailed vehicle information</span><span>Retro &amp; Classic Vehicles</span></div></div>
    <div className="main-nav wrap-wide">
      <button className="garage-mark" onClick={() => navigate('/')} aria-label="B & B Auto Exchange home"><span>B &amp; B</span> AUTO<small>EXCHANGE / RETRO &amp; CLASSIC VEHICLES</small></button>
      <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="primary-navigation" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}><span /><span /><span /></button>
      <nav id="primary-navigation" className={menuOpen ? 'open' : ''} aria-label="Primary navigation"><button className={active(['home'])} onClick={() => navigate('/')}>Home</button><button className={active(['inventory', 'detail'])} onClick={() => navigate('/inventory')}>Collection</button><button className={active(['finance'])} onClick={() => navigate('/financing')}>Financing</button><button className={active(['shipping'])} onClick={() => navigate('/shipping')}>Transport</button><button className={active(['tradein'])} onClick={() => navigate('/trade-in')}>Sell or Trade</button><button className={active(['about'])} onClick={() => navigate('/about')}>B &amp; B</button><div className="mobile-nav-actions">{callLink && <a className="header-phone" href={callLink}>Call {phone}</a>}<button className="header-cta" onClick={() => navigate('/financing')}>Plan your purchase <span>→</span></button></div></nav>
      <div className="header-actions">{callLink && <a className="header-phone" href={callLink} aria-label={`Call B & B Auto Exchange at ${phone}`}><i className="call-mark" aria-hidden="true" /><span>{phone}</span></a>}<button className="header-cta" onClick={() => navigate('/financing')}>Plan your purchase <span>→</span></button></div>
    </div>
  </header>
}
