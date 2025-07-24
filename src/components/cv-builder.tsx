"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Download, Eye, EyeOff, Save, Loader2, Globe, X, Edit3, BookOpen, Share2 } from "lucide-react"
import { CVTabs } from "@/components/cv-tabs"
import { CVSections } from "@/components/cv-sections"
import { CVPreview } from "@/components/cv-preview"
import { ColorPicker } from "@/components/color-picker"
import { useActions } from "@/hooks/useActions"
import { useSavedCVs } from "@/hooks/useSavedCVs"
import { useAI } from "@/hooks/useAI"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Hook para notificaciones
function useAINotifications() {
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  const showSuccess = (message: string) => {
    setNotification({ type: 'success', message })
    setTimeout(() => setNotification(null), 3000)
  }
  
  const showError = (message: string) => {
    setNotification({ type: 'error', message })
    setTimeout(() => setNotification(null), 3000)
  }
  
  return { notification, showSuccess, showError }
}

interface CVBuilderProps {
  onBack: () => void
  loadCVId?: string // ID of CV to load on mount
  onSave?: (cvId: string) => void // Callback when CV is saved
}

export interface CVData {
  personalInfo: {
    firstName: string
    lastName: string
    titles: string[]
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
  experience: {
    enabled: boolean
    items: Array<{
      position: string
      company: string
      period: string
      responsibilities: string[]
    }>
  }
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
    contactInfo: {
      country: { value: "", show: true },
      city: { value: "", show: true },
      phone: { value: "", show: true },
      email: { value: "", show: true },
      age: { value: "", show: false },
      gender: { value: "", show: false },
      nationality: { value: "", show: false },
      linkedin: { value: "", show: true },
    },
  },
  headerColor: "#0052CC",
  summary: "",
  skills: [],
  tools: [],
  experience: { enabled: true, items: [] },
  education: [],
  certifications: { enabled: false, items: [] },
  languages: [],
  references: { enabled: false, items: [] },
}

// Function to migrate old CV data structure to new format
const migrateCVData = (cvData: any): CVData => {
  // If experience is an array (old format), convert to new format
  if (Array.isArray(cvData.experience)) {
    cvData.experience = {
      enabled: true,
      items: cvData.experience
    }
  }

  // Ensure experience has proper structure
  if (!cvData.experience || typeof cvData.experience !== 'object') {
    cvData.experience = { enabled: true, items: [] }
  }
  
  // Ensure items array exists
  if (!cvData.experience.items) {
    cvData.experience.items = []
  }

  // Ensure certifications has proper structure
  if (!cvData.certifications || typeof cvData.certifications !== 'object') {
    cvData.certifications = { enabled: false, items: [] }
  }
  
  if (!cvData.certifications.items) {
    cvData.certifications.items = []
  }

  // Ensure references has proper structure
  if (!cvData.references || typeof cvData.references !== 'object') {
    cvData.references = { enabled: false, items: [] }
  }
  
  if (!cvData.references.items) {
    cvData.references.items = []
  }

  return cvData as CVData
}

// Function to validate if each section is completed
const validateSectionCompletion = (cvData: CVData) => {
  const validations = {
    // 0: Nombre
    personalInfo: cvData.personalInfo.firstName.trim() !== "" && cvData.personalInfo.lastName.trim() !== "",
    
    // 1: Título
    titles: cvData.personalInfo.titles.length > 0 && cvData.personalInfo.titles.some(title => title.trim() !== ""),
    
    // 2: Contacto
    contactInfo: Object.values(cvData.personalInfo.contactInfo).some(field => 
      field.show && field.value.trim() !== ""
    ),
    
    // 3: Resumen
    summary: cvData.summary.trim() !== "",
    
    // 4: Competencias
    skills: cvData.skills.length > 0 && cvData.skills.some(skill => skill.trim() !== ""),
    
    // 5: Herramientas
    tools: cvData.tools.length > 0 && cvData.tools.some(tool => tool.trim() !== ""),
    
    // 6: Experiencia
    experience: !cvData.experience.enabled || (
      cvData.experience.items && 
      cvData.experience.items.length > 0 && 
      cvData.experience.items.some(exp => 
        exp.position.trim() !== "" || 
        exp.company.trim() !== "" || 
        exp.period.trim() !== "" ||
        exp.responsibilities.some(resp => resp.trim() !== "")
      )
    ),
    
    // 7: Educación
    education: cvData.education.length > 0 && cvData.education.some(edu =>
      edu.university.trim() !== "" || 
      edu.degree.trim() !== "" || 
      edu.level.trim() !== "" || 
      edu.period.trim() !== ""
    ),
    
    // 8: Certificaciones
    certifications: !cvData.certifications.enabled || (
      cvData.certifications.items && 
      cvData.certifications.items.length > 0 && 
      cvData.certifications.items.some(cert => 
        cert.name.trim() !== "" || 
        cert.institution.trim() !== "" || 
        cert.year.trim() !== ""
      )
    ),
    
    // 9: Idiomas
    languages: cvData.languages.length > 0 && cvData.languages.some(lang =>
      lang.language.trim() !== "" || lang.level.trim() !== ""
    ),
    
    // 10: Referencias
    references: !cvData.references.enabled || (
      cvData.references.items && 
      cvData.references.items.length > 0 && 
      cvData.references.items.some(ref => 
        ref.name.trim() !== "" || 
        ref.company.trim() !== "" || 
        ref.phone.trim() !== ""
      )
    )
  }
  
  return validations
}

