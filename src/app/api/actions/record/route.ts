import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { 
      fingerprint, 
      userId, 
      actionType, 
      details, 
      amountPaid = 0,
      stripePaymentIntentId,
      stripeSessionId 
    } = await request.json()

    if (!fingerprint || !actionType) {
      return NextResponse.json(
        { error: 'Fingerprint and actionType are required' },
        { status: 400 }
      )
    }

    // Validate action type
    const validActionTypes = [
      'DOWNLOAD_SPANISH', 
      'DOWNLOAD_ENGLISH', 
      'TRANSLATE_TO_ENGLISH',
      'GENERATE_EMAIL',
      'GENERATE_COVER_LETTER', 
      'ADAPT_CV'
    ]

    if (!validActionTypes.includes(actionType)) {
      return NextResponse.json(
        { error: 'Invalid action type' },
        { status: 400 }
      )
    }

    // Special case: Allow anonymous users to record actions in the database
    if (!userId) {
      // First, get or create the fingerprint record in user_fingerprints table
      let fingerprintRecord
      
      try {
        // Try to get existing fingerprint
        const { data: existingFingerprint, error: selectError } = await supabaseAdmin
          .from('user_fingerprints')
          .select('*')
          .eq('fingerprint_hash', fingerprint)
          .maybeSingle()

        if (selectError) {
          console.error('Error selecting fingerprint for recording:', selectError)
          throw new Error('Failed to check fingerprint')
        }

        if (!existingFingerprint) {
          // Create new fingerprint record
          const { data: newFingerprint, error: insertError } = await supabaseAdmin
            .from('user_fingerprints')
            .insert({
              fingerprint_hash: fingerprint,
              user_id: null, // Anonymous user
              ip_address: null,
              user_agent: null,
              screen_resolution: null,
              timezone: null,
              language: null
            })
            .select()
            .single()

          if (insertError) {
            console.error('Error creating fingerprint for recording:', insertError)
            throw new Error('Failed to create fingerprint')
          }

          fingerprintRecord = newFingerprint
          console.log('✅ Created new fingerprint record for recording action:', fingerprintRecord.id)
        } else {
          fingerprintRecord = existingFingerprint
          console.log('📍 Using existing fingerprint record for recording:', fingerprintRecord.id)
        }
      } catch (error) {
        console.error('Error handling fingerprint for recording:', error)
        return NextResponse.json(
          { error: 'Failed to handle user fingerprint' },
          { status: 500 }
        )
      }

      // For anonymous users, record the action directly in the database with the correct fingerprint_id
      try {
        const { data: actionRecord, error: insertError } = await supabaseAdmin
          .from('user_actions')
          .insert({
            fingerprint_id: fingerprintRecord.id, // Use the actual fingerprint ID, not the hash
            user_id: null, // Anonymous user
            action_type: actionType,
            details: details || null,
            amount_paid: amountPaid || 0,
            stripe_payment_intent_id: stripePaymentIntentId || null,
            stripe_session_id: stripeSessionId || null,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single()

        if (insertError) {
          console.error('Error recording anonymous action:', insertError)
          throw new Error('Failed to record action')
        }

        console.log(`✅ Recorded ${actionType} action for anonymous user with fingerprint ${fingerprintRecord.id}`)

        return NextResponse.json({
          success: true,
          actionId: actionRecord.id,
          message: `Action ${actionType} recorded for anonymous user`
        })
      } catch (error) {
        console.error('Error recording anonymous action:', error)
        return NextResponse.json(
          { error: 'Failed to record anonymous action' },
          { status: 500 }
        )
      }
    }

    // Call the database function to record the action
    const { data, error } = await supabaseAdmin
      .rpc('record_user_action', {
        p_fingerprint_id: fingerprint,
        p_user_id: userId || null,
        p_action_type: actionType,
        p_details: details || null,
        p_amount_paid: amountPaid,
        p_stripe_payment_intent_id: stripePaymentIntentId || null,
        p_stripe_session_id: stripeSessionId || null
      })

    if (error) {
      console.error('Error recording action:', error)
      return NextResponse.json(
        { error: 'Failed to record action' },
        { status: 500 }
      )
    }

    // Check if the action was successfully recorded
    if (!data.success) {
      const statusCode = data.error?.includes('not allowed') ? 402 : 400
      return NextResponse.json(
        { 
          error: data.error || 'Action could not be recorded',
          checkResult: data.check_result
        },
        { status: statusCode }
      )
    }

    return NextResponse.json({
      success: true,
      actionId: data.action_id,
      message: data.message || 'Action recorded successfully'
    })

  } catch (error) {
    console.error('Action record error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 