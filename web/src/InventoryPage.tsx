import { useEffect, useMemo, useState } from 'react'
import { getVehicles } from './api'
import RetroSelect from './RetroSelect'
import type { VehicleSummary } from './types'

type Props = { go: (href: string) => void }
type PriceFilter = 'all' | 'under-40' | '40-75' | '75-125' | '125-plus'
type SortOrder = 'newest' | 'price-low' | 'price-high' | 'year-newest'

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const displayPrice = (price: number, priceText?: string | null) => priceText?.trim() || money.format(price)
const number = new Intl.NumberFormat('en-US')
const savedKey = 'retrodrive-saved-vehicles'

function readSaved(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(savedKey) ?? '[]')
    return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function inPriceRange(price: number, range: PriceFilter) {
  if (range === 'under-40') return price < 40000
  if (range === '40-75') return price >= 40000 && price < 75000
  if (range === '75-125') return price >= 75000 && price < 125000
  if (range === '125-plus') return price >= 125000
  return true
}

export default function InventoryPage({ go }: Props) {
  const [vehicles, setVehicles] = useState<VehicleSummary[]>([])
  const [query, setQuery] = useState('')
  const [make, setMake] = useState('All makes')
  const [price, setPrice] = useState<PriceFilter>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [savedOnly, setSavedOnly] = useState(false)
  const [saved, setSaved] = useState<string[]>(readSaved)

  useEffect(() => {
    void getVehicles().then((items) => {
      setVehicles(items)
      const legacy = items.filter((vehicle) => localStorage.getItem(`retrodrive-save-${vehicle.slug}`) === 'saved').map((vehicle) => vehicle.slug)
      if (legacy.length > 0) setSaved((current) => Array.from(new Set([...current, ...legacy])))
    })
  }, [])

  useEffect(() => { localStorage.setItem(savedKey, JSON.stringify(saved)) }, [saved])

  const makes = useMemo(() => ['All makes', ...Array.from(new Set(vehicles.map((vehicle) => vehicle.make))).sort()], [vehicles])
  const filtered = useMemo(() => {
    const matching = vehicles.filter((vehicle) => {
      const searchable = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.exteriorColor}`.toLowerCase()
      return (make === 'All makes' || vehicle.make === make)
        && inPriceRange(vehicle.price, price)
        && (!savedOnly || saved.includes(vehicle.slug))
        && searchable.includes(query.trim().toLowerCase())
    })
    return [...matching].sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price
      if (sort === 'price-high') return b.price - a.price
      if (sort === 'year-newest') return b.year - a.year
      return 0
    })
  }, [vehicles, make, price, savedOnly, saved, query, sort])

  const toggleSaved = (slug: string) => {
    setSaved((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug])
    const currentlySaved = saved.includes(slug)
    localStorage.setItem(`retrodrive-save-${slug}`, currentlySaved ? '' : 'saved')
  }

  return <section className="inventory-page wrap-wide enhanced-inventory">
    <div className="inventory-heading"><div><p className="garage-kicker">The showroom</p><h1>FIND A CAR<br /><em>THAT MOVES YOU.</em></h1></div><p>Search live inventory, narrow the collection, and keep a private shortlist on this device.</p></div>
    <div className="inventory-filters inventory-filters-pro">
      <label>Search inventory<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Year, make, model, or color" /></label>
      <label>Make<RetroSelect value={make} onChange={setMake} ariaLabel="Make" options={makes.map((item) => ({ value: item, label: item }))} /></label>
      <label>Price range<RetroSelect value={price} onChange={(value) => setPrice(value as PriceFilter)} ariaLabel="Price range" options={[{ value: 'all', label: 'All prices' }, { value: 'under-40', label: 'Under $40,000' }, { value: '40-75', label: '$40,000 – $74,999' }, { value: '75-125', label: '$75,000 – $124,999' }, { value: '125-plus', label: '$125,000+' }]} /></label>
      <label>Sort by<RetroSelect value={sort} onChange={(value) => setSort(value as SortOrder)} ariaLabel="Sort by" options={[{ value: 'newest', label: 'Collection order' }, { value: 'price-low', label: 'Price: low to high' }, { value: 'price-high', label: 'Price: high to low' }, { value: 'year-newest', label: 'Newest model year' }]} /></label>
      <button className={`saved-filter ${savedOnly ? 'active' : ''}`} type="button" onClick={() => setSavedOnly((value) => !value)}>{savedOnly ? '♥ Showing saved' : `♡ Saved (${saved.length})`}</button>
    </div>
    <div className="inventory-results"><span>{filtered.length} vehicle{filtered.length === 1 ? '' : 's'} available</span>{(query || make !== 'All makes' || price !== 'all' || savedOnly) && <button type="button" onClick={() => { setQuery(''); setMake('All makes'); setPrice('all'); setSavedOnly(false) }}>Clear filters</button>}</div>
    <div className="vehicle-grid dark-cards inventory-grid">{filtered.map((vehicle, index) => <InventoryVehicleCard key={vehicle.slug} vehicle={vehicle} number={index + 1} saved={saved.includes(vehicle.slug)} onSave={() => toggleSaved(vehicle.slug)} go={go} />)}</div>
    {filtered.length === 0 && <div className="empty-state inventory-empty"><p>No matching cars right now.</p><button className="outline-link" type="button" onClick={() => { setQuery(''); setMake('All makes'); setPrice('all'); setSavedOnly(false) }}>See the full collection <span>→</span></button></div>}
  </section>
}

function InventoryVehicleCard({ vehicle, number: order, saved, onSave, go }: { vehicle: VehicleSummary; number: number; saved: boolean; onSave: () => void; go: Props['go'] }) {
  return <article className="vehicle-card inventory-vehicle-card">
    <button className="vehicle-image" onClick={() => go(`/inventory/${vehicle.slug}`)} aria-label={`View ${vehicle.year} ${vehicle.make} ${vehicle.model}`}><img src={vehicle.imageUrl} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} loading="lazy" decoding="async" /><span>{String(order).padStart(2, '0')}</span><b>Verified & inspected</b></button>
    <button className={`vehicle-save-button ${saved ? 'saved' : ''}`} type="button" onClick={onSave} aria-pressed={saved}>{saved ? '♥ Saved' : '♡ Save'}</button>
    <div className="vehicle-info"><div><p className="vehicle-year">{vehicle.year} · {vehicle.make}</p><h3>{vehicle.model}</h3><p className="vehicle-spec">{number.format(vehicle.mileage)} mi · {vehicle.exteriorColor}</p></div><div className="vehicle-price">{vehicle.msrp && <s>{money.format(vehicle.msrp)}</s>}<strong>{displayPrice(vehicle.price, vehicle.priceText)}</strong></div></div>
    <button className="card-link" onClick={() => go(`/inventory/${vehicle.slug}`)}>View vehicle <span>→</span></button>
  </article>
}
