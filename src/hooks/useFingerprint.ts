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
        
        const fp = await generateFingerprint()
        setFingerprint(fp.fingerprintHash)
      } catch (err) {
        console.error('Error generating fingerprint:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    initFingerprint()
  }, [])

  return { fingerprint, isLoading, error }
} 