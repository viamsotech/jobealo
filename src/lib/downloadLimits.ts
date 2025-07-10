import { supabase } from './supabase'
import type { UserFingerprint, Download, DownloadLimit, User } from './supabase'

export interface DownloadLimitCheck {
  allowed: boolean
  remaining: number
  requiresRegistration: boolean
  requiresPayment: boolean
  price?: number
  userType: 'ANONYMOUS' | 'REGISTERED_FREEMIUM' | 'REGISTERED_PRO' | 'LIFETIME'
  downloadType: string
}

export interface UserDownloadStats {
  totalDownloads: number
  freeSpanishUsed: number
  freeSpanishLimit: number
  paidDownloads: number
  plan: string
  memberSince?: Date
}

export const DOWNLOAD_LIMITS = {
  ANONYMOUS: {
    spanish: 3,
    english: 0
  },
  REGISTERED_FREEMIUM: {
    spanish: 3,
    english: 0
  },
  REGISTERED_PRO: {
    spanish: -1, // Unlimited
    english: -1  // Unlimited
  },
  LIFETIME: {
    spanish: -1, // Unlimited
    english: -1  // Unlimited
  }
}

export const PRICING = {
  ADDITIONAL_SPANISH: 1.99,
  ADDITIONAL_ENGLISH: 1.99,
  PRO_MONTHLY: 14.99,
  LIFETIME: 59.99
}

export const FEATURES = {
  FREEMIUM: [
    'Acceso completo hasta 3 descargas',
    'Plantillas Optimizada ATS premium',
    'Todas las secciones del CV',
    'Mejoras con IA incluidas',
    'Traducciones al inglés con IA incluidas',
    'Después de 3 descargas:',
    '• Descargas adicionales: $1.99 c/u',
    '• Traducciones al inglés: $1.99 c/u'
  ],
  PRO: [
    'Descargas ilimitadas en español',
    'Mejoras con IA ilimitadas',
    'Traducción ilimitada al inglés',
    'Descargas al inglés ilimitadas'
  ],
  LIFETIME: [
    'Descargas ilimitadas en español',
    'Mejoras con IA ilimitadas',
    'Traducción ilimitada al inglés',
    'Descargas al inglés ilimitadas',
    'Creación de correo para aplicar a vacante ilimitada',
    'Carta de presentación para vacantes ilimitada'
  ]
}

export type UserType = 'ANONYMOUS' | 'REGISTERED_FREEMIUM' | 'REGISTERED_PRO' | 'LIFETIME'

export function getDownloadPrice(userType: UserType, language: 'spanish' | 'english'): number {
  if (userType === 'LIFETIME' || userType === 'REGISTERED_PRO') {
    return 0 // Unlimited access
  }
  
  if (language === 'spanish') {
    return PRICING.ADDITIONAL_SPANISH
  } else {
    return PRICING.ADDITIONAL_ENGLISH
  }
}

export function canDownload(userType: UserType, language: 'spanish' | 'english', currentUsage: number): boolean {
  const limit = DOWNLOAD_LIMITS[userType][language]
  
  if (limit === -1) {
    return true // Unlimited
  }
  
  return currentUsage < limit
}

export function getRemainingDownloads(userType: UserType, language: 'spanish' | 'english', currentUsage: number): number {
  const limit = DOWNLOAD_LIMITS[userType][language]
  
  if (limit === -1) {
    return -1 // Unlimited
  }
  
  return Math.max(0, limit - currentUsage)
}

/**
 * Check if user can download based on their fingerprint and desired language
 */
