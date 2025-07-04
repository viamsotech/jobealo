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
    
    // Convert price to cents
    const amount = Math.round(plan.price * 100)

    // Create payment intent - Solo tarjetas, configuración estable
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card'], // Solo tarjetas - esto automáticamente excluye Link y wallets
      metadata: {
        userId: session.user.id,
        planType: planType,
        userEmail: session.user.email || '',
        planName: plan.name,
        planPrice: plan.price.toString(),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      planType: planType,
      planName: plan.name,
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
} 