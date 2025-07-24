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
        { error: 'Authentication required to access CVs' },
        { status: 401 }
      )
    }

    // Get all CVs for the user
    const { data: cvs, error } = await supabaseAdmin
      .from('saved_cvs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch CVs: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      cvs: (cvs || []).map(cv => {
        const cvData = cv.cv_data as any // Type casting for JSON field
        return {
          id: cv.id,
          title: cv.title,
          isTemplate: cv.is_template,
          isCompleted: cv.is_completed,
          createdAt: cv.created_at,
          updatedAt: cv.updated_at,
          cvData: cv.cv_data,
          // Add summary info from cvData for display
          firstName: cvData?.personalInfo?.firstName || '',
          lastName: cvData?.personalInfo?.lastName || '',
          titles: cvData?.personalInfo?.titles || []
        }
      })
    })

  } catch (error) {
    console.error('Error fetching CVs:', error)
    return NextResponse.json(
      { error: 'Internal server error while fetching CVs' },
      { status: 500 }
    )
  }
}
