import { NextRequest, NextResponse } from 'next/server'
import { hasFullAccess } from '@/lib/downloadLimits'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fingerprint, userId } = body

    // Validate required fields
    if (!fingerprint?.fingerprintHash) {
      return NextResponse.json(
        { error: 'Fingerprint hash is required' },
        { status: 400 }
      )
    }

    // Check if user has full access to all features
    const hasAccess = await hasFullAccess(fingerprint.fingerprintHash, userId)

    return NextResponse.json({
      hasFullAccess: hasAccess,
      fingerprintHash: fingerprint.fingerprintHash,
      userId: userId || null
    })

  } catch (error) {
    console.error('Full access check error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        hasFullAccess: false 
      },
      { status: 500 }
    )
  }
} 