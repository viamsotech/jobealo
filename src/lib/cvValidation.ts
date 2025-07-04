import { CVData } from '@/components/cv-builder'

// Function to migrate old CV data structure to new format
export const migrateCVData = (cvData: any): CVData => {
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

// Function to validate section completion
export const validateSectionCompletion = (cvData: CVData) => {
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
export const getCompletedSectionsCount = (cvData: CVData) => {
  const validations = validateSectionCompletion(cvData)
  return Object.values(validations).filter(Boolean).length
}

// Function to get total sections count
export const getTotalSectionsCount = () => {
  return 11 // Total sections: nombre, título, contacto, resumen, competencias, herramientas, experiencia, educación, certificaciones, idiomas, referencias
}

// Function to check if CV is complete
export const isCVComplete = (cvData: CVData) => {
  const migratedData = migrateCVData(cvData)
  const completedSections = getCompletedSectionsCount(migratedData)
  const totalSections = getTotalSectionsCount()
  return completedSections >= totalSections
}

// Function to get completion percentage
export const getCompletionPercentage = (cvData: CVData) => {
  const migratedData = migrateCVData(cvData)
  const completedSections = getCompletedSectionsCount(migratedData)
  const totalSections = getTotalSectionsCount()
  return Math.round((completedSections / totalSections) * 100)
} 