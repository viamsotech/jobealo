import { NextRequest, NextResponse } from 'next/server';
import { improveWithAI, type ImprovementType } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      type, 
      content, 
      context 
    }: {
      type: ImprovementType;
      content: string | string[];
      context?: {
        position?: string;
        company?: string;
        industry?: string;
      };
    } = body;

    // Validar datos requeridos
    if (!type || !content) {
      return NextResponse.json(
        { error: 'Tipo y contenido son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el contenido no esté vacío
    const hasContent = Array.isArray(content) 
      ? content.some(item => item.trim().length > 0)
      : content.trim().length > 0;

    if (!hasContent) {
      return NextResponse.json(
        { error: 'El contenido no puede estar vacío' },
        { status: 400 }
      );
    }

    // Llamar a OpenAI para mejorar el contenido
    const improvedContent = await improveWithAI(type, content, context);

    return NextResponse.json({
      success: true,
      improved: improvedContent,
      original: content,
      type
    });

  } catch (error: any) {
    console.error('Error en API de mejora con IA:', error);

    // Manejar diferentes tipos de errores
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'Configuración de OpenAI incorrecta' },
        { status: 500 }
      );
    }

    if (error.message?.includes('quota') || error.message?.includes('billing')) {
      return NextResponse.json(
        { error: 'Límite de uso de OpenAI alcanzado' },
        { status: 429 }
      );
    }

    if (error.message?.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Muchas solicitudes, intenta en unos momentos' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la solicitud' },
      { status: 500 }
    );
  }
}

// Manejar métodos no permitidos
export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
} 