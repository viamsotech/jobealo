'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CVData } from '@/components/cv-builder'
import { X, Sparkles, FileText, Target, Copy, Save, Loader2 } from 'lucide-react'
import { useActions } from '@/hooks/useActions'

interface CompletedCV {
  id: string
  title: string
  cvData: CVData
  updatedAt: string
}

interface CVAdapterProps {
  completedCVs: CompletedCV[]
  onClose: () => void
  onAdaptationComplete: (adaptedCV: CVData, originalTitle: string) => void
}

export default function CVAdapter({ completedCVs, onClose, onAdaptationComplete }: CVAdapterProps) {
  const [selectedCVId, setSelectedCVId] = useState<string>('')
  const [jobDescription, setJobDescription] = useState('')
  const [adaptationFocus, setAdaptationFocus] = useState('')
  const [adaptedCV, setAdaptedCV] = useState<CVData | null>(null)
  const [originalCV, setOriginalCV] = useState<CVData | null>(null)
  const [isAdapting, setIsAdapting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'select' | 'adapt' | 'preview'>('select')

  const {
    canAdaptCV,
    recordAdaptCV,
    hasFullAccess,
    userType,
    remainingFreeActions
  } = useActions()

  const selectedCV = completedCVs.find(cv => cv.id === selectedCVId)

  const handleAdaptCV = async () => {
    if (!selectedCV || !jobDescription.trim()) return

    try {
      // Check if action is allowed first
      const actionCheck = await canAdaptCV()
      
      if (!actionCheck.allowed) {
        if (actionCheck.requiresPayment) {
          setError(`🔒 Necesitas pagar $${actionCheck.price} para adaptar CVs con IA.`)
          return
        } else if (actionCheck.requiresRegistration) {
          setError('🔒 Necesitas registrarte para usar las funciones de IA.')
          return
        } else {
          setError('🔒 Has agotado tus acciones gratuitas. Necesitas un plan Pro o Lifetime para adaptar CVs.')
          return
        }
      }

      setIsAdapting(true)
      setError('')

      const response = await fetch('/api/ai/adapt-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData: selectedCV.cvData,
          jobDescription: jobDescription.trim(),
          adaptationFocus: adaptationFocus.trim() || 'Optimización general para la vacante'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al adaptar el CV')
      }

      // Record the action after successful adaptation
      await recordAdaptCV({
        jobDescription: jobDescription.trim(),
        adaptationFocus: adaptationFocus.trim(),
        cvTitle: selectedCV.title,
        changesDetected: true
      })

      setAdaptedCV(data.adaptedCV)
      setOriginalCV(selectedCV.cvData)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsAdapting(false)
    }
  }

  const handleUseAdaptedCV = () => {
    if (adaptedCV && selectedCV) {
      onAdaptationComplete(adaptedCV, selectedCV.title)
    }
  }

  // Detailed change detection
  const getDetailedChanges = () => {
    if (!originalCV || !adaptedCV) return []
    
    const changes = []
    
    // Check professional summary
    if (originalCV.summary !== adaptedCV.summary) {
      changes.push({
        type: 'summary',
        label: 'Resumen Profesional',
        original: originalCV.summary || '',
        adapted: adaptedCV.summary || ''
      })
    }
    
    // Check experience descriptions
    if (originalCV.experience?.items && adaptedCV.experience?.items) {
      for (let i = 0; i < Math.min(originalCV.experience.items.length, adaptedCV.experience.items.length); i++) {
        const originalItem = originalCV.experience.items[i]
        const adaptedItem = adaptedCV.experience.items[i]
        
        // Check responsibilities
        const originalResponsibilities = originalItem.responsibilities?.join('\n') || ''
        const adaptedResponsibilities = adaptedItem.responsibilities?.join('\n') || ''
        
        if (originalResponsibilities !== adaptedResponsibilities) {
          changes.push({
            type: 'experience',
            label: `Experiencia: ${originalItem.company} (${originalItem.position})`,
            original: originalResponsibilities,
            adapted: adaptedResponsibilities
          })
        }
      }
    }
    
    // Check skills reordering
    if (JSON.stringify(originalCV.skills) !== JSON.stringify(adaptedCV.skills)) {
      changes.push({
        type: 'skills',
        label: 'Habilidades',
        original: originalCV.skills?.join(', ') || '',
        adapted: adaptedCV.skills?.join(', ') || ''
      })
    }
    
    return changes
  }

  const getChangesCount = () => {
    return getDetailedChanges().length
  }

  if (step === 'preview' && adaptedCV) {
    const detailedChanges = getDetailedChanges()
    
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">CV Adaptado</h2>
                <p className="text-sm text-gray-600">Revisa los cambios realizados por la IA</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="mb-6 flex items-center gap-4">
              <Badge variant="secondary" className="flex items-center gap-2">
                <Target className="h-3 w-3" />
                {detailedChanges.length} cambios realizados
              </Badge>
              <Badge variant="outline" className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Basado en: {selectedCV?.title}
              </Badge>
            </div>

            {detailedChanges.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  <Target className="h-12 w-12 mx-auto mb-2" />
                  <p>No se detectaron cambios significativos</p>
                  <p className="text-sm">El CV ya parece estar optimizado para esta vacante</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Detailed Changes */}
                {detailedChanges.map((change, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {change.type === 'summary' && <FileText className="h-5 w-5" />}
                        {change.type === 'experience' && <Target className="h-5 w-5" />}
                        {change.type === 'skills' && <Sparkles className="h-5 w-5" />}
                        {change.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500 mb-2 block">Antes</Label>
                          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
                            <p className="text-gray-700 whitespace-pre-wrap">{change.original}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500 mb-2 block">Después</Label>
                          <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm">
                            <p className="text-gray-700 whitespace-pre-wrap">{change.adapted}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between pt-6 border-t mt-6">
              <Button
                variant="outline"
                onClick={() => setStep('select')}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Adaptar de nuevo
              </Button>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUseAdaptedCV}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Usar CV Adaptado
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Adaptar CV para Vacante</h2>
              <p className="text-sm text-gray-600">Optimiza un CV existente para una vacante específica</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* CV Selection */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  1. Selecciona el CV base
                </div>
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Elige el CV que quieres adaptar para la vacante
              </p>
              <Select value={selectedCVId} onValueChange={setSelectedCVId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Selecciona un CV (${completedCVs.length} disponibles)`} />
                </SelectTrigger>
                <SelectContent>
                  {completedCVs.map((cv) => (
                    <SelectItem key={cv.id} value={cv.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span>{cv.title}</span>
                        <Badge variant="secondary" className="text-xs ml-auto">
                          {new Date(cv.updatedAt).toLocaleDateString()}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  {completedCVs.length === 0 && (
                    <div className="p-2 text-gray-500 text-sm">No hay CVs completados disponibles</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Job Description */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  2. Descripción de la vacante
                </div>
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Pega la descripción completa de la vacante aquí
              </p>
              <Textarea
                placeholder="Pega aquí la descripción de la vacante, requisitos, responsabilidades, etc."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[150px] resize-none"
              />
            </div>

            {/* Adaptation Focus */}
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  3. Enfoque de adaptación (opcional)
                </div>
              </Label>
              <p className="text-sm text-gray-600 mb-3">
                Especifica qué aspectos quieres que la IA enfatice más
              </p>
              <Input
                placeholder="Ej: Enfatizar habilidades técnicas, experiencia en liderazgo, etc."
                value={adaptationFocus}
                onChange={(e) => setAdaptationFocus(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <X className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAdaptCV}
                disabled={!selectedCVId || !jobDescription.trim() || isAdapting}
                className="flex items-center gap-2"
              >
                {isAdapting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adaptando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Adaptar CV
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 