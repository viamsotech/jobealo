"use client"

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { CVData } from '@/components/cv-builder'

export interface ApplicationEmail {
  id: string
  cvId: string
  title: string
  content: string
  jobDescription: string
  formality: 'informal' | 'semi-formal' | 'formal' | 'neutral'
  personality: 'amigable' | 'persuasivo' | 'inspirador' | 'profesional'
  createdAt: string
  updatedAt: string
}

export interface CoverLetter {
  id: string
  cvId: string
  title: string
  content: string
  jobDescription: string
  formality: 'informal' | 'semi-formal' | 'formal' | 'neutral'
  personality: 'amigable' | 'persuasivo' | 'inspirador' | 'profesional'
  createdAt: string
  updatedAt: string
}

export interface GenerateEmailParams {
  cvData: CVData
  jobDescription: string
  formality: string
  personality: string
}

export interface SaveApplicationParams {
  title: string
  content: string
  jobDescription: string
  formality: string
  personality: string
  cvId: string
}

export function useApplications() {
  const { data: session } = useSession()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emails, setEmails] = useState<ApplicationEmail[]>([])
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([])
  const [error, setError] = useState<string | null>(null)

  // Generate email with AI
  const generateEmail = useCallback(async (params: GenerateEmailParams): Promise<string | null> => {
    if (!session?.user?.id) {
      setError('Debes iniciar sesión para generar emails')
      return null
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar el email')
      }

      return data.email
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [session?.user?.id])

  // Generate cover letter with AI
  const generateCoverLetter = useCallback(async (params: GenerateEmailParams): Promise<string | null> => {
    if (!session?.user?.id) {
      setError('Debes iniciar sesión para generar cartas')
      return null
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-cover-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al generar la carta')
      }

      return data.coverLetter
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [session?.user?.id])

  // Load emails for a CV
  const loadEmails = useCallback(async (cvId: string) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/applications/emails?cvId=${cvId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar emails')
      }

      setEmails(data.emails || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      setEmails([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id])

  // Load cover letters for a CV
  const loadCoverLetters = useCallback(async (cvId: string) => {
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/applications/cover-letters?cvId=${cvId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar cartas')
      }

      setCoverLetters(data.coverLetters || [])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      setCoverLetters([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id])

  // Save email
  const saveEmail = useCallback(async (params: SaveApplicationParams): Promise<ApplicationEmail | null> => {
    if (!session?.user?.id) {
      setError('Debes iniciar sesión para guardar emails')
      return null
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/applications/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el email')
      }

      // Refresh emails list
      await loadEmails(params.cvId)

      return data.email
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [session?.user?.id, loadEmails])

  // Save cover letter
  const saveCoverLetter = useCallback(async (params: SaveApplicationParams): Promise<CoverLetter | null> => {
    if (!session?.user?.id) {
      setError('Debes iniciar sesión para guardar cartas')
      return null
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/applications/cover-letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar la carta')
      }

      // Refresh cover letters list
      await loadCoverLetters(params.cvId)

      return data.coverLetter
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [session?.user?.id, loadCoverLetters])

  // Delete email
  const deleteEmail = useCallback(async (emailId: string, cvId: string): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Debes iniciar sesión para eliminar emails')
      return false
    }

    try {
      const response = await fetch(`/api/applications/emails/${emailId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar el email')
      }

      // Refresh emails list
      await loadEmails(cvId)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      return false
    }
  }, [session?.user?.id, loadEmails])

  // Delete cover letter
  const deleteCoverLetter = useCallback(async (coverLetterId: string, cvId: string): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Debes iniciar sesión para eliminar cartas')
      return false
    }

    try {
      const response = await fetch(`/api/applications/cover-letters/${coverLetterId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar la carta')
      }

      // Refresh cover letters list
      await loadCoverLetters(cvId)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      return false
    }
  }, [session?.user?.id, loadCoverLetters])

  return {
    // State
    emails,
    coverLetters,
    isGenerating,
    isSaving,
    isLoading,
    error,
    
    // Actions
    generateEmail,
    generateCoverLetter,
    loadEmails,
    loadCoverLetters,
    saveEmail,
    saveCoverLetter,
    deleteEmail,
    deleteCoverLetter,
  }
} 