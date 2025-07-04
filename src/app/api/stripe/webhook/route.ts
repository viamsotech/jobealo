import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, WEBHOOK_EVENTS } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing Stripe signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case WEBHOOK_EVENTS.CHECKOUT_COMPLETED:
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED:
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case WEBHOOK_EVENTS.CUSTOMER_SUBSCRIPTION_DELETED:
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Handle successful checkout completion
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id)

  const userId = session.metadata?.userId
  const planType = session.metadata?.planType
  const paymentType = session.metadata?.type
  const language = session.metadata?.language

  // Handle individual download payments
  if (paymentType === 'individual_download') {
    console.log(`Processing individual download payment for language: ${language}`)
    
    try {
      // Record the individual purchase
      const { error: purchaseError } = await supabase
        .from('individual_purchases')
        .insert({
          user_id: userId, // Can be null for non-registered users
          stripe_session_id: session.id,
          amount: (session.amount_total || 0) / 100, // Convert cents to dollars
          currency: session.currency || 'usd',
          payment_type: 'INDIVIDUAL_DOWNLOAD',
          plan_type: null,
          metadata: {
            language: language,
            type: 'individual_download'
          },
          created_at: new Date().toISOString()
        })

      if (purchaseError) {
        console.error('Error recording individual purchase:', purchaseError)
      } else {
        console.log(`Successfully recorded individual download payment for ${language}`)
      }
    } catch (error) {
      console.error('Error processing individual download payment:', error)
    }
    return
  }

  // Handle plan upgrades (existing logic)
  if (!userId || !planType) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  try {
    // Determine the new plan based on payment mode
    let newPlan: string
    let stripeCustomerId = session.customer as string
    let subscriptionId: string | null = null

    if (session.mode === 'subscription') {
      // Pro plan (subscription)
      newPlan = 'PRO'
      subscriptionId = session.subscription as string
    } else {
      // Lifetime plan (one-time payment)
      newPlan = 'LIFETIME'
    }

    // Update user plan in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan: newPlan,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user plan:', updateError)
      return
    }

    // Record the purchase
    const { error: purchaseError } = await supabase
      .from('individual_purchases')
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount: (session.amount_total || 0) / 100, // Convert cents to dollars
        currency: session.currency || 'usd',
        payment_type: newPlan === 'PRO' ? 'SUBSCRIPTION' : 'LIFETIME',
        plan_type: newPlan,
        created_at: new Date().toISOString()
      })

    if (purchaseError) {
      console.error('Error recording purchase:', purchaseError)
    }

    console.log(`Successfully upgraded user ${userId} to ${newPlan} plan`)

  } catch (error) {
    console.error('Error processing checkout completion:', error)
  }
}

// Handle successful invoice payment (for subscription renewals)
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Invoice payment succeeded:', invoice.id)

  // For subscription renewals, we mainly just log the event
  // The main plan updates happen in checkout.session.completed
  console.log(`Invoice ${invoice.id} payment succeeded for customer ${invoice.customer}`)
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)

  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('Missing userId in subscription metadata:', subscription.id)
    return
  }

  try {
    // Downgrade user to FREEMIUM
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan: 'FREEMIUM',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .eq('stripe_subscription_id', subscription.id)

    if (updateError) {
      console.error('Error downgrading user plan:', updateError)
      return
    }

    console.log(`Successfully downgraded user ${userId} to FREEMIUM plan`)

  } catch (error) {
    console.error('Error processing subscription cancellation:', error)
  }
} 