import { useEffect, useMemo, useRef, useState } from 'react'
import { getShippingPickup } from './api'

type Props = { go: (href: string) => void }
type Service = 'standard' | 'priority' | 'express'
type Point = { lat: number; lng: number; label: string }
type LeafletLike = any

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-US')
const serviceDetails: Record<Service, { order: string; label: string; multiplier: number; timing: string; summary: string }> = {
  standard: { order: '01', label: 'Standard enclosed', multiplier: 1, timing: 'Estimated 5–8 business days', summary: 'Protected transport for collector vehicles.' },
  priority: { order: '02', label: 'Priority expedited', multiplier: 1.35, timing: 'Estimated 3–5 business days', summary: 'Earlier carrier matching where the route allows.' },
  express: { order: '03', label: 'VIP hot-shot express', multiplier: 1.8, timing: 'Estimated 1–2 business days', summary: 'High-touch coordination for special timing.' },
}

function leaflet() { return (window as Window & { L?: LeafletLike }).L }
function getHaversineDistance(from: Point, to: Point) {
  const radiusKm = 6371
  const deltaLat = (to.lat - from.lat) * Math.PI / 180
  const deltaLng = (to.lng - from.lng) * Math.PI / 180
  const value = Math.sin(deltaLat / 2) ** 2 + Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(deltaLng / 2) ** 2
  return radiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

export default function ShippingPlanner({ go }: Props) {
  const mapNode = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const originMarker = useRef<any>(null)
  const destinationMarker = useRef<any>(null)
  const routeLine = useRef<any>(null)
  const originRef = useRef<Point | null>(null)
  const [origin, setOrigin] = useState<Point | null>(null)
  const [destination, setDestination] = useState<Point | null>(null)
  const [search, setSearch] = useState('')
  const [distanceKm, setDistanceKm] = useState(0)
  const [routeStatus, setRouteStatus] = useState('Loading the fixed pickup location…')
  const [routeBusy, setRouteBusy] = useState(false)
  const [service, setService] = useState<Service>('standard')
  const miles = useMemo(() => Math.round(distanceKm * 0.621371), [distanceKm])
  const priceFor = (option: Service) => Math.round(distanceKm * 0.7 * serviceDetails[option].multiplier / 25) * 25
  const calculated = Boolean(origin && destination && distanceKm > 0)

  const iconFor = (kind: 'pickup' | 'destination') => {
    const L = leaflet()
    return L.divIcon({ className: 'shipping-map-marker-shell', html: `<span class="shipping-map-marker ${kind}">${kind === 'pickup' ? '1' : '2'}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] })
  }

  const clearRouteLine = () => {
    const map = mapInstance.current
    if (map && routeLine.current) map.removeLayer(routeLine.current)
    routeLine.current = null
  }

  const drawRoute = async (pickup: Point, dropoff: Point) => {
    const map = mapInstance.current
    const L = leaflet()
    if (!map || !L) return
    clearRouteLine()
    setRouteBusy(true)
    setRouteStatus('Calculating the driving route and delivery estimate…')
    const fallback = () => {
      const estimatedKm = getHaversineDistance(pickup, dropoff) * 1.25
      routeLine.current = L.polyline([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], { color: '#e4a331', weight: 4, dashArray: '7, 10', opacity: .9 }).addTo(map)
      setDistanceKm(estimatedKm)
      setRouteStatus('Route estimate calculated. Exact carrier routing is confirmed before transport.')
    }
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`
      const response = await fetch(url)
      const data = await response.json()
      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Route unavailable')
      const route = data.routes[0]
      const positions = route.geometry.coordinates.map((coordinate: [number, number]) => [coordinate[1], coordinate[0]])
      routeLine.current = L.polyline(positions, { color: '#e4a331', weight: 5, opacity: .9 }).addTo(map)
      setDistanceKm(route.distance / 1000)
      setRouteStatus('Driving route calculated. Select a delivery option below.')
    } catch {
      fallback()
    } finally {
      map.fitBounds(L.featureGroup([originMarker.current, destinationMarker.current]).getBounds().pad(.15))
      setRouteBusy(false)
    }
  }

  const setPickup = (point: Point) => {
    const map = mapInstance.current
    const L = leaflet()
    if (!map || !L) return
    if (originMarker.current) map.removeLayer(originMarker.current)
    originMarker.current = L.marker([point.lat, point.lng], { icon: iconFor('pickup') }).addTo(map).bindPopup(`<strong>Pickup point</strong><br>${point.label}`)
    originRef.current = point
    setOrigin(point)
    setDestination(null)
    setDistanceKm(0)
    clearRouteLine()
    setRouteStatus('Pickup point loaded. Click the map to place the delivery destination, or search for an address.')
  }

  const setDropoff = async (point: Point) => {
    const map = mapInstance.current
    const L = leaflet()
    const pickup = originRef.current
    if (!map || !L || !pickup) return
    if (destinationMarker.current) map.removeLayer(destinationMarker.current)
    destinationMarker.current = L.marker([point.lat, point.lng], { icon: iconFor('destination') }).addTo(map).bindPopup(`<strong>Delivery destination</strong><br>${point.label}`)
    setDestination(point)
    await drawRoute(pickup, point)
  }

  const resetPoints = () => {
    const map = mapInstance.current
    if (!map) return
    if (destinationMarker.current) map.removeLayer(destinationMarker.current)
    destinationMarker.current = null
    clearRouteLine()
    setDestination(null)
    setDistanceKm(0)
    setRouteStatus('Pickup remains fixed. Click the map to place a new delivery destination.')
    if (originRef.current) map.setView([originRef.current.lat, originRef.current.lng], 5)
  }

  useEffect(() => {
    let cancelled = false
    const setupMap = async () => {
      for (let attempt = 0; attempt < 30 && !leaflet(); attempt += 1) await new Promise((resolve) => window.setTimeout(resolve, 100))
      const pickup = await getShippingPickup().catch(() => ({ address: 'RetroDrive dispatch location', latitude: 39.5, longitude: -98.35 }))
      const L = leaflet()
      if (cancelled || !L || !mapNode.current) { if (!cancelled) setRouteStatus('The map could not load. Refresh the page and try again.'); return }
      const map = L.map(mapNode.current, { scrollWheelZoom: false }).setView([pickup.latitude, pickup.longitude], 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
      map.on('click', (event: { latlng: { lat: number; lng: number } }) => {
        const point = { lat: event.latlng.lat, lng: event.latlng.lng, label: `Latitude ${event.latlng.lat.toFixed(4)}, Longitude ${event.latlng.lng.toFixed(4)}` }
        if (originRef.current) void setDropoff(point)
      })
      mapInstance.current = map
      setPickup({ lat: pickup.latitude, lng: pickup.longitude, label: pickup.address })
    }
    void setupMap()
    return () => { cancelled = true; if (mapInstance.current) mapInstance.current.remove(); mapInstance.current = null }
  }, [])

  const searchAddress = async () => {
    if (!originRef.current) { setRouteStatus('The pickup location is still loading. Please try again in a moment.'); return }
    if (!search.trim()) return
    setRouteBusy(true)
    setRouteStatus('Finding that destination…')
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`, { headers: { 'Accept-Language': 'en-US,en;q=0.9' } })
      const results = await response.json()
      if (!results?.[0]) throw new Error('Location not found')
      const result = results[0]
      const label = String(result.display_name).split(',').slice(0, 3).join(',')
      await setDropoff({ lat: Number(result.lat), lng: Number(result.lon), label })
    } catch {
      setRouteStatus('Location not found. Try a city, ZIP code, or click the map to set the destination.')
      setRouteBusy(false)
    }
  }

  return <main className="hollywood-shipping">
    <section className="shipping-hero wrap-wide"><div><p className="garage-kicker">Real-time logistics</p><h1>INTERACTIVE<br /><em>DELIVERY ESTIMATOR.</em></h1></div><p>Your pickup location is set by RetroDrive. Place only the delivery destination on the map to calculate a driving route, real distance, and starting transport price.</p></section>
    <section className="shipping-route wrap-wide">
      <div className="shipping-map-wrap"><div className="shipping-map-container" ref={mapNode} aria-label="Interactive delivery map" /><p className="shipping-map-tip">The pickup point is fixed by RetroDrive. Click anywhere on the map to set or replace the delivery destination.</p></div>
      <div className="shipping-route-panel"><p className="garage-kicker">Plan your transport route</p><h2>SET THE<br /><em>DESTINATION.</em></h2><div className="shipping-fixed-pickup"><span>Fixed pickup</span><strong>{origin?.label ?? 'Loading location…'}</strong></div><label>Destination address or ZIP<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="e.g. Seattle, WA or 90210" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void searchAddress() } }} /></label><button className="shipping-calculate" type="button" onClick={() => void searchAddress()} disabled={routeBusy || !search.trim()}>{routeBusy ? 'Calculating…' : 'Find & calculate'} <span>→</span></button><p className="shipping-route-note">{routeStatus}</p><div className="shipping-point-summary"><span>01</span><strong>{origin ? 'RetroDrive pickup location' : 'Loading pickup location'}</strong><span>02</span><strong>{destination ? 'Destination set' : 'Choose destination'}</strong></div><button className="shipping-reset" type="button" onClick={resetPoints}>Reset destination</button></div>
    </section>
    {calculated && <section className="shipping-results wrap-wide" aria-live="polite"><header><p className="garage-kicker">Route calculated</p><h2>{number.format(miles)} MILES</h2><p>From {origin?.label} to {destination?.label}. Choose the transport option that fits your delivery timeline.</p></header><div className="shipping-tiers">{(Object.keys(serviceDetails) as Service[]).map((option) => <button className={`shipping-tier ${service === option ? 'selected' : ''}`} key={option} type="button" onClick={() => setService(option)}>{option === 'priority' && <b>Most requested</b>}<span className="tier-number">{serviceDetails[option].order}</span><span className="tier-copy"><strong>{serviceDetails[option].label}</strong><small>{serviceDetails[option].timing}</small><i>{serviceDetails[option].summary}</i></span><span className="tier-price">{money.format(priceFor(option))}<small>starting estimate</small></span></button>)}</div></section>}
    <section className="shipping-process wrap-wide"><header><p className="garage-kicker">How delivery works</p><h2>FROM OUR FLOOR<br /><em>TO YOUR DOOR.</em></h2></header><div className="shipping-process-grid"><article><span>01</span><h3>Reserve your vehicle</h3><p>Choose your vehicle and request the delivery route that fits your timeline.</p></article><article><span>02</span><h3>Inspect & prepare</h3><p>We confirm the details needed to coordinate a protected carrier pickup.</p></article><article><span>03</span><h3>Insured transport</h3><p>Your vehicle travels in a covered carrier with delivery updates along the way.</p></article><article><span>04</span><h3>White-glove handoff</h3><p>Delivery details are confirmed with you before the vehicle reaches its destination.</p></article></div></section>
    <section className="shipping-coverage"><div className="wrap-wide"><header><p className="garage-kicker">Flexible logistics</p><h2>WHEREVER THE<br /><em>ROAD LEADS.</em></h2></header><div className="shipping-coverage-grid"><article><span>USA</span><h3>Nationwide delivery</h3><p>Request transport to any of the 50 states. Standard and expedited options are available.</p><b>Route quote available</b></article><article><span>INTL</span><h3>International shipping</h3><p>For overseas destinations, our team can coordinate the documentation and shipping options.</p><b>Quote on request</b></article><article><span>PICKUP</span><h3>Pickup coordination</h3><p>Prefer to arrange your own transport? Let us know and we will coordinate the handoff.</p><b>By appointment</b></article></div></div></section>
    <button className="shipping-back text-back wrap-wide" onClick={() => go('/inventory')}>← Back to inventory</button>
  </main>
}
