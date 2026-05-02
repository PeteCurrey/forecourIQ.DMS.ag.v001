import Stripe from 'stripe'

// Provide a dummy key during build time to prevent initialization errors
const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_51dummy_key_for_build_purposes'

export const stripe = new Stripe(apiKey, {
  apiVersion: '2024-10-28.acacia',
  appInfo: {
    name: 'ForecourIQ DMS',
    version: '0.1.0',
  },
})