export async function checkDownloadLimit(
  fingerprintHash: string, 
  language: 'spanish' | 'english' = 'spanish',
  userId?: string
): Promise<DownloadLimitCheck> {
  // Get or create fingerprint
  const fingerprint = await getOrCreateFingerprint(fingerprintHash, userId)

  // Determine user type
  const userType = await getUserType(fingerprint)

  // Get limits for user type
  const limits = await getDownloadLimits(userType)
  
  // If PRO or lifetime user, always allow
  if (userType === 'LIFETIME' || userType === 'REGISTERED_PRO') {
    const downloadTypePrefix = userType === 'LIFETIME' ? 'LIFETIME' : 'PRO'
    const result = {
      allowed: true,
      remaining: 999999,
      requiresRegistration: false,
      requiresPayment: false,
      userType,
      downloadType: `${downloadTypePrefix}_${language.toUpperCase()}`
    }
    
    return result
  }
  
  // Get current usage
  const usage = await getCurrentUsage(fingerprint.id)

  // Check Spanish downloads
  if (language === 'spanish') {
    if (usage.freeSpanishUsed < limits.free_spanish_limit) {
      // Still has free Spanish downloads
      const result = {
        allowed: true,
        remaining: limits.free_spanish_limit - usage.freeSpanishUsed,
        requiresRegistration: false,
        requiresPayment: false,
        userType,
        downloadType: 'FREE_SPANISH'
      }
      
      return result
    } else {
      // Must pay for additional Spanish downloads
      const result = {
        allowed: true, // Allow anonymous users to pay for downloads
        remaining: 0,
        requiresRegistration: false, // Don't require registration for payment
        requiresPayment: true,
        price: limits.spanish_price,
        userType,
        downloadType: 'PAID_SPANISH'
      }
      
      return result
    }
  }
  
  // Check English downloads (always requires payment for non-PRO/LIFETIME)
  if (language === 'english') {
    const result = {
      allowed: true, // Allow anonymous users to pay for downloads
      remaining: 0,
      requiresRegistration: false, // Don't require registration for payment
      requiresPayment: true,
      price: limits.english_price,
      userType,
      downloadType: 'PAID_ENGLISH'
    }
    
    return result
  }
  
  throw new Error('Invalid language specified')
}

/**
 * Record a download
 */
export async function recordDownload(
  fingerprintHash: string,
  downloadType: string,
  ipAddress: string | null,
  fileName?: string,
  userId?: string,
  amountPaid?: number,
  stripePaymentIntentId?: string
): Promise<void> {
  const fingerprint = await getOrCreateFingerprint(fingerprintHash, userId)
  
  const { error } = await supabase
    .from('downloads')
    .insert({
      fingerprint_id: fingerprint.id,
      user_id: userId || null,
      download_type: downloadType,
      file_name: fileName,
      ip_address: ipAddress,
      amount_paid: amountPaid || 0,
      stripe_payment_intent_id: stripePaymentIntentId
    })
  
  if (error) {
    throw new Error(`Failed to record download: ${error.message}`)
  }
}

/**
 * Get user download statistics
 */
export async function getUserStats(fingerprintHash: string, userId?: string): Promise<UserDownloadStats> {
  const fingerprint = await getOrCreateFingerprint(fingerprintHash, userId)
  
  // Get total downloads
  const { count: totalDownloads } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('fingerprint_id', fingerprint.id)
  
  // Get free Spanish downloads
  const { count: freeSpanishDownloads } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('fingerprint_id', fingerprint.id)
    .eq('download_type', 'FREE_SPANISH')
  
  // Get paid downloads
  const { count: paidDownloads } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('fingerprint_id', fingerprint.id)
    .in('download_type', ['PAID_SPANISH', 'PAID_ENGLISH'])
  
  const userType = await getUserType(fingerprint)
  const limits = await getDownloadLimits(userType)
  
  // Get user info if available
  let user: User | null = null
  if (fingerprint.user_id) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', fingerprint.user_id)
      .maybeSingle()
    user = data
  }
  
  return {
    totalDownloads: totalDownloads || 0,
    freeSpanishUsed: freeSpanishDownloads || 0,
    freeSpanishLimit: limits.free_spanish_limit,
    paidDownloads: paidDownloads || 0,
    plan: user?.plan || 'FREEMIUM',
    memberSince: user?.created_at ? new Date(user.created_at) : undefined
  }
}

/**
 * Get or create fingerprint record
 */
async function getOrCreateFingerprint(fingerprintHash: string, userId?: string): Promise<UserFingerprint> {
  // Try to get existing fingerprint (handle the case where it doesn't exist)
  const { data: fingerprint, error: selectError } = await supabase
    .from('user_fingerprints')
    .select('*')
    .eq('fingerprint_hash', fingerprintHash)
    .maybeSingle() // Use maybeSingle() instead of single() to avoid errors when not found
  
  if (selectError) {
    throw new Error(`Failed to query fingerprint: ${selectError.message}`)
  }
  
  if (!fingerprint) {
    // Create new fingerprint
    const { data, error } = await supabase
      .from('user_fingerprints')
      .insert({
        fingerprint_hash: fingerprintHash,
        user_id: userId || null
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create fingerprint: ${error.message}`)
    }
    
    return data
  } else if (userId && !fingerprint.user_id) {
    // Link anonymous fingerprint to user after registration
    const { data, error } = await supabase
      .from('user_fingerprints')
      .update({ user_id: userId })
      .eq('fingerprint_hash', fingerprintHash)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to link fingerprint to user: ${error.message}`)
    }
    
    return data
  }
  
  return fingerprint
}

