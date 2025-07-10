import type { CVData } from "@/components/cv-builder"
import { useActions } from "@/hooks/useActions"
import { useStripePayment } from "@/hooks/useStripePayment"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Crown, AlertCircle, CheckCircle, Loader2, User, X, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
import PaymentModal from './payment/payment-modal'
import { useSession } from "next-auth/react"

interface CVPreviewProps {
  data: CVData
  isEnglishVersion?: boolean
  isComplete?: boolean
}

export function CVPreview({ data, isEnglishVersion = false, isComplete = true }: CVPreviewProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'spanish' | 'english'>('spanish')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [pendingDownload, setPendingDownload] = useState<{
    language: 'spanish' | 'english'
    price: number
  } | null>(null)
  const [showIndividualPaymentModal, setShowIndividualPaymentModal] = useState(false)
  const [individualPaymentData, setIndividualPaymentData] = useState<{ amount: number, language: string } | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translatedData, setTranslatedData] = useState<CVData | null>(null)
  const [showEnglishVersion, setShowEnglishVersion] = useState(isEnglishVersion)
  
  const { data: session } = useSession()
  const {
    checkAction,
    recordAction,
    canDownloadSpanish,
    canDownloadEnglish,
    recordDownloadSpanish,
    recordDownloadEnglish,
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
  const isAuthenticated = !!session?.user
  const userPlan = session?.user?.plan || userType

  // Download state (will be set dynamically)
  const [downloadState, setDownloadState] = useState<{
    canDownload: boolean
    needsRegistration: boolean
    needsPayment: boolean
    downloadPrice?: number
  }>({
    canDownload: false,
    needsRegistration: false,
    needsPayment: false,
    downloadPrice: 1.99
  })

  const stripePayment = useStripePayment()

  // Traducciones de secciones - usar las correctas según el estado actual
  const translations = {
    professionalSummary: (showEnglishVersion && translatedData) ? "PROFESSIONAL SUMMARY" : "RESUMEN PROFESIONAL",
    coreCompetencies: (showEnglishVersion && translatedData) ? "CORE COMPETENCIES" : "COMPETENCIAS PRINCIPALES", 
    toolsTech: (showEnglishVersion && translatedData) ? "TOOLS & TECHNOLOGIES" : "HERRAMIENTAS & TECNOLOGÍAS",
    professionalExperience: (showEnglishVersion && translatedData) ? "PROFESSIONAL EXPERIENCE" : "EXPERIENCIA PROFESIONAL",
    education: (showEnglishVersion && translatedData) ? "EDUCATION" : "EDUCACIÓN",
    certifications: (showEnglishVersion && translatedData) ? "CERTIFICATIONS" : "CERTIFICACIONES",
    languages: (showEnglishVersion && translatedData) ? "LANGUAGES" : "IDIOMAS",
    references: (showEnglishVersion && translatedData) ? "REFERENCES" : "REFERENCIAS",
    years: (showEnglishVersion && translatedData) ? "years" : "años"
  }

  const formatContactInfo = () => {
    const contacts: string[] = []
    
    // Use translated data when available
    const currentData = showEnglishVersion && translatedData ? translatedData : data
    
    // Primero obtener country y city para manejar el formato especial
    const countryData = currentData.personalInfo.contactInfo.country
    const cityData = currentData.personalInfo.contactInfo.city
    
    // Manejar país y ciudad juntos
    if (countryData.show && countryData.value) {
      let locationText = countryData.value
      if (cityData.show && cityData.value) {
        locationText += `, ${cityData.value}`
      }
      contacts.push(locationText)
    } else if (cityData.show && cityData.value) {
      contacts.push(cityData.value)
    }
    
    // Procesar el resto de campos
    Object.entries(currentData.personalInfo.contactInfo).forEach(([key, info]) => {
      if (info.show && info.value && key !== "country" && key !== "city") {
        switch (key) {
          case "phone":
            contacts.push(info.value)
            break
          case "email":
            contacts.push(info.value)
            break
          case "linkedin":
            contacts.push(info.value)
            break
          case "age":
            contacts.push(`${info.value} ${translations.years}`)
            break
          case "nationality":
            contacts.push(info.value)
            break
        }
      }
    })
    
    return contacts.join(" | ")
  }

  const handleDownload = async (language: 'spanish' | 'english') => {
    try {
      // For English, if not already translated, translate first
      if (language === 'english' && !showEnglishVersion) {
        await handleTranslateToEnglish()
        return
      }

      // For actual downloads (Spanish or already translated English)
      const actionType = language === 'english' ? 'DOWNLOAD_ENGLISH' : 'DOWNLOAD_SPANISH'
      const check = await checkAction(actionType)
      
      // If payment is required, show payment modal
      if (!check.allowed && check.requiresPayment && check.price) {
        setPendingDownload({ 
          language, 
          price: check.price 
        })
        setShowPaymentModal(true)
        return
      }
      
      // If registration is required, redirect to login  
      if (!check.allowed && check.requiresRegistration) {
        signIn()
        return
      }
      
      // If not allowed for other reasons, show error
      if (!check.allowed) {
        console.error('Download not allowed')
        return
      }

      // Use translated data if available
      const dataToDownload = showEnglishVersion && translatedData ? translatedData : data

      // If allowed, proceed with download
      const success = await downloadPDF(dataToDownload, language)
      if (success) {
        const message = language === 'english' ? 'CV downloaded successfully!' : '¡CV descargado exitosamente!'
        console.log(message)
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!pendingDownload) return

    try {
      // Para usuarios que acaban de pagar, descargar directamente el PDF
      await generateAndDownloadPDF(data, pendingDownload.language)
      const message = pendingDownload.language === 'english' ? 'CV downloaded successfully!' : '¡CV descargado exitosamente!'
      console.log(message)
      
      // Mostrar notificación de éxito
      alert(message)
    } catch (error) {
      console.error('Download error after payment:', error)
      alert('Error al descargar el PDF. Por favor, intenta de nuevo.')
    } finally {
      setShowPaymentModal(false)
      setPendingDownload(null)
    }
  }

  const handlePaymentCancel = () => {
    setShowPaymentModal(false)
    setPendingDownload(null)
  }

  const processIndividualPayment = async () => {
    if (!pendingDownload) return

    try {
      setShowPaymentModal(false)
      
      // Usar el modal de pago existente para pagos individuales
      setIndividualPaymentData({
        amount: pendingDownload.price,
        language: pendingDownload.language
      })
      setShowIndividualPaymentModal(true)

    } catch (error) {
      console.error('Payment error:', error)
      
      // Si falla, mostrar alternativa
      const confirmUpgrade = confirm(
        `Hubo un error procesando el pago individual. ¿Te gustaría considerar el plan Lifetime por $59.99 que incluye descargas ilimitadas?`
      )
      
      if (confirmUpgrade) {
        window.location.href = '/checkout?plan=LIFETIME'
      }
    } finally {
      setPendingDownload(null)
    }
  }

  const handleIndividualPaymentSuccess = () => {
    setShowIndividualPaymentModal(false)
    setIndividualPaymentData(null)
    
    // Para el modal nuevo, también descargar directamente
    if (individualPaymentData) {
      const language = individualPaymentData.language === 'english' ? 'english' : 'spanish'
      generateAndDownloadPDF(data, language)
        .then(() => {
          const message = language === 'english' ? 'CV downloaded successfully!' : '¡CV descargado exitosamente!'
          alert(message)
        })
        .catch((error) => {
          console.error('Download error after individual payment:', error)
          alert('Error al descargar el PDF. Por favor, intenta de nuevo.')
        })
    }
  }

  const getPlanBadge = () => {
    if (!isAuthenticated) return null

    switch (userPlan) {
      case 'PRO':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Crown className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        )
      case 'LIFETIME':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Crown className="w-3 h-3 mr-1" />
            Lifetime
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">
            Freemium
          </Badge>
        )
    }
  }

  const getDownloadStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          Verificando límites...
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )
    }

    if (isLifetimeUser || isProUser) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-yellow-600">
            <Crown className="w-4 h-4" />
            {isLifetimeUser ? 'Usuario Lifetime' : 'Usuario Pro'} - Acceso Completo Ilimitado
          </div>
          {getPlanBadge()}
        </div>
      )
    }

    if (isAuthenticated && userStats && userStats.stats.totalActions > 0 && !isLifetimeUser && !isProUser && (
      hasFullFeatureAccess ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800">
            <CheckCircle className="w-4 h-4" />
            Plan Freemium - Acceso completo hasta 3 descargas - {remainingFreeDownloads} restantes
          </div>
          {getPlanBadge()}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-4 h-4" />
            Acceso completo agotado - Necesitas plan Pro o Lifetime
          </div>
          {getPlanBadge()}
        </div>
      )
    )) {
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-800">
            <CheckCircle className="w-4 h-4" />
            Plan Freemium - Acceso completo hasta 3 descargas - {remainingFreeDownloads} restantes
          </div>
          {getPlanBadge()}
        </div>
      )
    }

    if (!isAuthenticated) {
      if (hasFullFeatureAccess) {
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            Acceso completo hasta 2 descargas - {remainingFreeDownloads} restantes
          </div>
        )
      } else {
        return (
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-4 h-4" />
            Usuario anónimo - Acceso completo agotado
          </div>
        )
      }
    }

    return null
  }

  const getButtonText = (language: 'spanish' | 'english') => {
    if (isGeneratingPDF) {
      return language === 'english' ? 'Generating PDF...' : 'Generando PDF...'
    }

    if (language === 'spanish') {
      if (canDownload) {
        if (isLifetimeUser || isProUser) {
          return 'Descargar en Español'
        }
        if (hasFullFeatureAccess) {
          return `Descarga Gratis (${remainingFreeDownloads} restantes)`
        }
        return 'Descargar en Español'
      }
      if (needsRegistration) {
        return 'Registrarse para Continuar'
      }
      if (needsPayment) {
        return `Descargar por $${downloadPrice}`
      }
      return 'Descargar en Español'
    } else {
      if (isLifetimeUser || isProUser) {
        return 'Download in English'
      }
      if (hasFullFeatureAccess) {
        return `Download Free (${remainingFreeDownloads} remaining)`
      }
      if (needsRegistration) {
        return 'Sign In to Continue'
      }
      return `Download for $${downloadPrice || '1.99'}`
    }
  }

  const headerStyle = {
    color: data.headerColor,
    borderBottomColor: data.headerColor,
  }

  // Create downloadPDF function with complete logic (NO action checking - only PDF generation)
  const downloadPDF = async (cvData: CVData, language: 'spanish' | 'english', skipActionRecording: boolean = false) => {
    try {
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

      // OPTIMIZED: Function to add text with better proportions
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = 'black', align: 'left' | 'center' | 'right' = 'left') => {
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
        
        // Check if we need a new page
        if (currentY + (lines.length * fontSize * 1.1) > pageHeight - margin) {
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
        currentY += lines.length * fontSize * 1.1 + 3
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

      // ========== OPTIMIZED SECTIONS ==========
      if (cvData.summary) {
        addSectionTitle(translations.professionalSummary)
        addText(cvData.summary, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (cvData.skills.length > 0) {
        addSectionTitle(translations.coreCompetencies)
        const skillsText = cvData.skills.map(skill => `• ${skill}`).join('  ')
        addText(skillsText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (cvData.tools.length > 0) {
        addSectionTitle(translations.toolsTech)
        const toolsText = cvData.tools.map(tool => `• ${tool}`).join('  ')
        addText(toolsText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (cvData.experience.enabled && cvData.experience.items.length > 0) {
        addSectionTitle(translations.professionalExperience)
        
        cvData.experience.items.forEach((exp, index) => {
          const jobTitle = `${exp.position} | ${exp.company}`;
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(jobTitle, margin, currentY)
          
          if (exp.period) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(exp.period)
            doc.text(exp.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 14

          if (exp.responsibilities.length > 0) {
            const validResponsibilities = exp.responsibilities.filter(r => r.trim())
            validResponsibilities.forEach(resp => {
              doc.setFontSize(10)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(85, 85, 85)
              
              const respText = `• ${resp}`
              const lines = doc.splitTextToSize(respText, usableWidth)
              
              if (currentY + (lines.length * 10 * 1.1) > pageHeight - margin) {
                doc.addPage()
                currentY = 50
              }
              
              doc.text(lines, margin, currentY)
              currentY += lines.length * 10 * 1.1 + 1
            })
          }
          
          if (index < cvData.experience.items.length - 1) {
            currentY += 12  // More space between experience items
          }
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (cvData.education.length > 0) {
        addSectionTitle(translations.education)
        
        cvData.education.forEach(edu => {
          const eduText = `• ${edu.level} en ${edu.degree} – ${edu.university}`
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(85, 85, 85)
          doc.text(eduText, margin, currentY)
          
          if (edu.period) {
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(edu.period)
            doc.text(edu.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 12
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (cvData.certifications.enabled && cvData.certifications.items.length > 0) {
        addSectionTitle(translations.certifications)
        
        cvData.certifications.items.forEach(cert => {
          const certText = `• ${cert.name} – ${cert.institution}, ${cert.year}`
          addText(certText, 10, false, 'gray')
          currentY += 1
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (cvData.languages.length > 0) {
        addSectionTitle(translations.languages)
        const languagesText = cvData.languages.map(lang => `• ${lang.language}: ${lang.level}`).join('  ')
        addText(languagesText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (cvData.references.enabled && cvData.references.items.length > 0) {
        addSectionTitle(translations.references)
        
        cvData.references.items.forEach(ref => {
          const refText = `• ${ref.name} – ${ref.company}, ${ref.phone}`
          addText(refText, 10, false, 'gray')
          currentY += 1
        })
        // No extra spacing after last section
      }

      // Generate filename
      const fileName = `CV_${cvData.personalInfo.firstName}_${cvData.personalInfo.lastName}_${language}${skipActionRecording ? '_PAID' : ''}.pdf`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')

      // Record the action if needed
      if (!skipActionRecording) {
        await recordFunction({
          language,
          fileName,
          cvData: {
            name: `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
            titles: cvData.personalInfo.titles
          }
        })
      }

      // Download PDF
      doc.save(fileName)
      
      return true
    } catch (error) {
      console.error('Error generating PDF:', error)
      throw error
    }
  }

  // Check download status when component mounts
  useEffect(() => {
    const checkDownloadStatus = async () => {
      try {
        const spanishCheck = await canDownloadSpanish()
        setDownloadState({
          canDownload: spanishCheck.allowed,
          needsRegistration: spanishCheck.requiresRegistration,
          needsPayment: spanishCheck.requiresPayment,
          downloadPrice: spanishCheck.price || 1.99
        })
      } catch (error) {
        console.error('Error checking download status:', error)
      }
    }

    checkDownloadStatus()
  }, [canDownloadSpanish])

  // Extract downloadState properties for compatibility
  const { canDownload, needsRegistration, needsPayment, downloadPrice } = downloadState

  // Add translation function exactly like CVBuilder
  const handleTranslateToEnglish = async () => {
    if (showEnglishVersion) {
      // If already in English, switch back to Spanish
      setShowEnglishVersion(false)
      setTranslatedData(null)
      return
    }

    // Check if translation is allowed first
    try {
      const check = await checkAction('TRANSLATE_TO_ENGLISH')
      
      if (!check.allowed && check.requiresPayment && check.price) {
        // Show payment modal for translation
        setPendingDownload({ 
          language: 'english', 
          price: check.price 
        })
        setShowPaymentModal(true)
        return
      }
      
      if (!check.allowed && check.requiresRegistration) {
        signIn()
        return
      }
      
      if (!check.allowed) {
        console.error('Translation not allowed')
        return
      }

      // Proceed with translation
      setIsTranslating(true)
      
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData: data
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al traducir el CV')
      }

      // Record the translation action for both authenticated and anonymous users
      await recordAction('TRANSLATE_TO_ENGLISH', {
        originalLanguage: 'spanish',
        targetLanguage: 'english',
        cvData: {
          name: `${data.personalInfo.firstName} ${data.personalInfo.lastName}`,
          titles: data.personalInfo.titles
        }
      })

      // Set translated data and switch to English view
      setTranslatedData(result.translatedCV)
      setShowEnglishVersion(true)
      console.log('✅ CV translated to English successfully!')
      
    } catch (error) {
      console.error('Translation error:', error)
    } finally {
      setIsTranslating(false)
    }
  }

  // Función para generar y descargar PDF directamente después del pago (formato completo)
  const generateAndDownloadPDF = async (cvData: CVData, language: 'spanish' | 'english') => {
    try {
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') {
        throw new Error('PDF generation only works in the browser')
      }

      // Si es inglés y no tenemos traducción, obtenerla primero
      if (language === 'english' && !translatedData) {
        setIsTranslating(true)
        try {
          const response = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cvData: cvData
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Error al traducir el CV')
          }

          setTranslatedData(result.translatedCV)
        } catch (translationError) {
          console.error('Translation error during paid download:', translationError)
          // Continuar con datos originales si falla la traducción
        } finally {
          setIsTranslating(false)
        }
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

      // OPTIMIZED: Function to add text with better proportions
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: string = 'black', align: 'left' | 'center' | 'right' = 'left') => {
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
        
        // Check if we need a new page
        if (currentY + (lines.length * fontSize * 1.1) > pageHeight - margin) {
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
        currentY += lines.length * fontSize * 1.1 + 3
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

      // Determine the data to use (translated if English and available)
      const actualData = language === 'english' && translatedData ? translatedData : cvData

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
      const fullName = `${actualData.personalInfo.firstName} ${actualData.personalInfo.lastName}`
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const nameWidth = doc.getTextWidth(fullName)
      doc.text(fullName, (pageWidth - nameWidth) / 2, headerStartY + 25)

      // OPTIMIZED: Titles with better proportions
      let titleLinesCount = 0
      if (actualData.personalInfo.titles.length > 0) {
        const titlesText = actualData.personalInfo.titles.join(' | ')
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
      
      const countryData = actualData.personalInfo.contactInfo.country
      const cityData = actualData.personalInfo.contactInfo.city
      
      if (countryData.show && countryData.value) {
        let locationText = countryData.value
        if (cityData.show && cityData.value) {
          locationText += `, ${cityData.value}`
        }
        contactLines.push(locationText)
      } else if (cityData.show && cityData.value) {
        contactLines.push(cityData.value)
      }
      
      Object.entries(actualData.personalInfo.contactInfo).forEach(([key, info]) => {
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

      // ========== OPTIMIZED SECTIONS ==========
      if (actualData.summary) {
        addSectionTitle(translations.professionalSummary)
        addText(actualData.summary, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (actualData.skills.length > 0) {
        addSectionTitle(translations.coreCompetencies)
        const skillsText = actualData.skills.map(skill => `• ${skill}`).join('  ')
        addText(skillsText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (actualData.tools.length > 0) {
        addSectionTitle(translations.toolsTech)
        const toolsText = actualData.tools.map(tool => `• ${tool}`).join('  ')
        addText(toolsText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (actualData.experience.enabled && actualData.experience.items.length > 0) {
        addSectionTitle(translations.professionalExperience)
        
        actualData.experience.items.forEach((exp, index) => {
          const jobTitle = `${exp.position} | ${exp.company}`;
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(jobTitle, margin, currentY)
          
          if (exp.period) {
            doc.setFontSize(9)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(exp.period)
            doc.text(exp.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 14

          if (exp.responsibilities.length > 0) {
            const validResponsibilities = exp.responsibilities.filter(r => r.trim())
            validResponsibilities.forEach(resp => {
              doc.setFontSize(10)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(85, 85, 85)
              
              const respText = `• ${resp}`
              const lines = doc.splitTextToSize(respText, usableWidth)
              
              if (currentY + (lines.length * 10 * 1.1) > pageHeight - margin) {
                doc.addPage()
                currentY = 50
              }
              
              doc.text(lines, margin, currentY)
              currentY += lines.length * 10 * 1.1 + 1
            })
          }
          
          if (index < actualData.experience.items.length - 1) {
            currentY += 12  // More space between experience items
          }
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (actualData.education.length > 0) {
        addSectionTitle(translations.education)
        
        actualData.education.forEach(edu => {
          const eduText = `• ${edu.level} en ${edu.degree} – ${edu.university}`
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(85, 85, 85)
          doc.text(eduText, margin, currentY)
          
          if (edu.period) {
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(edu.period)
            doc.text(edu.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 12
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (actualData.certifications.enabled && actualData.certifications.items.length > 0) {
        addSectionTitle(translations.certifications)
        
        actualData.certifications.items.forEach(cert => {
          const certText = `• ${cert.name} – ${cert.institution}, ${cert.year}`
          addText(certText, 10, false, 'gray')
          currentY += 1
        })
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (actualData.languages.length > 0) {
        addSectionTitle(translations.languages)
        const languagesText = actualData.languages.map(lang => `• ${lang.language}: ${lang.level}`).join('  ')
        addText(languagesText, 10, false, 'gray')
        currentY += 8  // Double spacing like mb-6 in preview
      }

      if (actualData.references.enabled && actualData.references.items.length > 0) {
        addSectionTitle(translations.references)
        
        actualData.references.items.forEach(ref => {
          const refText = `• ${ref.name} – ${ref.company}, ${ref.phone}`
          addText(refText, 10, false, 'gray')
          currentY += 1
        })
      }

      // Generate filename
      const fileName = `CV_${actualData.personalInfo.firstName}_${actualData.personalInfo.lastName}_${language}_PAID.pdf`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')

      // Download PDF directly - NO action recording since payment was already processed
      doc.save(fileName)
      
      console.log(`✅ Paid download completed: ${fileName}`)
      return true
    } catch (error) {
      console.error('Error generating PDF after payment:', error)
      throw error
    }
  }

  return (
    <div className="space-y-6">
      {/* Download Controls - Simplified */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          {/* Mobile: Simple layout */}
          <div className="block md:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Descargar CV</span>
              {getPlanBadge()}
            </div>
            
            {/* Status for mobile */}
            <div className="text-xs text-gray-600 mb-3">
              {isLoading ? "Verificando..." : 
               error ? <span className="text-red-600">{error}</span> :
               isLifetimeUser || isProUser ? (
                 <span className="text-green-600">✨ Acceso ilimitado</span>
               ) : hasFullFeatureAccess ? (
                 <span className="text-green-600">
                   {remainingFreeDownloads} descargas gratuitas restantes
                 </span>
               ) : (
                 <span className="text-orange-600">
                   ❌ Sin descargas disponibles - Necesitas pagar $1.99 por descarga
                 </span>
               )}
            </div>

            {/* Simple mobile message */}
            {!isComplete ? (
              <p className="text-xs text-amber-600">
                ⚠️ Completa tu CV para habilitar descargas
              </p>
            ) : hasFullFeatureAccess || isLifetimeUser || isProUser ? (
              <p className="text-xs text-gray-600">
                ✅ Usa los botones del header para descargar
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-orange-600 mb-3">
                  💳 Tienes 2 opciones para continuar:
                </p>
                
                {/* Individual Payment Option */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Opción 1: Pago por descarga</span>
                    <span className="text-lg font-bold text-blue-800">$1.99</span>
                  </div>
                  <p className="text-xs text-blue-600 mb-3">
                    Paga solo por esta descarga específica
                  </p>
                  <Button
                    onClick={() => {
                      setPendingDownload({ language: 'spanish', price: 1.99 })
                      setShowPaymentModal(true)
                    }}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    💳 Pagar $1.99 ahora
                  </Button>
                </div>

                {/* Lifetime Upgrade Option */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-yellow-800">Opción 2: Acceso ilimitado</span>
                    <div className="text-right">
                      <span className="text-xs text-yellow-600 line-through">$99.99</span>
                      <span className="text-lg font-bold text-yellow-800 ml-1">$59.99</span>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-600 mb-3">
                    🚀 Descargas ilimitadas + todas las funciones IA
                  </p>
                  <Button
                    onClick={() => window.location.href = '/checkout?plan=LIFETIME'}
                    size="sm"
                    variant="outline"
                    className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  >
                    ⭐ Upgrade a Lifetime
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop: More detailed layout */}
          <div className="hidden md:block">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-medium text-gray-700">Descargar CV</h3>
                {isAuthenticated && (
                  <Badge variant="outline" className="text-xs">
                    Sesión activa
                  </Badge>
                )}
              </div>
              {getPlanBadge()}
            </div>
            
            {/* Status message */}
            <div className="mb-3 text-xs text-gray-600">
              {isLoading && "Verificando límites..."}
              {error && <span className="text-red-600">{error}</span>}
              {!isLoading && !error && (
                <>
                  {isLifetimeUser || isProUser ? (
                    <span className="text-green-600">✨ Acceso ilimitado</span>
                  ) : hasFullFeatureAccess ? (
                    <span className="text-blue-800">
                      Plan Freemium - Acceso completo hasta 3 descargas - {remainingFreeDownloads} restantes
                    </span>
                  ) : (
                    <span className="text-orange-600">
                      ❌ Sin descargas disponibles - $1.99 por descarga adicional
                    </span>
                  )}
                </>
              )}
            </div>
            
            {/* Desktop buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              <Button 
                onClick={() => handleDownload('spanish')}
                disabled={isGeneratingPDF || !isComplete}
                size="sm"
                className="flex items-center gap-2"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>
                  {!isComplete ? 'CV Incompleto' : 
                   hasFullFeatureAccess || isLifetimeUser || isProUser ? 'PDF (ES)' :
                   `PDF (ES) $${downloadPrice || '1.99'}`}
                </span>
              </Button>

              <Button 
                onClick={() => handleDownload('english')}
                disabled={isGeneratingPDF || !isComplete || isTranslating}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                title={
                  !isComplete ? "CV debe estar 100% completo para traducir" :
                  showEnglishVersion ? "Descargar PDF en inglés" :
                  isLifetimeUser || isProUser ? "Traducir CV al inglés con IA - Acceso ilimitado" :
                  hasFullFeatureAccess ? "Traducir CV al inglés con IA - Gratis (cuenta como 1 descarga)" :
                  `Traducir CV al inglés con IA - $${downloadPrice || '1.99'}`
                }
              >
                {isTranslating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span>
                  {isTranslating ? 'Traduciendo...' :
                   !isComplete ? 'CV Incompleto' :
                   showEnglishVersion ? 'PDF (EN)' :
                   isLifetimeUser || isProUser ? '🤖 Traducir al Inglés' :
                   hasFullFeatureAccess ? '🤖 Traducir al Inglés Gratis' :
                   `🤖 Traducir al Inglés $${downloadPrice || '1.99'}`}
                </span>
                <Crown className="w-3 h-3 text-yellow-500" />
              </Button>

              {/* Payment Options for users without access */}
              {!hasFullFeatureAccess && !isLifetimeUser && !isProUser && isAuthenticated && (
                <>
                  <div className="w-full border-t border-gray-200 my-2"></div>
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Individual Payment */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-center">
                        <p className="text-sm font-medium text-blue-800 mb-1">Pago por descarga</p>
                        <p className="text-2xl font-bold text-blue-800 mb-2">$1.99</p>
                        <Button
                          onClick={() => {
                            setPendingDownload({ language: 'spanish', price: 1.99 })
                            setShowPaymentModal(true)
                          }}
                          size="sm"
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          💳 Pagar ahora
                        </Button>
                      </div>
                    </div>
                    
                    {/* Lifetime Upgrade */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-center">
                        <p className="text-sm font-medium text-yellow-800 mb-1">Acceso ilimitado</p>
                        <div className="mb-2">
                          <span className="text-sm text-yellow-600 line-through">$99.99</span>
                          <span className="text-2xl font-bold text-yellow-800 ml-1">$59.99</span>
                        </div>
                        <Button
                          onClick={() => window.location.href = '/checkout?plan=LIFETIME'}
                          size="sm"
                          variant="outline"
                          className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        >
                          ⭐ Upgrade
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Legacy lifetime button for users with some activity */}
              {isAuthenticated && userStats && userStats.stats.totalActions > 0 && !isLifetimeUser && !isProUser && hasFullFeatureAccess && (
                <Button
                  onClick={() => window.location.href = '/checkout?plan=LIFETIME'}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                >
                  <Crown className="w-3 h-3" />
                  <span>Lifetime $59.99</span>
                </Button>
              )}
            </div>

            {!isComplete && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ Completa tu CV para habilitar descargas
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CV Preview */}
      <div className="bg-white rounded-lg shadow-sm border p-8 max-w-4xl mx-auto">
        {/* Use translated data when available */}
        {(() => {
          const currentData = showEnglishVersion && translatedData ? translatedData : data
          
          return (
            <>
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2" style={headerStyle}>
                  {currentData.personalInfo.firstName} {currentData.personalInfo.lastName}
                </h1>
                {currentData.personalInfo.titles.length > 0 && (
                  <p className="text-xl text-gray-600 mb-4">
                    {currentData.personalInfo.titles.join(' | ')}
                  </p>
                )}
                <p className="text-gray-600 text-sm">
                  {formatContactInfo()}
                </p>
              </div>

              {/* Professional Summary */}
              {currentData.summary && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                    {translations.professionalSummary}
                  </h3>
                  <p className="text-gray-700">{currentData.summary}</p>
                </div>
              )}

              {/* Core Competencies */}
              {currentData.skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                    {translations.coreCompetencies}
                  </h3>
                  <div className="text-gray-700">
                    {currentData.skills.map((skill, index) => (
                      <span key={index}>
                        • {skill}
                        {index < currentData.skills.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools & Technologies */}
              {currentData.tools.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                    {translations.toolsTech}
                  </h3>
                  <div className="text-gray-700">
                    {currentData.tools.map((tool, index) => (
                      <span key={index}>
                        • {tool}
                        {index < currentData.tools.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Professional Experience */}
              {currentData.experience.enabled && currentData.experience.items && currentData.experience.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                    {translations.professionalExperience}
                  </h3>
                  <div className="space-y-4">
                    {currentData.experience.items.map((exp, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {exp.position} | {exp.company}
                          </h4>
                          <span className="text-sm text-gray-600">{exp.period}</span>
                        </div>
                        {exp.responsibilities.length > 0 && (
                          <ul className="text-gray-700 space-y-1">
                            {exp.responsibilities
                              .filter((r) => r.trim())
                              .map((resp, respIndex) => (
                                <li key={respIndex}>• {resp}</li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {currentData.education.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                    {translations.education}
                  </h3>
                  <div className="space-y-2">
                    {currentData.education.map((edu, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-700">
                          • {edu.level} en {edu.degree} – {edu.university}
                        </span>
                        <span className="text-sm text-gray-600">{edu.period}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {currentData.certifications.enabled && currentData.certifications.items && currentData.certifications.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                    {translations.certifications}
                  </h3>
                  <div className="space-y-2">
                    {currentData.certifications.items.map((cert, index) => (
                      <div key={index} className="text-gray-700">
                        • {cert.name} – {cert.institution}, {cert.year}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {currentData.languages.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                    {translations.languages}
                  </h3>
                  <div className="text-gray-700">
                    {currentData.languages.map((lang, index) => (
                      <span key={index}>
                        • {lang.language}: {lang.level}
                        {index < currentData.languages.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* References */}
              {currentData.references.enabled && currentData.references.items && currentData.references.items.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                    {translations.references}
                  </h3>
                  <div className="space-y-2">
                    {currentData.references.items.map((ref, index) => (
                      <div key={index} className="text-gray-700">
                        • {ref.name} – {ref.company}, {ref.phone}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* Payment Modal for Individual Downloads */}
      {showPaymentModal && pendingDownload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Descarga Adicional</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePaymentCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">
                  Descarga en {pendingDownload.language === 'english' ? 'Inglés' : 'Español'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ${pendingDownload.price.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pago único • Descarga inmediata
                </p>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>• ✅ Descarga inmediata después del pago</p>
                <p>• ✅ CV optimizado para sistemas ATS</p>
                <p>• ✅ Pago seguro con Stripe</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handlePaymentCancel}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={processIndividualPayment}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={stripePayment.isLoading}
                >
                  {stripePayment.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pagar ${pendingDownload.price.toFixed(2)}
                    </>
                  )}
                </Button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  ¿Descargas frecuentes?{' '}
                  <button
                    onClick={() => {
                      window.location.href = '/checkout?plan=LIFETIME'
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Upgrade a Lifetime $59.99
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Individual Payment Modal */}
      {showIndividualPaymentModal && individualPaymentData && (
        <PaymentModal
          isOpen={showIndividualPaymentModal}
          individualPayment={{
            amount: individualPaymentData.amount,
            language: individualPaymentData.language,
            description: `Descarga individual de CV en ${individualPaymentData.language === 'english' ? 'inglés' : 'español'}`
          }}
          onSuccess={handleIndividualPaymentSuccess}
          onClose={() => {
            setShowIndividualPaymentModal(false)
            setIndividualPaymentData(null)
          }}
        />
      )}
    </div>
  )
}
