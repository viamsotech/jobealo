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

    const body = await request.json()
    const { planType, amount, currency, type, language } = body

    let paymentAmount: number
    let description: string
    let metadata: any

    if (type === 'individual_download') {
      // Individual download payment
      if (!amount || !language) {
        return NextResponse.json(
          { error: 'Amount and language are required for individual downloads' },
          { status: 400 }
        )
      }

      paymentAmount = amount // Amount already in cents
      description = `CV Download (${language === 'english' ? 'English' : 'Spanish'})`
      metadata = {
        userId: session.user.id,
        userEmail: session.user.email || '',
        type: 'individual_download',
        language: language,
        downloadPrice: (amount / 100).toString()
      }
    } else {
      // Plan payment (existing logic)
      if (!planType || !STRIPE_PRODUCTS[planType]) {
        return NextResponse.json(
          { error: 'Invalid plan type' },
          { status: 400 }
        )
      }

      const plan = STRIPE_PRODUCTS[planType]
      paymentAmount = Math.round(plan.price * 100)
      description = `${plan.name} Plan`
      metadata = {
        userId: session.user.id,
        planType: planType,
        userEmail: session.user.email || '',
        planName: plan.name,
        planPrice: plan.price.toString(),
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: paymentAmount,
      currency: currency || 'usd',
      payment_method_types: ['card'],
      description: description,
      metadata: metadata,
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: paymentAmount,
      type: type || 'plan',
      ...(planType && { planType, planName: STRIPE_PRODUCTS[planType].name }),
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
} 