import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { getStripeJs, type PlanType } from '@/lib/stripe'

export const useStripePayment = () => {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const createCheckoutSession = async (planType: PlanType) => {
    if (!session) {
      setError('Please sign in to upgrade your plan')
      return null
    }

    setIsLoading(true)
    setError('')

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      return data
    } catch (error) {
      console.error('Checkout session creation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to create checkout session')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const redirectToCheckout = async (planType: PlanType) => {
    const sessionData = await createCheckoutSession(planType)
    
    if (!sessionData) {
      return false
    }

    try {
      // Get Stripe.js instance
      const stripe = await getStripeJs()
      
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: sessionData.sessionId,
      })

      if (error) {
        console.error('Stripe redirect error:', error)
        setError(error.message || 'Failed to redirect to checkout')
        return false
      }

      return true
    } catch (error) {
      console.error('Stripe redirect error:', error)
      setError(error instanceof Error ? error.message : 'Failed to redirect to checkout')
      return false
    }
  }

  const verifyPayment = async (sessionId: string) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment')
      }

      return data
    } catch (error) {
      console.error('Payment verification error:', error)
      setError(error instanceof Error ? error.message : 'Failed to verify payment')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    createCheckoutSession,
    redirectToCheckout,
    verifyPayment,
    clearError: () => setError(''),
  }
} 