import { NextRequest, NextResponse } from 'next/server';
import { translateCVToEnglish } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { cvData } = body;

    // Validar datos requeridos
    if (!cvData) {
      return NextResponse.json(
        { error: 'Datos del CV son requeridos' },
        { status: 400 }
      );
    }

    // Validar que el CV tenga contenido mínimo
    if (!cvData.personalInfo?.firstName || !cvData.personalInfo?.lastName) {
      return NextResponse.json(
        { error: 'El CV debe tener al menos nombre y apellidos' },
        { status: 400 }
      );
    }

    // Traducir el CV completo usando OpenAI
    const translatedCV = await translateCVToEnglish(cvData);

    return NextResponse.json({
      success: true,
      translatedCV,
      originalCV: cvData
    });

  } catch (error: unknown) {
    console.error('Error en API de traducción:', error);

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
      { error: 'Internal server error while translating CV' },
      { status: 500 }
    );
  }
}

// Manejar métodos no permitidos
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
} 