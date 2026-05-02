import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20', // Use the latest stable or the one installed (17.3.1 supports this)
  appInfo: {
    name: 'ForecourIQ DMS',
    version: '0.1.0',
  },
})
