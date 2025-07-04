import { NextRequest, NextResponse } from 'next/server'
import { getUserStats } from '@/lib/downloadLimits'
import { validateFingerprint } from '@/lib/fingerprint'

export async function POST(request: NextRequest) {
  try {
    const { fingerprint, userId } = await request.json()
    
    // Validate fingerprint format
    if (!fingerprint || !validateFingerprint(fingerprint)) {
      return NextResponse.json(
        { error: 'Invalid fingerprint data' },
        { status: 400 }
      )
    }
    
    // Get user stats
    const stats = await getUserStats(fingerprint.fingerprintHash, userId)
    
    return NextResponse.json({
      success: true,
      stats
    })
    
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 