"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Eye, EyeOff, Globe } from "lucide-react"
import { CVTabs } from "@/components/cv-tabs"
import { CVSections } from "@/components/cv-sections"
import { CVPreview } from "@/components/cv-preview"
import { ColorPicker } from "@/components/color-picker"
import { usePDFDownload } from "@/hooks/usePDFDownload"
import { useAINotifications } from "@/hooks/useAI"
import { Download, Loader2 } from "lucide-react"
import Image from "next/image"

interface CVBuilderProps {
  onBack: () => void
}

export interface CVData {
  personalInfo: {
    firstName: string
    lastName: string
    titles: string[]
    photo: {
      enabled: boolean
      url: string
    }
    contactInfo: {
      country: { value: string; show: boolean }
      city: { value: string; show: boolean }
      phone: { value: string; show: boolean }
      email: { value: string; show: boolean }
      age: { value: string; show: boolean }
      gender: { value: string; show: boolean }
      nationality: { value: string; show: boolean }
      linkedin: { value: string; show: boolean }
    }
  }
  headerColor: string
  summary: string
  skills: string[]
  tools: string[]
  experience: Array<{
    position: string
    company: string
    period: string
    responsibilities: string[]
  }>
  education: Array<{
    university: string
    degree: string
    level: string
    period: string
  }>
  certifications: {
    enabled: boolean
    items: Array<{
      name: string
      institution: string
      year: string
    }>
  }
  languages: Array<{
    language: string
    level: string
  }>
  references: {
    enabled: boolean
    items: Array<{
      name: string
      company: string
      phone: string
    }>
  }
}

const initialCVData: CVData = {
  personalInfo: {
    firstName: "",
    lastName: "",
    titles: [],
    photo: {
      enabled: false,
      url: "",
    },
    contactInfo: {
      country: { value: "", show: false },
      city: { value: "", show: false },
      phone: { value: "", show: false },
      email: { value: "", show: false },
      age: { value: "", show: false },
      gender: { value: "", show: false },
      nationality: { value: "", show: false },
      linkedin: { value: "", show: false },
    },
  },
  headerColor: "#0052CC", // Default blue color
  summary: "",
  skills: [],
  tools: [],
  experience: [],
  education: [],
  certifications: { enabled: false, items: [] },
  languages: [],
  references: { enabled: false, items: [] },
}

