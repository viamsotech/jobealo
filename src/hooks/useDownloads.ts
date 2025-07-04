import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { generateFingerprint, type BrowserFingerprint } from '@/lib/fingerprint'
import jsPDF from 'jspdf'
import type { CVData } from '@/components/cv-builder'

interface DownloadLimitCheck {
  allowed: boolean
  remaining: number
  requiresRegistration: boolean
  requiresPayment: boolean
  price?: number
  userType: 'ANONYMOUS' | 'REGISTERED_FREEMIUM' | 'REGISTERED_PRO' | 'LIFETIME'
  downloadType: string
}

interface UserStats {
  totalDownloads: number
  freeSpanishUsed: number
  freeSpanishLimit: number
  paidDownloads: number
  plan: string
  memberSince?: Date
}

interface UseDownloadsReturn {
  // States
  fingerprint: BrowserFingerprint | null
  downloadCheck: DownloadLimitCheck | null
  userStats: UserStats | null
  isLoading: boolean
  error: string | null
  
  // Functions
  checkDownloadLimit: (language?: 'spanish' | 'english') => Promise<void>
  recordDownload: (options: {
    language?: 'spanish' | 'english'
    fileName?: string
    amountPaid?: number
    stripePaymentIntentId?: string
  }) => Promise<boolean>
  downloadPDF: (cvData: CVData, language?: 'spanish' | 'english') => Promise<boolean>
  refreshStats: () => Promise<void>
  checkFullAccess: () => Promise<boolean>
  
  // Computed values
  canDownload: boolean
  remainingFreeDownloads: number
  isLifetimeUser: boolean
  isProUser: boolean
  needsRegistration: boolean
  needsPayment: boolean
  downloadPrice?: number
  isGeneratingPDF: boolean
  hasFullFeatureAccess: boolean
  
  // Auth states
  isAuthenticated: boolean
  userPlan: string | null
}

