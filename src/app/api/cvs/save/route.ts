import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required to save CV' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, cvData, isTemplate = false, isCompleted = false, cvId } = body

    // Validate required fields
    if (!title || !cvData) {
      return NextResponse.json(
        { error: 'Title and CV data are required' },
        { status: 400 }
      )
    }

    // Validate CV data has minimum required fields
    if (!cvData.personalInfo?.firstName || !cvData.personalInfo?.lastName) {
      return NextResponse.json(
        { error: 'CV must have at least first name and last name' },
        { status: 400 }
      )
    }

    let savedCV

    if (cvId) {
      // Update existing CV
      const { data: existingCV } = await supabase
        .from('saved_cvs')
        .select('*')
        .eq('id', cvId)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!existingCV) {
        return NextResponse.json(
          { error: 'CV not found or access denied' },
          { status: 404 }
        )
      }

      const { data, error } = await supabase
        .from('saved_cvs')
        .update({
          title,
          cv_data: cvData,
          is_template: isTemplate,
          is_completed: isCompleted,
          updated_at: new Date().toISOString()
        })
        .eq('id', cvId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update CV: ${error.message}`)
      }

      savedCV = data
    } else {
      // Create new CV
      const { data, error } = await supabase
        .from('saved_cvs')
        .insert({
          user_id: session.user.id,
          title,
          cv_data: cvData,
          is_template: isTemplate,
          is_completed: isCompleted
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create CV: ${error.message}`)
      }

      savedCV = data
    }

    return NextResponse.json({
      success: true,
      cv: {
        id: savedCV.id,
        title: savedCV.title,
        isTemplate: savedCV.is_template,
        isCompleted: savedCV.is_completed,
        createdAt: savedCV.created_at,
        updatedAt: savedCV.updated_at
      },
      message: cvId ? 'CV updated successfully' : 'CV saved successfully'
    })

  } catch (error) {
    console.error('Error saving CV:', error)
    return NextResponse.json(
      { error: 'Internal server error while saving CV' },
      { status: 500 }
    )
  }
}
