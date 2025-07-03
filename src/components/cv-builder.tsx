"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"
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

    // Validar que hay datos mínimos para generar el CV
    if (!cvData.personalInfo.firstName || !cvData.personalInfo.lastName) {
      showError('Completa al menos tu nombre y apellidos antes de descargar el PDF')
      return
    }

    try {
      await downloadPDF(cvData)
      showSuccess('¡CV descargado exitosamente!')
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Error al descargar el PDF')
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
              <div className="flex items-center justify-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={isReviewing ? handleBackToEdit : () => setShowPreview(false)}
                  className="flex items-center space-x-2"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>{isReviewing ? 'Volver a editar' : 'Cerrar Vista'}</span>
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={isGenerating || !canDownloadPDF}
                  size="sm"
                  className={`flex items-center space-x-2 ${!canDownloadPDF ? 'bg-gray-300 cursor-not-allowed' : ''}`}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isGenerating ? 'Generando...' : 'Descargar PDF'}</span>
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
          <div className="flex items-center justify-center space-x-3 max-w-7xl mx-auto">
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
              <span className="hidden sm:inline">Previsualizar</span>
              <span className="sm:hidden">Vista</span>
            </Button>
            <Button 
              onClick={handleDownloadPDF}
              disabled={isGenerating || !canDownloadPDF}
              size="sm"
              className={`flex items-center space-x-2 ${!canDownloadPDF ? 'bg-gray-300 cursor-not-allowed' : ''}`}
              title={!canDownloadPDF ? 'Complete todos los pasos para habilitar la descarga' : ''}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{isGenerating ? 'Generando PDF...' : 'Descargar PDF'}</span>
              <span className="sm:hidden">PDF</span>
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
            <div className="flex items-center space-x-4">
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
    </div>
  )
}
