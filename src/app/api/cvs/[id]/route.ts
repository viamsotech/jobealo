import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required to access CV' },
        { status: 401 }
      )
    }

    const { id: cvId } = await params

    // Get the specific CV
    const { data: cv, error } = await supabaseAdmin
      .from('saved_cvs')
      .select('*')
      .eq('id', cvId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch CV: ${error.message}`)
    }

    if (!cv) {
      return NextResponse.json(
        { error: 'CV not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      cv: {
        id: cv.id,
        title: cv.title,
        cvData: cv.cv_data,
        isTemplate: cv.is_template,
        isCompleted: cv.is_completed,
        createdAt: cv.created_at,
        updatedAt: cv.updated_at
      }
    })

  } catch (error) {
    console.error('Error fetching CV:', error)
    return NextResponse.json(
      { error: 'Internal server error while fetching CV' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required to delete CV' },
        { status: 401 }
      )
    }

    const { id: cvId } = await params

    // Check if CV exists and belongs to user
    const { data: cv } = await supabaseAdmin
      .from('saved_cvs')
      .select('id')
      .eq('id', cvId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!cv) {
      return NextResponse.json(
        { error: 'CV not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the CV
    const { error } = await supabaseAdmin
      .from('saved_cvs')
      .delete()
      .eq('id', cvId)

    if (error) {
      throw new Error(`Failed to delete CV: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'CV deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting CV:', error)
    return NextResponse.json(
      { error: 'Internal server error while deleting CV' },
      { status: 500 }
    )
  }
}
