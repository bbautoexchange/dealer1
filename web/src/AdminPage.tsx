import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { adminLogin, adminLogout, createAdminVehicle, deleteAdminVehicle, getAdminSession, getAdminVehicles, importAdminVehicles, setVehiclePublication, updateAdminVehicle } from './api'
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

const vehicleImportColumns = [
  'year', 'make', 'model', 'priceText', 'msrp', 'mileage', 'vin', 'exteriorColor', 'interiorColor',
  'engine', 'horsepower', 'transmission', 'bodyStyle', 'location', 'stockNumber', 'description',
  'features', 'photoPublicIds', 'published', 'slug',
] as const

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
  const [isImporting, setIsImporting] = useState(false)

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

  const exportVehicles = () => {
    const rows = vehicles.map(vehicleToImportRow)
    downloadCsv('bb-auto-exchange-vehicles.csv', [vehicleImportColumns, ...rows])
    setStatus({ kind: 'success', message: `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} exported to CSV.` })
  }

  const downloadTemplate = () => {
    downloadCsv('bb-auto-exchange-vehicle-import-template.csv', [
      vehicleImportColumns,
      [
        '1967', 'Ford', 'Mustang Fastback', '$84,900', '89900', '52318', '', 'Highland Green', 'Black vinyl',
        '289 V8', '271 hp', '4-speed manual', 'Fastback', 'Houston, TX', 'BB-001',
        'Documented restoration with a well-kept provenance file and classic V8 character.',
        'Documented restoration|Clear title|Available for nationwide delivery',
        'bb-auto-exchange/mustang-1967/front|bb-auto-exchange/mustang-1967/interior', 'true', '1967-ford-mustang-fastback',
      ],
    ])
  }

  const importVehicles = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsImporting(true)
    setStatus({ kind: 'sending', message: 'Checking CSV and importing vehicles…' })
    try {
      const imported = parseVehicleCsv(await file.text())
      const created = await importAdminVehicles(imported)
      await loadVehicles()
      setStatus({ kind: 'success', message: `${created.length} vehicle${created.length === 1 ? '' : 's'} imported successfully.` })
    } catch (reason) {
      setStatus({ kind: 'error', message: messageFrom(reason) })
    } finally {
      setIsImporting(false)
    }
  }

  if (authenticated === null) {
    return <section className="admin-loading"><span className="utility-dot" />Preparing secure workspace…</section>
  }

  if (!authenticated) {
    return <section className="admin-login-wrap"><div className="admin-login-card"><p className="garage-kicker">Private workspace</p><h1>INVENTORY<br /><em>CONTROL.</em></h1><p>Sign in to add vehicle listings, keep cars as drafts, and publish them to the live collection.</p><form onSubmit={submitLogin}><label>Admin password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete="current-password" /></label><button className="amber-button" disabled={status.kind === 'sending'}>{status.kind === 'sending' ? 'Signing in…' : 'Sign in'} <span>→</span></button></form><AdminStatus status={status} /></div></section>
  }

  return <section className="admin-page wrap-wide"><div className="admin-topline"><div><p className="garage-kicker">Private workspace</p><h1>INVENTORY<br /><em>CONTROL.</em></h1><p>Add a vehicle, attach its Cloudinary image IDs, and choose whether it remains a draft or goes live immediately.</p></div><div className="admin-topline-actions"><button className="outline-link" type="button" onClick={downloadTemplate}>Download template</button><button className="outline-link" type="button" onClick={exportVehicles}>Export CSV</button><label className="outline-link admin-import-button">{isImporting ? 'Importing…' : 'Import CSV'}<input type="file" accept=".csv,text/csv" onChange={(event) => void importVehicles(event)} disabled={isImporting} /></label><button className="outline-link" type="button" onClick={() => void signOut()}>Sign out <span>→</span></button></div></div>

    <section className="admin-layout"><form className="admin-form" onSubmit={submitVehicle}><div className="admin-form-heading"><div><p className="garage-kicker">{editingVehicleId ? 'Edit listing' : 'New listing'}</p><h2>{editingVehicleId ? <>EDIT<br /><em>VEHICLE.</em></> : <>ADD A<br /><em>VEHICLE.</em></>}</h2></div><span>Year, make, model, asking price, description, and photos are required. Other specs stay hidden when blank; a blank VIN shows “On request”.</span></div>
      <div className="form-row"><label>Year<input required type="number" min="1886" max="2100" value={form.year} onChange={(event) => update('year', Number(event.target.value))} /></label><label>Stock number<input maxLength={80} value={form.stockNumber} onChange={(event) => update('stockNumber', event.target.value)} placeholder="e.g. RD-6802" /></label></div>
      <div className="form-row"><label>Make<input required maxLength={80} value={form.make} onChange={(event) => update('make', event.target.value)} placeholder="Ford" /></label><label>Model<input required maxLength={120} value={form.model} onChange={(event) => update('model', event.target.value)} placeholder="Mustang Fastback" /></label></div>
      <div className="form-row"><label>Asking price<input required maxLength={120} value={form.priceText} onChange={(event) => { const priceText = event.target.value; update('priceText', priceText); update('price', numericPrice(priceText)) }} placeholder="$17,801, Call for price, or any text" /></label><label>MSRP / reference price<input type="number" min="0" step="100" value={form.msrp ?? ''} onChange={(event) => update('msrp', event.target.value ? Number(event.target.value) : null)} /></label></div>
      <div className="form-row"><label>Mileage<input type="number" min="0" step="1" value={form.mileage || ''} onChange={(event) => update('mileage', Number(event.target.value))} /></label><label>VIN<input maxLength={80} value={form.vin} onChange={(event) => update('vin', event.target.value)} placeholder="On request when left blank" /></label></div>
      <div className="form-row"><label>Exterior color<input maxLength={80} value={form.exteriorColor} onChange={(event) => update('exteriorColor', event.target.value)} /></label><label>Interior color<input maxLength={80} value={form.interiorColor} onChange={(event) => update('interiorColor', event.target.value)} /></label></div>
      <div className="form-row"><label>Engine<input maxLength={120} value={form.engine} onChange={(event) => update('engine', event.target.value)} placeholder="289 V8" /></label><label>Horsepower<input maxLength={80} value={form.horsepower} onChange={(event) => update('horsepower', event.target.value)} placeholder="271 hp" /></label></div>
      <div className="form-row"><label>Transmission<input maxLength={120} value={form.transmission} onChange={(event) => update('transmission', event.target.value)} placeholder="4-speed manual" /></label><label>Body style<input maxLength={80} value={form.bodyStyle} onChange={(event) => update('bodyStyle', event.target.value)} placeholder="Coupe" /></label></div>
      <div className="form-row"><label>Vehicle location<input maxLength={160} value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Scottsdale, Arizona" /></label><label>Page URL (optional)<input maxLength={160} value={form.slug} onChange={(event) => update('slug', event.target.value)} placeholder="Auto-generated if empty" /></label></div>
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

