export const LEAD_STATUSES = [
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Test Drive', value: 'test_drive' },
  { label: 'Offer Made', value: 'offer' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
]

export const VEHICLE_STATUSES = [
  { label: 'Available', value: 'available' },
  { label: 'Reserved', value: 'reserved' },
  { label: 'Sold', value: 'sold' },
  { label: 'In Prep', value: 'prep' },
]

export const SPECIALITIES = [
  { label: 'Budget (under £10k)', value: 'budget' },
  { label: 'Family Cars', value: 'family' },
  { label: 'Performance & Sports', value: 'performance' },
  { label: 'Prestige & Luxury', value: 'prestige' },
  { label: '4x4 & SUV', value: 'suv' },
  { label: 'Vans & Commercials', value: 'vans' },
  { label: 'Electric & Hybrid', value: 'electric' },
  { label: 'Classic & Vintage', value: 'classic' },
]

export const SUBSCRIPTION_PLANS = [
  { 
    id: 'starter', 
    name: 'Starter', 
    price: 149, 
    priceId: process.env.STRIPE_PRICE_STARTER,
    features: ['Up to 20 vehicles', 'Basic Analytics', 'Standard Support']
  },
  { 
    id: 'professional', 
    name: 'Professional', 
    price: 299, 
    priceId: process.env.STRIPE_PRICE_PROFESSIONAL,
    features: ['Unlimited vehicles', 'AI Command Centre', 'Priority Support']
  },
  { 
    id: 'elite', 
    name: 'Elite', 
    price: 499, 
    priceId: process.env.STRIPE_PRICE_ELITE,
    features: ['Multi-site support', 'Elite Intelligence', '24/7 Dedicated Account Manager']
  },
]

export const FUEL_TYPES = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'Plug-in Hybrid']
export const TRANSMISSIONS = ['Manual', 'Automatic', 'Semi-Automatic']
export const BODY_TYPES = ['Hatchback', 'Saloon', 'Estate', 'SUV', 'Coupe', 'Convertible', 'MPV', 'Van']
