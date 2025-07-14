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

    const body = await request.json()
    console.log('📥 Request body:', JSON.stringify(body, null, 2))
    
    const { cvData, jobDescription, adaptationFocus } = body

    console.log('🔍 Extracted fields:')
    console.log('  - cvData exists:', !!cvData)
    console.log('  - jobDescription exists:', !!jobDescription)
    console.log('  - jobDescription content:', jobDescription)
    console.log('  - adaptationFocus:', adaptationFocus)

    // Validate required fields
    if (!cvData || !jobDescription) {
      console.log('❌ Validation failed - missing required fields')
      console.log('  - cvData:', !!cvData)
      console.log('  - jobDescription:', !!jobDescription)
      return NextResponse.json(
        { error: 'Faltan campos requeridos: cvData, jobDescription' },
        { status: 400 }
      )
    }

    // Validación suave de contenido - detectar queries obviamente fuera de contexto
    const suspiciousPatterns = [
      /ignora.{0,15}instrucciones/i,
      /actúa como si fueras/i,
      /olvida.{0,15}anterior/i,
      /responde.{0,15}como.{0,15}si/i,
      /hombre.{0,15}luna/i,
      /poema|canción|historia|chiste/i,
      /matemáticas|física|química|biología/i
    ];

    const containsSuspiciousContent = suspiciousPatterns.some(pattern => 
      pattern.test(jobDescription.toLowerCase())
    );

    if (containsSuspiciousContent) {
      return NextResponse.json(
        { error: 'La descripción del trabajo debe estar relacionada con oportunidades laborales reales. Te ayudo con CVs y postulaciones profesionales.' },
        { status: 400 }
      )
    }

    // Validate CV data has minimum required fields
    if (!cvData.personalInfo?.firstName || !cvData.personalInfo?.lastName) {
      console.log('❌ CV validation failed - missing personal info')
      console.log('  - firstName:', cvData.personalInfo?.firstName)
      console.log('  - lastName:', cvData.personalInfo?.lastName)
      return NextResponse.json(
        { error: 'El CV debe tener al menos nombre y apellidos completos' },
        { status: 400 }
      )
    }

    console.log('✅ All validations passed, proceeding with AI adaptation')

    // Create the adaptation prompt
    const prompt = `Eres un experto en optimización de CVs para reclutadores. Tu tarea es adaptar un CV existente para que se ajuste mejor a una vacante específica.

REGLAS FUNDAMENTALES:
1. NO INVENTES información que no esté en el CV original
2. NO agregues experiencias, logros o habilidades que no existan
3. NO cambies fechas, nombres de empresas, cargos o datos factuales
4. SOLO modifica la redacción y presentación de la información existente
5. Mantén la estructura y formato JSON exacto del CV original
6. ENFÓCATE ÚNICAMENTE en adaptar el CV para esta oportunidad laboral específica

ANÁLISIS DE LA VACANTE:
${jobDescription}

ENFOQUE DE ADAPTACIÓN: ${adaptationFocus || 'Optimización general para la vacante'}

CV ORIGINAL A ADAPTAR:
${JSON.stringify(cvData, null, 2)}

INSTRUCCIONES ESPECÍFICAS DE ADAPTACIÓN:

1. RESUMEN PROFESIONAL:
   - Reescribe el resumen para que refleje cómo el candidato encaja con la vacante
   - Destaca las fortalezas más relevantes para el puesto
   - Usa terminología de la vacante cuando sea apropiada
   - NO menciones que "busca trabajo en [empresa]" - enfócate en valor que aporta
   - Mantén el tono profesional y específico

2. EXPERIENCIA LABORAL:
   - Reescribe las responsabilidades para resaltar aspectos más relevantes
   - Reorganiza las tareas poniendo primero las más importantes para la vacante
   - Usa palabras clave de la descripción del trabajo cuando sea verídico
   - Enfatiza logros y resultados que sean relevantes
   - Mantén toda la información factual intacta

3. HABILIDADES:
   - Reordena las habilidades poniendo primero las más relevantes
   - Agrupa habilidades relacionadas si es apropiado
   - NO agregues habilidades nuevas que no estén en el original

4. OTROS CAMPOS:
   - Mantén exactamente igual: datos personales, educación, certificaciones, idiomas
   - Solo ajusta el orden si es muy relevante para la vacante

FORMATO DE RESPUESTA:
- Devuelve únicamente el JSON del CV adaptado
- Mantén exactamente la misma estructura que el CV original
- Asegúrate de que el JSON sea válido y completo

El CV adaptado debe verse natural y profesional, como si hubiera sido escrito específicamente para esta vacante, pero usando solo información verídica del CV original.`

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto consultor en optimización de CVs especializado en adaptar currículums para oportunidades laborales específicas. Tu misión es ayudar a las personas a destacar profesionalmente ajustando la presentación de su experiencia real. Mantén un enfoque profesional pero cercano, adaptando CVs existentes para vacantes específicas sin inventar información falsa. Solo trabajas con temas relacionados a CVs, postulaciones laborales y desarrollo profesional. Siempre devuelves JSON válido en el mismo formato que recibes."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.5, // Slightly lower for more consistent JSON output
    })

    let adaptedCVData
    try {
      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from AI')
      }

      // Clean the response to extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response')
      }

      adaptedCVData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      return NextResponse.json(
        { error: 'Error procesando la respuesta de la IA. Intenta nuevamente.' },
        { status: 500 }
      )
    }

    // Validate that essential fields are preserved
    if (!adaptedCVData.personalInfo?.firstName || !adaptedCVData.personalInfo?.lastName) {
      return NextResponse.json(
        { error: 'Error en la adaptación: información personal perdida' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      adaptedCV: adaptedCVData,
      success: true,
      message: 'CV adaptado exitosamente'
    })

  } catch (error) {
    console.error('Error adapting CV:', error)
    
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