/**
 * Determine user type based on fingerprint data
 */
async function getUserType(fingerprint: UserFingerprint): Promise<'ANONYMOUS' | 'REGISTERED_FREEMIUM' | 'REGISTERED_PRO' | 'LIFETIME'> {
  if (!fingerprint.user_id) {
    return 'ANONYMOUS'
  }
  
  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('plan')
    .eq('id', fingerprint.user_id)
    .maybeSingle()
  
  if (!user) {
    return 'ANONYMOUS'
  }
  
  if (user.plan === 'LIFETIME') {
    return 'LIFETIME'
  }
  
  if (user.plan === 'PRO') {
    return 'REGISTERED_PRO'
  }
  
  return 'REGISTERED_FREEMIUM'
}

/**
 * Get download limits for user type
 */
async function getDownloadLimits(userType: string): Promise<DownloadLimit> {
  const { data: limits } = await supabase
    .from('download_limits')
    .select('*')
    .eq('user_type', userType)
    .maybeSingle()
  
  if (limits) {
    return limits
  }
  
  // Create default limits if they don't exist
  const defaultLimits = {
    'ANONYMOUS': {
      user_type: 'ANONYMOUS' as const,
      free_spanish_limit: 3,
      spanish_price: 1.99,
      english_price: 1.99,
      requires_registration: false
    },
    'REGISTERED_FREEMIUM': {
      user_type: 'REGISTERED_FREEMIUM' as const,
      free_spanish_limit: 3,
      spanish_price: 1.99,
      english_price: 1.99,
      requires_registration: true
    },
    'REGISTERED_PRO': {
      user_type: 'REGISTERED_PRO' as const,
      free_spanish_limit: -1,
      spanish_price: 0,
      english_price: 0,
      requires_registration: true
    },
    'LIFETIME': {
      user_type: 'LIFETIME' as const,
      free_spanish_limit: -1,
      spanish_price: 0,
      english_price: 0,
      requires_registration: true
    }
  }
  
  const defaultLimit = defaultLimits[userType as keyof typeof defaultLimits]
  
  if (!defaultLimit) {
    throw new Error(`Unknown user type: ${userType}`)
  }
  
  const { data, error } = await supabase
    .from('download_limits')
    .insert(defaultLimit)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create default limits: ${error.message}`)
  }
  
  return data
}

/**
 * Get current download usage
 */
async function getCurrentUsage(fingerprintId: string) {
  // Get free Spanish downloads
  const { count: freeSpanishUsed } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('fingerprint_id', fingerprintId)
    .eq('download_type', 'FREE_SPANISH')
  
  // Get paid downloads
  const { count: paidDownloads } = await supabase
    .from('downloads')
    .select('*', { count: 'exact', head: true })
    .eq('fingerprint_id', fingerprintId)
    .in('download_type', ['PAID_SPANISH', 'PAID_ENGLISH'])
  
  return {
    freeSpanishUsed: freeSpanishUsed || 0,
    paidDownloads: paidDownloads || 0
  }
}

/**
 * Check if user has full access to all features (for freemium users)
 * Returns true if user is PRO/LIFETIME or if freemium user hasn't used both downloads yet
 */
export async function hasFullAccess(
  fingerprintHash: string,
  userId?: string
): Promise<boolean> {
  // Get or create fingerprint
  const fingerprint = await getOrCreateFingerprint(fingerprintHash, userId)
  
  // Determine user type
  const userType = await getUserType(fingerprint)
  
  // PRO and LIFETIME users always have full access
  if (userType === 'LIFETIME' || userType === 'REGISTERED_PRO') {
    return true
  }
  
  // For freemium users, check if they still have free downloads remaining
  const usage = await getCurrentUsage(fingerprint.id)
  const limits = await getDownloadLimits(userType)
  
  // If they haven't used all their free downloads, they have full access
  return usage.freeSpanishUsed < limits.free_spanish_limit
}

/**
 * Get remaining free downloads for user
 */
export async function getRemainingFreeDownloads(
  fingerprintHash: string,
  userId?: string
): Promise<number> {
  const fingerprint = await getOrCreateFingerprint(fingerprintHash, userId)
  const userType = await getUserType(fingerprint)
  
  if (userType === 'LIFETIME' || userType === 'REGISTERED_PRO') {
    return -1 // Unlimited
  }
  
  const usage = await getCurrentUsage(fingerprint.id)
  const limits = await getDownloadLimits(userType)
  
  return Math.max(0, limits.free_spanish_limit - usage.freeSpanishUsed)
} 