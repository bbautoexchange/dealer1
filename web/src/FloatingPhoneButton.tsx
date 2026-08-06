import { useEffect, useState } from 'react'
import { getSiteSettings } from './api'

function phoneHref(value: string) {
  const number = value.replace(/[^\d+]/g, '')
  return number.replace(/\D/g, '').length >= 7 ? `tel:${number}` : undefined
}

export default function FloatingPhoneButton() {
  const [phone, setPhone] = useState('')
  useEffect(() => { void getSiteSettings().then((settings) => setPhone(settings.phone)).catch(() => undefined) }, [])
  const callLink = phoneHref(phone)
  if (!callLink) return null

  return <a className="floating-phone" href={callLink} aria-label={`Call B & B Auto Exchange at ${phone}`} title={`Call B & B Auto Exchange: ${phone}`}><span className="call-mark" aria-hidden="true" /></a>
}
