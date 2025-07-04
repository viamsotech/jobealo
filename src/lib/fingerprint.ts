/**
 * Browser Fingerprinting Library
 * Creates a unique hash based on browser characteristics without storing personal data
 */

export interface BrowserFingerprint {
  fingerprintHash: string
  userAgent: string
  screenResolution: string
  timezone: string
  language: string
}

/**
 * Generate a comprehensive browser fingerprint
 */
export async function generateFingerprint(): Promise<BrowserFingerprint> {
  // Collect browser characteristics
  const userAgent = navigator.userAgent
  const screenResolution = `${screen.width}x${screen.height}x${screen.colorDepth}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const language = navigator.language

  // Additional entropy sources
  const platform = navigator.platform
  const hardwareConcurrency = navigator.hardwareConcurrency || 0
  const maxTouchPoints = navigator.maxTouchPoints || 0
  const cookieEnabled = navigator.cookieEnabled
  
  // Canvas fingerprinting (subtle but effective)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.textBaseline = 'top'
    ctx.font = '14px Arial'
    ctx.fillText('Jobealo CV Builder 🚀', 2, 2)
  }
  const canvasFingerprint = canvas.toDataURL()

  // WebGL fingerprinting
  const gl = canvas.getContext('webgl')
  const webglRenderer = gl ? gl.getParameter(gl.RENDERER) : 'unknown'
  const webglVendor = gl ? gl.getParameter(gl.VENDOR) : 'unknown'

  // Combine all characteristics
  const fingerprintData = [
    userAgent,
    screenResolution,
    timezone,
    language,
    platform,
    hardwareConcurrency.toString(),
    maxTouchPoints.toString(),
    cookieEnabled.toString(),
    canvasFingerprint,
    webglRenderer,
    webglVendor
  ].join('|')

  // Generate SHA-256 hash
  const fingerprintHash = await generateSHA256(fingerprintData)

  return {
    fingerprintHash,
    userAgent,
    screenResolution,
    timezone,
    language
  }
}

/**
 * Generate SHA-256 hash from string
 */
async function generateSHA256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Get client IP address (from headers in API route)
 */
export function getClientIP(request: Request): string | null {
  // Try various header combinations
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  const clientIP = request.headers.get('x-client-ip')
  if (clientIP) {
    return clientIP
  }

  return null
}

/**
 * Validate if fingerprint looks legitimate (basic anti-bot check)
 */
export function validateFingerprint(fingerprint: BrowserFingerprint): boolean {
  // Check if userAgent looks real
  if (!fingerprint.userAgent || fingerprint.userAgent.length < 20) {
    return false
  }

  // Check if screen resolution looks real
  const resolution = fingerprint.screenResolution.split('x')
  if (resolution.length !== 3) {
    return false
  }

  const width = parseInt(resolution[0])
  const height = parseInt(resolution[1])
  
  // Screen too small/large = likely bot
  if (width < 800 || width > 4000 || height < 600 || height > 3000) {
    return false
  }

  // Check timezone format
  if (!fingerprint.timezone || !fingerprint.timezone.includes('/')) {
    return false
  }

  return true
} 