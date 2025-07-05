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
          return
        }

        // Check if required APIs are available
        if (!navigator || !screen || !crypto || !crypto.subtle) {
          console.warn('Required browser APIs not available for fingerprinting')
          return
        }
        
        const fp = await generateFingerprint()
        setFingerprint(fp.fingerprintHash)
      } catch (err) {
        console.warn('Error generating fingerprint (will use fallback):', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        // Don't throw, just log the error and continue without fingerprint
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
    // Helper to check if fingerprint is available
    isAvailable: fingerprint !== null && !error
  }
} 