function vehicleToImportRow(vehicle: AdminVehicle): string[] {
  return [
    String(vehicle.year), vehicle.make, vehicle.model, vehicle.priceText?.trim() || money.format(vehicle.price),
    vehicle.msrp?.toString() ?? '', vehicle.mileage ? String(vehicle.mileage) : '', vehicle.vin,
    vehicle.exteriorColor, vehicle.interiorColor, vehicle.engine, vehicle.horsepower, vehicle.transmission,
    vehicle.bodyStyle, vehicle.location, vehicle.stockNumber, vehicle.description, vehicle.features.join('|'),
    vehicle.photoPublicIds.join('|'), String(vehicle.published), vehicle.slug,
  ]
}

function downloadCsv(fileName: string, rows: ReadonlyArray<ReadonlyArray<string>>) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function parseVehicleCsv(source: string): AdminVehicleInput[] {
  const rows = parseCsv(source.replace(/^\uFEFF/, ''))
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one vehicle row.')

  const headers = rows[0].map((value) => value.trim().toLowerCase())
  const duplicatedHeader = headers.find((header, index) => header && headers.indexOf(header) !== index)
  if (duplicatedHeader) throw new Error(`The CSV header '${duplicatedHeader}' is duplicated.`)

  const columns = new Map(headers.map((header, index) => [header, index]))
  const missingColumns = vehicleImportColumns.filter((column) => !columns.has(column.toLowerCase()))
  if (missingColumns.length > 0) throw new Error(`The CSV is missing column${missingColumns.length === 1 ? '' : 's'}: ${missingColumns.join(', ')}.`)

  const vehicleRows = rows.slice(1).filter((row) => row.some((value) => value.trim().length > 0))
  if (vehicleRows.length === 0) throw new Error('The CSV does not contain any vehicle rows.')
  if (vehicleRows.length > 500) throw new Error('Import up to 500 vehicles at a time.')

  return vehicleRows.map((row, index) => {
    const rowNumber = index + 2
    const value = (column: string) => row[columns.get(column.toLowerCase()) ?? -1]?.trim() ?? ''
    const priceText = requiredCsvValue(value('priceText'), 'priceText', rowNumber)
    const photoPublicIds = splitPipeList(value('photoPublicIds'))
    if (photoPublicIds.length === 0) throw new Error(`Row ${rowNumber}: photoPublicIds needs at least one Cloudinary public ID.`)

    return {
      slug: value('slug') || undefined,
      year: requiredCsvInteger(value('year'), 'year', rowNumber),
      make: requiredCsvValue(value('make'), 'make', rowNumber),
      model: requiredCsvValue(value('model'), 'model', rowNumber),
      price: numericPrice(priceText),
      priceText,
      msrp: optionalCsvNumber(value('msrp'), 'msrp', rowNumber),
      mileage: optionalCsvInteger(value('mileage'), 'mileage', rowNumber) ?? 0,
      vin: value('vin'),
      exteriorColor: value('exteriorColor'),
      interiorColor: value('interiorColor'),
      engine: value('engine'),
      horsepower: value('horsepower'),
      transmission: value('transmission'),
      bodyStyle: value('bodyStyle'),
      location: value('location'),
      stockNumber: value('stockNumber'),
      description: requiredCsvValue(value('description'), 'description', rowNumber),
      features: splitPipeList(value('features')),
      photoPublicIds,
      published: parseCsvBoolean(value('published'), rowNumber),
    }
  })
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (!quoted && character === ',') {
      row.push(cell)
      cell = ''
    } else if (!quoted && (character === '\n' || character === '\r')) {
      if (character === '\r' && source[index + 1] === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted value.')
  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

function requiredCsvValue(value: string, column: string, rowNumber: number) {
  if (!value) throw new Error(`Row ${rowNumber}: ${column} is required.`)
  return value
}

function requiredCsvInteger(value: string, column: string, rowNumber: number) {
  const parsed = optionalCsvInteger(value, column, rowNumber, null)
  if (parsed === null) throw new Error(`Row ${rowNumber}: ${column} is required.`)
  return parsed
}

function optionalCsvInteger(value: string, column: string, rowNumber: number, blankValue: number | null = 0): number | null {
  if (!value) return blankValue
  const parsed = Number(value.replace(/,/g, ''))
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Row ${rowNumber}: ${column} must be a whole number of zero or more.`)
  return parsed
}

function optionalCsvNumber(value: string, column: string, rowNumber: number): number | null {
  if (!value) return null
  const parsed = Number(value.replace(/[,$]/g, ''))
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Row ${rowNumber}: ${column} must be a number of zero or more.`)
  return parsed
}

function parseCsvBoolean(value: string, rowNumber: number) {
  if (!value || /^(false|no|0|draft)$/i.test(value)) return false
  if (/^(true|yes|1|live|published)$/i.test(value)) return true
  throw new Error(`Row ${rowNumber}: published must be true/false, yes/no, 1/0, live, or draft.`)
}

function splitPipeList(value: string) {
  return value.split('|').map((item) => item.trim()).filter(Boolean)
}

function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : 'We could not complete that request. Please try again.'
}
