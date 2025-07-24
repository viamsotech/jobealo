import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
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

      const downloadType = paymentIntent.metadata?.type
      const isAnonymousPayment = paymentIntent.metadata?.isAnonymous === 'true'
      const planType = paymentIntent.metadata?.planType

      // For plan upgrades, require authentication
      if (downloadType !== 'individual_download' && downloadType !== 'individual_action') {
        if (!session || !session.user) {
          return NextResponse.json(
            { error: 'Authentication required for plan upgrades' },
            { status: 401 }
          )
        }

        // Verify this payment belongs to the current user for plan upgrades
        if (paymentIntent.metadata?.userId !== session.user.id) {
          return NextResponse.json(
            { error: 'Unauthorized - Payment does not belong to user' },
            { status: 403 }
          )
        }
      }

      // Handle individual AI action payments
      if (downloadType === 'individual_action') {
        const actionType = paymentIntent.metadata?.actionType
        const actionPrice = paymentIntent.metadata?.actionPrice
        const amount = paymentIntent.amount / 100 // Convert cents to dollars
        const fingerprintHash = paymentIntent.metadata?.fingerprint

        if (!actionType) {
          return NextResponse.json(
            { error: 'Action type not found in payment metadata' },
            { status: 400 }
          )
        }

        if (!fingerprintHash || fingerprintHash === 'unknown') {
          return NextResponse.json(
            { error: 'Fingerprint not found in payment metadata' },
            { status: 400 }
          )
        }

        // For authenticated users, verify the payment belongs to them
        if (!isAnonymousPayment && session?.user?.id) {
          if (paymentIntent.metadata?.userId !== session.user.id) {
            return NextResponse.json(
              { error: 'Unauthorized - Payment does not belong to user' },
              { status: 403 }
            )
          }
        }

        // Get or create fingerprint record to get the fingerprint_id
        let fingerprintRecord
        try {
          // Try to get existing fingerprint
          const { data: existingFingerprint, error: selectError } = await supabaseAdmin
            .from('user_fingerprints')
            .select('*')
            .eq('fingerprint_hash', fingerprintHash)
            .maybeSingle()

          if (selectError) {
            console.error('Error fetching fingerprint:', selectError)
            return NextResponse.json(
              { error: 'Error processing payment verification' },
              { status: 500 }
            )
          }

          if (existingFingerprint) {
            fingerprintRecord = existingFingerprint
          } else {
            // Create new fingerprint if it doesn't exist
            const { data: newFingerprint, error: insertError } = await supabaseAdmin
              .from('user_fingerprints')
              .insert({
                fingerprint_hash: fingerprintHash,
                user_id: isAnonymousPayment ? null : (session?.user?.id || null)
              })
              .select()
              .single()

            if (insertError) {
              console.error('Error creating fingerprint:', insertError)
              return NextResponse.json(
                { error: 'Error processing payment verification' },
                { status: 500 }
              )
            }

            fingerprintRecord = newFingerprint
          }
        } catch (fingerprintError) {
          console.error('Fingerprint processing error:', fingerprintError)
          return NextResponse.json(
            { error: 'Error processing payment verification' },
            { status: 500 }
          )
        }

        // Map frontend action types to database action types
        const actionTypeMap: { [key: string]: string } = {
          'email': 'GENERATE_EMAIL',
          'cover-letter': 'GENERATE_COVER_LETTER',
          'adapt-cv': 'ADAPT_CV'
        }

        const dbActionType = actionTypeMap[actionType] || actionType.toUpperCase()

        // Record the action in the actions table
        try {
          const { error: actionError } = await supabaseAdmin
            .from('user_actions')
            .insert({
              fingerprint_id: fingerprintRecord.id,
              user_id: isAnonymousPayment ? null : (session?.user?.id || null),
              action_type: dbActionType,
              amount_paid: amount,
              stripe_payment_intent_id: paymentIntentId,
              created_at: new Date().toISOString()
            })

          if (actionError) {
            console.error('Error recording action:', actionError)
            return NextResponse.json(
              { error: 'Error recording action' },
              { status: 500 }
            )
          }
        } catch (dbError) {
          console.error('Database error recording action:', dbError)
          return NextResponse.json(
            { error: 'Database error recording action' },
            { status: 500 }
          )
        }

        const userInfo = isAnonymousPayment ? 'anonymous user' : `user ${session?.user?.id}`
        console.log(`Successfully processed individual action payment for ${userInfo}: ${actionType} - $${amount}`)

        return NextResponse.json({
          success: true,
          type: 'individual_action',
          actionType: actionType,
          amount: amount,
          message: 'Action payment processed successfully',
          paymentIntentId: paymentIntentId
        })
      }

      // For individual downloads, allow anonymous payments
      if (downloadType === 'individual_download') {
        const language = paymentIntent.metadata?.language
        const downloadPrice = paymentIntent.metadata?.downloadPrice
        const amount = paymentIntent.amount / 100 // Convert cents to dollars
        const fingerprintHash = paymentIntent.metadata?.fingerprint

        if (!language) {
          return NextResponse.json(
            { error: 'Download language not found in payment metadata' },
            { status: 400 }
          )
        }

        if (!fingerprintHash || fingerprintHash === 'unknown') {
          return NextResponse.json(
            { error: 'Fingerprint not found in payment metadata' },
            { status: 400 }
          )
        }

        // For authenticated users, verify the payment belongs to them
        if (!isAnonymousPayment && session?.user?.id) {
          if (paymentIntent.metadata?.userId !== session.user.id) {
            return NextResponse.json(
              { error: 'Unauthorized - Payment does not belong to user' },
              { status: 403 }
            )
          }
        }

        // Get or create fingerprint record to get the fingerprint_id
        let fingerprintRecord
        try {
          // Try to get existing fingerprint
          const { data: existingFingerprint, error: selectError } = await supabaseAdmin
            .from('user_fingerprints')
            .select('*')
            .eq('fingerprint_hash', fingerprintHash)
            .maybeSingle()

          if (selectError) {
            console.error('Error fetching fingerprint:', selectError)
            return NextResponse.json(
              { error: 'Error processing payment verification' },
              { status: 500 }
            )
          }

          if (existingFingerprint) {
            fingerprintRecord = existingFingerprint
          } else {
            // Create new fingerprint if it doesn't exist
            const { data: newFingerprint, error: insertError } = await supabaseAdmin
              .from('user_fingerprints')
              .insert({
                fingerprint_hash: fingerprintHash,
                user_id: isAnonymousPayment ? null : (session?.user?.id || null)
              })
              .select()
              .single()

            if (insertError) {
              console.error('Error creating fingerprint:', insertError)
              return NextResponse.json(
                { error: 'Error processing payment verification' },
                { status: 500 }
              )
            }

            fingerprintRecord = newFingerprint
          }
        } catch (fingerprintError) {
          console.error('Fingerprint processing error:', fingerprintError)
          return NextResponse.json(
            { error: 'Error processing payment verification' },
            { status: 500 }
          )
        }

        // Record the download in the downloads table with correct fingerprint_id
        try {
          const { error: downloadError } = await supabaseAdmin
            .from('downloads')
            .insert({
              fingerprint_id: fingerprintRecord.id, // Usar el fingerprint_id correcto
              user_id: isAnonymousPayment ? null : (session?.user?.id || null),
              download_type: `PAID_${language.toUpperCase()}`,
              file_name: `CV_${language}_${new Date().toISOString().split('T')[0]}.pdf`,
              amount_paid: amount,
              stripe_payment_intent_id: paymentIntentId,
              created_at: new Date().toISOString()
            })

          if (downloadError) {
            console.error('Error recording download:', downloadError)
            return NextResponse.json(
              { error: 'Error recording download' },
              { status: 500 }
            )
          }
        } catch (dbError) {
          console.error('Database error recording download:', dbError)
          return NextResponse.json(
            { error: 'Database error recording download' },
            { status: 500 }
          )
        }

        const userInfo = isAnonymousPayment ? 'anonymous user' : `user ${session?.user?.id}`
        console.log(`Successfully processed individual download payment for ${userInfo}: ${language} - $${amount}`)

        return NextResponse.json({
          success: true,
          type: 'individual_download',
          language: language,
          amount: amount,
          message: 'Download payment processed successfully',
          paymentIntentId: paymentIntentId
        })
      }

      // Handle plan upgrade payments (requires authentication)
      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Authentication required for plan upgrades' },
          { status: 401 }
        )
      }

      if (!planType) {
        return NextResponse.json(
          { error: 'Plan type not found in payment metadata' },
          { status: 400 }
        )
      }

      const amount = paymentIntent.amount / 100 // Convert cents to dollars

      // Update user plan in database
      const { error: updateError } = await supabaseAdmin
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
      const { error: purchaseError } = await supabaseAdmin
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