import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { stripe, STRIPE_PRODUCTS, type PlanType } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to continue' },
        { status: 401 }
      )
    }

    const { planType } = await request.json() as { planType: PlanType }

    // Validate plan type
    if (!planType || !STRIPE_PRODUCTS[planType]) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      )
    }

    const plan = STRIPE_PRODUCTS[planType]
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

    // Create checkout session configuration
    const checkoutSessionConfig: any = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: session.user.id,
        planType: planType,
        userEmail: session.user.email,
      },
      customer_email: session.user.email,
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
    }

    // For subscription (Pro plan)
    if (plan.interval === 'month') {
      checkoutSessionConfig.mode = 'subscription'
      checkoutSessionConfig.subscription_data = {
        metadata: {
          userId: session.user.id,
          planType: planType,
        }
      }
    } 
    // For one-time payment (Lifetime plan)
    else {
      checkoutSessionConfig.mode = 'payment'
    }

    // Create the checkout session
    const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionConfig)

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url
    })

  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 