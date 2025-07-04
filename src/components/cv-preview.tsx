import type { CVData } from "@/components/cv-builder"
import { useDownloads } from "@/hooks/useDownloads"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Crown, AlertCircle, CheckCircle, Loader2, User } from "lucide-react"
import { useState } from "react"

interface CVPreviewProps {
  data: CVData
  isEnglishVersion?: boolean
  isComplete?: boolean
}

export function CVPreview({ data, isEnglishVersion = false, isComplete = true }: CVPreviewProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<'spanish' | 'english'>('spanish')
  
  const {
    downloadCheck,
    userStats,
    isLoading,
    error,
    canDownload,
    remainingFreeDownloads,
    isLifetimeUser,
    isProUser,
    needsRegistration,
    needsPayment,
    downloadPrice,
    downloadPDF,
    isGeneratingPDF,
    isAuthenticated,
    userPlan,
    hasFullFeatureAccess
  } = useDownloads()

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
    // Si necesita registro, redirigir a login
    if (needsRegistration && !isAuthenticated) {
      signIn()
      return
    }

    try {
      const success = await downloadPDF(data, language)
      if (success) {
        const message = language === 'english' ? 'CV downloaded successfully!' : '¡CV descargado exitosamente!'
        console.log(message)
      }
    } catch (error) {
      console.error('Download error:', error)
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

    if (isAuthenticated && userStats) {
      if (hasFullFeatureAccess) {
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Plan Freemium - Acceso completo hasta {userStats.freeSpanishLimit} descargas ({userStats.freeSpanishUsed} usadas)
            </div>
            {getPlanBadge()}
          </div>
        )
      } else {
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-4 h-4" />
              Acceso completo agotado - Necesitas plan Pro o Lifetime
            </div>
            {getPlanBadge()}
          </div>
        )
      }
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

  return (
    <div className="space-y-6">
      {/* Download Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Descargar CV
            {isAuthenticated && (
              <span className="text-sm font-normal text-gray-500">
                (Sesión activa)
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Selecciona el idioma y descarga tu CV profesional
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          {getDownloadStatus()}
          
          {/* Download Buttons */}
          <div className="space-y-4">
            {/* Spanish Download */}
            <div className="space-y-2">
              <Button 
                onClick={() => handleDownload('spanish')}
                disabled={isGeneratingPDF || !isComplete || (!canDownload && !needsRegistration && !needsPayment)}
                className="w-full flex items-center justify-center space-x-2"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : needsRegistration && !isAuthenticated ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{!isComplete ? 'Completa tu CV primero' : getButtonText('spanish')}</span>
                {canDownload && !needsRegistration && isComplete && <CheckCircle className="w-4 h-4 text-green-500" />}
              </Button>
              
              {/* Messages */}
              {!isComplete && (
                <p className="text-sm text-amber-600 text-center">
                  ⚠️ Completa todas las secciones obligatorias antes de descargar
                </p>
              )}
              {isComplete && needsRegistration && !isAuthenticated && (
                <p className="text-sm text-amber-600 text-center">
                  📝 Regístrate gratis para continuar con acceso completo
                </p>
              )}
              {isComplete && needsPayment && isAuthenticated && !hasFullFeatureAccess && (
                <p className="text-sm text-blue-600 text-center">
                  💳 Descarga adicional por ${downloadPrice} (acceso completo agotado)
                </p>
              )}
              {isComplete && hasFullFeatureAccess && !isLifetimeUser && !isProUser && (
                <p className="text-sm text-green-600 text-center">
                  🎉 Tienes acceso completo a todas las funciones hasta {userStats?.freeSpanishLimit || 2} descargas
                </p>
              )}
            </div>

            {/* English Download */}
            <div className="space-y-2">
              <Button 
                onClick={() => handleDownload('english')}
                disabled={isGeneratingPDF || !isComplete}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2"
              >
                {isGeneratingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{!isComplete ? 'Completa tu CV primero' : getButtonText('english')}</span>
                <Crown className="w-4 h-4 text-yellow-500" />
              </Button>
              
              {!isComplete && (
                <p className="text-sm text-amber-600 text-center">
                  ⚠️ Completa todas las secciones obligatorias antes de descargar
                </p>
              )}
              {isComplete && !(isLifetimeUser || isProUser) && (
                <p className="text-sm text-gray-600 text-center">
                  {hasFullFeatureAccess ? (
                    `🇺🇸 Descarga en inglés incluida en tu acceso completo (${remainingFreeDownloads} restantes)`
                  ) : (
                    `🇺🇸 Descarga en inglés ${!isAuthenticated ? 'requiere registro y pago' : 'requiere pago'}`
                  )}
                </p>
              )}
            </div>

            {/* Lifetime Upgrade Offer */}
            {isAuthenticated && userStats && userStats.totalDownloads > 0 && !isLifetimeUser && !isProUser && (
              <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4 text-center">
                <Crown className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-semibold text-yellow-800 mb-1">
                  🎉 ¡Oferta Especial!
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  Upgrade a Plan Lifetime por solo <strong>$59.99</strong>
                </p>
                <p className="text-xs text-yellow-600">
                  ✨ Descargas ilimitadas en español e inglés
                </p>
              </div>
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
    </div>
  )
}
