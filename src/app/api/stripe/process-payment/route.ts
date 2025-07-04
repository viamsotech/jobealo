import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { paymentIntentId } = await request.json()

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment Intent ID is required' },
        { status: 400 }
      )
    }

    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      // Verify payment was successful
      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { error: 'Payment not completed' },
          { status: 400 }
        )
      }

      // Verify this payment belongs to the current user
      if (paymentIntent.metadata?.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized - Payment does not belong to user' },
          { status: 403 }
        )
      }

      const planType = paymentIntent.metadata?.planType
      const downloadType = paymentIntent.metadata?.type
      const amount = paymentIntent.amount / 100 // Convert cents to dollars

      if (downloadType === 'individual_download') {
        // Handle individual download payment
        const language = paymentIntent.metadata?.language
        const downloadPrice = paymentIntent.metadata?.downloadPrice

        if (!language) {
          return NextResponse.json(
            { error: 'Download language not found in payment metadata' },
            { status: 400 }
          )
        }

        // Record the download in the downloads table
        try {
          const { error: downloadError } = await supabase
            .from('downloads')
            .insert({
              user_id: session.user.id,
              download_type: `PAID_${language.toUpperCase()}`,
              file_name: `CV_${language}_${new Date().toISOString().split('T')[0]}.pdf`,
              amount_paid: amount,
              stripe_payment_intent_id: paymentIntentId,
              created_at: new Date().toISOString()
            })

          if (downloadError) {
            console.error('Error recording download:', downloadError)
            // Don't fail the request if download recording fails
          }
        } catch (dbError) {
          console.error('Database error recording download:', dbError)
        }

        console.log(`Successfully processed individual download payment for user ${session.user.id}: ${language} - $${amount}`)

        return NextResponse.json({
          success: true,
          type: 'individual_download',
          language: language,
          amount: amount,
          message: 'Download payment processed successfully'
        })
      }

      if (!planType) {
        return NextResponse.json(
          { error: 'Plan type not found in payment metadata' },
          { status: 400 }
        )
      }

      // Update user plan in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          plan: planType,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)

      if (updateError) {
        console.error('Error updating user plan:', updateError)
        return NextResponse.json(
          { error: 'Failed to update user plan' },
          { status: 500 }
        )
      }

      // Record the purchase
      const { error: purchaseError } = await supabase
        .from('individual_purchases')
        .insert({
          user_id: session.user.id,
          stripe_session_id: paymentIntent.id,
          amount: amount,
          currency: paymentIntent.currency,
          payment_type: planType === 'PRO' ? 'SUBSCRIPTION' : 'LIFETIME',
          plan_type: planType,
          status: 'COMPLETED',
          created_at: new Date().toISOString()
        })

      if (purchaseError) {
        console.error('Error recording purchase:', purchaseError)
        // Don't fail the request if purchase recording fails
      }

      console.log(`Successfully upgraded user ${session.user.id} to ${planType} plan`)

      return NextResponse.json({
        success: true,
        planType: planType,
        amount: amount,
        message: 'Payment processed successfully'
      })

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError)
      
      if (stripeError.code === 'resource_missing') {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to verify payment with Stripe' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 