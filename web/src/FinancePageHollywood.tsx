import { useEffect, useMemo, useState } from 'react'
import { getVehicle, submitFinance } from './api'
import RetroSelect from './RetroSelect'
import type { ContactFields, Vehicle } from './types'

type Props = { go: (href: string) => void }
type Status = { type: 'idle' | 'sending' | 'success' | 'error'; message: string }
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function FinancePageHollywood({ go }: Props) {
  const params = new URLSearchParams(window.location.search)
  const vehicleSlug = params.get('vehicle')
  const initialPrice = Number(params.get('price')) || 85000
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [price, setPrice] = useState(initialPrice)
  const [downPayment, setDownPayment] = useState(Math.round(initialPrice * 0.2))
  const [rate, setRate] = useState(6.49)
  const [term, setTerm] = useState(60)
  const [contact, setContact] = useState<ContactFields>({ firstName: '', lastName: '', email: '', phone: '', pageUrl: window.location.href })
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' })

  useEffect(() => {
    if (!vehicleSlug) return
    void getVehicle(vehicleSlug).then((value) => { setVehicle(value); setPrice(value.price) }).catch(() => undefined)
  }, [vehicleSlug])

  const monthly = useMemo(() => {
    const principal = Math.max(price - downPayment, 0)
    const monthlyRate = rate / 1200
    return monthlyRate === 0 ? principal / term : principal * monthlyRate * Math.pow(1 + monthlyRate, term) / (Math.pow(1 + monthlyRate, term) - 1)
  }, [price, downPayment, rate, term])

  const update = (field: keyof ContactFields, value: string) => setContact((current) => ({ ...current, [field]: value }))
  const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : undefined
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus({ type: 'sending', message: 'Sending your pre-approval request…' })
    try {
      const message = await submitFinance({ ...contact, vehiclePrice: price, downPayment, interestRate: rate, termMonths: term, vehicleName: vehicleName ?? vehicleSlug ?? undefined, vehicleVin: vehicle?.vin, vehicleSlug: vehicle?.slug ?? vehicleSlug ?? undefined, vehiclePriceLabel: vehicle?.priceText?.trim() || (vehicle ? money.format(vehicle.price) : undefined) })
      setStatus({ type: 'success', message })
    } catch (error) {
      setStatus({ type: 'error', message: error instanceof Error ? error.message : 'Please try again in a moment.' })
    }
  }

  return <section className="page-frame wrap-wide">
    <div className="page-intro"><div><p className="garage-kicker">Classic vehicle financing</p><h1>PLAN YOUR<br /><em>NEXT CLASSIC.</em></h1></div><p>Estimate a payment structure, then send B & B Auto Exchange a direct request about the retro or classic vehicle you have in mind.</p></div>
    <section className="calculator-layout">
      <div className="calculator-card"><h3>Payment estimator</h3><label>Vehicle price<span className="input-affix">$<input type="number" min="1000" value={price} onChange={(event) => setPrice(Number(event.target.value))} /></span></label><label>Down payment<span className="input-affix">$<input type="number" min="0" value={downPayment} onChange={(event) => setDownPayment(Number(event.target.value))} /></span></label><label>Estimated APR<span className="input-affix"><input type="number" min="0" step="0.1" value={rate} onChange={(event) => setRate(Number(event.target.value))} />%</span></label><label>Term<RetroSelect value={String(term)} onChange={(value) => setTerm(Number(value))} ariaLabel="Finance term" options={[24, 36, 48, 60, 72, 84].map((months) => ({ value: String(months), label: `${months} months` }))} /></label><div className="payment-result"><span>Estimated monthly payment</span><strong>{money.format(monthly)}</strong><small>Estimate only. Your actual payment, rate, and approval are determined by the lender.</small></div></div>
      <form className="lead-form paper-form" onSubmit={submit}><p className="garage-kicker">Ready to apply?</p><h2>GET PRE-<em>APPROVED.</em></h2>{vehicle && <div className="finance-selected-vehicle"><span>Applying for</span><strong>{vehicleName}</strong><small>VIN {vehicle.vin} · {vehicle.priceText?.trim() || money.format(vehicle.price)}</small></div>}<p>Submitting this request does not affect your credit score. A specialist will guide the next step.</p><div className="form-row"><label>First name<input required value={contact.firstName} onChange={(event) => update('firstName', event.target.value)} /></label><label>Last name<input required value={contact.lastName} onChange={(event) => update('lastName', event.target.value)} /></label></div><div className="form-row"><label>Email<input required type="email" value={contact.email} onChange={(event) => update('email', event.target.value)} /></label><label>Phone<input required type="tel" value={contact.phone} onChange={(event) => update('phone', event.target.value)} /></label></div><button className="amber-button" disabled={status.type === 'sending'}>Start finance request <span>→</span></button>{status.type !== 'idle' && <p className={`form-status ${status.type}`}>{status.message}</p>}</form>
    </section>
    <section className="steps-row"><Step title="Tell us your plan" text="Share the payment structure that feels right for your purchase." /><Step title="Talk to a specialist" text="Review available lender options, terms, and vehicle eligibility." /><Step title="Complete securely" text="Finalize the required documents with your selected lending partner." /></section>
    <button className="text-back" onClick={() => go('/inventory')}>← Browse available vehicles</button>
  </section>
}

function Step({ title, text }: { title: string; text: string }) {
  return <article><h3>{title}</h3><p>{text}</p></article>
}
