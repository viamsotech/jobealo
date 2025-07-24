import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const { fingerprintHash } = await request.json()
    
    if (!fingerprintHash) {
      return NextResponse.json(
        { error: 'fingerprintHash is required' },
        { status: 400 }
      )
    }
    
    // Check if fingerprint exists
    const { data: fingerprint, error: selectError } = await supabaseAdmin
      .from('user_fingerprints')
      .select('*')
      .eq('fingerprint_hash', fingerprintHash)
      .maybeSingle()
    
    if (selectError) {
      console.error('Error selecting fingerprint:', selectError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }
    
    if (!fingerprint) {
      // Create new fingerprint linked to user
      const { data: newFingerprint, error: insertError } = await supabaseAdmin
        .from('user_fingerprints')
        .insert({
          fingerprint_hash: fingerprintHash,
          user_id: session.user.id
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Error creating fingerprint:', insertError)
        return NextResponse.json(
          { error: 'Failed to create fingerprint' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Fingerprint created and linked',
        fingerprint: newFingerprint
      })
    }
    
    // Update existing fingerprint to link to user
    if (fingerprint.user_id !== session.user.id) {
      const { data: updatedFingerprint, error: updateError } = await supabaseAdmin
        .from('user_fingerprints')
        .update({ user_id: session.user.id })
        .eq('fingerprint_hash', fingerprintHash)
        .select()
        .single()
      
      if (updateError) {
        console.error('Error updating fingerprint:', updateError)
        return NextResponse.json(
          { error: 'Failed to update fingerprint' },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: 'Fingerprint linked to user',
        fingerprint: updatedFingerprint
      })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Fingerprint already linked correctly',
      fingerprint
    })
    
  } catch (error) {
    console.error('Error fixing fingerprint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
