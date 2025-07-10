'use client'

import { useState, useEffect } from 'react'
import { generateFingerprint } from '@/lib/fingerprint'

/**
 * React hook for browser fingerprinting
 */
export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initFingerprint() {
      try {
        setIsLoading(true)
        setError(null)
        
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          console.warn('Fingerprinting not available in server environment')
          setFingerprint('server-default')
          return
        }

        // Check if we already have a stored fingerprint
        try {
          const storedFingerprint = localStorage.getItem('jobealo_fingerprint')
          if (storedFingerprint) {
            console.log('🔍 Using stored fingerprint')
            setFingerprint(storedFingerprint)
            return
          }
        } catch (storageError) {
          console.warn('localStorage not available, continuing with generation')
        }

        // Check if required APIs are available
        if (!navigator || !screen) {
          console.warn('Required browser APIs not available for fingerprinting, using deterministic fallback')
          const deterministicFingerprint = generateDeterministicFallback()
          setFingerprint(deterministicFingerprint)
          
          // Store the deterministic fingerprint
          try {
            localStorage.setItem('jobealo_fingerprint', deterministicFingerprint)
          } catch (storageError) {
            console.warn('Could not store fingerprint in localStorage')
          }
          return
        }
        
        // Try to generate a real fingerprint
        try {
          const fp = await generateFingerprint()
          console.log('✅ Generated crypto fingerprint')
          setFingerprint(fp.fingerprintHash)
          
          // Store the real fingerprint
          try {
            localStorage.setItem('jobealo_fingerprint', fp.fingerprintHash)
          } catch (storageError) {
            console.warn('Could not store fingerprint in localStorage')
          }
        } catch (fingerprintError) {
          console.warn('Error generating crypto fingerprint, using deterministic fallback:', fingerprintError)
          const deterministicFingerprint = generateDeterministicFallback()
          setFingerprint(deterministicFingerprint)
          
          // Store the deterministic fingerprint
          try {
            localStorage.setItem('jobealo_fingerprint', deterministicFingerprint)
          } catch (storageError) {
            console.warn('Could not store fingerprint in localStorage')
          }
        }
      } catch (err) {
        console.warn('Error in fingerprint initialization, using deterministic fallback:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        
        const deterministicFingerprint = generateDeterministicFallback()
        setFingerprint(deterministicFingerprint)
        
        try {
          localStorage.setItem('jobealo_fingerprint', deterministicFingerprint)
        } catch (storageError) {
          console.warn('Could not store fingerprint in localStorage')
        }
      } finally {
        setIsLoading(false)
      }
    }

    initFingerprint()
  }, [])

  return { 
    fingerprint, 
    isLoading, 
    error,
    isAvailable: fingerprint !== null
  }
}

/**
 * Generate a deterministic fingerprint based on stable device characteristics
 * This will be the same for the same device/browser combination
 */
function generateDeterministicFallback(): string {
  try {
    // Collect stable device characteristics
    const userAgent = navigator?.userAgent || 'unknown'
    const language = navigator?.language || 'unknown'
    const platform = navigator?.platform || 'unknown'
    const screenRes = screen ? `${screen.width}x${screen.height}x${screen.colorDepth}` : 'unknown'
    const timezone = Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'unknown'
    const hardwareConcurrency = navigator?.hardwareConcurrency?.toString() || 'unknown'
    const maxTouchPoints = navigator?.maxTouchPoints?.toString() || 'unknown'
    const cookieEnabled = navigator?.cookieEnabled?.toString() || 'unknown'

    // Combine characteristics into a stable string
    const deviceString = [
      userAgent,
      language,
      platform,
      screenRes,
      timezone,
      hardwareConcurrency,
      maxTouchPoints,
      cookieEnabled
    ].join('|')

    // Create a simple hash without crypto.subtle
    const simpleHash = createSimpleHash(deviceString)
    const deterministicFingerprint = `device-${simpleHash}`
    
    console.log('🔧 Generated deterministic fingerprint')
    return deterministicFingerprint
  } catch (error) {
    console.warn('Error generating deterministic fallback:', error)
    // Last resort: very basic fallback
    return `basic-${navigator?.userAgent?.length || 0}-${screen?.width || 0}-${screen?.height || 0}`
  }
}

/**
 * Create a simple hash without crypto.subtle (for HTTP environments)
 */
function createSimpleHash(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36)
} 