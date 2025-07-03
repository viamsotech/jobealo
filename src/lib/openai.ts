import OpenAI from 'openai';

// Configuración de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
  | 'experience-suggestions';

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
          content: 'Eres un experto en recursos humanos. Responde ÚNICAMENTE con el contenido solicitado, sin texto explicativo adicional. No uses numeración ni bullets. Responde directamente.'
        },
        {
          role: 'user',
          content: fullPrompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500'),
      temperature: 0.7,
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