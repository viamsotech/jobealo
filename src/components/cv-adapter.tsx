'use client'

import { useState, useEffect } from 'react'
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
import PaymentModal from '@/components/payment/payment-modal'

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
  const [actionCheckResult, setActionCheckResult] = useState<{
    allowed: boolean
    requiresPayment: boolean
    requiresRegistration: boolean
    price: number | null
  } | null>(null)

  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingAdaptation, setPendingAdaptation] = useState<{
    cvId: string
    jobDescription: string
    adaptationMode: string
  } | null>(null)

  const {
    canAdaptCV,
    recordAdaptCV,
    hasFullAccess,
    userType,
    remainingFreeActions
  } = useActions()

  // Debug: Log completed CVs when component mounts
  useEffect(() => {
    console.log('🎯 CVAdapter Debug Info:')
    console.log('  - Received completedCVs:', completedCVs)
    console.log('  - completedCVs length:', completedCVs.length)
    console.log('  - completedCVs details:', completedCVs.map(cv => ({
      id: cv.id,
      title: cv.title,
      updatedAt: cv.updatedAt,
      hasCvData: !!cv.cvData
    })))
  }, [completedCVs])

  // Check action availability when component mounts
  useEffect(() => {
    const checkActionAvailability = async () => {
      try {
        const check = await canAdaptCV()
        setActionCheckResult(check)
      } catch (error) {
        console.error('Error checking action availability:', error)
      }
    }

    checkActionAvailability()
  }, [canAdaptCV])

  const canUseFeature = actionCheckResult?.allowed || false
  const requiresPayment = actionCheckResult?.requiresPayment || false
  const requiresRegistration = actionCheckResult?.requiresRegistration || false
  const actionPrice = actionCheckResult?.price || 1.99

  const selectedCV = completedCVs.find(cv => cv.id === selectedCVId)

  const handleAdaptCV = async () => {
    if (!selectedCV || !jobDescription.trim()) return

    // Don't proceed if action is not allowed
    if (!canUseFeature) {
      return
    }

    setIsAdapting(true)
    setError('')

    try {
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

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false)
    
    if (!pendingAdaptation) return

    // After successful payment, perform the adaptation directly
    setIsAdapting(true)

    try {
      const cvData = completedCVs.find(cv => cv.id === pendingAdaptation.cvId)?.cvData
      if (!cvData) return

      const adapted = await fetch('/api/ai/adapt-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData: cvData,
          jobDescription: pendingAdaptation.jobDescription,
          adaptationFocus: pendingAdaptation.adaptationMode as 'Optimización general para la vacante'
        }),
      })

      const data = await adapted.json()

      if (!adapted.ok) {
        throw new Error(data.error || 'Error al adaptar el CV')
      }

      // ✅ NO need to record action - it was already recorded during payment processing
      // The backend automatically records the action when payment is successful

      setAdaptedCV(data.adaptedCV)
      setOriginalCV(cvData)
      setStep('preview')

      // Show success message
      alert('¡CV adaptado exitosamente!')
    } catch (error) {
      console.error('Error adapting CV after payment:', error)
      setStep('select')
      alert('Error al adaptar el CV. Por favor, intenta de nuevo.')
    } finally {
      setIsAdapting(false)
      setPendingAdaptation(null)
    }
  }

  const handleIndividualPayment = () => {
    // Store current configuration for after payment
    setPendingAdaptation({
      cvId: selectedCVId,
      jobDescription: jobDescription.trim(),
      adaptationMode: adaptationFocus.trim() || 'Optimización general para la vacante'
    })
    
    // Show payment modal
    setShowPaymentModal(true)
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

              {completedCVs.length > 0 ? (
                <Select 
                  value={selectedCVId} 
                  onValueChange={(value) => {
                    console.log('🎯 CV selected:', value)
                    setSelectedCVId(value)
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Selecciona un CV (${completedCVs.length} disponibles)`} />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {completedCVs.map((cv) => (
                      <SelectItem key={cv.id} value={cv.id}>
                        <div className="flex items-center gap-2 w-full">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1">{cv.title}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(cv.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    No hay CVs completados disponibles
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Para usar esta función, necesitas tener al menos un CV completado al 100%.
                    Completa todas las secciones de un CV y regresa aquí.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onClose}
                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                  >
                    Ir a Mis CVs
                  </Button>
                </div>
              )}
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

            {/* Access Status Message */}
            {!canUseFeature && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <Target className="w-5 h-5 text-orange-600 mt-0.5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-orange-800 mb-1">
                      {requiresPayment ? 'Pago requerido' : requiresRegistration ? 'Registro requerido' : 'Límite alcanzado'}
                    </h4>
                    <div className="text-sm text-orange-700 mb-4">
                      {requiresPayment && (
                        <p>Tienes 2 opciones para usar la función de adaptar CV con IA:</p>
                      )}
                      {requiresRegistration && (
                        <p>Debes registrarte para acceder a las funciones de IA.</p>
                      )}
                      {!requiresPayment && !requiresRegistration && (
                        <p>Has agotado tus acciones gratuitas. Tienes 2 opciones para continuar:</p>
                      )}
                    </div>
                    
                    {/* Payment Options */}
                    {(requiresPayment || (!requiresPayment && !requiresRegistration)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {/* Individual Payment */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-center">
                            <p className="text-sm font-medium text-blue-800 mb-1">Pago por acción</p>
                            <p className="text-xl font-bold text-blue-800 mb-2">${actionPrice}</p>
                            <p className="text-xs text-blue-600 mb-2">Solo esta adaptación</p>
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700"
                              onClick={handleIndividualPayment}
                            >
                              💳 Pagar $1.99
                            </Button>
                          </div>
                        </div>
                        
                        {/* Lifetime Upgrade */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="text-center">
                            <p className="text-sm font-medium text-yellow-800 mb-1">Acceso ilimitado</p>
                            <div className="mb-2">
                              <span className="text-sm text-yellow-600 line-through">$99.99</span>
                              <span className="text-xl font-bold text-yellow-800 ml-1">$59.99</span>
                            </div>
                            <p className="text-xs text-yellow-600 mb-2">Todas las funciones IA</p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                              onClick={() => window.location.href = '/checkout?plan=LIFETIME'}
                            >
                              ⭐ Upgrade
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Registration Option */}
                    {requiresRegistration && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => window.location.href = '/auth/signup'}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Registrarse gratis
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
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
                disabled={!selectedCVId || !jobDescription.trim() || isAdapting || !canUseFeature}
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
                    {!canUseFeature ? 'Función no disponible' : 'Adaptar CV'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
        individualPayment={{
          amount: actionPrice,
          actionType: 'adapt-cv',
          description: 'Adaptar CV para vacante específica con IA'
        }}
      />
    </div>
  )
} 