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

    // For anonymous users (no userId), handle the basic free actions directly
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
          console.error('Error selecting fingerprint:', selectError)
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
            console.error('Error creating fingerprint:', insertError)
            throw new Error('Failed to create fingerprint')
          }

          fingerprintRecord = newFingerprint
          console.log('✅ Created new fingerprint record for anonymous user:', fingerprintRecord.id)
        } else {
          fingerprintRecord = existingFingerprint
          console.log('📍 Found existing fingerprint record:', fingerprintRecord.id)
        }
      } catch (error) {
        console.error('Error handling fingerprint:', error)
        // If we can't handle fingerprint, allow but assume they need to pay
        return NextResponse.json({
          allowed: false,
          remaining: 0,
          requiresPayment: true,
          requiresRegistration: false,
          price: 1.99,
          userType: 'ANONYMOUS',
          currentActions: 0
        })
      }

      // Now check how many actions they've already used with the correct fingerprint_id
      // Count ALL actions together, not per action type (total limit is 3 actions, not 3 per type)
      const { data: actionsCount, error: countError } = await supabase
        .from('user_actions')
        .select('id')
        .eq('fingerprint_id', fingerprintRecord.id) // Use the actual fingerprint ID, not the hash
        // REMOVED: .eq('action_type', actionType) - Count ALL action types together

      if (countError) {
        console.error('Error counting anonymous actions:', countError)
        // If we can't check, don't allow it
        return NextResponse.json({
          allowed: false,
          remaining: 0,
          requiresPayment: true,
          requiresRegistration: false,
          price: 1.99,
          userType: 'ANONYMOUS',
          currentActions: 0
        })
      }

      const usedActions = actionsCount?.length || 0
      const remainingActions = Math.max(0, 3 - usedActions)

      console.log(`🔍 Anonymous user total actions: ${usedActions}/3 used, ${remainingActions} remaining (checking ${actionType})`)

      if (remainingActions > 0) {
        // They still have free actions available
        return NextResponse.json({
          allowed: true,
          remaining: remainingActions,
          requiresPayment: false,
          requiresRegistration: false,
          price: null,
          userType: 'ANONYMOUS',
          currentActions: usedActions
        })
      } else {
        // They've used their 3 free actions, need to pay
        return NextResponse.json({
          allowed: false, // Block the action
          remaining: 0,
          requiresPayment: true,
          requiresRegistration: false,
          price: 1.99,
          userType: 'ANONYMOUS',
          currentActions: usedActions
        })
      }
    }

    // For authenticated users, use the database function
    const { data, error } = await supabase
      .rpc('can_perform_action', {
        p_fingerprint_id: fingerprint,
        p_user_id: userId,
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