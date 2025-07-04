import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    try {
      // Retrieve the checkout session from Stripe
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId)

      // Check if this is an individual payment (doesn't require auth)
      const isIndividualPayment = checkoutSession.metadata?.type === 'individual_download'

      // For plan payments, require authentication and user verification
      if (!isIndividualPayment) {
        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }

        // Verify that this session belongs to the current user
        if (checkoutSession.metadata?.userId !== session.user.id) {
          return NextResponse.json(
            { error: 'Unauthorized - Session does not belong to user' },
            { status: 403 }
          )
        }
      }

      // Check if payment was successful
      if (checkoutSession.payment_status !== 'paid') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 400 }
        )
      }

      // Extract payment details
      const paymentDetails = {
        sessionId: checkoutSession.id,
        planType: checkoutSession.metadata?.planType,
        amount: checkoutSession.amount_total ? (checkoutSession.amount_total / 100).toFixed(2) : '0.00',
        currency: checkoutSession.currency?.toUpperCase() || 'USD',
        paymentStatus: checkoutSession.payment_status,
        customerEmail: checkoutSession.customer_email,
        mode: checkoutSession.mode, // 'payment' or 'subscription'
        created: new Date(checkoutSession.created * 1000).toISOString(),
        type: checkoutSession.metadata?.type,
        language: checkoutSession.metadata?.language
      }

      return NextResponse.json(paymentDetails)

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError)
      
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Payment session not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to verify payment with Stripe' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 