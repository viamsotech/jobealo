import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get current user plan from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('plan, updated_at')
      .eq('id', session.user.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Plan sincronizado correctamente',
      plan: user.plan,
      updated_at: user.updated_at
    })
  } catch (error) {
    console.error('Error syncing plan:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 