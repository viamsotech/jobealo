import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { cvData, jobDescription, formality, personality } = await request.json()

    // Validate required fields
    if (!cvData || !jobDescription || !formality || !personality) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: cvData, jobDescription, formality, personality' },
        { status: 400 }
      )
    }

    // Validate CV data has minimum required fields
    if (!cvData.personalInfo?.firstName || !cvData.personalInfo?.lastName) {
      return NextResponse.json(
        { error: 'El CV debe tener al menos nombre y apellidos completos' },
        { status: 400 }
      )
    }

    // Format CV data for the prompt
    const formatCVForPrompt = (cv: any) => {
      let cvText = `Nombre: ${cv.personalInfo.firstName} ${cv.personalInfo.lastName}\n`
      
      if (cv.personalInfo.titles?.length > 0) {
        cvText += `Títulos profesionales: ${cv.personalInfo.titles.join(', ')}\n`
      }

      if (cv.summary) {
        cvText += `Resumen profesional: ${cv.summary}\n`
      }

      if (cv.skills?.length > 0) {
        cvText += `Competencias: ${cv.skills.join(', ')}\n`
      }

      if (cv.tools?.length > 0) {
        cvText += `Herramientas y tecnologías: ${cv.tools.join(', ')}\n`
      }

      if (cv.experience?.enabled && cv.experience?.items?.length > 0) {
        cvText += `Experiencia profesional:\n`
        cv.experience.items.forEach((exp: any, index: number) => {
          cvText += `${index + 1}. ${exp.position} en ${exp.company} (${exp.period})\n`
          if (exp.responsibilities?.length > 0) {
            exp.responsibilities.forEach((resp: string) => {
              if (resp.trim()) cvText += `   - ${resp}\n`
            })
          }
        })
      }

      if (cv.education?.length > 0) {
        cvText += `Educación:\n`
        cv.education.forEach((edu: any, index: number) => {
          cvText += `${index + 1}. ${edu.level} en ${edu.degree} - ${edu.university} (${edu.period})\n`
        })
      }

      if (cv.languages?.length > 0) {
        cvText += `Idiomas: ${cv.languages.map((lang: any) => `${lang.language} (${lang.level})`).join(', ')}\n`
      }

      if (cv.certifications?.enabled && cv.certifications?.items?.length > 0) {
        cvText += `Certificaciones:\n`
        cv.certifications.items.forEach((cert: any, index: number) => {
          cvText += `${index + 1}. ${cert.name} - ${cert.institution} (${cert.year})\n`
        })
      }

      return cvText
    }

    // Get tone descriptions
    const getFormalityDescription = (level: string) => {
      switch (level) {
        case 'informal': return 'informal y relajado'
        case 'semi-formal': return 'semi-formal, profesional pero accesible'
        case 'formal': return 'formal y muy profesional'
        case 'neutral': return 'neutral y equilibrado'
        default: return 'profesional'
      }
    }

    const getPersonalityDescription = (type: string) => {
      switch (type) {
        case 'amigable': return 'amigable y cercano'
        case 'persuasivo': return 'persuasivo y convincente'
        case 'inspirador': return 'inspirador y motivacional'
        case 'profesional': return 'profesional y competente'
        default: return 'profesional'
      }
    }

    const cvFormatted = formatCVForPrompt(cvData)
    const formalityDesc = getFormalityDescription(formality)
    const personalityDesc = getPersonalityDescription(personality)

    // Create the prompt
    const prompt = `Eres un experto en redacción de emails de postulación laboral. Tu tarea es generar un email profesional de postulación basándote ÚNICAMENTE en la información del CV proporcionado y la descripción del trabajo.

INFORMACIÓN DEL CANDIDATO:
${cvFormatted}

DESCRIPCIÓN DEL TRABAJO:
${jobDescription}

INSTRUCCIONES IMPORTANTES:
1. NO inventes información que no esté en el CV
2. NO agregues habilidades o experiencias que no estén mencionadas
3. USA ÚNICAMENTE los datos reales del CV para crear el email
4. El tono debe ser ${formalityDesc} y ${personalityDesc}
5. El email debe tener: asunto, saludo, introducción, cuerpo con ejemplos específicos del CV, cierre y despedida
6. Menciona específicamente experiencias y logros que aparecen en el CV y que sean relevantes para el puesto
7. El email debe estar en español
8. Máximo 300 palabras
9. Incluye un asunto atractivo

FORMATO ESPERADO:
Asunto: [Asunto del email]

[Saludo]

[Cuerpo del email con párrafos bien estructurados]

[Despedida profesional]
[Nombre completo]

Genera el email ahora:`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto en redacción de emails de postulación laboral. Siempre generas emails profesionales, personalizados y persuasivos basándote únicamente en la información proporcionada."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    })

    const generatedEmail = completion.choices[0]?.message?.content

    if (!generatedEmail) {
      return NextResponse.json(
        { error: 'No se pudo generar el email. Intenta nuevamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      email: generatedEmail.trim(),
      success: true
    })

  } catch (error) {
    console.error('Error generating email:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'Error de configuración del servicio de IA' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 