import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useFingerprint } from '@/hooks/useFingerprint'

export type ActionType = 
  | 'DOWNLOAD_SPANISH'
  | 'DOWNLOAD_ENGLISH'
  | 'TRANSLATE_TO_ENGLISH'
  | 'GENERATE_EMAIL'
  | 'GENERATE_COVER_LETTER'
  | 'ADAPT_CV'

export interface ActionCheckResult {
  allowed: boolean
  remaining: number
  requiresPayment: boolean
  requiresRegistration: boolean
  price: number | null
  userType: string
  currentActions: number
}

export interface ActionStats {
  totalActions: number
  freeActionsUsed: number
  freeActionLimit: number
  paidActions: number
  plan: string
  memberSince: string | null
}

export interface UserActionStatus {
  stats: ActionStats
  hasFullAccess: boolean
  remainingFreeActions: number
  userType: string
}

export function useActions() {
  const { data: session } = useSession()
  const { fingerprint } = useFingerprint()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<UserActionStatus | null>(null)

  // Check if user can perform a specific action
  const checkAction = useCallback(async (actionType: ActionType): Promise<ActionCheckResult> => {
    if (!fingerprint) {
      throw new Error('Fingerprint not available')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/actions/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          userId: session?.user?.id || null,
          actionType
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check action')
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fingerprint, session?.user?.id])

  // Record an action
  const recordAction = useCallback(async (
    actionType: ActionType,
    details?: Record<string, any>,
    paymentInfo?: {
      amountPaid: number
      stripePaymentIntentId?: string
      stripeSessionId?: string
    }
  ): Promise<{ success: boolean; actionId?: string; message?: string }> => {
    if (!fingerprint) {
      throw new Error('Fingerprint not available')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/actions/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          userId: session?.user?.id || null,
          actionType,
          details,
          amountPaid: paymentInfo?.amountPaid || 0,
          stripePaymentIntentId: paymentInfo?.stripePaymentIntentId,
          stripeSessionId: paymentInfo?.stripeSessionId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record action')
      }

      // Refresh user stats after recording an action
      await refreshStats()

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fingerprint, session?.user?.id])

  // Get user statistics
  const refreshStats = useCallback(async (): Promise<UserActionStatus> => {
    if (!fingerprint) {
      throw new Error('Fingerprint not available')
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/actions/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          userId: session?.user?.id || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats')
      }

      setUserStats(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [fingerprint, session?.user?.id])

  // Auto-refresh stats when dependencies change
  useEffect(() => {
    if (fingerprint) {
      refreshStats().catch(console.error)
    }
  }, [fingerprint, session?.user?.id, refreshStats])

  // Convenience functions for common actions
  const canDownloadSpanish = useCallback(() => checkAction('DOWNLOAD_SPANISH'), [checkAction])
  const canDownloadEnglish = useCallback(() => checkAction('DOWNLOAD_ENGLISH'), [checkAction])
  const canTranslateToEnglish = useCallback(() => checkAction('TRANSLATE_TO_ENGLISH'), [checkAction])
  const canGenerateEmail = useCallback(() => checkAction('GENERATE_EMAIL'), [checkAction])
  const canGenerateCoverLetter = useCallback(() => checkAction('GENERATE_COVER_LETTER'), [checkAction])
  const canAdaptCV = useCallback(() => checkAction('ADAPT_CV'), [checkAction])

  const recordDownloadSpanish = useCallback((details?: Record<string, any>) => 
    recordAction('DOWNLOAD_SPANISH', details), [recordAction])
  const recordDownloadEnglish = useCallback((details?: Record<string, any>) => 
    recordAction('DOWNLOAD_ENGLISH', details), [recordAction])
  const recordTranslateToEnglish = useCallback((details?: Record<string, any>) => 
    recordAction('TRANSLATE_TO_ENGLISH', details), [recordAction])
  const recordGenerateEmail = useCallback((details?: Record<string, any>) => 
    recordAction('GENERATE_EMAIL', details), [recordAction])
  const recordGenerateCoverLetter = useCallback((details?: Record<string, any>) => 
    recordAction('GENERATE_COVER_LETTER', details), [recordAction])
  const recordAdaptCV = useCallback((details?: Record<string, any>) => 
    recordAction('ADAPT_CV', details), [recordAction])

  return {
    // Core functions
    checkAction,
    recordAction,
    refreshStats,
    
    // Convenience functions
    canDownloadSpanish,
    canDownloadEnglish,
    canTranslateToEnglish,
    canGenerateEmail,
    canGenerateCoverLetter,
    canAdaptCV,
    
    recordDownloadSpanish,
    recordDownloadEnglish,
    recordTranslateToEnglish,
    recordGenerateEmail,
    recordGenerateCoverLetter,
    recordAdaptCV,
    
    // State
    isLoading,
    error,
    userStats,
    
    // Computed properties
    hasFullAccess: userStats?.hasFullAccess || false,
    remainingFreeActions: userStats?.remainingFreeActions || 0,
    userType: userStats?.userType || 'ANONYMOUS'
  }
} 