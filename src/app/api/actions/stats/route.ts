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

    // For anonymous users (no userId), handle stats directly
    if (!userId) {
      // First, get or create the fingerprint record in user_fingerprints table
      let fingerprintRecord
      
      try {
        // Try to get existing fingerprint
        const { data: existingFingerprint, error: selectError } = await supabase
          .from('user_fingerprints')
          .select('*')
          .eq('fingerprint_hash', fingerprint)
          .maybeSingle()

        if (selectError) {
          console.error('Error selecting fingerprint for stats:', selectError)
          throw new Error('Failed to check fingerprint')
        }

        if (!existingFingerprint) {
          // Create new fingerprint record
          const { data: newFingerprint, error: insertError } = await supabase
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
            console.error('Error creating fingerprint for stats:', insertError)
            throw new Error('Failed to create fingerprint')
          }

          fingerprintRecord = newFingerprint
          console.log('✅ Created new fingerprint record for stats:', fingerprintRecord.id)
        } else {
          fingerprintRecord = existingFingerprint
          console.log('📍 Using existing fingerprint record for stats:', fingerprintRecord.id)
        }
      } catch (error) {
        console.error('Error handling fingerprint for stats:', error)
        // Return default stats if fingerprint handling fails
        return NextResponse.json({
          stats: {
            totalActions: 0,
            freeActionsUsed: 0,
            freeActionLimit: 3,
            paidActions: 0,
            plan: 'ANONYMOUS',
            memberSince: null
          },
          hasFullAccess: true, // Allow first 3 actions
          remainingFreeActions: 3,
          userType: 'ANONYMOUS'
        })
      }

      // Get stats for anonymous user using the correct fingerprint_id
      try {
        // Count total actions
        const { count: totalActions, error: totalError } = await supabase
          .from('user_actions')
          .select('*', { count: 'exact', head: true })
          .eq('fingerprint_id', fingerprintRecord.id)

        if (totalError) {
          console.error('Error counting total actions:', totalError)
          throw new Error('Failed to get total actions')
        }

        // Count free actions (those with amount_paid = 0)
        const { count: freeActions, error: freeError } = await supabase
          .from('user_actions')
          .select('*', { count: 'exact', head: true })
          .eq('fingerprint_id', fingerprintRecord.id)
          .eq('amount_paid', 0)

        if (freeError) {
          console.error('Error counting free actions:', freeError)
          throw new Error('Failed to get free actions')
        }

        // Count paid actions
        const { count: paidActions, error: paidError } = await supabase
          .from('user_actions')
          .select('*', { count: 'exact', head: true })
          .eq('fingerprint_id', fingerprintRecord.id)
          .gt('amount_paid', 0)

        if (paidError) {
          console.error('Error counting paid actions:', paidError)
          throw new Error('Failed to get paid actions')
        }

        const totalActionsCount = totalActions || 0
        const freeActionsUsed = freeActions || 0
        const paidActionsCount = paidActions || 0
        const remainingFreeActions = Math.max(0, 3 - freeActionsUsed)
        const hasFullAccess = remainingFreeActions > 0

        console.log(`📊 Anonymous user stats: ${totalActionsCount} total, ${freeActionsUsed} free, ${paidActionsCount} paid, ${remainingFreeActions} remaining`)

        return NextResponse.json({
          stats: {
            totalActions: totalActionsCount,
            freeActionsUsed: freeActionsUsed,
            freeActionLimit: 3,
            paidActions: paidActionsCount,
            plan: 'ANONYMOUS',
            memberSince: null
          },
          hasFullAccess: hasFullAccess,
          remainingFreeActions: remainingFreeActions,
          userType: 'ANONYMOUS'
        })
      } catch (error) {
        console.error('Error getting anonymous user stats:', error)
        // Return default stats if query fails
        return NextResponse.json({
          stats: {
            totalActions: 0,
            freeActionsUsed: 0,
            freeActionLimit: 3,
            paidActions: 0,
            plan: 'ANONYMOUS',
            memberSince: null
          },
          hasFullAccess: true,
          remainingFreeActions: 3,
          userType: 'ANONYMOUS'
        })
      }
    }

    // Call the database function to get user statistics for authenticated users
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
    const userPlan = data.userType === 'PRO' || data.userType === 'LIFETIME' ? data.userType : 'FREEMIUM'
    const isProOrLifetime = userPlan === 'PRO' || userPlan === 'LIFETIME'
    
    const stats = {
      totalActions: data.totalActions || 0,
      freeActionsUsed: data.freeActionsUsed || 0,
      freeActionLimit: isProOrLifetime ? -1 : (data.freeActionLimit || 3),
      paidActions: data.paidActions || 0,
      plan: userPlan,
      memberSince: null // We can add this later if needed
    }

    return NextResponse.json({
      stats,
      hasFullAccess: isProOrLifetime ? true : (data.hasFullAccess || false),
      remainingFreeActions: isProOrLifetime ? -1 : (data.remainingFreeActions || 0),
      userType: data.userType || 'ANONYMOUS'
    })

  } catch (error) {
    console.error('Stats fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 