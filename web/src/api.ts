import { demoVehicles } from './demo-data'
import type { AboutContent, AdminSession, AdminVehicle, AdminVehicleInput, ContactFields, InquiryForm, ShippingPickupLocation, SiteSettingsContent, TrustedNetworkContent, Vehicle, VehicleSummary } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5141' : '')

type MetaPixelWindow = Window & { fbq?: (...args: unknown[]) => void }

function createMetaEventId() {
  return `lead_${typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`
}

function trackMetaLead(eventId: string) {
  ;(window as MetaPixelWindow).fbq?.('track', 'Lead', {}, { eventID: eventId })
}

export const defaultTrustedNetwork: TrustedNetworkContent = {
  metrics: [
    { value: 'Retro only', label: 'Inventory focus', detail: 'Classic vehicles with character' },
    { value: 'Vehicle-led', label: 'Every listing', detail: 'Specs, photos, and context' },
    { value: 'Nationwide', label: 'Delivery planning', detail: 'Route support when needed' },
    { value: 'Direct', label: 'B & B support', detail: 'Questions welcomed' },
  ],
  eyebrow: 'The B & B approach',
  title: 'CLASSICS, KEPT PERSONAL',
  description: 'B & B Auto Exchange keeps the process centered on the vehicle, the details that matter, and a clear next step.',
  credentials: [
    { icon: 'licensed', title: 'Retro and classic only', detail: 'The collection is dedicated to timeless vehicles with real character.', status: 'Focused' },
    { icon: 'authorized', title: 'Details before decisions', detail: 'Each listing brings together the specifications, condition context, and available media.', status: 'Clear' },
    { icon: 'certified', title: 'Personal next steps', detail: 'Ask about a vehicle, finance planning, or delivery from the same place.', status: 'Personal' },
  ],
  partners: [
    { mark: '01', name: 'Discover', category: 'Browse the collection' },
    { mark: '02', name: 'Review', category: 'Explore the vehicle file' },
    { mark: '03', name: 'Plan', category: 'Finance or delivery' },
    { mark: '04', name: 'Connect', category: 'Talk with B & B' },
  ],
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail ?? error?.title ?? 'Something went wrong. Please try again.')
  }

  return response.status === 204 ? Promise.resolve(undefined as T) : response.json() as Promise<T>
}

function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { credentials: 'include', ...init })
}

export async function getVehicles(): Promise<VehicleSummary[]> {
  try {
    return await request<VehicleSummary[]>('/api/vehicles')
  } catch {
    return demoVehicles
  }
}

export async function getVehicle(slug: string): Promise<Vehicle> {
  try {
    return await request<Vehicle>(`/api/vehicles/${encodeURIComponent(slug)}`)
  } catch {
    const vehicle = demoVehicles.find((item) => item.slug === slug)
    if (!vehicle) throw new Error('This vehicle is no longer available.')
    return vehicle
  }
}

export async function getTrustedNetwork(): Promise<TrustedNetworkContent> {
  try {
    return await request<TrustedNetworkContent>('/api/site/trusted-network')
  } catch {
    return defaultTrustedNetwork
  }
}

export async function getShippingPickup(): Promise<ShippingPickupLocation> {
  return request<ShippingPickupLocation>('/api/site/shipping-pickup')
}

export async function getAboutContent(): Promise<AboutContent> {
  return request<AboutContent>('/api/site/about')
}

export async function getSiteSettings(): Promise<SiteSettingsContent> {
  return request<SiteSettingsContent>('/api/site/settings')
}

export async function submitInquiry(inquiry: InquiryForm): Promise<string> {
  const metaEventId = createMetaEventId()
  const response = await request<{ message: string }>('/api/inquiries', {
    method: 'POST',
    body: JSON.stringify({ ...inquiry, metaEventId }),
  })
  trackMetaLead(metaEventId)
  return response.message
}

async function submitLead(path: string, body: object): Promise<string> {
  const metaEventId = createMetaEventId()
  const response = await request<{ message: string }>(path, { method: 'POST', body: JSON.stringify({ ...body, metaEventId }) })
  trackMetaLead(metaEventId)
  return response.message
}

export function submitFinance(body: ContactFields & { vehiclePrice: number; downPayment: number; interestRate: number; termMonths: number; vehicleName?: string; vehicleVin?: string; vehicleSlug?: string; vehiclePriceLabel?: string }) {
  return submitLead('/api/leads/finance', body)
}

export function submitTradeIn(body: ContactFields & { year: number; make: string; model: string; mileage: number; condition: string; message: string }) {
  return submitLead('/api/leads/trade-in', body)
}

export function submitDelivery(body: ContactFields & { destination: string; distanceMiles: number; vehicle?: string }) {
  return submitLead('/api/leads/delivery', body)
}

export function subscribeVip(body: { email: string; pageUrl: string }) {
  return submitLead('/api/leads/newsletter', body)
}

export async function getAdminSession(): Promise<AdminSession> {
  const response = await fetch(`${apiBaseUrl}/api/admin/auth/me`, { credentials: 'include' })
  if (response.status === 401) return { authenticated: false }
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.detail ?? error?.title ?? 'Admin access is temporarily unavailable.')
  }
  return response.json() as Promise<AdminSession>
}

export function adminLogin(password: string) {
  return adminRequest<AdminSession>('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
}

export function adminLogout() {
  return adminRequest<void>('/api/admin/auth/logout', { method: 'POST' })
}

export function getAdminVehicles() {
  return adminRequest<AdminVehicle[]>('/api/admin/vehicles')
}

export function createAdminVehicle(vehicle: AdminVehicleInput) {
  return adminRequest<AdminVehicle>('/api/admin/vehicles', { method: 'POST', body: JSON.stringify(vehicle) })
}

export function importAdminVehicles(vehicles: AdminVehicleInput[]) {
  return adminRequest<AdminVehicle[]>('/api/admin/vehicles/import', { method: 'POST', body: JSON.stringify({ vehicles }) })
}

export function updateAdminVehicle(id: number, vehicle: AdminVehicleInput) {
  return adminRequest<AdminVehicle>(`/api/admin/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(vehicle) })
}

export function deleteAdminVehicle(id: number) {
  return adminRequest<void>(`/api/admin/vehicles/${id}`, { method: 'DELETE' })
}

export function setVehiclePublication(id: number, published: boolean) {
  return adminRequest<void>(`/api/admin/vehicles/${id}/publication`, { method: 'PATCH', body: JSON.stringify({ published }) })
}
