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
  stats: {
    downloads: number
    hasFullAccess: boolean
    remainingFreeDownloads: number
  }
  isLoading: boolean
  error: string | null
  downloadPDF: (data: CVData, language: 'spanish' | 'english') => Promise<boolean>
  hasFullFeatureAccess: boolean
  checkFullAccess: () => Promise<boolean>
  fixFingerprintLinking: () => Promise<boolean>
  isAuthenticated: boolean
  userPlan: string | null
  
  // Legacy properties used by components
  downloadCheck: DownloadLimitCheck | null
  userStats: UserStats | null
  isLifetimeUser: boolean
  isProUser: boolean
  isGeneratingPDF: boolean
  remainingFreeDownloads: number
  canDownload: boolean
  needsRegistration: boolean
  needsPayment: boolean
  downloadPrice?: number
  
  // New functions
  checkIndividualPayment: (sessionId: string) => Promise<boolean>
  checkPaidDownload: () => Promise<{ isPaid: boolean; language: string | null }>
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
  const [remainingFreeDownloads, setRemainingFreeDownloads] = useState(0)

  // Generate fingerprint on mount
  useEffect(() => {
    async function initFingerprint() {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
          console.warn('Downloads: Fingerprinting not available in server environment')
          return
        }

        // Check if required APIs are available
        if (!navigator || !screen || !crypto || !crypto.subtle) {
          console.warn('Downloads: Required browser APIs not available for fingerprinting')
          return
        }

        const fp = await generateFingerprint()
        setFingerprint(fp)
      } catch (err) {
        console.warn('Downloads: Error generating fingerprint (will use fallback):', err)
        // Don't throw, just log the error and continue without fingerprint
      }
    }

    initFingerprint()
  }, [])

  // Check download limits - made more robust
  const checkDownloadLimitInternal = useCallback(async () => {
    // For authenticated users, we can work without fingerprint
    const userIdentifier = session?.user?.id || fingerprint?.fingerprintHash
    
    if (!userIdentifier) {
      console.warn('Downloads: No user identifier available, using default limits')
      setDownloadCheck({
        allowed: false,
        remaining: 3,
        requiresRegistration: !session?.user,
        requiresPayment: false,
        price: 1.99,
        userType: 'ANONYMOUS',
        downloadType: 'FREE_SPANISH'
      })
      return
    }

    try {
      const response = await fetch('/api/downloads/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: fingerprint?.fingerprintHash || 'anonymous',
          userId: session?.user?.id || null
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to check download limits')
      }

      setDownloadCheck(data)
    } catch (error) {
      console.warn('Downloads: Error checking limits, using defaults:', error)
      setDownloadCheck({
        allowed: false,
        remaining: session?.user ? 3 : 0,
        requiresRegistration: !session?.user,
        requiresPayment: false,
        price: 1.99,
        userType: session?.user ? 'REGISTERED_PRO' : 'ANONYMOUS',
        downloadType: 'FREE_SPANISH'
      })
    }
  }, [fingerprint, session])

  // Function to fix fingerprint linking - made more robust
  const fixFingerprintLinking = useCallback(async (): Promise<boolean> => {
    if (!fingerprint || !session?.user?.id) {
      console.warn('Downloads: Cannot fix fingerprint linking - missing fingerprint or user')
      return false
    }

    try {
      const response = await fetch('/api/user/fix-fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          fingerprintHash: fingerprint.fingerprintHash
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Fingerprint linking fixed successfully')
        // Refresh download limits after fixing
        await checkDownloadLimitInternal()
        return true
      } else {
        console.warn('❌ Failed to fix fingerprint:', data.error)
        return false
      }
    } catch (error) {
      console.warn('❌ Error fixing fingerprint:', error)
      return false
    }
  }, [fingerprint, session?.user?.id, checkDownloadLimitInternal])

  // Refresh download statistics - made more robust
  const refreshStatsInternal = useCallback(async () => {
    // For authenticated users, we can work without fingerprint
    const userIdentifier = session?.user?.id || fingerprint?.fingerprintHash
    
    if (!userIdentifier) {
      console.warn('Downloads: No user identifier available for stats')
      return
    }

    try {
      const response = await fetch('/api/downloads/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: fingerprint?.fingerprintHash || 'anonymous',
          userId: session?.user?.id || null
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setUserStats(data)
      } else {
        console.warn('Downloads: Failed to fetch stats:', data.error)
      }
    } catch (error) {
      console.warn('Downloads: Error fetching stats:', error)
    }
  }, [fingerprint, session])

  // Check download limits when fingerprint is ready or session changes
  useEffect(() => {
    const userIdentifier = session?.user?.id || fingerprint?.fingerprintHash
    if (userIdentifier && status !== 'loading') {
      checkDownloadLimitInternal()
    }
  }, [fingerprint, session, status, checkDownloadLimitInternal])

  // Force refresh when user logs in (to link fingerprint to user)
  useEffect(() => {
    if (fingerprint && session?.user?.id && status === 'authenticated') {
      // Fix fingerprint linking first, then check download limits
      fixFingerprintLinking()
    }
  }, [fingerprint, session?.user?.id, status, fixFingerprintLinking])

  // Record download function - made more robust
  const recordDownload = useCallback(async (params: {
    language: 'spanish' | 'english',
    fileName: string,
    cvData: {
      name: string
      titles: string[]
    }
  }) => {
    const userIdentifier = session?.user?.id || fingerprint?.fingerprintHash
    
    if (!userIdentifier) {
      setError('Downloads: User identification not available')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('📝 Recording download...', params)

      const response = await fetch('/api/downloads/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: fingerprint?.fingerprintHash || 'anonymous',
          userId: session?.user?.id || null,
          language: params.language,
          fileName: params.fileName,
          cvData: params.cvData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record download')
      }

      console.log('✅ Download recorded successfully:', data)

      // Refresh stats and limits
      await Promise.all([
        refreshStatsInternal(),
        checkDownloadLimitInternal()
      ])

      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error recording download:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [fingerprint, session, refreshStatsInternal, checkDownloadLimitInternal])

  // Check full access function - made more robust
  const checkFullAccess = useCallback(async (): Promise<boolean> => {
    const userIdentifier = session?.user?.id || fingerprint?.fingerprintHash
    
    if (!userIdentifier) {
      setError('Downloads: User identification not available')
      return false
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/downloads/full-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint: fingerprint?.fingerprintHash || 'anonymous',
          userId: session?.user?.id || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check full access')
      }

      setHasFullFeatureAccess(data.hasFullAccess)
      setRemainingFreeDownloads(data.remainingFreeDownloads)

      console.log('✅ Full access check:', data)
      return data.hasFullAccess
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('Downloads: Error checking full access:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [fingerprint, session])

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
      await checkDownloadLimitInternal()
      
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

      // Generate PDF using OPTIMIZED styling to match preview
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
      const fileName = `CV_${cvData.personalInfo.firstName}_${cvData.personalInfo.lastName}_${language}.pdf`
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')

      // Record download in Supabase BEFORE generating PDF
      const recordSuccess = await recordDownload({
        language,
        fileName,
        cvData: {
          name: `${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName}`,
          titles: cvData.personalInfo.titles
        }
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
    checkDownloadLimitInternal(), [checkDownloadLimitInternal])
  
  const refreshStats = useCallback(() => refreshStatsInternal(), [refreshStatsInternal])

  const checkFullAccessInternal = useCallback(() => checkFullAccess(), [checkFullAccess])

  // Computed values
  const canDownload = downloadCheck?.allowed ?? false
  const isLifetimeUser = downloadCheck?.userType === 'LIFETIME'
  const isProUser = downloadCheck?.userType === 'REGISTERED_PRO'
  const needsRegistration = downloadCheck?.requiresRegistration ?? false
  const needsPayment = downloadCheck?.requiresPayment ?? false
  const downloadPrice = downloadCheck?.price
  const isAuthenticated = status === 'authenticated'
  const userPlan = session?.user?.plan || null

  // Función para verificar si se ha pagado por una descarga individual
  const checkIndividualPayment = async (sessionId: string) => {
    try {
      const response = await fetch('/api/stripe/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to verify payment')
      }

      const paymentDetails = await response.json()
      return paymentDetails.type === 'individual_download' && paymentDetails.paymentStatus === 'paid'
    } catch (error) {
      console.error('Error checking individual payment:', error)
      return false
    }
  }

  // Función para obtener parámetros de URL
  const getUrlParams = () => {
    if (typeof window === 'undefined') return {}
    
    const params = new URLSearchParams(window.location.search)
    return {
      sessionId: params.get('session_id'),
      type: params.get('type'),
      language: params.get('language')
    }
  }

  // Verificar si viene de un pago individual exitoso
  const checkPaidDownload = async () => {
    const { sessionId, type, language } = getUrlParams()
    
    if (sessionId && type === 'individual_download' && language) {
      const isPaid = await checkIndividualPayment(sessionId)
      if (isPaid) {
        // Permitir la descarga inmediatamente
        return { isPaid: true, language }
      }
    }
    
    return { isPaid: false, language: null }
  }

  return {
    stats: {
      downloads: userStats?.totalDownloads ?? 0,
      hasFullAccess: hasFullFeatureAccess,
      remainingFreeDownloads: remainingFreeDownloads
    },
    isLoading,
    error,
    downloadPDF,
    hasFullFeatureAccess,
    checkFullAccess: checkFullAccessInternal,
    fixFingerprintLinking,
    isAuthenticated,
    userPlan,
    downloadCheck,
    userStats,
    isLifetimeUser,
    isProUser,
    isGeneratingPDF,
    remainingFreeDownloads,
    canDownload,
    needsRegistration,
    needsPayment,
    downloadPrice,
    checkIndividualPayment,
    checkPaidDownload
  }
}