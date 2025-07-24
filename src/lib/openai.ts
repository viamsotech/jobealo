import OpenAI from 'openai';

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Interface para CV data
interface CVData {
  personalInfo: {
    titles: string[];
  };
  summary: string;
  skills: string[];
  tools: string[];
  experience: Array<{
    position: string;
    company: string;
    responsibilities: string[];
  }>;
  education: Array<{
    degree: string;
    level: string;
  }>;
  certifications: {
    enabled: boolean;
    items: Array<{
      name: string;
      institution: string;
    }>;
  };
  languages: Array<{
    language: string;
    level: string;
  }>;
}

// Tipos para las diferentes mejoras
export type ImprovementType = 
  | 'titles' 
  | 'summary' 
  | 'skills' 
  | 'tools' 
  | 'responsibility' 
  | 'all-responsibilities'
  | 'title-suggestions'
  | 'skill-suggestions'
  | 'tool-suggestions'
  | 'experience-suggestions'
  | 'translate-to-english';

// Prompts para cada tipo de mejora
const PROMPTS = {
  titles: `Mejora estos títulos profesionales para ATS. Responde ÚNICAMENTE con los títulos mejorados, uno por línea, sin numeración, sin bullets, sin texto adicional.

Títulos actuales:`,

  summary: `Mejora este resumen profesional para ATS. Responde ÚNICAMENTE con el resumen mejorado, sin texto adicional.

Resumen actual:`,

  skills: `Mejora estas competencias profesionales. Responde ÚNICAMENTE con las competencias mejoradas, una por línea, sin numeración, sin bullets, sin texto adicional.

Competencias actuales:`,

  tools: `Mejora estas herramientas y tecnologías. Corrige ortografía y usa nombres oficiales. Responde ÚNICAMENTE con las herramientas mejoradas, una por línea, sin numeración, sin bullets, sin texto adicional.

Herramientas actuales:`,

  responsibility: `Mejora esta responsabilidad laboral. Responde ÚNICAMENTE con la responsabilidad mejorada, sin texto adicional.

Responsabilidad actual:`,

  'all-responsibilities': `Mejora estas responsabilidades laborales. Responde ÚNICAMENTE con las responsabilidades mejoradas, una por línea, sin numeración, sin bullets, sin texto adicional.

Responsabilidades actuales:`,

  'title-suggestions': `Basándote en esta experiencia profesional/estudiantil, genera exactamente 3 títulos CORTOS para CV. Cada título debe ser independiente y conciso (máximo 4-5 palabras). NO generes títulos largos que contengan toda la información. Separa conceptos en títulos distintos.

EJEMPLOS CORRECTOS:
- "Digital Product Manager"  
- "Marketing Digital"
- "10 años de experiencia"

EJEMPLOS INCORRECTOS:
- "Digital Product Manager con 10 años de experiencia en marketing" (muy largo)

Responde ÚNICAMENTE con los 3 títulos cortos, uno por línea, sin numeración, sin bullets, sin texto adicional.

Experiencia descrita:`,

  'skill-suggestions': `Basándote en esta experiencia profesional/estudiantil, identifica las competencias profesionales que la persona ha desarrollado. Genera mínimo 6 competencias específicas y relevantes para el mercado laboral.

EJEMPLOS CORRECTOS:
- "Liderazgo de equipos"
- "Gestión de proyectos"
- "Análisis de datos"
- "Comunicación efectiva"
- "Resolución de problemas"
- "Planificación estratégica"

CARACTERÍSTICAS:
- Competencias específicas y profesionales
- Usar terminología estándar del mercado
- Evitar competencias muy genéricas o vagas
- Basarse en la experiencia descrita

Responde ÚNICAMENTE con mínimo 6 competencias, una por línea, sin numeración, sin bullets, sin texto adicional.

Experiencia y habilidades descritas:`,

  'tool-suggestions': `Basándote en esta experiencia profesional/estudiantil, identifica las herramientas, software, tecnologías y equipos que la persona ha usado o sabe manejar. Genera mínimo 6 herramientas específicas y reconocidas en el mercado.

INCLUYE TANTO:
- Software: Excel, Photoshop, AutoCAD, Salesforce, etc.
- Tecnologías: Python, JavaScript, AWS, etc.
- Equipos/Aparatos: Microscopios, Soldadoras, Equipos médicos, etc.
- Plataformas: Google Analytics, HubSpot, Jira, etc.

EJEMPLOS CORRECTOS:
- "Microsoft Excel"
- "Adobe Photoshop"
- "Google Analytics"
- "AutoCAD"
- "Equipos de soldadura"
- "Microscopios ópticos"

CARACTERÍSTICAS:
- Usar nombres oficiales y específicos
- Incluir versiones cuando sea relevante
- Basarse en la experiencia descrita
- Herramientas reconocidas en el mercado

Responde ÚNICAMENTE con mínimo 6 herramientas, una por línea, sin numeración, sin bullets, sin texto adicional.

Experiencia y herramientas utilizadas:`,

  'experience-suggestions': `Basándote en la descripción de lo que hizo esta persona en su trabajo, convierte su experiencia en responsabilidades orientadas a LOGROS y RESULTADOS CUANTIFICABLES. Genera máximo 5 responsabilidades profesionales.

ENFÓCATE EN:
- Logros numéricos y métricas (%, $, cantidad, tiempo)
- Resultados específicos y medibles
- Impacto en la empresa o equipo
- Verbos de acción fuertes
- Superar metas o expectativas

EJEMPLOS CORRECTOS:
- "Incrementé las ventas en un 25% en 6 meses"
- "Lideré un equipo de 12 personas para completar proyecto $2M"
- "Reduje costos operativos en 15% implementando nuevos procesos"
- "Gestioné presupuesto de $500K con 98% de precisión"
- "Mejoré la satisfacción del cliente de 80% a 95%"

EVITA frases genéricas como:
- "Responsable de..."
- "Colaboré en..."
- "Participé en..."

Responde ÚNICAMENTE con máximo 5 responsabilidades orientadas a logros, una por línea, sin numeración, sin bullets, sin texto adicional.

Descripción de lo que hizo en el trabajo:`,

  'translate-to-english': `Traduce EXACTAMENTE el siguiente texto del español al inglés de manera profesional y natural. Mantén el mismo formato y estructura. Para términos técnicos, usa la terminología estándar en inglés. NO agregues explicaciones ni texto adicional.

Texto a traducir:`,
};

