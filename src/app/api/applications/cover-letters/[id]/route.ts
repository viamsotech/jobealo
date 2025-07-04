import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const params = await context.params
    const coverLetterId = params.id

    if (!coverLetterId) {
      return NextResponse.json(
        { error: 'ID de la carta es requerido' },
        { status: 400 }
      )
    }

    const { title, content } = await request.json()

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Título y contenido son requeridos' },
        { status: 400 }
      )
    }

    // Update the cover letter
    const { data: coverLetter, error } = await supabase
      .from('cover_letters')
      .update({
        title: title.trim(),
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', coverLetterId)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating cover letter:', error)
      return NextResponse.json(
        { error: 'Error al actualizar la carta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      coverLetter,
      success: true
    })

  } catch (error) {
    console.error('Error in PUT /api/applications/cover-letters/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const params = await context.params
    const coverLetterId = params.id

    if (!coverLetterId) {
      return NextResponse.json(
        { error: 'ID de la carta es requerido' },
        { status: 400 }
      )
    }

    // Delete the cover letter (RLS policy ensures user can only delete their own cover letters)
    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', coverLetterId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error deleting cover letter:', error)
      return NextResponse.json(
        { error: 'Error al eliminar la carta' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Carta eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error in DELETE /api/applications/cover-letters/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 