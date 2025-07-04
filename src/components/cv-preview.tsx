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

  // Traducciones de secciones
  const translations = {
    professionalSummary: isEnglishVersion ? "PROFESSIONAL SUMMARY" : "RESUMEN PROFESIONAL",
    coreCompetencies: isEnglishVersion ? "CORE COMPETENCIES" : "COMPETENCIAS PRINCIPALES", 
    toolsTech: isEnglishVersion ? "TOOLS & TECHNOLOGIES" : "HERRAMIENTAS & TECNOLOGÍAS",
    professionalExperience: isEnglishVersion ? "PROFESSIONAL EXPERIENCE" : "EXPERIENCIA PROFESIONAL",
    education: isEnglishVersion ? "EDUCATION" : "EDUCACIÓN",
    certifications: isEnglishVersion ? "CERTIFICATIONS" : "CERTIFICACIONES",
    languages: isEnglishVersion ? "LANGUAGES" : "IDIOMAS",
    references: isEnglishVersion ? "REFERENCES" : "REFERENCIAS",
    years: isEnglishVersion ? "years" : "años"
  }

  const formatContactInfo = () => {
    const contacts: string[] = []
    
    // Primero obtener country y city para manejar el formato especial
    const countryData = data.personalInfo.contactInfo.country
    const cityData = data.personalInfo.contactInfo.city
    
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
    Object.entries(data.personalInfo.contactInfo).forEach(([key, info]) => {
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
      // First check if action is allowed
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

      // If allowed, proceed with download
      const success = await downloadPDF(data, language)
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
      // Descargar automáticamente después del pago exitoso
      const success = await downloadPDF(data, pendingDownload.language)
      if (success) {
        const message = pendingDownload.language === 'english' ? 'CV downloaded successfully!' : '¡CV descargado exitosamente!'
        console.log(message)
      }
    } catch (error) {
      console.error('Download error after payment:', error)
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
    
    // Intentar descargar automáticamente después del pago exitoso
    if (individualPaymentData) {
      const language = individualPaymentData.language === 'english' ? 'english' : 'spanish'
      handleDownload(language)
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

  // Create downloadPDF function with complete logic
  const downloadPDF = async (cvData: CVData, language: 'spanish' | 'english') => {
    try {
      const actionType = language === 'english' ? 'DOWNLOAD_ENGLISH' : 'DOWNLOAD_SPANISH'
      const recordFunction = language === 'english' ? recordDownloadEnglish : recordDownloadSpanish
      
      // Verificar que estamos en el cliente
      if (typeof window === 'undefined') {
        throw new Error('PDF generation only works in the browser')
      }

      // Generate PDF using the complete logic from useDownloads
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF('p', 'pt', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 40
      const usableWidth = pageWidth - (margin * 2)
      let currentY = 60

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

      // Function to add text with wrapping
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
        if (currentY + (lines.length * fontSize * 1.2) > pageHeight - margin) {
          doc.addPage()
          currentY = 60
        }
        
        let x = margin
        if (align === 'center') {
          x = pageWidth / 2
        } else if (align === 'right') {
          x = pageWidth - margin
        }
        
        doc.text(lines, x, currentY, { align: align })
        currentY += lines.length * fontSize * 1.2 + 5
      }

      // Function to add section line with color
      const addSectionLine = () => {
        doc.setDrawColor(headerColor.r, headerColor.g, headerColor.b)
        doc.setLineWidth(1)
        doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5)
        currentY += 10
      }

      // Function to add section title
      const addSectionTitle = (title: string) => {
        currentY += 10
        addText(title, 14, true, 'header')
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

      // ========== HEADER ==========
      const headerStartY = currentY

      // Full name centered
      const fullName = `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      const nameWidth = doc.getTextWidth(fullName)
      doc.text(fullName, (pageWidth - nameWidth) / 2, headerStartY + 30)

      // Titles centered with text wrapping
      let titleLinesCount = 0
      if (cvData.personalInfo.titles.length > 0) {
        const titlesText = cvData.personalInfo.titles.join(' | ')
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(85, 85, 85)
        
        const titleLines = doc.splitTextToSize(titlesText, usableWidth)
        titleLinesCount = titleLines.length
        
        titleLines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line)
          const x = (pageWidth - lineWidth) / 2
          doc.text(line, x, headerStartY + 55 + (index * 16))
        })
      }

      // Contact info centered
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
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        
        const lines = doc.splitTextToSize(contactText, usableWidth)
        const contactStartY = headerStartY + 75 + (titleLinesCount > 1 ? (titleLinesCount - 1) * 16 : 0)
        
        lines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line)
          const x = (pageWidth - lineWidth) / 2
          doc.text(line, x, contactStartY + (index * 12))
        })
        
        currentY = Math.max(currentY, contactStartY + 15 + (lines.length - 1) * 12)
      } else {
        currentY = Math.max(currentY, headerStartY + 90 + (titleLinesCount > 1 ? (titleLinesCount - 1) * 16 : 0))
      }

      // ========== SECTIONS ==========
      if (cvData.summary) {
        addSectionTitle(translations.professionalSummary)
        addText(cvData.summary, 11, false, 'gray')
        currentY += 5
      }

      if (cvData.skills.length > 0) {
        addSectionTitle(translations.coreCompetencies)
        const skillsText = cvData.skills.map(skill => `• ${skill}`).join('  ')
        addText(skillsText, 11, false, 'gray')
        currentY += 5
      }

      if (cvData.tools.length > 0) {
        addSectionTitle(translations.toolsTech)
        const toolsText = cvData.tools.map(tool => `• ${tool}`).join('  ')
        addText(toolsText, 11, false, 'gray')
        currentY += 5
      }

      if (cvData.experience.enabled && cvData.experience.items.length > 0) {
        addSectionTitle(translations.professionalExperience)
        
        cvData.experience.items.forEach((exp, index) => {
          const jobTitle = `${exp.position} | ${exp.company}`;
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text(jobTitle, margin, currentY)
          
          if (exp.period) {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(exp.period)
            doc.text(exp.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 18

          if (exp.responsibilities.length > 0) {
            const validResponsibilities = exp.responsibilities.filter(r => r.trim())
            validResponsibilities.forEach(resp => {
              doc.setFontSize(11)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(85, 85, 85)
              
              const respText = `• ${resp}`
              const lines = doc.splitTextToSize(respText, usableWidth)
              
              if (currentY + (lines.length * 11 * 1.2) > pageHeight - margin) {
                doc.addPage()
                currentY = 60
              }
              
              doc.text(lines, margin, currentY)
              currentY += lines.length * 11 * 1.2 + 2
            })
          }
          
          if (index < cvData.experience.items.length - 1) {
            currentY += 10
          }
        })
        currentY += 5
      }

      if (cvData.education.length > 0) {
        addSectionTitle(translations.education)
        
        cvData.education.forEach(edu => {
          const eduText = `• ${edu.level} en ${edu.degree} – ${edu.university}`
          doc.setFontSize(11)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(85, 85, 85)
          doc.text(eduText, margin, currentY)
          
          if (edu.period) {
            doc.setFontSize(10)
            doc.setTextColor(100, 100, 100)
            const periodWidth = doc.getTextWidth(edu.period)
            doc.text(edu.period, pageWidth - margin - periodWidth, currentY)
          }
          
          currentY += 16
        })
        currentY += 5
      }

      if (cvData.certifications.enabled && cvData.certifications.items.length > 0) {
        addSectionTitle(translations.certifications)
        
        cvData.certifications.items.forEach(cert => {
          const certText = `• ${cert.name} – ${cert.institution}, ${cert.year}`
          addText(certText, 11, false, 'gray')
          currentY += 2
        })
        currentY += 5
      }

      if (cvData.languages.length > 0) {
        addSectionTitle(translations.languages)
        const languagesText = cvData.languages.map(lang => `• ${lang.language}: ${lang.level}`).join('  ')
        addText(languagesText, 11, false, 'gray')
        currentY += 5
      }

      if (cvData.references.enabled && cvData.references.items.length > 0) {
        addSectionTitle(translations.references)
        
        cvData.references.items.forEach(ref => {
          const refText = `• ${ref.name} – ${ref.company}, ${ref.phone}`
          addText(refText, 11, false, 'gray')
          currentY += 2
        })
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
      doc.save(fileName)
      
      return true
    } catch (error) {
      console.error('Error downloading PDF:', error)
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
                <p className="text-xs text-orange-600">
                  💳 Cada descarga adicional cuesta $1.99
                </p>
                {!isLifetimeUser && !isProUser && (
                  <Button
                    onClick={() => window.location.href = '/checkout?plan=LIFETIME'}
                    size="sm"
                    variant="outline"
                    className="w-full text-xs bg-yellow-50 border-yellow-300 text-yellow-700"
                  >
                    🚀 Upgrade a Lifetime $59.99 (Sin límites)
                  </Button>
                )}
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
                disabled={isGeneratingPDF || !isComplete}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="w-3 h-3" />
                <span>
                  {!isComplete ? 'CV Incompleto' :
                   isLifetimeUser || isProUser ? 'PDF (EN)' :
                   hasFullFeatureAccess ? 'PDF (EN) Gratis' :
                   `PDF (EN) $${downloadPrice || '1.99'}`}
                </span>
                <Crown className="w-3 h-3 text-yellow-500" />
              </Button>

              {isAuthenticated && userStats && userStats.stats.totalActions > 0 && !isLifetimeUser && !isProUser && (
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
      <div className="max-w-4xl mx-auto bg-white shadow-lg">
        <div className="p-8 space-y-6">
          {/* Header with Photo */}
          <div className="flex items-start space-x-6">
            {data.personalInfo.photo.enabled && data.personalInfo.photo.url && (
              <div className="flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-gray-200">
                  <img
                    src={data.personalInfo.photo.url || "/placeholder.svg"}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {data.personalInfo.firstName} {data.personalInfo.lastName}
              </h1>
              {data.personalInfo.titles.length > 0 && (
                <h2 className="text-lg font-semibold text-gray-700 break-words leading-relaxed">
                  {data.personalInfo.titles.join(" | ")}
                </h2>
              )}
              {formatContactInfo() && <p className="text-sm text-gray-600">{formatContactInfo()}</p>}
            </div>
          </div>

          {/* Professional Summary */}
          {data.summary && (
            <div>
              <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                {translations.professionalSummary}
              </h3>
              <p className="text-gray-700 leading-relaxed">{data.summary}</p>
            </div>
          )}

          {/* Core Competencies */}
          {data.skills.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                {translations.coreCompetencies}
              </h3>
              <div className="text-gray-700">
                {data.skills.map((skill, index) => (
                  <span key={index}>
                    • {skill}
                    {index < data.skills.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tools & Technologies */}
          {data.tools.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                {translations.toolsTech}
              </h3>
              <div className="text-gray-700">
                {data.tools.map((tool, index) => (
                  <span key={index}>
                    • {tool}
                    {index < data.tools.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Professional Experience */}
          {data.experience.enabled && data.experience.items && data.experience.items.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                {translations.professionalExperience}
              </h3>
              <div className="space-y-4">
                {data.experience.items.map((exp, index) => (
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
          {data.education.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                {translations.education}
              </h3>
              <div className="space-y-2">
                {data.education.map((edu, index) => (
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
          {data.certifications.enabled && data.certifications.items && data.certifications.items.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                {translations.certifications}
              </h3>
              <div className="space-y-2">
                {data.certifications.items.map((cert, index) => (
                  <div key={index} className="text-gray-700">
                    • {cert.name} – {cert.institution}, {cert.year}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-2 border-b pb-1" style={headerStyle}>
                {translations.languages}
              </h3>
              <div className="text-gray-700">
                {data.languages.map((lang, index) => (
                  <span key={index}>
                    • {lang.language}: {lang.level}
                    {index < data.languages.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {data.references.enabled && data.references.items && data.references.items.length > 0 && (
            <div>
              <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
                {translations.references}
              </h3>
              <div className="space-y-2">
                {data.references.items.map((ref, index) => (
                  <div key={index} className="text-gray-700">
                    • {ref.name} – {ref.company}, {ref.phone}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
