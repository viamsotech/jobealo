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
    const emailId = params.id

    if (!emailId) {
      return NextResponse.json(
        { error: 'ID del email es requerido' },
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

    // Update the email
    const { data: email, error } = await supabase
      .from('application_emails')
      .update({
        title: title.trim(),
        content: content.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', emailId)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating email:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      email,
      success: true
    })

  } catch (error) {
    console.error('Error in PUT /api/applications/emails/[id]:', error)
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
    const emailId = params.id

    if (!emailId) {
      return NextResponse.json(
        { error: 'ID del email es requerido' },
        { status: 400 }
      )
    }

    // Delete the email (RLS policy ensures user can only delete their own emails)
    const { error } = await supabase
      .from('application_emails')
      .delete()
      .eq('id', emailId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error deleting email:', error)
      return NextResponse.json(
        { error: 'Error al eliminar el email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email eliminado exitosamente'
    })

  } catch (error) {
    console.error('Error in DELETE /api/applications/emails/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 