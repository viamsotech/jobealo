import { NextRequest, NextResponse } from 'next/server'
import { checkDownloadLimit, recordDownload } from '@/lib/downloadLimits'
import { getClientIP, validateFingerprint } from '@/lib/fingerprint'

export async function POST(request: NextRequest) {
  try {
    const { 
      fingerprint, 
      language = 'spanish', 
      fileName, 
      userId,
      amountPaid = 0,
      stripePaymentIntentId 
    } = await request.json()
    
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
    
    // Double-check limits before recording (prevent race conditions)
    const limitCheck = await checkDownloadLimit(
      fingerprint.fingerprintHash, 
      language, 
      userId
    )
    
    if (!limitCheck.allowed) {
      return NextResponse.json({
        success: false,
        error: 'Download not allowed',
        ...limitCheck
      }, { status: 429 }) // Too Many Requests
    }
    
    // If payment is required but not provided
    if (limitCheck.requiresPayment && amountPaid === 0 && !stripePaymentIntentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment required for this download',
        ...limitCheck
      }, { status: 402 }) // Payment Required
    }
    
    // If registration is required but user not provided
    if (limitCheck.requiresRegistration && !userId) {
      return NextResponse.json({
        success: false,
        error: 'Registration required for this download',
        ...limitCheck
      }, { status: 401 }) // Unauthorized
    }
    
    // Get client IP for tracking
    const clientIP = getClientIP(request)
    
    // Record the download
    await recordDownload(
      fingerprint.fingerprintHash,
      limitCheck.downloadType,
      clientIP,
      fileName || `cv-${language}.pdf`,
      userId,
      amountPaid,
      stripePaymentIntentId
    )
    
    // Get updated limit info
    const updatedLimits = await checkDownloadLimit(
      fingerprint.fingerprintHash, 
      language, 
      userId
    )
    
    return NextResponse.json({
      success: true,
      message: 'Download recorded successfully',
      amountPaid,
      ...updatedLimits
    })
    
  } catch (error) {
    console.error('Error recording download:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 