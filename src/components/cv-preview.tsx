import type { CVData } from "@/components/cv-builder"

interface CVPreviewProps {
  data: CVData
  isEnglishVersion?: boolean
}

export function CVPreview({ data, isEnglishVersion = false }: CVPreviewProps) {
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

  const headerStyle = {
    color: data.headerColor,
    borderBottomColor: data.headerColor,
  }

  return (
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
        {data.experience.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3 border-b pb-1" style={headerStyle}>
              {translations.professionalExperience}
            </h3>
            <div className="space-y-4">
              {data.experience.map((exp, index) => (
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
        {data.certifications.enabled && data.certifications.items.length > 0 && (
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
        {data.references.enabled && data.references.items.length > 0 && (
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
  )
}
