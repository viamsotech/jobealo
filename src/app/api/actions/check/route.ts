import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { fingerprint, userId, actionType } = await request.json()

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint is required' },
        { status: 400 }
      )
    }

    // Call the database function to check action limits
    const { data, error } = await supabase
      .rpc('can_perform_action', {
        p_fingerprint_id: fingerprint,
        p_user_id: userId || null,
        p_action_type: actionType
      })

    if (error) {
      console.error('Error checking action limit:', error)
      return NextResponse.json(
        { error: 'Failed to check action limit' },
        { status: 500 }
      )
    }

    // Transform the response to match our interface
    const result = {
      allowed: data.allowed,
      remaining: data.remaining,
      requiresPayment: data.requiresPayment || false,
      requiresRegistration: data.requiresRegistration || false,
      price: data.price || null,
      userType: data.userType,
      currentActions: data.currentActions
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Action check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 