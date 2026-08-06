import { demoVehicles } from './demo-data'
import type { AboutContent, AdminSession, AdminVehicle, AdminVehicleInput, ContactFields, InquiryForm, ShippingPickupLocation, SiteSettingsContent, TrustedNetworkContent, Vehicle, VehicleSummary } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:5141' : '')

export const defaultTrustedNetwork: TrustedNetworkContent = {
  metrics: [
    { value: '15+', label: 'Years in business', detail: 'Built around collector cars' },
    { value: '1.2K+', label: 'Vehicles delivered', detail: 'Nationwide delivery support' },
    { value: '98%', label: 'Client satisfaction', detail: 'Based on buyer feedback' },
    { value: '50', label: 'States served', detail: 'Door-to-door availability' },
  ],
  eyebrow: 'Trusted network',
  title: 'LICENSED & PARTNERED',
  description: 'The specialists behind your purchase, financing, and delivery work together to keep each step clear.',
  credentials: [
    { icon: 'licensed', title: 'Licensed Motor Vehicle Dealer', detail: 'License details are provided with your purchase documentation.', status: 'Verified' },
    { icon: 'authorized', title: 'Authorized Dealer', detail: 'Curated classic, collector, and performance inventory.', status: 'Authorized' },
    { icon: 'certified', title: 'Certified Classic Dealer', detail: 'Vehicle histories, condition notes, and delivery planning in one place.', status: 'Certified' },
  ],
  partners: [
    { mark: 'ALLY', name: 'Ally Financial', category: 'Auto financing', image: '/partners/ally.svg' },
    { mark: 'CAP', name: 'Capital One', category: 'Auto finance', image: '/partners/capitalone.svg' },
    { mark: 'MON', name: 'Montway', category: 'Vehicle transport', image: '/partners/montway.svg' },
    { mark: 'AT', name: 'AutoTrader', category: 'Marketplace', image: '/partners/autotrader.svg' },
    { mark: 'CARFAX', name: 'Carfax', category: 'Vehicle history', image: '/partners/carfax.svg' },
    { mark: 'CS', name: 'CarShield', category: 'Extended warranty', image: '/partners/carshield.svg' },
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
  const response = await request<{ message: string }>('/api/inquiries', {
    method: 'POST',
    body: JSON.stringify(inquiry),
  })
  return response.message
}

async function submitLead(path: string, body: object): Promise<string> {
  const response = await request<{ message: string }>(path, { method: 'POST', body: JSON.stringify(body) })
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

export function updateAdminVehicle(id: number, vehicle: AdminVehicleInput) {
  return adminRequest<AdminVehicle>(`/api/admin/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(vehicle) })
}

export function deleteAdminVehicle(id: number) {
  return adminRequest<void>(`/api/admin/vehicles/${id}`, { method: 'DELETE' })
}

export function setVehiclePublication(id: number, published: boolean) {
  return adminRequest<void>(`/api/admin/vehicles/${id}/publication`, { method: 'PATCH', body: JSON.stringify({ published }) })
}
