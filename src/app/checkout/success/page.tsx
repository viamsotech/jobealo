"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { CheckCircle, Download, Crown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Actualizar sesión para reflejar el nuevo plan
    const refreshSession = async () => {
      if (session) {
        // Force a complete session refresh
        await update()
        // Additional refresh to ensure JWT is rebuilt
        setTimeout(async () => {
          await update()
        }, 1000)
      }
      setIsLoading(false)
    }

    // Timeout para dar tiempo a que el backend procese el pago
    const timer = setTimeout(refreshSession, 2000)
    return () => clearTimeout(timer)
  }, [session, update])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  const userPlan = session?.user?.plan || 'FREEMIUM'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Image
            src="/images/jobealologo2.svg"
            alt="Jobealo"
            width={120}
            height={30}
            className="h-8 w-auto"
          />
        </div>
      </div>

      {/* Success Content */}
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Pago completado con éxito!
          </h1>
          <p className="text-xl text-gray-600">
            Bienvenido a Jobealo {userPlan === 'PRO' ? 'Pro' : userPlan === 'LIFETIME' ? 'Lifetime' : ''}
          </p>
        </div>

        {/* Plan Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-center mb-4">
            <Crown className="w-6 h-6 text-yellow-500 mr-2" />
            <span className="text-lg font-medium text-gray-900">
              Tu plan {userPlan === 'PRO' ? 'Pro' : userPlan === 'LIFETIME' ? 'Lifetime' : ''} está activo
            </span>
          </div>
          
          <div className="text-gray-600 mb-6">
            Ya puedes disfrutar de todas las funcionalidades premium de Jobealo.
          </div>

          {/* Benefits */}
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Descargas ilimitadas en español e inglés</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Mejoras con IA sin límites</span>
            </div>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span>Traducción automática al inglés</span>
            </div>
            {userPlan === 'LIFETIME' && (
              <>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>Creación de correos para vacantes</span>
                </div>
                <div className="flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span>Cartas de presentación personalizadas</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Button 
            size="lg" 
            className="w-full max-w-md"
            onClick={() => router.push('/')}
          >
            <Download className="w-5 h-5 mr-2" />
            Crear mi primer CV
          </Button>
          
          <Button 
            variant="outline" 
            size="lg"
            className="w-full max-w-md"
            onClick={() => router.push('/settings')}
          >
            Ver mi cuenta
          </Button>

          <div className="mt-8">
            <Button 
              variant="ghost"
              onClick={() => router.push('/')}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </div>
        </div>

        {/* Support */}
        <div className="mt-12 p-6 bg-blue-50 rounded-xl">
          <h3 className="font-medium text-blue-900 mb-2">¿Necesitas ayuda?</h3>
          <p className="text-blue-700 text-sm mb-3">
            Nuestro equipo está aquí para ayudarte a sacar el máximo provecho de Jobealo.
          </p>
          <Button variant="outline" size="sm">
            <a href="mailto:soporte@jobealo.com">Contactar Soporte</a>
          </Button>
        </div>
      </div>
    </div>
  )
} 