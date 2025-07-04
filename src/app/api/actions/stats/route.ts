import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { fingerprint, userId } = await request.json()

    if (!fingerprint) {
      return NextResponse.json(
        { error: 'Fingerprint is required' },
        { status: 400 }
      )
    }

    // Call the database function to get user statistics
    const { data, error } = await supabase
      .rpc('get_user_action_stats', {
        p_fingerprint_id: fingerprint,
        p_user_id: userId || null
      })

    if (error) {
      console.error('Error fetching user stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user statistics' },
        { status: 500 }
      )
    }

    // Transform the response to match our interface
    const stats = {
      totalActions: data.totalActions || 0,
      freeActionsUsed: data.freeActionsUsed || 0,
      freeActionLimit: data.freeActionLimit || 3,
      paidActions: data.paidActions || 0,
      plan: data.userType || 'ANONYMOUS',
      memberSince: null // We can add this later if needed
    }

    return NextResponse.json({
      stats,
      hasFullAccess: data.hasFullAccess || false,
      remainingFreeActions: data.remainingFreeActions || 0,
      userType: data.userType
    })

  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 