export type VehicleSummary = {
  slug: string
  year: number
  make: string
  model: string
  price: number
  priceText?: string | null
  msrp: number | null
  mileage: number
  exteriorColor: string
  stockNumber: string
  imageUrl: string
}

export type Vehicle = VehicleSummary & {
  vin: string
  interiorColor: string
  engine: string
  horsepower: string
  transmission: string
  bodyStyle: string
  location: string
  description: string
  features: string[]
  imageUrls: string[]
}

export type InquiryForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  vehicleSlug: string
  message: string
  pageUrl: string
}

export type ContactFields = {
  firstName: string
  lastName: string
  email: string
  phone: string
  pageUrl: string
}

export type AdminSession = {
  authenticated: boolean
}

export type AdminVehicle = Vehicle & {
  id: number
  published: boolean
  createdAt: string
  photoPublicIds: string[]
}

export type AdminVehicleInput = {
  slug?: string
  year: number
  make: string
  model: string
  price: number
  priceText: string
  msrp: number | null
  mileage: number
  vin: string
  exteriorColor: string
  interiorColor: string
  engine: string
  horsepower: string
  transmission: string
  bodyStyle: string
  location: string
  stockNumber: string
  description: string
  features: string[]
  photoPublicIds: string[]
  published: boolean
}

export type TrustedNetworkContent = {
  metrics: Array<{ value: string; label: string; detail: string }>
  eyebrow: string
  title: string
  description: string
  credentials: Array<{ icon: string; title: string; detail: string; status: string }>
  partners: Array<{ mark: string; name: string; category: string; image?: string }>
}

export type ShippingPickupLocation = {
  address: string
  latitude: number
  longitude: number
}

export type SiteSettingsContent = {
  showroomAddress: string
  phone: string
  email: string
  showroomHours: string
}

export type AboutContent = {
  eyebrow: string
  title: string
  intro: string
  story: {
    title: string
    paragraphs: string[]
    imageCaption: string
    licenseTitle: string
    licenseDetail: string
  }
  contact: {
    title: string
    addressLabel: string
    address: string
    phoneLabel: string
    phone: string
    phoneDetail: string
    emailLabel: string
    email: string
    emailDetail: string
    hoursLabel: string
    hours: string
  }
  stats: Array<{ value: string; label: string; detail: string }>
}