export function CVBuilder({ onBack }: CVBuilderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [cvData, setCVData] = useState<CVData>(initialCVData)
  const [showPreview, setShowPreview] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  
  // Estados para traducción
  const [isTranslationEnabled] = useState(true) // Habilitado temporalmente gratis
  const [isTranslating, setIsTranslating] = useState(false)
  const [showEnglishPreview, setShowEnglishPreview] = useState(false)
  const [translatedData, setTranslatedData] = useState<CVData | null>(null)
  
  // Hooks para PDF y notificaciones
  const { downloadPDF, isGenerating } = usePDFDownload()
  const { notification, showSuccess, showError } = useAINotifications()

  const steps = [
    "Nombre",
    "Título",
    "Contacto",
    "Resumen",
    "Competencias",
    "Herramientas",
    "Experiencia",
    "Educación",
    "Certificaciones",
    "Idiomas",
    "Referencias",
  ]

  const progress = ((currentStep + 1) / steps.length) * 100

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("jobealo-cv-data", JSON.stringify(cvData))
    }, 2000)
    return () => clearTimeout(timer)
  }, [cvData])

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("jobealo-cv-data")
    if (saved) {
      setCVData(JSON.parse(saved))
    }
  }, [])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  const updateCVData = (section: string, data: unknown) => {
    setCVData((prev) => ({
      ...prev,
      [section]: data,
    }))
  }

  const isFlowComplete = currentStep === steps.length - 1
  const canDownloadPDF = isFlowComplete || isReviewing

  const handleDownloadPDF = async () => {
    // Validar que el flujo esté completo
    if (!canDownloadPDF) {
      showError('Complete todos los pasos del formulario antes de descargar el PDF')
      return
    }

    // Determinar qué datos usar (inglés o español)
    const dataToDownload = showEnglishPreview && translatedData ? translatedData : cvData

    // Validar que hay datos mínimos para generar el CV
    if (!dataToDownload.personalInfo.firstName || !dataToDownload.personalInfo.lastName) {
      showError('Completa al menos tu nombre y apellidos antes de descargar el PDF')
      return
    }

    try {
      await downloadPDF(dataToDownload)
      const message = showEnglishPreview ? 'CV downloaded successfully!' : '¡CV descargado exitosamente!'
      showSuccess(message)
    } catch (error) {
      const errorMessage = showEnglishPreview ? 'Error downloading PDF' : 'Error al descargar el PDF'
      showError(error instanceof Error ? error.message : errorMessage)
    }
  }

  const handleReviewCV = () => {
    setIsReviewing(true)
    setShowPreview(true)
  }

  const handleBackToEdit = () => {
    setIsReviewing(false)
    setShowPreview(false)
  }

  const handleTranslateToEnglish = async () => {
    if (!isTranslationEnabled) {
      showError('🌟 Traducción al inglés es una funcionalidad premium. ¡Próximamente disponible!')
      return
    }
    
    // Verificar que el flujo esté completo
    if (!isFlowComplete) {
      showError('⚠️ Debes terminar tu CV para poder traducirlo. Completa todos los pasos primero.')
      return
    }
    
    // Verificar que hay contenido mínimo
    if (!cvData.personalInfo.firstName || !cvData.personalInfo.lastName) {
      showError('⚠️ Agrega al menos tu nombre y apellidos antes de traducir')
      return
    }
    
    if (showEnglishPreview) {
      // Si ya está en inglés, volver a español
      setShowEnglishPreview(false)
      setTranslatedData(null)
      showSuccess('✅ ¡CV cambiado a español!')
      return
    }
    
    // Mostrar mensaje promocional
    showSuccess('🎉 ¡Gran oportunidad! Esta función normalmente es premium, pero está disponible GRATIS en tu plan por tiempo limitado')
    
    // Traducir con IA
    setIsTranslating(true)
    
    try {
      // Llamar a la API de traducción real
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData: cvData
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al traducir el CV')
      }

      // Usar los datos traducidos realmente por IA
      setTranslatedData(data.translatedCV)
      setShowEnglishPreview(true)
      showSuccess('✅ ¡CV traducido al inglés exitosamente! Revisa la vista previa para ver los cambios')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      showError(`❌ ${errorMessage}`)
    } finally {
      setIsTranslating(false)
    }
  }

  // Vista previa en inglés (completamente traducida)
  if (showEnglishPreview && translatedData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b">
          {/* Header Mobile - Layout vertical */}
          <div className="md:hidden">
            {/* Nivel 1: Logo */}
            <div className="px-4 py-3 border-b">
              <div className="flex justify-center">
                <Image
                  src="/images/jobealologo2.svg"
                  alt="Jobealo"
                  width={120}
                  height={30}
                  className="h-8 w-auto"
                />
              </div>
            </div>
            
            {/* Nivel 2: Botones */}
            <div className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEnglishPreview(false)
                    setTranslatedData(null)
                  }}
                  className="flex items-center space-x-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Spanish</span>
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={isGenerating}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download PDF</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Header Desktop - Layout horizontal */}
          <div className="hidden md:flex items-center justify-between max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEnglishPreview(false)
                  setTranslatedData(null)
                }}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Spanish</span>
              </Button>
            </div>
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                className="flex items-center space-x-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mensaje de revisión en inglés */}
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              🎉 English Version Ready!
            </h2>
            <p className="text-green-700">
              Your CV has been translated to English. Review all information and download your ATS-optimized PDF.
            </p>
          </div>
        </div>
        
        <div className="p-8">
          <CVPreview data={translatedData} isEnglishVersion={true} />
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className={`fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        {/* Overlay de traducción */}
        {isTranslating && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100]">
            <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-2xl border border-gray-200">
              <div className="flex flex-col items-center space-y-6">
                {/* Animación de traducción */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                
                {/* Texto */}
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Traduciendo tu CV...
                  </h3>
                  <p className="text-gray-600">
                    Nuestra IA está traduciendo todo el contenido al inglés de manera profesional
                  </p>
                  <p className="text-sm text-gray-500">
                    Esto puede tomar unos momentos
                  </p>
                </div>

                {/* Barra de progreso animada */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-50 bg-white border-b">
          {/* Header Mobile - Layout vertical */}
          <div className="md:hidden">
            {/* Nivel 1: Logo */}
            <div className="px-4 py-3 border-b">
              <div className="flex justify-center">
                <Image
                  src="/images/jobealologo2.svg"
                  alt="Jobealo"
                  width={120}
                  height={30}
                  className="h-8 w-auto"
                />
              </div>
            </div>
            
            {/* Nivel 2: Botones */}
            <div className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isReviewing ? handleBackToEdit : () => setShowPreview(false)}
                  className="flex items-center space-x-1"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>{isReviewing ? 'Editar' : 'Cerrar'}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateToEnglish}
                  disabled={isTranslating || !isFlowComplete}
                  className={`flex items-center space-x-1 ${
                    !isFlowComplete
                      ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                      : 'border-green-300 text-green-600 hover:bg-green-50'
                  }`}
                  title={
                    !isFlowComplete
                      ? "⚠️ Debes terminar tu CV para poder traducirlo" 
                      : "🎉 Traducir al inglés - ¡GRATIS por tiempo limitado!"
                  }
                >
                  {isTranslating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  <span>{showEnglishPreview ? 'ES' : 'EN'}</span>
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={isGenerating || !canDownloadPDF}
                  size="sm"
                  className={`flex items-center space-x-1 ${!canDownloadPDF ? 'bg-gray-300 cursor-not-allowed' : ''}`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>PDF</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Header Desktop - Layout horizontal */}
          <div className="hidden md:flex items-center justify-between max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={isReviewing ? handleBackToEdit : () => setShowPreview(false)}
                className="flex items-center space-x-2"
              >
                <EyeOff className="w-4 h-4" />
                <span>{isReviewing ? 'Volver a editar' : 'Cerrar Vista Previa'}</span>
              </Button>
            </div>
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTranslateToEnglish}
                disabled={isTranslating || !isFlowComplete}
                className={`flex items-center space-x-2 ${
                  !isFlowComplete
                    ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                    : 'border-green-300 text-green-600 hover:bg-green-50'
                }`}
                title={
                  !isFlowComplete
                    ? "⚠️ Debes terminar tu CV para poder traducirlo" 
                    : "🎉 Traducir al inglés - ¡GRATIS por tiempo limitado!"
                }
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>{showEnglishPreview ? '🇪🇸 Español' : '🇺🇸 English'}</span>
                <span className="ml-1 px-1 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded">FREE</span>
              </Button>
              <Button 
                onClick={handleDownloadPDF}
                disabled={isGenerating || !canDownloadPDF}
                className="flex items-center space-x-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Generando PDF...' : 'Descargar PDF'}</span>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mensaje cuando PDF está deshabilitado */}
        {!canDownloadPDF && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
            <div className="max-w-7xl mx-auto text-center">
              <p className="text-yellow-800 text-sm">
                ⚠️ Complete todos los pasos del formulario para habilitar la descarga del PDF
              </p>
            </div>
          </div>
        )}
        
        {/* Mensaje de revisión */}
        {isReviewing && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
            <div className="max-w-7xl mx-auto text-center">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">
                🎉 ¡Felicidades! Tu CV está listo
              </h2>
              <p className="text-blue-700">
                Revisa toda la información y cuando estés conforme, descarga tu CV en PDF optimizado para sistemas ATS.
              </p>
            </div>
          </div>
        )}
        
        <div className="p-8">
          <CVPreview data={cvData} />
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className={`fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}>
            {notification.message}
          </div>
        )}

        {/* Overlay de traducción */}
        {isTranslating && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100]">
            <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-2xl border border-gray-200">
              <div className="flex flex-col items-center space-y-6">
                {/* Animación de traducción */}
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                
                {/* Texto */}
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Traduciendo tu CV...
                  </h3>
                  <p className="text-gray-600">
                    Nuestra IA está traduciendo todo el contenido al inglés de manera profesional
                  </p>
                  <p className="text-sm text-gray-500">
                    Esto puede tomar unos momentos
                  </p>
                </div>

                {/* Barra de progreso animada */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b">
        {/* Nivel 1: Botón volver + Logo (solo mobile) */}
        <div className="px-4 py-3 border-b md:hidden">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </Button>
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
            {/* Espaciador para mantener el logo centrado */}
            <div className="w-[72px]"></div>
          </div>
        </div>
        
        {/* Nivel 2: Herramientas (solo visible en mobile) */}
        <div className="px-4 py-3 md:hidden">
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-7xl mx-auto">
            <ColorPicker
              selectedColor={cvData.headerColor}
              onColorChange={(color) => updateCVData("headerColor", color)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="flex items-center space-x-1"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Vista</span>
              <span className="sm:hidden">👁</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTranslateToEnglish}
              disabled={isTranslating || !isFlowComplete}
              className={`flex items-center space-x-1 ${
                !isFlowComplete
                  ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                  : 'border-green-300 text-green-600 hover:bg-green-50'
              }`}
              title={
                !isFlowComplete
                  ? "⚠️ Debes terminar tu CV para poder traducirlo" 
                  : "🎉 Traducir al inglés - ¡GRATIS por tiempo limitado!"
              }
            >
              {isTranslating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              <span>{showEnglishPreview ? 'ES' : 'EN'}</span>
            </Button>
            <Button 
              onClick={handleDownloadPDF}
              disabled={isGenerating || !canDownloadPDF}
              size="sm"
              className={`flex items-center space-x-1 ${!canDownloadPDF ? 'bg-gray-300 cursor-not-allowed' : ''}`}
              title={!canDownloadPDF ? 'Complete todos los pasos para habilitar la descarga' : ''}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>PDF</span>
            </Button>
          </div>
        </div>
        
        {/* Header Desktop - Una sola línea (solo visible en desktop) */}
        <div className="hidden md:block px-4 py-3">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center space-x-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </Button>
              <Image
                src="/images/jobealologo2.svg"
                alt="Jobealo"
                width={120}
                height={30}
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center space-x-3">
              <ColorPicker
                selectedColor={cvData.headerColor}
                onColorChange={(color) => updateCVData("headerColor", color)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Previsualizar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTranslateToEnglish}
                disabled={isTranslating}
                className="flex items-center space-x-2 border-green-300 text-green-600 hover:bg-green-50"
                title="🎉 Traducir al inglés - ¡GRATIS por tiempo limitado!"
              >
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>🇺🇸 English</span>
                <span className="ml-1 px-1 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded">FREE</span>
              </Button>
              <Button 
                onClick={handleDownloadPDF}
                disabled={isGenerating || !canDownloadPDF}
                className={`flex items-center space-x-2 ${!canDownloadPDF ? 'bg-gray-300 cursor-not-allowed' : ''}`}
                title={!canDownloadPDF ? 'Complete todos los pasos para habilitar la descarga' : ''}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isGenerating ? 'Generando PDF...' : 'Descargar PDF'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>
              Paso {currentStep + 1} de {steps.length}
            </span>
            <span>{Math.round(progress)}% completado</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <CVTabs steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <CVSections
          currentStep={currentStep}
          cvData={cvData}
          updateCVData={updateCVData}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onReview={handleReviewCV}
          isFirstStep={currentStep === 0}
          isLastStep={currentStep === steps.length - 1}
        />
      </div>

      {/* Notificaciones */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.message}
        </div>
      )}

      {/* Overlay de traducción */}
      {isTranslating && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100]">
          <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-2xl border border-gray-200">
            <div className="flex flex-col items-center space-y-6">
              {/* Animación de traducción */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              {/* Texto */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-900">
                  Traduciendo tu CV...
                </h3>
                <p className="text-gray-600">
                  Nuestra IA está traduciendo todo el contenido al inglés de manera profesional
                </p>
                <p className="text-sm text-gray-500">
                  Esto puede tomar unos momentos
                </p>
              </div>

              {/* Barra de progreso animada */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
