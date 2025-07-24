import { createClient } from '@supabase/supabase-js'

// Get Supabase URL and anon key from your Supabase dashboard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ymldnzlozbhjtjrlyclk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here'

// Service role key for backend operations (bypasses RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Service role client for backend API operations
export const supabaseAdmin = createClient(
  supabaseUrl, 
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Type definitions for our tables (much simpler than Prisma)
export interface UserFingerprint {
  id: string
  fingerprint_hash: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  screen_resolution?: string
  timezone?: string
  language?: string
  created_at: string
  updated_at: string
}

export interface Download {
  id: string
  fingerprint_id: string
  user_id?: string
  download_type: 'FREE_SPANISH' | 'PAID_SPANISH' | 'PAID_ENGLISH' | 'LIFETIME_SPANISH' | 'LIFETIME_ENGLISH' | 'PRO_SPANISH' | 'PRO_ENGLISH'
  file_name?: string
  ip_address?: string
  amount_paid: number
  stripe_payment_intent_id?: string
  created_at: string
}

export interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  provider: 'google' | 'github' | 'magic-link'
  provider_id: string
  plan: 'FREEMIUM' | 'PRO' | 'LIFETIME'
  lifetime_purchased_at?: string
  created_at: string
  updated_at: string
}

export interface DownloadLimit {
  id: string
  user_type: 'ANONYMOUS' | 'REGISTERED_FREEMIUM' | 'REGISTERED_PRO' | 'LIFETIME'
  free_spanish_limit: number
  spanish_price: number
  english_price: number
  requires_registration: boolean
  created_at: string
  updated_at: string
}

interface DownloadLimitCheck {
  allowed: boolean
  remaining: number
  requiresRegistration: boolean
  requiresPayment: boolean
  price?: number
  userType: 'ANONYMOUS' | 'REGISTERED_FREEMIUM' | 'REGISTERED_PRO' | 'LIFETIME'
  downloadType: string
}

interface UserStats {
  totalDownloads: number
  freeSpanishUsed: number
  freeSpanishLimit: number
  paidDownloads: number
  plan: string
  memberSince?: Date
}

interface DownloadLimitConfig {
  id: string
  user_type: 'ANONYMOUS' | 'REGISTERED_FREEMIUM' | 'REGISTERED_PRO' | 'LIFETIME'
  free_spanish_limit: number
  spanish_price: number
  english_price: number
  requires_registration: boolean
  created_at: string
  updated_at: string
} 