import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user exists with credentials provider
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.toLowerCase())
      .eq('provider', 'credentials')
      .maybeSingle()

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, you will receive a reset link.'
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save reset token to database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error saving reset token:', updateError)
      return NextResponse.json(
        { error: 'Failed to process reset request' },
        { status: 500 }
      )
    }

    // TODO: Send email with reset link
    // For now, we'll just log the reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`
    console.log('Password reset URL:', resetUrl)
    console.log('Send this URL to:', email)

    // In production, you would send an email here
    // Example with a service like SendGrid, Resend, or NodeMailer
    
    return NextResponse.json({
      message: 'If an account exists with this email, you will receive a reset link.',
      // In development, include the reset URL for testing
      ...(process.env.NODE_ENV === 'development' && {
        resetUrl: resetUrl,
        debug: `Reset token: ${resetToken}`
      })
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 