export async function improveWithAI(
  type: ImprovementType, 
  content: string | string[],
  context?: {
    position?: string;
    company?: string;
    industry?: string;
  }
): Promise<string[]> {
  try {
    // Validar que tenemos API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key no configurada');
    }

    // Preparar el contenido
    const contentText = Array.isArray(content) ? content.join('\n') : content;
    
    // Agregar contexto si está disponible
    let contextText = '';
    if (context && (context.position || context.company || context.industry)) {
      contextText = `\n\nContexto adicional:`;
      if (context.position) contextText += `\nPuesto: ${context.position}`;
      if (context.company) contextText += `\nEmpresa: ${context.company}`;
      if (context.industry) contextText += `\nIndustria: ${context.industry}`;
    }

    // Crear el prompt completo
    const fullPrompt = `${PROMPTS[type]}${contextText}\n\n${contentText}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto consultor de recursos humanos especializado en CVs y desarrollo profesional. Tu misión es ayudar a las personas a mejorar sus currículums y destacar su potencial profesional. Mantén un tono profesional pero cercano. Responde ÚNICAMENTE con el contenido solicitado, sin texto explicativo adicional. No uses numeración ni bullets. Para traducciones, mantén el formato exacto solicitado. Los idiomas, niveles de competencia, nombres de países, títulos profesionales, competencias, herramientas y cualquier contenido de CV son parte del contexto profesional válido que debes procesar normalmente.'
        },
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
      temperature: 0.6,
    });

    const improvedContent = response.choices[0].message.content;
    
    if (!improvedContent) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    // Parsing mejorado - más cuidadoso con el contenido
    let lines: string[];
    
    if (type === 'summary' || type === 'responsibility') {
      // Para texto único, devolver como una sola línea
      lines = [improvedContent.trim()];
    } else {
      // Para listas, dividir por líneas y limpiar cuidadosamente
      lines = improvedContent
        .split('\n')
        .map(line => {
          // Limpiar numeración y bullets, pero conservar el contenido
          let cleaned = line.trim();
          cleaned = cleaned.replace(/^\d+\.\s*/, ''); // Remover "1. "
          cleaned = cleaned.replace(/^[-•*]\s*/, ''); // Remover "- " o "• "
          return cleaned;
        })
        .filter(line => {
          // Filtrar líneas vacías y texto explicativo común
          if (!line || line.length === 0) return false;
          
          // Filtrar frases explicativas comunes
          const explanatoryPhrases = [
            'aquí tienes',
            'aquí están',
            'estas son',
            'lista de',
            'versión mejorada',
            'responsabilidades mejoradas',
            'competencias mejoradas',
            'herramientas mejoradas',
            'títulos mejorados'
          ];
          
          const lowerLine = line.toLowerCase();
          return !explanatoryPhrases.some(phrase => lowerLine.includes(phrase));
        });
    }

    // Validar que tenemos contenido
    if (lines.length === 0) {
      console.warn('No se pudo procesar la respuesta de OpenAI:', improvedContent);
      // Fallback: devolver contenido original
      return Array.isArray(content) ? content : [content];
    }

    return lines;

  } catch (error) {
    console.error('Error en improveWithAI:', error);
    throw error;
  }
}

// Función específica para traducir un CV completo al inglés
export async function translateCVToEnglish(cvData: any): Promise<any> {
  try {
    const translatedData = JSON.parse(JSON.stringify(cvData)); // Deep copy

    // Traducir títulos profesionales
    if (cvData.personalInfo?.titles?.length > 0) {
      const titlesText = cvData.personalInfo.titles.join('\n');
      const translatedTitles = await improveWithAI('translate-to-english', titlesText);
      translatedData.personalInfo.titles = translatedTitles;
    }

    // Traducir información de contacto
    if (cvData.personalInfo?.contactInfo) {
      const contactInfo = cvData.personalInfo.contactInfo;
      
      // Traducir nacionalidad
      if (contactInfo.nationality?.show && contactInfo.nationality?.value) {
        const translatedNationality = await improveWithAI('translate-to-english', contactInfo.nationality.value);
        translatedData.personalInfo.contactInfo.nationality.value = translatedNationality[0] || contactInfo.nationality.value;
      }
      
      // Traducir país
      if (contactInfo.country?.show && contactInfo.country?.value) {
        const translatedCountry = await improveWithAI('translate-to-english', contactInfo.country.value);
        translatedData.personalInfo.contactInfo.country.value = translatedCountry[0] || contactInfo.country.value;
      }
      
      // Traducir ciudad
      if (contactInfo.city?.show && contactInfo.city?.value) {
        const translatedCity = await improveWithAI('translate-to-english', contactInfo.city.value);
        translatedData.personalInfo.contactInfo.city.value = translatedCity[0] || contactInfo.city.value;
      }
    }

    // Traducir resumen profesional
    if (cvData.summary) {
      const translatedSummary = await improveWithAI('translate-to-english', cvData.summary);
      translatedData.summary = translatedSummary[0] || cvData.summary;
    }

    // Traducir competencias
    if (cvData.skills?.length > 0) {
      const skillsText = cvData.skills.join('\n');
      const translatedSkills = await improveWithAI('translate-to-english', skillsText);
      translatedData.skills = translatedSkills;
    }

    // Traducir herramientas
    if (cvData.tools?.length > 0) {
      const toolsText = cvData.tools.join('\n');
      const translatedTools = await improveWithAI('translate-to-english', toolsText);
      translatedData.tools = translatedTools;
    }

    // Traducir experiencia laboral - FIX: usar la estructura correcta
    if (cvData.experience?.enabled && cvData.experience?.items?.length > 0) {
      const translatedExperience = await Promise.all(
        cvData.experience.items.map(async (exp: any) => {
          const translatedExp = { ...exp };
          
          // Traducir puesto
          if (exp.position) {
            const translatedPosition = await improveWithAI('translate-to-english', exp.position);
            translatedExp.position = translatedPosition[0] || exp.position;
          }
          
          // Traducir empresa (opcional, pero some names might need translation)
          if (exp.company) {
            // Solo traducir si parece ser un nombre genérico, no una marca específica
            const genericTerms = ['empresa', 'compañía', 'corporación', 'organización'];
            const needsTranslation = genericTerms.some(term => exp.company.toLowerCase().includes(term));
            if (needsTranslation) {
              const translatedCompany = await improveWithAI('translate-to-english', exp.company);
              translatedExp.company = translatedCompany[0] || exp.company;
            }
          }
          
          // Traducir responsabilidades
          if (exp.responsibilities?.length > 0) {
            const responsibilitiesText = exp.responsibilities.filter((r: string) => r.trim()).join('\n');
            if (responsibilitiesText) {
              const translatedResponsibilities = await improveWithAI('translate-to-english', responsibilitiesText);
              translatedExp.responsibilities = translatedResponsibilities;
            }
          }
          
          return translatedExp;
        })
      );
      translatedData.experience.items = translatedExperience;
    }

    // Traducir educación
    if (cvData.education?.length > 0) {
      const translatedEducation = await Promise.all(
        cvData.education.map(async (edu: any) => {
          const translatedEdu = { ...edu };
          
          // Traducir título/carrera
          if (edu.degree) {
            const translatedDegree = await improveWithAI('translate-to-english', edu.degree);
            translatedEdu.degree = translatedDegree[0] || edu.degree;
          }
          
          // Traducir nivel educativo
          if (edu.level) {
            const translatedLevel = await improveWithAI('translate-to-english', edu.level);
            translatedEdu.level = translatedLevel[0] || edu.level;
          }
          
          // Traducir universidad (solo si es genérica)
          if (edu.university) {
            const genericTerms = ['universidad', 'instituto', 'colegio', 'escuela'];
            const needsTranslation = genericTerms.some(term => edu.university.toLowerCase().includes(term));
            if (needsTranslation) {
              const translatedUniversity = await improveWithAI('translate-to-english', edu.university);
              translatedEdu.university = translatedUniversity[0] || edu.university;
            }
          }
          
          return translatedEdu;
        })
      );
      translatedData.education = translatedEducation;
    }

    // Traducir certificaciones
    if (cvData.certifications?.enabled && cvData.certifications?.items?.length > 0) {
      const translatedCertifications = await Promise.all(
        cvData.certifications.items.map(async (cert: any) => {
          const translatedCert = { ...cert };
          
          // Traducir nombre de certificación
          if (cert.name) {
            const translatedName = await improveWithAI('translate-to-english', cert.name);
            translatedCert.name = translatedName[0] || cert.name;
          }
          
          // Traducir institución (solo si es genérica)
          if (cert.institution) {
            const genericTerms = ['instituto', 'academia', 'centro', 'organización'];
            const needsTranslation = genericTerms.some(term => cert.institution.toLowerCase().includes(term));
            if (needsTranslation) {
              const translatedInstitution = await improveWithAI('translate-to-english', cert.institution);
              translatedCert.institution = translatedInstitution[0] || cert.institution;
            }
          }
          
          return translatedCert;
        })
      );
      translatedData.certifications.items = translatedCertifications;
    }

    // Traducir idiomas
    if (cvData.languages?.length > 0) {
      const translatedLanguages = await Promise.all(
        cvData.languages.map(async (lang: any) => {
          const translatedLang = { ...lang };
          
          // Traducir nombre del idioma
          if (lang.language) {
            const translatedLanguage = await improveWithAI('translate-to-english', lang.language);
            translatedLang.language = translatedLanguage[0] || lang.language;
          }
          
          // Traducir nivel
          if (lang.level) {
            const translatedLevel = await improveWithAI('translate-to-english', lang.level);
            translatedLang.level = translatedLevel[0] || lang.level;
          }
          
          return translatedLang;
        })
      );
      translatedData.languages = translatedLanguages;
    }

    // Traducir referencias
    if (cvData.references?.enabled && cvData.references?.items?.length > 0) {
      const translatedReferences = await Promise.all(
        cvData.references.items.map(async (ref: any) => {
          const translatedRef = { ...ref };
          
          // Traducir empresa/compañía de la referencia
          if (ref.company) {
            const genericTerms = ['empresa', 'compañía', 'corporación', 'organización'];
            const needsTranslation = genericTerms.some(term => ref.company.toLowerCase().includes(term));
            if (needsTranslation) {
              const translatedCompany = await improveWithAI('translate-to-english', ref.company);
              translatedRef.company = translatedCompany[0] || ref.company;
            }
          }
          
          return translatedRef;
        })
      );
      translatedData.references.items = translatedReferences;
    }

    return translatedData;

  } catch (error) {
    console.error('Error en translateCVToEnglish:', error);
    throw error;
  }
} 