export function useDownloads(): UseDownloadsReturn {
  const { data: session, status } = useSession()
  const [fingerprint, setFingerprint] = useState<BrowserFingerprint | null>(null)
  const [downloadCheck, setDownloadCheck] = useState<DownloadLimitCheck | null>(null)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [hasFullFeatureAccess, setHasFullFeatureAccess] = useState(false)

  // Generate fingerprint on mount
  useEffect(() => {
    async function initFingerprint() {
      try {
        setIsLoading(true)
        const fp = await generateFingerprint()
        setFingerprint(fp)
      } catch (err) {
        setError('Failed to initialize user tracking')
        console.error('Fingerprint generation error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initFingerprint()
  }, [])

  const checkDownloadLimitInternal = useCallback(async (
    language: 'spanish' | 'english' = 'spanish'
  ) => {
    if (!fingerprint) return

    try {
      const response = await fetch('/api/downloads/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fingerprint, 
          language, 
          userId: session?.user?.id 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to check download limits')
      }

      const data = await response.json()
      
      setDownloadCheck(data)
      setError(null)
    } catch (err) {
      setError('Failed to check download limits')
      console.error('Download limit check error:', err)
    }
  }, [fingerprint, session])

  // Function to fix fingerprint linking
  const fixFingerprintLinking = useCallback(async () => {
    if (!fingerprint || !session?.user?.id) return

    try {
      const response = await fetch('/api/user/fix-fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fingerprintHash: fingerprint.fingerprintHash 
        })
      })

      const data = await response.json()

      if (response.ok) {
        // After fixing, check download limits
        setTimeout(() => {
          checkDownloadLimitInternal('spanish')
        }, 1000)
      } else {
        console.error('❌ Failed to fix fingerprint:', data.error)
      }
    } catch (error) {
      console.error('❌ Error fixing fingerprint:', error)
    }
  }, [fingerprint, session?.user?.id, checkDownloadLimitInternal])

  const refreshStatsInternal = useCallback(async () => {
    if (!fingerprint) return

    try {
      const response = await fetch('/api/downloads/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fingerprint, 
          userId: session?.user?.id 
        })
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user stats')
      }

      const data = await response.json()
      setUserStats(data.stats)
    } catch (err) {
      console.error('Stats fetch error:', err)
    }
  }, [fingerprint, session])

  const checkFullAccessInternal = useCallback(async (): Promise<boolean> => {
    if (!fingerprint) return false

    try {
      const response = await fetch('/api/downloads/full-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fingerprint, 
          userId: session?.user?.id 
        })
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      const hasAccess = data.hasFullAccess
      setHasFullFeatureAccess(hasAccess)
      return hasAccess
    } catch (err) {
      console.error('Full access check error:', err)
      return false
    }
  }, [fingerprint, session])

  // Check download limits when fingerprint is ready or session changes
  useEffect(() => {
    if (fingerprint && status !== 'loading') {
      checkDownloadLimitInternal('spanish')
      refreshStatsInternal()
    }
  }, [fingerprint, session, status, refreshStatsInternal])

  // Force refresh when user logs in (to link fingerprint to user)
  useEffect(() => {
    if (fingerprint && session?.user?.id && status === 'authenticated') {
      // Fix fingerprint linking first, then check download limits
      fixFingerprintLinking()
    }
  }, [fingerprint, session?.user?.id, status, fixFingerprintLinking])

  const recordDownload = useCallback(async (options: {
    language?: 'spanish' | 'english'
    fileName?: string
    amountPaid?: number
    stripePaymentIntentId?: string
  }): Promise<boolean> => {
    if (!fingerprint) {
      setError('User fingerprint not ready')
      return false
    }

    const {
      language = 'spanish',
      fileName,
      amountPaid = 0,
      stripePaymentIntentId
    } = options

    try {
      const response = await fetch('/api/downloads/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fingerprint, 
          language, 
          fileName, 
          userId: session?.user?.id,
          amountPaid,
          stripePaymentIntentId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setError('Download limit exceeded')
        } else if (response.status === 402) {
          setError('Payment required for this download')
        } else if (response.status === 401) {
          setError('Registration required for this download')
        } else {
          setError(data.error || 'Failed to record download')
        }
        setDownloadCheck(data)
        return false
      }

      // Update local state with new limits
      setDownloadCheck(data)
      setError(null)
      
      // Refresh stats to show updated usage
      await refreshStatsInternal()
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to record download'
      setError(errorMessage)
      console.error('Download record error:', err)
      return false
    }
  }, [fingerprint, session, refreshStatsInternal])

  // Integrated PDF download with tracking
  const downloadPDF = useCallback(async (
    cvData: CVData, 
    language: 'spanish' | 'english' = 'spanish'
  ): Promise<boolean> => {
    if (!fingerprint) {
      setError('User fingerprint not ready')
      return false
    }

    // Verificar que estamos en el cliente
    if (typeof window === 'undefined') {
      setError('PDF generation only works in the browser')
      return false
    }

    setIsGeneratingPDF(true)
    
    try {
      // First check limits
      await checkDownloadLimitInternal(language)
      
      // If not allowed, show error
      if (downloadCheck && !downloadCheck.allowed) {
        if (downloadCheck.requiresRegistration) {
          setError('Registration required for this download')
        } else if (downloadCheck.requiresPayment) {
          setError(`Payment required: $${downloadCheck.price}`)
        } else {
          setError('Download not allowed')
        }
        return false
      }

      // Generate PDF using the same logic as usePDFDownload
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

      // Record download in Supabase BEFORE generating PDF
      const recordSuccess = await recordDownload({
        language,
        fileName
      })

      if (!recordSuccess) {
        return false // Recording failed, don't download
      }

      // Download PDF
      doc.save(fileName)
      
      return true
    } catch (error) {
      console.error('Error generating PDF:', error)
      setError('Error generating PDF. Please try again.')
      return false
    } finally {
      setIsGeneratingPDF(false)
    }
  }, [fingerprint, downloadCheck, checkDownloadLimitInternal, recordDownload])

  // Public functions
  const checkDownloadLimit = useCallback((language: 'spanish' | 'english' = 'spanish') => 
    checkDownloadLimitInternal(language), [checkDownloadLimitInternal])
  
  const refreshStats = useCallback(() => refreshStatsInternal(), [refreshStatsInternal])

  const checkFullAccess = useCallback(() => checkFullAccessInternal(), [checkFullAccessInternal])

  // Computed values
  const canDownload = downloadCheck?.allowed ?? false
  const remainingFreeDownloads = downloadCheck?.remaining ?? 0
  const isLifetimeUser = downloadCheck?.userType === 'LIFETIME'
  const isProUser = downloadCheck?.userType === 'REGISTERED_PRO'
  const needsRegistration = downloadCheck?.requiresRegistration ?? false
  const needsPayment = downloadCheck?.requiresPayment ?? false
  const downloadPrice = downloadCheck?.price
  const isAuthenticated = status === 'authenticated'
  const userPlan = session?.user?.plan || null

  return {
    fingerprint,
    downloadCheck,
    userStats,
    isLoading,
    error,
    checkDownloadLimit,
    recordDownload,
    downloadPDF,
    refreshStats,
    checkFullAccess,
    canDownload,
    remainingFreeDownloads,
    isLifetimeUser,
    isProUser,
    needsRegistration,
    needsPayment,
    downloadPrice,
    isGeneratingPDF,
    isAuthenticated,
    userPlan,
    hasFullFeatureAccess
  }
} 
