import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import type { CVData } from '@/components/cv-builder'

interface SavedCV {
  id: string
  title: string
  isTemplate: boolean
  isCompleted: boolean
  createdAt: string
  updatedAt: string
  firstName: string
  lastName: string
  titles: string[]
  cvData?: CVData
}

interface UseSavedCVsReturn {
  // State
  cvs: SavedCV[]
  isLoading: boolean
  error: string | null
  isSaving: boolean
  
  // Functions
  loadCVs: () => Promise<void>
  saveCV: (title: string, cvData: CVData, options?: {
    isTemplate?: boolean
    isCompleted?: boolean
    cvId?: string
  }) => Promise<SavedCV | null>
  loadCV: (id: string) => Promise<CVData | null>
  deleteCV: (id: string) => Promise<boolean>
  duplicateCV: (id: string, newTitle: string) => Promise<SavedCV | null>
  
  // Helper
  generateCVTitle: (cvData: CVData) => string
}

export function useSavedCVs(): UseSavedCVsReturn {
  const { data: session } = useSession()
  const [cvs, setCVs] = useState<SavedCV[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const loadCVs = useCallback(async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/cvs')
      
      if (!response.ok) {
        throw new Error('Failed to load CVs')
      }

      const data = await response.json()
      setCVs(data.cvs || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading CVs'
      setError(errorMessage)
      console.error('Error loading CVs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.id])

  const saveCV = useCallback(async (
    title: string, 
    cvData: CVData, 
    options: {
      isTemplate?: boolean
      isCompleted?: boolean
      cvId?: string
    } = {}
  ): Promise<SavedCV | null> => {
    if (!session?.user?.id) {
      setError('Authentication required to save CV')
      return null
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/cvs/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          cvData,
          isTemplate: options.isTemplate || false,
          isCompleted: options.isCompleted || false,
          cvId: options.cvId
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save CV')
      }

      const data = await response.json()
      
      // Reload CVs to get updated list
      await loadCVs()
      
      return data.cv
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error saving CV'
      setError(errorMessage)
      console.error('Error saving CV:', err)
      return null
    } finally {
      setIsSaving(false)
    }
  }, [session?.user?.id, loadCVs])

  const loadCV = useCallback(async (id: string): Promise<CVData | null> => {
    if (!session?.user?.id) {
      setError('Authentication required to load CV')
      return null
    }

    try {
      const response = await fetch(`/api/cvs/${id}`)
      
      if (!response.ok) {
        throw new Error('Failed to load CV')
      }

      const data = await response.json()
      return data.cv.cvData
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error loading CV'
      setError(errorMessage)
      console.error('Error loading CV:', err)
      return null
    }
  }, [session?.user?.id])

  const deleteCV = useCallback(async (id: string): Promise<boolean> => {
    if (!session?.user?.id) {
      setError('Authentication required to delete CV')
      return false
    }

    try {
      const response = await fetch(`/api/cvs/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete CV')
      }

      // Remove from local state
      setCVs(prev => prev.filter(cv => cv.id !== id))
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error deleting CV'
      setError(errorMessage)
      console.error('Error deleting CV:', err)
      return false
    }
  }, [session?.user?.id])

  const duplicateCV = useCallback(async (id: string, newTitle: string): Promise<SavedCV | null> => {
    const cvData = await loadCV(id)
    if (!cvData) return null

    return await saveCV(newTitle, cvData, { isCompleted: false })
  }, [loadCV, saveCV])

  const generateCVTitle = useCallback((cvData: CVData): string => {
    const firstName = cvData.personalInfo.firstName || 'Nuevo'
    const lastName = cvData.personalInfo.lastName || 'CV'
    const date = new Date().toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    })
    
    return `CV ${firstName} ${lastName} - ${date}`
  }, [])

  // Load CVs when user logs in
  useEffect(() => {
    if (session?.user?.id) {
      loadCVs()
    } else {
      setCVs([])
    }
  }, [session?.user?.id])

  return {
    cvs,
    isLoading,
    error,
    isSaving,
    loadCVs,
    saveCV,
    loadCV,
    deleteCV,
    duplicateCV,
    generateCVTitle
  }
}
