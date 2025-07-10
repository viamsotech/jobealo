import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Check if user exists in database
          const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('email', credentials.email)
            .eq('provider', 'credentials')
            .maybeSingle()

          if (!user) {
            return null
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(credentials.password, user.provider_id)
          
          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatar_url,
            plan: user.plan,
            provider: user.provider
          }
        } catch (error) {
          console.error('Credentials auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) return false

      try {
        // Handle Google OAuth
        if (account.provider === 'google') {
          // Check if user already exists
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email!)
            .maybeSingle()

          if (existingUser) {
            // Update existing user info
            await supabase
              .from('users')
              .update({
                name: user.name,
                avatar_url: user.image,
                provider: account.provider,
                provider_id: account.providerAccountId,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingUser.id)
          } else {
            // Create new user
            const { error } = await supabase
              .from('users')
              .insert({
                email: user.email!,
                name: user.name,
                avatar_url: user.image,
                provider: account.provider,
                provider_id: account.providerAccountId,
                plan: 'FREEMIUM'
              })

            if (error) {
              console.error('Error creating user:', error)
              return false
            }
          }
        }

        return true
      } catch (error) {
        console.error('Sign in error:', error)
        return false
      }
    },
    async jwt({ token, user, account, trigger }) {
      // Always fetch the latest user data from database to ensure plan is up to date
      if (token.userId || (account && user)) {
        let userId = token.userId
        
        // On first login, get userId from user object
        if (account && user) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email!)
            .single()

          if (dbUser) {
            userId = dbUser.id
          }
        }

        // Always fetch current user data to get latest plan
        if (userId) {
          const { data: currentUser } = await supabase
            .from('users')
            .select('id, plan, provider')
            .eq('id', userId)
            .single()

          if (currentUser) {
            token.userId = currentUser.id
            token.plan = currentUser.plan
            token.provider = currentUser.provider
          }
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        // Add custom fields to session
        session.user.id = token.userId as string
        session.user.plan = token.plan as string
        session.user.provider = token.provider as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper function to get server-side session
export async function getServerSession() {
  const { getServerSession } = await import("next-auth/next")
  return getServerSession(authOptions)
} 