import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cvId = searchParams.get('cvId')

    if (!cvId) {
      return NextResponse.json(
        { error: 'cvId es requerido' },
        { status: 400 }
      )
    }

    // Get cover letters for the specific CV
    const { data: coverLetters, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('cv_id', cvId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching cover letters:', error)
      return NextResponse.json(
        { error: 'Error al obtener las cartas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      coverLetters: coverLetters || [],
      success: true
    })

  } catch (error) {
    console.error('Error in GET /api/applications/cover-letters:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

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

    const { title, content, jobDescription, formality, personality, cvId } = await request.json()

    // Validate required fields
    if (!title || !content || !jobDescription || !formality || !personality || !cvId) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      )
    }

    // Check if user already has 3 cover letters for this CV
    const { data: existingCoverLetters, error: countError } = await supabase
      .from('cover_letters')
      .select('id')
      .eq('cv_id', cvId)
      .eq('user_id', session.user.id)

    if (countError) {
      console.error('Error checking existing cover letters:', countError)
      return NextResponse.json(
        { error: 'Error al verificar cartas existentes' },
        { status: 500 }
      )
    }

    if (existingCoverLetters && existingCoverLetters.length >= 3) {
      return NextResponse.json(
        { 
          error: 'Ya tienes 3 cartas guardadas para este CV. Elimina una para agregar otra.',
          code: 'LIMIT_REACHED'
        },
        { status: 400 }
      )
    }

    // Create new cover letter
    const { data: coverLetter, error } = await supabase
      .from('cover_letters')
      .insert({
        user_id: session.user.id,
        cv_id: cvId,
        title: title.trim(),
        content: content.trim(),
        job_description: jobDescription.trim(),
        formality,
        personality,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating cover letter:', error)
      return NextResponse.json(
        { error: 'Error al guardar la carta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      coverLetter,
      success: true
    })

  } catch (error) {
    console.error('Error in POST /api/applications/cover-letters:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 