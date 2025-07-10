import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { stripe, STRIPE_PRODUCTS, type PlanType } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    const { planType, amount, currency, type, language, actionType, fingerprint } = body

    // For plan payments, require authentication
    if (!type || (type !== 'individual_download' && type !== 'individual_action')) {
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized - Please sign in to continue' },
          { status: 401 }
        )
      }
    }

    let paymentAmount: number
    let description: string
    let metadata: any

    if (type === 'individual_download') {
      // Individual download payment - allow for anonymous users
      if (!amount || !language) {
        return NextResponse.json(
          { error: 'Amount and language are required for individual downloads' },
          { status: 400 }
        )
      }

      paymentAmount = amount // Amount already in cents
      description = `CV Download (${language === 'english' ? 'English' : 'Spanish'})`
      metadata = {
        userId: session?.user?.id || 'anonymous',
        userEmail: session?.user?.email || 'anonymous@jobealo.com',
        type: 'individual_download',
        language: language,
        downloadPrice: (amount / 100).toString(),
        isAnonymous: !session?.user?.id ? 'true' : 'false',
        fingerprint: fingerprint || 'unknown'
      }
    } else if (type === 'individual_action') {
      // Individual AI action payment - allow for anonymous users
      if (!amount || !actionType) {
        return NextResponse.json(
          { error: 'Amount and actionType are required for individual actions' },
          { status: 400 }
        )
      }

      paymentAmount = amount // Amount already in cents
      description = `AI Action: ${actionType}`
      metadata = {
        userId: session?.user?.id || 'anonymous',
        userEmail: session?.user?.email || 'anonymous@jobealo.com',
        type: 'individual_action',
        actionType: actionType,
        actionPrice: (amount / 100).toString(),
        isAnonymous: !session?.user?.id ? 'true' : 'false',
        fingerprint: fingerprint || 'unknown'
      }
    } else {
      // Plan payment (existing logic) - requires authentication
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Authentication required for plan upgrades' },
          { status: 401 }
        )
      }

      if (!planType || !(planType in STRIPE_PRODUCTS)) {
        return NextResponse.json(
          { error: 'Invalid plan type' },
          { status: 400 }
        )
      }

      const plan = STRIPE_PRODUCTS[planType as PlanType]
      paymentAmount = Math.round(plan.price * 100)
      description = `${plan.name} Plan`
      metadata = {
        userId: session.user.id,
        planType: planType,
        userEmail: session.user.email || '',
        planName: plan.name,
        planPrice: plan.price.toString(),
        fingerprint: fingerprint || 'unknown'
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
      ...(planType && { planType, planName: STRIPE_PRODUCTS[planType as PlanType].name }),
    })

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
} 