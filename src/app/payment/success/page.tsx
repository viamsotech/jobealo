"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Download, Crown, ArrowLeft, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

function PaymentSuccessContent() {
  const { data: session, update } = useSession()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [isLoading, setIsLoading] = useState(true)
  const [paymentDetails, setPaymentDetails] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No payment session found')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/stripe/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify payment')
        }

        setPaymentDetails(data)
        
        // Update session to reflect new plan
        if (session) {
          await update()
        }

      } catch (error) {
        console.error('Payment verification error:', error)
        setError(error instanceof Error ? error.message : 'Payment verification failed')
      } finally {
        setIsLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId, session, update])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Verificando tu pago...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-red-600">Error</CardTitle>
              <CardDescription className="text-center">
                Hubo un problema verificando tu pago
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">{error}</p>
              <Button asChild className="w-full">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/images/jobealologo2.svg"
            alt="Jobealo"
            width={120}
            height={30}
            className="h-8 w-auto mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900">¡Pago Exitoso!</h1>
          <p className="text-gray-600 mt-2">
            Tu plan ha sido activado correctamente
          </p>
        </div>

        {/* Success Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-green-600">
              ¡Bienvenido a Jobealo {paymentDetails?.planType || 'Pro'}!
            </CardTitle>
            <CardDescription className="text-lg">
              Tu pago ha sido procesado exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Details */}
            {paymentDetails && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Detalles del pago:</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Plan:</span>
                    <span className="ml-2 font-medium">
                      {paymentDetails.planType === 'PRO' ? 'Jobealo Pro' : 'Jobealo Lifetime'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Monto:</span>
                    <span className="ml-2 font-medium">
                      ${paymentDetails.amount || '0.00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Estado:</span>
                    <span className="ml-2 font-medium text-green-600">Pagado</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ID de sesión:</span>
                    <span className="ml-2 font-mono text-xs">
                      {sessionId?.substring(0, 20)}...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Benefits */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-blue-600" />
                Lo que incluye tu plan:
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Descargas ilimitadas en español
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Mejoras con IA ilimitadas
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Traducción ilimitada al inglés
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Descargas al inglés ilimitadas
                </li>
                {paymentDetails?.planType === 'LIFETIME' && (
                  <>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Creación de correo para aplicar a vacante ilimitada
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Carta de presentación para vacantes ilimitada
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <Button asChild className="w-full" size="lg">
                <Link href="/">
                  <Download className="w-5 h-5 mr-2" />
                  Crear mi CV ahora
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/settings">
                  Ver mi cuenta
                </Link>
              </Button>
            </div>

            {/* Support */}
            <div className="pt-4 border-t text-center text-sm text-gray-600">
              <p>
                ¿Necesitas ayuda? Contáctanos en{' '}
                <a href="mailto:soporte@jobealo.com" className="text-blue-600 hover:text-blue-500">
                  soporte@jobealo.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back to Home */}
        <div className="text-center">
          <Button variant="ghost" asChild>
            <Link href="/" className="flex items-center justify-center space-x-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al inicio</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
} 