// Function to count completed sections
const getCompletedSectionsCount = (cvData: CVData) => {
  const validations = validateSectionCompletion(cvData)
  return Object.values(validations).filter(Boolean).length
}

export function CVBuilder({ onBack, loadCVId, onSave }: CVBuilderProps) {
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(0)
  const [cvData, setCVData] = useState<CVData>(initialCVData)
  const [showPreview, setShowPreview] = useState(false)
  const [isReviewing, setIsReviewing] = useState(false)
  const [showEnglishPreview, setShowEnglishPreview] = useState(false)
  const [translatedData, setTranslatedData] = useState<CVData | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [currentCVId, setCurrentCVId] = useState<string | null>(loadCVId || null)
  const [lastSavedData, setLastSavedData] = useState<CVData | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // New states for custom CV naming
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [customCVName, setCustomCVName] = useState("")
  const [saveAsCompleted, setSaveAsCompleted] = useState(false)
  const [currentCVTitle, setCurrentCVTitle] = useState("")
  
  // Estados para traducción
  const [isTranslationEnabled] = useState(true) // Habilitado temporalmente gratis
  
  // Hooks para PDF y notificaciones
  const { 
    checkAction,
    recordAction,
    refreshStats,
    canDownloadSpanish,
    canDownloadEnglish,
    canTranslateToEnglish,
    recordDownloadSpanish,
    recordDownloadEnglish,
    recordTranslateToEnglish,
    isLoading,
    error,
    userStats,
    hasFullAccess,
    remainingFreeActions,
    userType
  } = useActions()

  // Derived values for compatibility
  const isLifetimeUser = userType === 'LIFETIME'
  const isProUser = userType === 'PRO'
  const hasFullFeatureAccess = hasFullAccess
  const remainingFreeDownloads = remainingFreeActions
  const isGeneratingPDF = isLoading
  
  const { 
    saveCV, 
    loadCV, 
    isSaving, 
    generateCVTitle,
    cvs 
  } = useSavedCVs()
  
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

  // Calculate real progress based on completed sections
  const completedSections = getCompletedSectionsCount(cvData)
  const totalSections = steps.length
  const progress = (completedSections / totalSections) * 100

  // Check full access when component mounts or session changes
  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  // Ensure scroll to top when CV Builder mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Load existing CV if loadCVId is provided
  useEffect(() => {
    const loadExistingCV = async () => {
      if (loadCVId && session?.user?.id) {
        try {
          const cvData = await loadCV(loadCVId)
          if (cvData) {
            const migratedData = migrateCVData(cvData)
            setCVData(migratedData)
            setLastSavedData(migratedData)
            setCurrentCVId(loadCVId)
            
            // Obtener el título del CV de la lista
            const currentCV = cvs.find(cv => cv.id === loadCVId)
            if (currentCV) {
              setCurrentCVTitle(currentCV.title)
            }
            
            showSuccess('CV cargado exitosamente')
          }
        } catch (error) {
          showError('Error al cargar el CV')
          console.error('Error loading CV:', error)
        }
      }
    }

    loadExistingCV()
  }, [loadCVId, session?.user?.id, cvs])

  // Track unsaved changes
  useEffect(() => {
    if (lastSavedData) {
      const hasChanges = JSON.stringify(cvData) !== JSON.stringify(lastSavedData)
      setHasUnsavedChanges(hasChanges)
    }
  }, [cvData, lastSavedData])

  // Auto-save to localStorage (keep this for backup)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem("jobealo-cv-data", JSON.stringify(cvData))
    }, 2000)
    return () => clearTimeout(timer)
  }, [cvData])

  // Load from localStorage on mount (only if not loading existing CV)
  useEffect(() => {
    if (!loadCVId) {
      const saved = localStorage.getItem("jobealo-cv-data")
      if (saved) {
        try {
          const parsedData = JSON.parse(saved)
          setCVData(migrateCVData(parsedData))
        } catch (error) {
          console.error('Error parsing saved CV data:', error)
          setCVData(initialCVData)
        }
      }
    }
  }, [loadCVId])

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

  const handleSaveCV = async (markAsCompleted: boolean = false) => {
    if (!session?.user?.id) {
      showError('Debes iniciar sesión para guardar el CV')
      return
    }

    if (!cvData.personalInfo.firstName || !cvData.personalInfo.lastName) {
      showError('Agrega al menos tu nombre y apellidos antes de guardar')
      return
    }

    try {
      const title = customCVName || generateCVTitle(cvData)
      const savedCV = await saveCV(
        title,
        cvData,
        {
          cvId: currentCVId || undefined,
          isCompleted: markAsCompleted,
          isTemplate: false
        }
      )

      if (savedCV) {
        setCurrentCVId(savedCV.id)
        setLastSavedData({ ...cvData })
        setHasUnsavedChanges(false)
        setShowSaveModal(false)
        setCurrentCVTitle(title)  // ✅ FIX: Actualizar el título mostrado inmediatamente
        setCustomCVName(title)    // ✅ FIX: Mantener el título usado para futuras operaciones de guardado
        
        const message = currentCVId ? 'CV actualizado exitosamente' : 'CV guardado exitosamente'
        showSuccess(message)
        
        // Notify parent component
        onSave?.(savedCV.id)
      }
    } catch (error) {
      showError('Error al guardar el CV')
      console.error('Error saving CV:', error)
    }
  }

  const handleOpenSaveModal = (completed: boolean = false) => {
    setSaveAsCompleted(completed)
    
    // Si es un CV existente, obtener su título actual
    if (currentCVId) {
      const currentCV = cvs.find(cv => cv.id === currentCVId)
      const currentTitle = currentCV?.title || generateCVTitle(cvData)
      setCustomCVName(currentTitle)
      setCurrentCVTitle(currentTitle)
    } else {
      // Si es nuevo, generar título automático
      const newTitle = generateCVTitle(cvData)
      setCustomCVName(newTitle)
      setCurrentCVTitle("")
    }
    
    setShowSaveModal(true)
  }

  const handleQuickSave = () => {
    if (currentCVId) {
      // Si ya existe, actualizar directamente (guardado rápido)
      handleSaveCV(false)
    } else {
      // Si es nuevo, mostrar modal
      handleOpenSaveModal(false)
    }
  }
  
  const handleEditCVName = () => {
    // Función específica para editar el nombre de un CV existente
    handleOpenSaveModal(false)
  }
  
  const handleSaveAsCompleted = () => handleOpenSaveModal(true)

  // Fix: isFlowComplete should be based on actual CV completion, not just current step
  const isFlowComplete = completedSections >= totalSections
  const canDownloadPDF = isFlowComplete || isReviewing

  // Create downloadPDF function with complete logic
  const downloadPDF = async (cvData: CVData, language: 'spanish' | 'english') => {
    try {
      console.log('🔥 PDF Download Started - New Version with improved spacing')
      const actionType = language === 'english' ? 'DOWNLOAD_ENGLISH' : 'DOWNLOAD_SPANISH'
      const recordFunction = language === 'english' ? recordDownloadEnglish : recordDownloadSpanish
      
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') {
        throw new Error('PDF generation only works in the browser')
      }

      // Generate PDF using OPTIMIZED styling to match preview
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF('p', 'pt', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 40
      const usableWidth = pageWidth - (margin * 2)
      let currentY = 50

      // Configure font
      doc.setFont('helvetica')

      // Convert hex color to RGB for jsPDF
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 }
      }

      const headerColor = hexToRgb(cvData.headerColor)

      // SMART PAGINATION: Check if we're too close to page end (more aggressive)
      const isNearPageEnd = (minSpaceNeeded: number = 150) => {
        return currentY + minSpaceNeeded > pageHeight - margin
      }

      // SMART PAGINATION: Move to next page if too close to end
      const avoidOrphanContent = (minSpaceNeeded: number = 150) => {
        if (isNearPageEnd(minSpaceNeeded)) {
          console.log(`📄 NEW PAGE: Avoiding orphan content, needed ${minSpaceNeeded}px space`)
          doc.addPage()
          currentY = 50
        }
      }

      // OPTIMIZED: Function to add text with better proportions
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = 'black', align: 'left' | 'center' | 'right' = 'left', forceNewPageCheck: boolean = false) => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        
        // Set color
        if (color === 'black') {
          doc.setTextColor(0, 0, 0)
        } else if (color === 'gray') {
          doc.setTextColor(85, 85, 85)
        } else if (color === 'lightgray') {
          doc.setTextColor(128, 128, 128)
        } else if (color === 'header') {
          doc.setTextColor(headerColor.r, headerColor.g, headerColor.b)
        }
        
        const lines = doc.splitTextToSize(text, usableWidth)
        
        // Only check for page break if forced (for individual items within sections)
        if (forceNewPageCheck && currentY + (lines.length * fontSize * 1.3 + 5) > pageHeight - margin) {
          doc.addPage()
          currentY = 50
        }
        
        let x = margin
        if (align === 'center') {
          x = pageWidth / 2
        } else if (align === 'right') {
          x = pageWidth - margin
        }
        
        doc.text(lines, x, currentY, { align: align })
        const spacing = lines.length * fontSize * 1.3 + 5
        console.log(`📏 Text spacing: ${spacing}px for "${text.substring(0, 20)}..."`)
        currentY += spacing  // Better line spacing for readability
      }

      // OPTIMIZED: Function to add section line with better spacing
      const addSectionLine = () => {
        doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b)
        doc.setLineWidth(0.5)
        doc.line(margin, currentY - 2, pageWidth - margin, currentY - 2)
        currentY += 10  // More space after line before content (like preview)
      }

      // OPTIMIZED: Function to add section title with better proportions
      const addSectionTitle = (title: string) => {
        currentY += 6
        addText(title, 11, true, 'header')
        addSectionLine()
      }

      // Translations based on language
      const translations = language === 'english' ? {
        professionalSummary: "PROFESSIONAL SUMMARY",
        coreCompetencies: "CORE COMPETENCIES",
        toolsTech: "TOOLS & TECHNOLOGIES",
        professionalExperience: "PROFESSIONAL EXPERIENCE",
        education: "EDUCATION",
        certifications: "CERTIFICATIONS",
        languages: "LANGUAGES",
        references: "REFERENCES",
        years: "years"
      } : {
        professionalSummary: "RESUMEN PROFESIONAL",
        coreCompetencies: "COMPETENCIAS PRINCIPALES",
        toolsTech: "HERRAMIENTAS & TECNOLOGÍAS",
        professionalExperience: "EXPERIENCIA PROFESIONAL",
        education: "EDUCACIÓN",
        certifications: "CERTIFICACIONES",
        languages: "IDIOMAS",
        references: "REFERENCIAS",
        years: "años"
      }

      // ========== OPTIMIZED HEADER ==========
      const headerStartY = currentY

      // OPTIMIZED: Full name with better size
      const fullName = `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const nameWidth = doc.getTextWidth(fullName)
      doc.text(fullName, (pageWidth - nameWidth) / 2, headerStartY + 25)

      // OPTIMIZED: Titles with better proportions
      let titleLinesCount = 0
      if (cvData.personalInfo.titles.length > 0) {
        const titlesText = cvData.personalInfo.titles.join(' | ')
        doc.setFontSize(12)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(85, 85, 85)
        
        const titleLines = doc.splitTextToSize(titlesText, usableWidth)
        titleLinesCount = titleLines.length
        
        titleLines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line)
          const x = (pageWidth - lineWidth) / 2
          doc.text(line, x, headerStartY + 45 + (index * 14))
        })
      }

      // OPTIMIZED: Contact info with better spacing
      const contactLines: string[] = []
      
      const countryData = cvData.personalInfo.contactInfo.country
      const cityData = cvData.personalInfo.contactInfo.city
      
      if (countryData.show && countryData.value) {
        let locationText = countryData.value
        if (cityData.show && cityData.value) {
          locationText += `, ${cityData.value}`
        }
        contactLines.push(locationText)
      } else if (cityData.show && cityData.value) {
        contactLines.push(cityData.value)
      }
      
      Object.entries(cvData.personalInfo.contactInfo).forEach(([key, info]) => {
        if (info.show && info.value && key !== "country" && key !== "city") {
          switch (key) {
            case "phone": 
              contactLines.push(info.value)
              break
            case "email": 
              contactLines.push(info.value)
              break
            case "linkedin": 
              contactLines.push(info.value)
              break
            case "age": 
              contactLines.push(`${info.value} ${translations.years}`)
              break
            case "nationality": 
              contactLines.push(info.value)
              break
          }
        }
      })

      if (contactLines.length > 0) {
        const contactText = contactLines.join(' | ')
        
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        const lines = doc.splitTextToSize(contactText, usableWidth)
        const contactStartY = headerStartY + 65 + (titleLinesCount > 1 ? (titleLinesCount - 1) * 14 : 0)
        
        lines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line)
          const x = (pageWidth - lineWidth) / 2
          doc.text(line, x, contactStartY + (index * 11))
        })
        
        currentY = Math.max(currentY, contactStartY + 15 + (lines.length - 1) * 11)
      } else {
        currentY = Math.max(currentY, headerStartY + 80 + (titleLinesCount > 1 ? (titleLinesCount - 1) * 14 : 0))
      }

      // Add double spacing after header before first section
      currentY += 12

      // ========== SMART PAGINATION SECTIONS ==========
      // SUMMARY - Avoid orphan sections
      if (cvData.summary) {
        avoidOrphanContent(120) // Need space for title + meaningful content
        addSectionTitle(translations.professionalSummary)
        addText(cvData.summary, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      // SKILLS - Avoid orphan sections
      if (cvData.skills.length > 0) {
        avoidOrphanContent(100) // Need space for title + skills list
        addSectionTitle(translations.coreCompetencies)
        const skillsText = cvData.skills.map(skill => `• ${skill}`).join('  ')
        addText(skillsText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      // TOOLS - Avoid orphan sections
      if (cvData.tools.length > 0) {
        avoidOrphanContent(100) // Need space for title + tools list
        addSectionTitle(translations.toolsTech)
        const toolsText = cvData.tools.map(tool => `• ${tool}`).join('  ')
        addText(toolsText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      // EXPERIENCE - Special handling: Can split between jobs but not within a job
      if (cvData.experience.enabled && cvData.experience.items.length > 0) {
        // Ensure we have space for section title + at least first job
        avoidOrphanContent(160) // Need space for title + meaningful job content
        addSectionTitle(translations.professionalExperience)
        
        cvData.experience.items.forEach((exp, index) => {
          // For each job, check if we have reasonable space (avoid tiny job entries at page end)
          if (isNearPageEnd(120)) { // Need at least 120pt for job title + responsibilities
            doc.addPage()
            currentY = 50
          }
          
          // Now add the job content (we know it fits)
          const jobTitle = `${exp.position} | ${exp.company}`;
          addText(jobTitle, 11, true, 'black')
          
          if (exp.period) {
            // Position period on the right side, accounting for the improved spacing
            currentY -= 20 // Go back to align with job title
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(exp.period)
            doc.text(exp.period, pageWidth - margin - periodWidth, currentY)
            currentY += 22 // Move forward with proper spacing
          }

          if (exp.responsibilities.length > 0) {
            const validResponsibilities = exp.responsibilities.filter(r => r.trim())
            validResponsibilities.forEach(resp => {
              const respText = `• ${resp}`
              // Use addText for consistent spacing
              addText(respText, 10, false, 'gray')
            })
          }
          
          if (index < cvData.experience.items.length - 1) {
            currentY += 12  // More space between experience items
          }
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      // EDUCATION - Avoid orphan sections
      if (cvData.education.length > 0) {
        avoidOrphanContent(100) // Need space for title + at least one education item
        addSectionTitle(translations.education)
        
        cvData.education.forEach(edu => {
          const eduText = `• ${edu.level} en ${edu.degree} – ${edu.university}`
          
          // Use addText for consistent spacing
          addText(eduText, 10, false, 'gray')
          
          if (edu.period) {
            // Position period on the right side, accounting for the improved spacing
            currentY -= 18 // Go back to align with education text
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(edu.period)
            doc.text(edu.period, pageWidth - margin - periodWidth, currentY)
            currentY += 20 // Move forward with proper spacing
          }
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      // CERTIFICATIONS - Avoid orphan sections
      if (cvData.certifications.enabled && cvData.certifications.items.length > 0) {
        avoidOrphanContent(100) // Need space for title + at least one certification
        addSectionTitle(translations.certifications)
        
        cvData.certifications.items.forEach(cert => {
          const certText = `• ${cert.name} – ${cert.institution}, ${cert.year}`
          addText(certText, 10, false, 'gray')
          currentY += 3  // Better spacing between certifications
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      // LANGUAGES - Avoid orphan sections
      if (cvData.languages.length > 0) {
        avoidOrphanContent(80) // Need space for title + languages line
        addSectionTitle(translations.languages)
        const languagesText = cvData.languages.map(lang => `• ${lang.language}: ${lang.level}`).join('  ')
        addText(languagesText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      // REFERENCES - Avoid orphan sections
      if (cvData.references.enabled && cvData.references.items.length > 0) {
        avoidOrphanContent(100) // Need space for title + at least one reference
        addSectionTitle(translations.references)
        
        cvData.references.items.forEach(ref => {
          const refText = `• ${ref.name} – ${ref.company}, ${ref.phone}`
          addText(refText, 10, false, 'gray')
          currentY += 3  // Better spacing between references
        })
        // No extra spacing after last section
      }

      // Generate filename
      const fileName = `CV_${cvData.personalInfo.firstName}_${cvData.personalInfo.lastName}_${language}.pdf`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')

      // Record the action first
      await recordFunction({
        language,
        fileName,
        cvData: {
          name: `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
          titles: cvData.personalInfo.titles
        }
      })

      // Download PDF
      console.log('✅ PDF Generated successfully with improved spacing and pagination')
      doc.save(fileName)
      
      return true
    } catch (error) {
      console.error('Error downloading PDF:', error)
      throw error
    }
  }

  const handleDownloadPDF = async () => {
    // Validar que el CV esté completo
    if (!isFlowComplete) {
      showError('⚠️ Tu CV debe estar 100% completo para descargar el PDF. Completa todas las secciones obligatorias.')
      return
    }

    // Determinar qué datos usar (inglés o español)
    const dataToDownload = showEnglishPreview && translatedData ? translatedData : cvData
    const language = showEnglishPreview ? 'english' : 'spanish'

    // Validar que hay datos mínimos para generar el CV
    if (!dataToDownload.personalInfo.firstName || !dataToDownload.personalInfo.lastName) {
      showError('Completa al menos tu nombre y apellidos antes de descargar el PDF')
      return
    }

    try {
      // VERIFICAR LÍMITES ANTES DE DESCARGAR
      const actionType = language === 'english' ? 'DOWNLOAD_ENGLISH' : 'DOWNLOAD_SPANISH'
      const check = await checkAction(actionType)
      
      // Si se requiere pago, mostrar mensaje
      if (!check.allowed && check.requiresPayment && check.price) {
        showError(`🔒 Necesitas pagar $${check.price} para descargar este CV.`)
        return
      }
      
      // Si se requiere registro, mostrar mensaje
      if (!check.allowed && check.requiresRegistration) {
        showError('🔒 Necesitas registrarte para continuar descargando.')
        return
      }
      
      // Si no está permitido por otros motivos, mostrar error
      if (!check.allowed) {
        showError('🔒 Has agotado tus descargas gratuitas.')
        return
      }

      // Si está permitido, proceder con la descarga
      const success = await downloadPDF(dataToDownload, language)
      if (success) {
        const message = showEnglishPreview ? 'CV downloaded successfully!' : '¡CV descargado exitosamente!'
        showSuccess(message)
      }
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

    // Para usuarios no logueados, verificar límites antes de traducir
    if (!session?.user) {
      // Verificar si la traducción está permitida
      try {
        const check = await checkAction('TRANSLATE_TO_ENGLISH')
        
        if (!check.allowed && check.requiresPayment && check.price) {
          showError(`🔒 Necesitas pagar $${check.price} para traducir al inglés.`)
          return
        }
        
        if (!check.allowed && check.requiresRegistration) {
          showError('🔒 Necesitas registrarte para continuar traduciendo.')
          return
        }
        
        if (!check.allowed) {
          showError('🔒 Has agotado tus traducciones gratuitas.')
          return
        }

        // Si está permitido, proceder con la traducción
        setIsTranslating(true)
        
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

        // Registrar la acción de traducción para usuarios anónimos también
        await recordAction('TRANSLATE_TO_ENGLISH', {
          originalLanguage: 'spanish',
          targetLanguage: 'english',
          cvData: {
            name: `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
            titles: cvData.personalInfo.titles
          }
        })

        showSuccess('✅ ¡CV traducido al inglés exitosamente! 🎯 Ahora puedes descargarlo usando el botón de descarga.')
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
        showError(`❌ ${errorMessage}`)
      } finally {
        setIsTranslating(false)
      }
      return
    }
    
    // Para usuarios logueados, verificar acceso usando el nuevo sistema
    try {
      const check = await canTranslateToEnglish()
      if (!check.allowed) {
        if (check.requiresPayment) {
          showError(`🔒 Necesitas pagar $${check.price} para traducir al inglés.`)
        } else {
          showError('🔒 Has agotado tus funciones gratuitas. Necesitas un plan Pro o Lifetime para traducir al inglés.')
        }
        return
      }

      // Mostrar mensaje sobre acceso
      if (isLifetimeUser || isProUser) {
        showSuccess(`🎉 ¡Perfecto! Tienes acceso ilimitado a todas las funciones.`)
      } else if (hasFullFeatureAccess) {
        showSuccess(`🎉 ¡Perfecto! Tienes acceso completo. Te quedan ${remainingFreeActions} acciones gratuitas.`)
      }
      
      // Traducir con IA
      setIsTranslating(true)
      
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

      // Registrar la acción de traducción
      await recordTranslateToEnglish({
        originalLanguage: 'spanish',
        targetLanguage: 'english',
        cvData: {
          name: `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
          titles: cvData.personalInfo.titles
        }
      })

      // Usar los datos traducidos realmente por IA
      setTranslatedData(data.translatedCV)
      setShowEnglishPreview(true)
      showSuccess('✅ ¡CV traducido al inglés exitosamente! 🎯 Ahora puedes descargarlo usando el botón de descarga.')
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
        <div className="sticky top-16 z-40 bg-white border-b">
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
                  disabled={isGeneratingPDF}
                  size="sm"
                  className="flex items-center space-x-1"
                >
                  {isGeneratingPDF ? (
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
                disabled={isGeneratingPDF}
                className="flex items-center space-x-2"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}</span>
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
          <CVPreview data={translatedData} isEnglishVersion={true} isComplete={isFlowComplete} />
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
                    🤖 Traduciendo tu CV con IA...
                  </h3>
                  <p className="text-gray-600">
                    Nuestra IA está traduciendo todo el contenido al inglés de manera profesional
                  </p>
                  <p className="text-sm text-gray-500">
                    Una vez completado, podrás descargar el PDF en inglés
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    Esta traducción cuenta como 1 descarga en tu plan
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
        <div className="sticky top-16 z-40 bg-white border-b">
          {/* Header Mobile - Layout vertical */}
          <div className="md:hidden">
            {/* Nivel 1: Logo */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center space-x-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </Button>
                <div className="flex flex-col items-center">
                  <Image
                    src="/images/jobealologo2.svg"
                    alt="Jobealo"
                    width={120}
                    height={30}
                    className="h-8 w-auto"
                  />
                  {currentCVId && currentCVTitle && (
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="text-xs text-gray-600 max-w-[120px] truncate">
                        {currentCVTitle}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleEditCVName}
                        className="p-1 h-auto w-auto text-gray-500 hover:text-gray-700"
                        title="Editar nombre del CV"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                {/* Espaciador para mantener el logo centrado */}
                <div className="w-[72px]"></div>
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
                {session?.user?.id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleQuickSave}
                    disabled={isSaving}
                    className={`flex items-center space-x-1 ${
                      hasUnsavedChanges ? 'border-orange-300 text-orange-600' : 'border-green-300 text-green-600'
                    }`}
                    title={hasUnsavedChanges ? 'Tienes cambios sin guardar' : 'CV guardado'}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Guardar</span>
                    {hasUnsavedChanges && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateToEnglish}
                  disabled={isTranslating || !isFlowComplete}
                  className={`flex items-center space-x-2 ${
                    !isFlowComplete
                      ? 'border-gray-300 text-gray-400 cursor-not-allowed' 
                      : showEnglishPreview
                      ? 'border-green-300 text-green-600 hover:bg-green-50'
                      : !session?.user
                      ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                      : hasFullFeatureAccess || isLifetimeUser || isProUser
                      ? 'border-green-300 text-green-600 hover:bg-green-50'
                      : 'border-orange-300 text-orange-600 hover:bg-orange-50'
                  }`}
                  title={
                    !isFlowComplete
                      ? "⚠️ Debes terminar tu CV para poder traducirlo" 
                      : showEnglishPreview
                      ? "🇪🇸 Cambiar a versión en español"
                      : !session?.user
                      ? "🤖 Traducir CV al inglés GRATIS - Para descargar necesitarás registro gratuito"
                      : isLifetimeUser || isProUser
                      ? '🤖 Traducir CV al inglés con IA - Acceso ilimitado'
                      : hasFullFeatureAccess
                      ? `🤖 Traducir CV al inglés con IA - Te quedan ${remainingFreeDownloads} traducciones gratuitas`
                      : '🔒 Traducir CV al inglés con IA - Necesitas plan Pro o Lifetime (cuenta como 1 descarga)'
                  }
                >
                  {isTranslating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                  <span>
                    {showEnglishPreview ? '🇪🇸 Ver en Español' : '🤖 Traducir al Inglés'}
                  </span>
                  {!showEnglishPreview && hasFullFeatureAccess && !isLifetimeUser && !isProUser && (
                    <Badge variant="secondary" className="text-xs h-5">
                      1 DESCARGA
                    </Badge>
                  )}
                  {!showEnglishPreview && (isLifetimeUser || isProUser) && (
                    <Badge variant="secondary" className="text-xs h-5 bg-blue-100 text-blue-700">
                      ILIMITADO
                    </Badge>
                  )}
                </Button>
                <Button 
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || !canDownloadPDF}
                  size="sm"
                  className={`flex items-center space-x-2 ${!canDownloadPDF ? 'bg-gray-300 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>
                    {isGeneratingPDF 
                      ? 'Generando...' 
                      : showEnglishPreview 
                        ? 'Descargar PDF (EN)' 
                        : 'Descargar PDF (ES)'
                    }
                  </span>
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
              {session?.user?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuickSave}
                  disabled={isSaving}
                  className={`flex items-center space-x-2 ${
                    hasUnsavedChanges ? 'border-orange-300 text-orange-600' : 'border-green-300 text-green-600'
                  }`}
                  title={hasUnsavedChanges ? 'Tienes cambios sin guardar' : 'CV guardado'}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Guardando...' : 'Guardar CV'}</span>
                  {hasUnsavedChanges && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
                </Button>
              )}
            </div>
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
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
            </div>
          </div>
        </div>
        
        {/* Mensaje cuando PDF está deshabilitado */}
        {!canDownloadPDF && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
            <div className="max-w-7xl mx-auto text-center">
              <p className="text-yellow-800 text-sm">
                ⚠️ Tu CV debe estar 100% completo para descargar el PDF. Completa todas las secciones obligatorias.
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
          <CVPreview data={cvData} isComplete={isFlowComplete} />
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
                    🤖 Traduciendo tu CV con IA...
                  </h3>
                  <p className="text-gray-600">
                    Nuestra IA está traduciendo todo el contenido al inglés de manera profesional
                  </p>
                  <p className="text-sm text-gray-500">
                    Una vez completado, podrás descargar el PDF en inglés
                  </p>
                  <p className="text-xs text-blue-600 font-medium">
                    Esta traducción cuenta como 1 descarga en tu plan
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
      <div className="sticky top-16 z-40 bg-white border-b">
        {/* Nivel 1: Botón volver + Logo (solo mobile) */}
        <div className="px-4 py-3 border-b md:hidden">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </Button>
            <div className="flex flex-col items-center">
              <Image
                src="/images/jobealologo2.svg"
                alt="Jobealo"
                width={120}
                height={30}
                className="h-8 w-auto"
              />
              {currentCVId && currentCVTitle && (
                <div className="flex items-center space-x-1 mt-1">
                  <span className="text-xs text-gray-600 max-w-[120px] truncate">
                    {currentCVTitle}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditCVName}
                    className="p-1 h-auto w-auto text-gray-500 hover:text-gray-700"
                    title="Editar nombre del CV"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
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
            {session?.user?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickSave}
                disabled={isSaving}
                className={`flex items-center space-x-1 ${
                  hasUnsavedChanges ? 'border-orange-300 text-orange-600' : 'border-green-300 text-green-600'
                }`}
                title={hasUnsavedChanges ? 'Tienes cambios sin guardar' : 'CV guardado'}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Guardar</span>
                <span className="sm:hidden">💾</span>
                {hasUnsavedChanges && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
              </Button>
            )}
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
              {currentCVId && currentCVTitle && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-full">
                  <span className="text-sm text-gray-700 font-medium">
                    {currentCVTitle}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditCVName}
                    className="p-1 h-auto w-auto text-gray-500 hover:text-gray-700"
                    title="Editar nombre del CV"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <ColorPicker
                selectedColor={cvData.headerColor}
                onColorChange={(color) => updateCVData("headerColor", color)}
              />
              {session?.user?.id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleQuickSave}
                  disabled={isSaving}
                  className={`flex items-center space-x-2 ${
                    hasUnsavedChanges ? 'border-orange-300 text-orange-600' : 'border-green-300 text-green-600'
                  }`}
                  title={hasUnsavedChanges ? 'Tienes cambios sin guardar' : 'CV guardado'}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                  {hasUnsavedChanges && <span className="w-2 h-2 bg-orange-500 rounded-full"></span>}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                className="flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Previsualizar</span>
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
              Completado {completedSections} de {totalSections}
            </span>
            <span>{Math.round(progress)}% completado</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <CVTabs 
            steps={steps} 
            currentStep={currentStep} 
            onStepClick={handleStepClick}
            cvData={cvData}
            validateSectionCompletion={validateSectionCompletion}
          />
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
                  🤖 Traduciendo tu CV con IA...
                </h3>
                <p className="text-gray-600">
                  Nuestra IA está traduciendo todo el contenido al inglés de manera profesional
                </p>
                <p className="text-sm text-gray-500">
                  Una vez completado, podrás descargar el PDF en inglés
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  Esta traducción cuenta como 1 descarga en tu plan
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

      {/* Modal de guardar CV */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {currentCVId ? 'Actualizar CV' : 'Guardar CV'}
                </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="cv-name" className="text-sm font-medium text-gray-700 mb-2 block">
                  Nombre del CV
                </Label>
                <Input
                  id="cv-name"
                  type="text"
                  value={customCVName}
                  onChange={(e) => setCustomCVName(e.target.value)}
                  placeholder="Ej: CV para Marketing Digital, CV Desarrollador Senior..."
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este nombre te ayudará a identificar el CV en tu lista guardada
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="mark-completed"
                  checked={saveAsCompleted}
                  onChange={(e) => setSaveAsCompleted(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <Label htmlFor="mark-completed" className="text-sm text-gray-700">
                  Marcar como terminado
                </Label>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleSaveCV(saveAsCompleted)}
                  disabled={isSaving || !customCVName.trim()}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {currentCVId ? 'Actualizar' : 'Guardar'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
