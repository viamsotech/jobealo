"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  FileText, 
  Edit, 
  Trash2, 
  Copy, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  Edit3,
  X,
  Eye,
  Mail,
  FileSpreadsheet,
  TrendingUp,
  Target,
  Sparkles
} from 'lucide-react'
import { useSavedCVs } from '@/hooks/useSavedCVs'
import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'
import { CVData } from '@/components/cv-builder'
import { migrateCVData, getCompletedSectionsCount, getTotalSectionsCount } from '@/lib/cvValidation'
import { useApplications } from '@/hooks/useApplications'
import { ApplicationGenerator } from '@/components/application-generator'
import { SavedApplicationsViewer } from '@/components/saved-applications-viewer'
import CVAdapter from '@/components/cv-adapter'

interface SavedCVsDashboardProps {
  onSelectCV?: (cvId: string) => void
  onCreateNew?: () => void
  onPreviewCV?: (cvData: CVData, cvTitle: string) => void
}

export function SavedCVsDashboard({ onSelectCV, onCreateNew, onPreviewCV }: SavedCVsDashboardProps) {
  const { data: session } = useSession()
  const { cvs, isLoading, error, deleteCV, duplicateCV, saveCV } = useSavedCVs()
  const { loadEmails, loadCoverLetters, emails, coverLetters } = useApplications()
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  
  // Application generator state
  const [showApplicationGenerator, setShowApplicationGenerator] = useState(false)
  const [generatorType, setGeneratorType] = useState<'email' | 'cover-letter'>('email')
  const [selectedCVId, setSelectedCVId] = useState<string | null>(null)
  const [selectedCVData, setSelectedCVData] = useState<CVData | null>(null)
  const [applicationCounts, setApplicationCounts] = useState<Record<string, { emails: number, coverLetters: number }>>({})

  // Saved applications viewer state
  const [showApplicationsViewer, setShowApplicationsViewer] = useState(false)
  const [viewerCVId, setViewerCVId] = useState<string | null>(null)
  const [viewerCVTitle, setViewerCVTitle] = useState<string>('')

  // CV Adapter state
  const [showCVAdapter, setShowCVAdapter] = useState(false)

  // Load application counts for all CVs
  useEffect(() => {
    const loadApplicationCounts = async () => {
      if (!session?.user?.id || cvs.length === 0) return

      const counts: Record<string, { emails: number, coverLetters: number }> = {}
      
      // Load counts for all CVs in parallel
      const countPromises = cvs.map(async (cv) => {
        try {
          const [emailsResponse, coverLettersResponse] = await Promise.all([
            fetch(`/api/applications/emails?cvId=${cv.id}`),
            fetch(`/api/applications/cover-letters?cvId=${cv.id}`)
          ])

          const emailsData = await emailsResponse.json()
          const coverLettersData = await coverLettersResponse.json()

          counts[cv.id] = {
            emails: emailsData.emails ? emailsData.emails.length : 0,
            coverLetters: coverLettersData.coverLetters ? coverLettersData.coverLetters.length : 0
          }
        } catch (error) {
          console.error(`Error loading counts for CV ${cv.id}:`, error)
          counts[cv.id] = { emails: 0, coverLetters: 0 }
        }
      })

      await Promise.all(countPromises)
      setApplicationCounts(counts)
    }

    loadApplicationCounts()
  }, [cvs, session?.user?.id])

  const handleOpenApplicationGenerator = (type: 'email' | 'cover-letter', cvId: string, cvData: CVData) => {
    setGeneratorType(type)
    setSelectedCVId(cvId)
    setSelectedCVData(cvData)
    setShowApplicationGenerator(true)
  }

  const handleCloseApplicationGenerator = () => {
    setShowApplicationGenerator(false)
    const cvId = selectedCVId // Store before clearing
    setSelectedCVId(null)
    setSelectedCVData(null)
    
    // Force reload of application counts for this CV
    if (cvId) {
      reloadApplicationCountsForCV(cvId)
    }
  }

  // Helper function to reload counts for a specific CV
  const reloadApplicationCountsForCV = async (cvId: string) => {
    if (!session?.user?.id) return

    try {
      // Make direct API calls to get fresh counts
      const [emailsResponse, coverLettersResponse] = await Promise.all([
        fetch(`/api/applications/emails?cvId=${cvId}`),
        fetch(`/api/applications/cover-letters?cvId=${cvId}`)
      ])

      const emailsData = await emailsResponse.json()
      const coverLettersData = await coverLettersResponse.json()

      const emailCount = emailsData.emails ? emailsData.emails.length : 0
      const coverLetterCount = coverLettersData.coverLetters ? coverLettersData.coverLetters.length : 0
      
      setApplicationCounts(prev => ({
        ...prev,
        [cvId]: {
          emails: emailCount,
          coverLetters: coverLetterCount
        }
      }))
    } catch (error) {
      console.error(`Error reloading counts for CV ${cvId}:`, error)
    }
  }

  const handleOpenApplicationsViewer = (cvId: string, cvTitle: string) => {
    setViewerCVId(cvId)
    setViewerCVTitle(cvTitle)
    setShowApplicationsViewer(true)
  }

  const handleCloseApplicationsViewer = () => {
    setShowApplicationsViewer(false)
    const cvId = viewerCVId // Store before clearing
    setViewerCVId(null)
    setViewerCVTitle('')
    
    // Reload application counts after viewing (in case user deleted something)
    if (cvId) {
      reloadApplicationCountsForCV(cvId)
    }
  }

  // CV Adapter handlers
  const handleOpenCVAdapter = () => {
    console.log('🎯 Opening CV Adapter - Debug Info:')
    console.log('  - Total CVs:', cvs.length)
    console.log('  - Has completed CVs:', hasCompletedCVs)
    console.log('  - Completed CVs count:', completedCVs.length)
    console.log('  - Completed CVs data:', completedCVs)

    // Check if we have at least one completed CV
    const completedCVsForAdapter = cvs.filter(cv => {
      if (!cv.cvData) return false
      const migratedData = migrateCVData(cv.cvData)
      const completedSections = getCompletedSectionsCount(migratedData)
      const totalSections = getTotalSectionsCount()
      return completedSections >= totalSections
    })

    if (completedCVsForAdapter.length === 0) {
      // Use a more user-friendly way to show the error
      // Could use a toast notification library here instead
      alert('⚠️ Primero necesitas completar al menos un CV al 100% para usar esta función.\n\nTermina de llenar todas las secciones de un CV y luego podrás adaptarlo para vacantes específicas.')
      return
    }

    setShowCVAdapter(true)
  }

  const handleCloseCVAdapter = () => {
    setShowCVAdapter(false)
  }

  const handleAdaptationComplete = async (adaptedCV: CVData, originalTitle: string) => {
    // Create a new CV with the adapted data
    const newTitle = `${originalTitle} - Adaptado`
    const result = await saveCV(newTitle, adaptedCV, {
      isCompleted: true,
      isTemplate: false
    })
    
    if (result) {
      // Close the adapter and potentially load the new CV for editing
      setShowCVAdapter(false)
      
      // Optionally, we could open the newly created CV for editing
      if (onSelectCV && result.id) {
        onSelectCV(result.id)
      }
    }
  }

  // Get completed CVs for the adapter
  const getCompletedCVs = () => {
    return cvs.filter(cv => {
      if (!cv.cvData) return false
      const migratedData = migrateCVData(cv.cvData)
      const completedSections = getCompletedSectionsCount(migratedData)
      const totalSections = getTotalSectionsCount()
      return completedSections >= totalSections
    })
  }

  const completedCVs = getCompletedCVs()
  const hasCompletedCVs = completedCVs.length > 0

  // Filter CVs based on search term
  const filteredCVs = cvs.filter(cv => 
    cv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cv.titles.some(title => title.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDelete = async (cvId: string, title: string) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${title}"?`)) {
      setDeletingId(cvId)
      const success = await deleteCV(cvId)
      if (success) {
        // Success feedback is handled by the hook
      }
      setDeletingId(null)
    }
  }

  const handleDuplicate = async (cvId: string, originalTitle: string) => {
    const newTitle = `${originalTitle} (Copia)`
    setDuplicatingId(cvId)
    const newCV = await duplicateCV(cvId, newTitle)
    if (newCV) {
      // Success feedback could be added here
    }
    setDuplicatingId(null)
  }

  const handleStartRename = (cvId: string, currentName: string) => {
    setEditingNameId(cvId)
    setNewName(currentName)
  }

  const handleCancelRename = () => {
    setEditingNameId(null)
    setNewName('')
  }

  const handleSaveRename = async (cvId: string) => {
    if (!newName.trim()) return

    setRenamingId(cvId)
    
    // Find the CV to get its data
    const cv = cvs.find(c => c.id === cvId)
    if (!cv || !cv.cvData) {
      setRenamingId(null)
      return
    }

    // Save CV with new name
    const result = await saveCV(newName.trim(), cv.cvData, {
      cvId: cvId,
      isCompleted: cv.isCompleted,
      isTemplate: cv.isTemplate
    })

    if (result) {
      setEditingNameId(null)
      setNewName('')
    }
    
    setRenamingId(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // If user is not authenticated
  if (!session) {
    return (
      <div className="space-y-6">
        {/* Header para usuarios anónimos */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Crear CV Gratis</h2>
            <p className="text-gray-600">Crea y descarga tu CV profesional sin registrarte</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={onCreateNew} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Crear Nuevo CV
            </Button>
          </div>
        </div>

        {/* Información sobre descargas gratuitas */}
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    ¡Gratis sin registro!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Crea y descarga hasta 3 CVs sin necesidad de crear cuenta
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Para acceso ilimitado:</p>
                <Button
                  onClick={() => signIn()}
                  variant="outline"
                  size="sm"
                  className="mt-1"
                >
                  Registrarse Gratis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beneficios de registrarse */}
        <Card className="border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              ¿Por qué registrarse?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Guardar CVs</p>
                  <p className="text-sm text-gray-600">Edita y gestiona múltiples CVs</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Historial de descargas</p>
                  <p className="text-sm text-gray-600">Accede a tus CVs previamente creados</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Funciones IA</p>
                  <p className="text-sm text-gray-600">Emails y cartas de presentación</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">Traducción automática</p>
                  <p className="text-sm text-gray-600">CV en español e inglés</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mis CVs Guardados</h2>
          <p className="text-gray-600">Gestiona y edita tus CVs guardados</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onCreateNew} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Crear Nuevo CV
          </Button>
        </div>
      </div>

      {/* CV Adapter Card */}
      {!isLoading && (
        <Card className={`border-2 ${hasCompletedCVs ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${hasCompletedCVs ? 'bg-orange-100' : 'bg-gray-100'}`}>
                  <Target className={`w-6 h-6 ${hasCompletedCVs ? 'text-orange-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${hasCompletedCVs ? 'text-gray-900' : 'text-gray-500'}`}>
                    Adaptar CV para Vacante
                  </h3>
                  <p className={`text-sm ${hasCompletedCVs ? 'text-gray-600' : 'text-gray-400'}`}>
                    {hasCompletedCVs 
                      ? `Personaliza cualquiera de tus ${completedCVs.length} CV${completedCVs.length > 1 ? 's' : ''} completado${completedCVs.length > 1 ? 's' : ''} para una vacante específica`
                      : 'Completa al menos un CV al 100% para usar esta función'
                    }
                  </p>
                </div>
              </div>
              <Button
                onClick={handleOpenCVAdapter}
                disabled={!hasCompletedCVs}
                variant={hasCompletedCVs ? "default" : "outline"}
                className={`flex items-center gap-2 ${
                  hasCompletedCVs 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                {hasCompletedCVs ? 'Adaptar CV' : 'No Disponible'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por nombre, título o contenido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-2 p-4">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando CVs...
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredCVs.length === 0 && !error && (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron CVs' : 'No tienes CVs guardados'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'Prueba con otros términos de búsqueda'
                : 'Crea tu primer CV y guárdalo para poder editarlo después'
              }
            </p>
            {!searchTerm && (
              <Button onClick={onCreateNew} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Crear Mi Primer CV
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* CVs Grid */}
      {!isLoading && filteredCVs.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCVs.map((cv) => {
            // Apply data migration and calculate completion progress for this CV
            const migratedData = cv.cvData ? migrateCVData(cv.cvData) : null
            const completedSections = migratedData ? getCompletedSectionsCount(migratedData) : 0
            const totalSections = getTotalSectionsCount()
            const completionPercentage = Math.round((completedSections / totalSections) * 100)
            const isComplete = completedSections >= totalSections
            
            return (
            <Card key={cv.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 max-w-[calc(100%-120px)]">
                    {editingNameId === cv.id ? (
                      <div className="space-y-2">
                        <Input
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          placeholder="Nombre del CV"
                          className="text-lg font-semibold"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveRename(cv.id)
                            } else if (e.key === 'Escape') {
                              handleCancelRename()
                            }
                          }}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveRename(cv.id)}
                            disabled={renamingId === cv.id || !newName.trim()}
                          >
                            {renamingId === cv.id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            Guardar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelRename}
                            disabled={renamingId === cv.id}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 min-w-0">
                          <CardTitle className="text-lg truncate flex-shrink min-w-0">{cv.title}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartRename(cv.id, cv.title)}
                            className="p-1 h-auto w-auto text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Editar nombre"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                        </div>
                        <CardDescription className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {cv.firstName} {cv.lastName}
                        </CardDescription>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {isComplete ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {completionPercentage}%
                      </Badge>
                    )}
                    {cv.isTemplate && (
                      <Badge variant="outline">
                        Plantilla
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Progreso del CV</span>
                    <span>{completedSections} de {totalSections} secciones</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isComplete ? 'bg-green-500' : 'bg-orange-400'
                      }`}
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Titles */}
                {cv.titles.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Títulos: </span>
                    {cv.titles.slice(0, 2).join(', ')}
                    {cv.titles.length > 2 && '...'}
                  </div>
                )}

                {/* Timestamps */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Actualizado: {formatDate(cv.updatedAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {/* Primary Actions Row */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onSelectCV?.(cv.id)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => migratedData && onPreviewCV?.(migratedData, cv.title)}
                      disabled={!migratedData}
                      title="Previsualizar CV"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(cv.id, cv.title)}
                      disabled={duplicatingId === cv.id}
                      title="Duplicar CV"
                    >
                      {duplicatingId === cv.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(cv.id, cv.title)}
                      disabled={deletingId === cv.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Eliminar CV"
                    >
                      {deletingId === cv.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Secondary Actions Row */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isComplete}
                      onClick={() => isComplete && migratedData && handleOpenApplicationGenerator('email', cv.id, migratedData)}
                      className={`flex-1 flex items-center justify-center ${
                        !isComplete 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-blue-50 text-blue-600'
                      }`}
                      title={!isComplete ? 'Completa el CV al 100% para usar esta función' : 'Generar email de postulación'}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      <span>Email</span>
                      {applicationCounts[cv.id] && (
                        <span className="ml-1 text-xs">
                          ({applicationCounts[cv.id].emails}/3)
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!isComplete}
                      onClick={() => isComplete && migratedData && handleOpenApplicationGenerator('cover-letter', cv.id, migratedData)}
                      className={`flex-1 flex items-center justify-center ${
                        !isComplete 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'hover:bg-purple-50 text-purple-600'
                      }`}
                      title={!isComplete ? 'Completa el CV al 100% para usar esta función' : 'Generar carta de presentación'}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-1" />
                      <span>Carta</span>
                      {applicationCounts[cv.id] && (
                        <span className="ml-1 text-xs">
                          ({applicationCounts[cv.id].coverLetters}/3)
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Tertiary Actions Row - Ver Guardados */}
                  {applicationCounts[cv.id] && (applicationCounts[cv.id].emails > 0 || applicationCounts[cv.id].coverLetters > 0) && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenApplicationsViewer(cv.id, cv.title)}
                        className="w-full flex items-center justify-center hover:bg-indigo-50 text-indigo-600 border-indigo-200"
                        title="Ver emails y cartas guardados"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        <span>Ver Guardados</span>
                        <span className="ml-1 text-xs">
                          ({(applicationCounts[cv.id].emails || 0) + (applicationCounts[cv.id].coverLetters || 0)})
                        </span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {/* Results Summary */}
      {!isLoading && filteredCVs.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          {searchTerm ? (
            <>Mostrando {filteredCVs.length} resultado(s) de {cvs.length} CVs</>
          ) : (
            <>Total: {cvs.length} CV(s) guardado(s)</>
          )}
        </div>
      )}

      {/* Application Generator Modal */}
      {showApplicationGenerator && selectedCVData && selectedCVId && (
        <ApplicationGenerator
          isOpen={showApplicationGenerator}
          onClose={handleCloseApplicationGenerator}
          cvData={selectedCVData}
          cvId={selectedCVId}
          type={generatorType}
          emailCount={applicationCounts[selectedCVId]?.emails || 0}
          coverLetterCount={applicationCounts[selectedCVId]?.coverLetters || 0}
        />
      )}

      {/* Saved Applications Viewer Modal */}
      {showApplicationsViewer && viewerCVId && viewerCVTitle && (
        <SavedApplicationsViewer
          isOpen={showApplicationsViewer}
          onClose={handleCloseApplicationsViewer}
          cvId={viewerCVId}
          cvTitle={viewerCVTitle}
        />
      )}

      {/* CV Adapter Modal */}
      {showCVAdapter && (
        <CVAdapter
          completedCVs={completedCVs
            .filter(cv => cv.cvData) // Ensure we only pass CVs with data
            .map(cv => ({
              id: cv.id,
              title: cv.title,
              cvData: cv.cvData!,
              updatedAt: cv.updatedAt
            }))
          }
          onClose={handleCloseCVAdapter}
          onAdaptationComplete={handleAdaptationComplete}
        />
      )}
    </div>
  )
}
