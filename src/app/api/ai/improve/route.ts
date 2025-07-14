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

    // Validación suave de contenido - detectar queries obviamente fuera de contexto
    const contentText = Array.isArray(content) ? content.join(' ') : content;
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
      pattern.test(contentText.toLowerCase())
    );

    if (containsSuspiciousContent) {
      return NextResponse.json(
        { error: 'El contenido debe estar relacionado con información profesional de CVs. Te ayudo con currículums y postulaciones laborales.' },
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

  } catch (error: unknown) {
    console.error('Error en API de mejora:', error);

    // Manejar diferentes tipos de errores
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI configuration error' },
        { status: 500 }
      );
    }

    if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
      return NextResponse.json(
        { error: 'OpenAI usage limit reached' },
        { status: 429 }
      );
    }

    if (errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { error: 'Too many requests, please try again in a moment' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while improving content' },
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