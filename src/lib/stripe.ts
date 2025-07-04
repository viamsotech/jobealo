import Stripe from 'stripe'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2025-06-30.basil',
  typescript: true,
})

// Client-side Stripe configuration
export const getStripeJs = async () => {
  const { loadStripe } = await import('@stripe/stripe-js')
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')
}

// Product and price configurations
export const STRIPE_PRODUCTS = {
  PRO: {
    priceId: process.env.STRIPE_PRO_PRICE_ID || 'price_placeholder_pro',
    name: 'Jobealo Pro',
    description: 'Plan mensual con descargas ilimitadas',
    price: 14.99,
    interval: 'month' as const,
    features: [
      'Descargas ilimitadas en español',
      'Mejoras con IA ilimitadas', 
      'Traducción ilimitada al inglés',
      'Descargas al inglés ilimitadas'
    ]
  },
  LIFETIME: {
    priceId: process.env.STRIPE_LIFETIME_PRICE_ID || 'price_placeholder_lifetime',
    name: 'Jobealo Lifetime',
    description: 'Pago único de por vida',
    price: 59.99,
    originalPrice: 99.99,
    interval: 'one_time' as const,
    features: [
      'Descargas ilimitadas en español',
      'Mejoras con IA ilimitadas',
      'Traducción ilimitada al inglés', 
      'Descargas al inglés ilimitadas',
      'Creación de correo para aplicar a vacante ilimitada',
      'Carta de presentación para vacantes ilimitada'
    ]
  }
} as const

export type PlanType = keyof typeof STRIPE_PRODUCTS

// Helper function to format price
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// Helper function to get plan details
export const getPlanDetails = (planType: PlanType) => {
  return STRIPE_PRODUCTS[planType]
}

// Webhook event types we handle
export const WEBHOOK_EVENTS = {
  CHECKOUT_COMPLETED: 'checkout.session.completed',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
} as const 