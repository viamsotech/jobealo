import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // Call the database function to record the action
    const { data, error } = await supabase
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