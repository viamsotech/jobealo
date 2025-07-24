import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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

    // Get emails for the specific CV
    const { data: emails, error } = await supabaseAdmin
      .from('application_emails')
      .select('*')
      .eq('cv_id', cvId)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching emails:', error)
      return NextResponse.json(
        { error: 'Error al obtener los emails' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      emails: emails || [],
      success: true
    })

  } catch (error) {
    console.error('Error in GET /api/applications/emails:', error)
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

    // Check if user already has 3 emails for this CV
    const { data: existingEmails, error: countError } = await supabaseAdmin
      .from('application_emails')
      .select('id')
      .eq('cv_id', cvId)
      .eq('user_id', session.user.id)

    if (countError) {
      console.error('Error checking existing emails:', countError)
      return NextResponse.json(
        { error: 'Error al verificar emails existentes' },
        { status: 500 }
      )
    }

    if (existingEmails && existingEmails.length >= 3) {
      return NextResponse.json(
        { 
          error: 'Ya tienes 3 emails guardados para este CV. Elimina uno para agregar otro.',
          code: 'LIMIT_REACHED'
        },
        { status: 400 }
      )
    }

    // Create new email
    const { data: email, error } = await supabaseAdmin
      .from('application_emails')
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
      console.error('Error creating email:', error)
      return NextResponse.json(
        { error: 'Error al guardar el email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      email,
      success: true
    })

  } catch (error) {
    console.error('Error in POST /api/applications/emails:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 