"use client"

import { useState } from 'react'
import { SavedCVsDashboard } from '@/components/saved-cvs-dashboard'
import { CVBuilder, CVData } from '@/components/cv-builder'
import { CVPreview } from '@/components/cv-preview'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Eye, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { migrateCVData, getCompletedSectionsCount } from '@/lib/cvValidation'

export default function CVsPage() {
  const router = useRouter()
  const [selectedCVId, setSelectedCVId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [previewData, setPreviewData] = useState<{cvData: CVData, title: string} | null>(null)

  const handleSelectCV = (cvId: string) => {
    setSelectedCVId(cvId)
    setIsCreatingNew(false)
    setPreviewData(null) // Close preview if open
  }

  const handleCreateNew = () => {
    setSelectedCVId(null)
    setIsCreatingNew(true)
    setPreviewData(null) // Close preview if open
  }

  const handleBackToDashboard = () => {
    setSelectedCVId(null)
    setIsCreatingNew(false)
    setPreviewData(null) // Close preview if open
  }

  const handlePreviewCV = (cvData: CVData, cvTitle: string) => {
    setPreviewData({ cvData, title: cvTitle })
  }

  const handleClosePreview = () => {
    setPreviewData(null)
  }

  const handleCVSaved = (cvId: string) => {
    // Optionally stay in editor or go back to dashboard
    console.log('CV saved with ID:', cvId)
  }

  // If editing or creating a CV, show the CV Builder
  if (selectedCVId || isCreatingNew) {
    return (
      <CVBuilder
        loadCVId={selectedCVId || undefined}
        onBack={handleBackToDashboard}
        onSave={handleCVSaved}
      />
    )
  }

  // If previewing a CV, show the preview
  if (previewData) {
    // Apply data migration before validation
    const migratedData = migrateCVData(previewData.cvData)
    const completedSections = getCompletedSectionsCount(migratedData)
    const totalSections = 11
    const isComplete = completedSections >= totalSections

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-16 z-40 bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClosePreview}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver a Mis CVs</span>
                </Button>
                <div className="flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Vista Previa</h1>
                    <p className="text-sm text-gray-600">{previewData.title}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClosePreview}
                className="flex items-center space-x-1"
              >
                <X className="w-4 h-4" />
                <span>Cerrar</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <CVPreview data={migratedData} isComplete={isComplete} />
        </div>
      </div>
    )
  }

  // Otherwise show the dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Inicio</span>
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Mis CVs</h1>
                <p className="text-gray-600">Gestiona y crea tus currículos profesionales</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <SavedCVsDashboard
          onSelectCV={handleSelectCV}
          onCreateNew={handleCreateNew}
          onPreviewCV={handlePreviewCV}
        />
      </div>
    </div>
  )
}
