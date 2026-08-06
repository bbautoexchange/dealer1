import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { adminLogin, adminLogout, createAdminVehicle, deleteAdminVehicle, getAdminSession, getAdminVehicles, setVehiclePublication, updateAdminVehicle } from './api'
import type { AdminVehicle, AdminVehicleInput } from './types'

type FormStatus = { kind: 'idle' | 'sending' | 'success' | 'error'; message: string }

const initialVehicle = (): AdminVehicleInput => ({
  slug: '',
  year: 1967,
  make: '',
  model: '',
  price: 0,
  priceText: '',
  msrp: null,
  mileage: 0,
  vin: '',
  exteriorColor: '',
  interiorColor: '',
  engine: '',
  horsepower: '',
  transmission: '',
  bodyStyle: '',
  location: '',
  stockNumber: '',
  description: '',
  features: [],
  photoPublicIds: [],
  published: false,
})

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([])
  const [form, setForm] = useState<AdminVehicleInput>(initialVehicle)
  const [featuresText, setFeaturesText] = useState('')
  const [photosText, setPhotosText] = useState('')
  const [status, setStatus] = useState<FormStatus>({ kind: 'idle', message: '' })
  const [busyVehicleId, setBusyVehicleId] = useState<number | null>(null)
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null)

  const loadVehicles = async () => {
    const items = await getAdminVehicles()
    setVehicles(items)
  }

  useEffect(() => {
    void (async () => {
      try {
        const session = await getAdminSession()
        setAuthenticated(session.authenticated)
        if (session.authenticated) await loadVehicles()
      } catch (reason) {
        setAuthenticated(false)
        setStatus({ kind: 'error', message: messageFrom(reason) })
      }
    })()
  }, [])

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus({ kind: 'sending', message: 'Signing in…' })
    try {
      await adminLogin(password)
      setPassword('')
      setAuthenticated(true)
      await loadVehicles()
      setStatus({ kind: 'success', message: 'Signed in securely.' })
    } catch (reason) {
      setStatus({ kind: 'error', message: messageFrom(reason) })
    }
  }

  const signOut = async () => {
    await adminLogout().catch(() => undefined)
    setAuthenticated(false)
    setVehicles([])
    setStatus({ kind: 'idle', message: '' })
  }

  function update<K extends keyof AdminVehicleInput>(field: K, value: AdminVehicleInput[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const resetEditor = () => {
    setEditingVehicleId(null)
    setForm(initialVehicle())
    setFeaturesText('')
    setPhotosText('')
  }

  const submitVehicle = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
    const published = submitter?.value === 'publish'
    const payload: AdminVehicleInput = {
      ...form,
      slug: form.slug?.trim() || undefined,
      features: splitLines(featuresText),
      photoPublicIds: splitLines(photosText),
      published,
    }
    setStatus({ kind: 'sending', message: published ? 'Publishing vehicle…' : 'Saving draft…' })
    try {
      const created = editingVehicleId
        ? await updateAdminVehicle(editingVehicleId, payload)
        : await createAdminVehicle(payload)
      setVehicles((current) => editingVehicleId
        ? current.map((item) => item.id === created.id ? created : item)
        : [created, ...current])
      setEditingVehicleId(null)
      setForm(initialVehicle())
      setFeaturesText('')
      setPhotosText('')
      setStatus({ kind: 'success', message: published ? 'Vehicle is now live in Inventory.' : 'Draft saved. Publish it when it is ready.' })
    } catch (reason) {
      setStatus({ kind: 'error', message: messageFrom(reason) })
    }
  }

  const editVehicle = (vehicle: AdminVehicle) => {
    setEditingVehicleId(vehicle.id)
    setForm({
      slug: vehicle.slug,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      price: vehicle.price,
      priceText: vehicle.priceText?.trim() || money.format(vehicle.price),
      msrp: vehicle.msrp,
      mileage: vehicle.mileage,
      vin: vehicle.vin,
      exteriorColor: vehicle.exteriorColor,
      interiorColor: vehicle.interiorColor,
      engine: vehicle.engine,
      horsepower: vehicle.horsepower,
      transmission: vehicle.transmission,
      bodyStyle: vehicle.bodyStyle,
      location: vehicle.location,
      stockNumber: vehicle.stockNumber,
      description: vehicle.description,
      features: vehicle.features,
      photoPublicIds: vehicle.photoPublicIds,
      published: vehicle.published,
    })
    setFeaturesText(vehicle.features.join('\n'))
    setPhotosText(vehicle.photoPublicIds.join('\n'))
    setStatus({ kind: 'idle', message: '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeVehicle = async (vehicle: AdminVehicle) => {
    if (!window.confirm(`Delete ${vehicle.year} ${vehicle.make} ${vehicle.model}? This cannot be undone.`)) return
    setBusyVehicleId(vehicle.id)
    try {
      await deleteAdminVehicle(vehicle.id)
      setVehicles((current) => current.filter((item) => item.id !== vehicle.id))
      if (editingVehicleId === vehicle.id) resetEditor()
      setStatus({ kind: 'success', message: 'Vehicle removed from Inventory.' })
    } catch (reason) {
      setStatus({ kind: 'error', message: messageFrom(reason) })
    } finally {
      setBusyVehicleId(null)
    }
  }

  const togglePublication = async (vehicle: AdminVehicle) => {
    setBusyVehicleId(vehicle.id)
    try {
      await setVehiclePublication(vehicle.id, !vehicle.published)
      setVehicles((current) => current.map((item) => item.id === vehicle.id ? { ...item, published: !item.published } : item))
    } catch (reason) {
      setStatus({ kind: 'error', message: messageFrom(reason) })
    } finally {
      setBusyVehicleId(null)
    }
  }

  if (authenticated === null) {
    return <section className="admin-loading"><span className="utility-dot" />Preparing secure workspace…</section>
  }

  if (!authenticated) {
    return <section className="admin-login-wrap"><div className="admin-login-card"><p className="garage-kicker">Private workspace</p><h1>INVENTORY<br /><em>CONTROL.</em></h1><p>Sign in to add vehicle listings, keep cars as drafts, and publish them to the live collection.</p><form onSubmit={submitLogin}><label>Admin password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete="current-password" /></label><button className="amber-button" disabled={status.kind === 'sending'}>{status.kind === 'sending' ? 'Signing in…' : 'Sign in'} <span>→</span></button></form><AdminStatus status={status} /></div></section>
  }

  return <section className="admin-page wrap-wide"><div className="admin-topline"><div><p className="garage-kicker">Private workspace</p><h1>INVENTORY<br /><em>CONTROL.</em></h1><p>Add a vehicle, attach its Cloudinary image IDs, and choose whether it remains a draft or goes live immediately.</p></div><button className="outline-link" onClick={() => void signOut()}>Sign out <span>→</span></button></div>

    <section className="admin-layout"><form className="admin-form" onSubmit={submitVehicle}><div className="admin-form-heading"><div><p className="garage-kicker">{editingVehicleId ? 'Edit listing' : 'New listing'}</p><h2>{editingVehicleId ? <>EDIT<br /><em>VEHICLE.</em></> : <>ADD A<br /><em>VEHICLE.</em></>}</h2></div><span>{editingVehicleId ? 'Update the information below, then save the listing again.' : 'All fields marked by the form are part of the public listing.'}</span></div>
      <div className="form-row"><label>Year<input required type="number" min="1886" max="2100" value={form.year} onChange={(event) => update('year', Number(event.target.value))} /></label><label>Stock number<input required maxLength={80} value={form.stockNumber} onChange={(event) => update('stockNumber', event.target.value)} placeholder="e.g. RD-6802" /></label></div>
      <div className="form-row"><label>Make<input required maxLength={80} value={form.make} onChange={(event) => update('make', event.target.value)} placeholder="Ford" /></label><label>Model<input required maxLength={120} value={form.model} onChange={(event) => update('model', event.target.value)} placeholder="Mustang Fastback" /></label></div>
      <div className="form-row"><label>Asking price<input required maxLength={120} value={form.priceText} onChange={(event) => { const priceText = event.target.value; update('priceText', priceText); update('price', numericPrice(priceText)) }} placeholder="$17,801, Call for price, or any text" /></label><label>MSRP / reference price<input type="number" min="0" step="100" value={form.msrp ?? ''} onChange={(event) => update('msrp', event.target.value ? Number(event.target.value) : null)} /></label></div>
      <div className="form-row"><label>Mileage<input required type="number" min="0" step="1" value={form.mileage || ''} onChange={(event) => update('mileage', Number(event.target.value))} /></label><label>VIN<input required maxLength={80} value={form.vin} onChange={(event) => update('vin', event.target.value)} /></label></div>
      <div className="form-row"><label>Exterior color<input required maxLength={80} value={form.exteriorColor} onChange={(event) => update('exteriorColor', event.target.value)} /></label><label>Interior color<input required maxLength={80} value={form.interiorColor} onChange={(event) => update('interiorColor', event.target.value)} /></label></div>
      <div className="form-row"><label>Engine<input required maxLength={120} value={form.engine} onChange={(event) => update('engine', event.target.value)} placeholder="289 V8" /></label><label>Horsepower<input required maxLength={80} value={form.horsepower} onChange={(event) => update('horsepower', event.target.value)} placeholder="271 hp" /></label></div>
      <div className="form-row"><label>Transmission<input required maxLength={120} value={form.transmission} onChange={(event) => update('transmission', event.target.value)} placeholder="4-speed manual" /></label><label>Body style<input required maxLength={80} value={form.bodyStyle} onChange={(event) => update('bodyStyle', event.target.value)} placeholder="Coupe" /></label></div>
      <div className="form-row"><label>Vehicle location<input required maxLength={160} value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Scottsdale, Arizona" /></label><label>Page URL (optional)<input maxLength={160} value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="Auto-generated if empty" /></label></div>
      <label>Vehicle description<textarea required rows={5} maxLength={5000} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Condition, history, character, and why it belongs in the collection." /></label>
      <label>Features & highlights<textarea rows={4} value={featuresText} onChange={(event) => setFeaturesText(event.target.value)} placeholder={'One per line\nDocumented restoration\nClear title'} /></label>
      <label>Cloudinary image public IDs<textarea required rows={4} value={photosText} onChange={(event) => setPhotosText(event.target.value)} placeholder={'One per line\nretrodive/mustang-1967/front\nretrodive/mustang-1967/interior'} /><small>Paste the public ID from Cloudinary, not a full image URL. The first ID is used as the card image.</small></label>
      <div className="admin-submit-row"><button className="ghost-button" type="submit" value="draft" disabled={status.kind === 'sending'}>Save as draft</button><button className="amber-button" type="submit" value="publish" disabled={status.kind === 'sending'}>{status.kind === 'sending' ? 'Saving…' : 'Publish to inventory'} <span>→</span></button></div><AdminStatus status={status} />
      {editingVehicleId && <button className="text-back admin-cancel-edit" type="button" onClick={resetEditor}>← Cancel editing</button>}
    </form>

    {false && <>
    <aside className="admin-list"><div className="admin-list-heading"><p className="garage-kicker">Collection status</p><h2>{vehicles.length} <em>LISTINGS</em></h2></div>{vehicles.length === 0 ? <p className="admin-empty">No vehicles yet. Your first listing will appear here.</p> : <div className="admin-vehicles">{vehicles.map((vehicle) => <article key={vehicle.id} className="admin-vehicle-card"><img src={vehicle.imageUrls[0]} alt="" /><div><div className="admin-vehicle-meta"><span className={vehicle.published ? 'live' : 'draft'}>{vehicle.published ? 'Live' : 'Draft'}</span><span>{new Date(vehicle.createdAt).toLocaleDateString()}</span></div><h3>{vehicle.year} {vehicle.make} {vehicle.model}</h3><p>{money.format(vehicle.price)} · {vehicle.stockNumber}</p><a href={`/inventory/${vehicle.slug}`} target="_blank" rel="noreferrer">View listing ↗</a></div><button className="card-publication-button" disabled={busyVehicleId === vehicle.id} onClick={() => void togglePublication(vehicle)}>{busyVehicleId === vehicle.id ? 'Saving…' : vehicle.published ? 'Unpublish' : 'Publish'}</button></article>)}</div>}</aside>
    </>}
    <aside className="admin-list">
      <div className="admin-list-heading"><p className="garage-kicker">Collection status</p><h2>{vehicles.length} <em>LISTINGS</em></h2></div>
      {vehicles.length === 0 ? <p className="admin-empty">No vehicles yet. Your first listing will appear here.</p> : <div className="admin-vehicles">
        {vehicles.map((vehicle) => <article key={vehicle.id} className="admin-vehicle-card">
          <img src={vehicle.imageUrls[0]} alt="" />
          <div>
            <div className="admin-vehicle-meta"><span className={vehicle.published ? 'live' : 'draft'}>{vehicle.published ? 'Live' : 'Draft'}</span><span>{new Date(vehicle.createdAt).toLocaleDateString()}</span></div>
            <h3>{vehicle.year} {vehicle.make} {vehicle.model}</h3>
            <p>{vehicle.priceText?.trim() || money.format(vehicle.price)} · {vehicle.stockNumber}</p>
            <a href={`/inventory/${vehicle.slug}`} target="_blank" rel="noreferrer">View listing ↗</a>
          </div>
          <div className="admin-card-actions">
            <button disabled={busyVehicleId === vehicle.id} onClick={() => editVehicle(vehicle)}>Edit</button>
            <button disabled={busyVehicleId === vehicle.id} onClick={() => void togglePublication(vehicle)}>{busyVehicleId === vehicle.id ? 'Saving…' : vehicle.published ? 'Unpublish' : 'Publish'}</button>
            <button className="danger" disabled={busyVehicleId === vehicle.id} onClick={() => void removeVehicle(vehicle)}>Delete</button>
          </div>
        </article>)}
      </div>}
    </aside>
  </section></section>
}

function AdminStatus({ status }: { status: FormStatus }) {
  return status.kind === 'idle' ? null : <p className={`form-status ${status.kind === 'sending' ? 'sending' : status.kind}`} role="status">{status.message}</p>
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function numericPrice(value: string) {
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  const parsed = match ? Number(match[0]) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : 'We could not complete that request. Please try again.'
}
