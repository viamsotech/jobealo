import { NextRequest, NextResponse } from 'next/server'
import { checkDownloadLimit } from '@/lib/downloadLimits'
import { getClientIP, validateFingerprint } from '@/lib/fingerprint'

export async function POST(request: NextRequest) {
  try {
    const { fingerprint, language = 'spanish', userId } = await request.json()
    
    // Validate fingerprint format
    if (!fingerprint || !validateFingerprint(fingerprint)) {
      return NextResponse.json(
        { error: 'Invalid fingerprint data' },
        { status: 400 }
      )
    }
    
    // Validate language
    if (!['spanish', 'english'].includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language. Must be "spanish" or "english"' },
        { status: 400 }
      )
    }
    
    // Check download limits
    const limitCheck = await checkDownloadLimit(
      fingerprint.fingerprintHash, 
      language, 
      userId
    )
    
    return NextResponse.json({
      success: true,
      ...limitCheck
    })
    
  } catch (error) {
    console.error('Error checking download limit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 