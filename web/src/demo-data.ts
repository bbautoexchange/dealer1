import type { Vehicle } from './types'

export const demoVehicles: Vehicle[] = [
  {
    slug: '1967-ford-mustang-fastback',
    year: 1967,
    make: 'Ford',
    model: 'Mustang Fastback',
    price: 84900,
    msrp: 89500,
    mileage: 52318,
    exteriorColor: 'Highland Green',
    interiorColor: 'Black vinyl',
    vin: '7R02C184928',
    engine: '289 V8',
    horsepower: '271 hp',
    transmission: '4-speed manual',
    bodyStyle: 'Fastback',
    location: 'Scottsdale, Arizona',
    stockNumber: 'RD-6701',
    description: 'An authentically styled fastback with a documented restoration, period-correct details, and the confident road manners that made the first-generation Mustang an American icon.',
    features: ['Documented restoration', 'Factory-style interior', 'Period-correct 4-speed', 'Nationwide enclosed delivery'],
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85',
    imageUrls: [
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1600&q=85'
    ]
  },
  {
    slug: '1972-chevrolet-corvette-stingray',
    year: 1972,
    make: 'Chevrolet',
    model: 'Corvette Stingray',
    price: 58900,
    msrp: 62900,
    mileage: 61204,
    exteriorColor: 'Ontario Orange',
    interiorColor: 'Black leather',
    vin: '1Z37K2S500001',
    engine: '350 V8',
    horsepower: '200 hp',
    transmission: 'Turbo-Hydramatic automatic',
    bodyStyle: 'Coupe',
    location: 'Nashville, Tennessee',
    stockNumber: 'RD-7204',
    description: 'A bright, numbers-matching C3 coupe with removable T-tops, a rich black interior, and a well-kept presentation ready for weekend drives or a growing collection.',
    features: ['Numbers-matching drivetrain', 'Removable T-tops', 'Documented service history', 'Clear title'],
    imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=85',
    imageUrls: [
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1523983388277-336a66bf9bcd?auto=format&fit=crop&w=1600&q=85'
    ]
  },
  {
    slug: '1965-porsche-356c-coupe',
    year: 1965,
    make: 'Porsche',
    model: '356C Coupe',
    price: 119500,
    msrp: 126000,
    mileage: 48766,
    exteriorColor: 'Signal Red',
    interiorColor: 'Tan leather',
    vin: '221718',
    engine: '1600 cc flat-four',
    horsepower: '75 hp',
    transmission: '4-speed manual',
    bodyStyle: 'Coupe',
    location: 'Monterey, California',
    stockNumber: 'RD-6508',
    description: 'A late-production 356C finished in a timeless color combination. Carefully preserved character, sharp panel fit, and an inviting analog driving experience.',
    features: ['Late-production 356C', 'Four-wheel disc brakes', 'Collector-grade presentation', 'Inspection report available'],
    imageUrl: 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85',
    imageUrls: [
      'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a?auto=format&fit=crop&w=1600&q=85',
      'https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1600&q=85'
    ]
  }
]
