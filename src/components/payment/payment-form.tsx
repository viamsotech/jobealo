"use client"

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CreditCard, Lock, Shield, CheckCircle, X } from 'lucide-react'
import { type PlanType, STRIPE_PRODUCTS } from '@/lib/stripe'
import { useSession } from 'next-auth/react'
import { useFingerprint } from '@/hooks/useFingerprint'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

interface PaymentFormProps {
  planType?: PlanType
  onSuccess: () => void
  onCancel: () => void
  individualPayment?: {
    amount: number
    language?: string  // For PDF downloads (english/spanish) 
    actionType?: string  // For AI actions (email/cover-letter/adapt-cv)
    description: string
  }
}

function CheckoutForm({ planType, onSuccess, onCancel, individualPayment }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { data: session } = useSession()
  const { fingerprint } = useFingerprint()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [customerName, setCustomerName] = useState(session?.user?.name || '')
  const [customerEmail, setCustomerEmail] = useState(session?.user?.email || '')
  const [clientSecret, setClientSecret] = useState<string>('')

  // Usar datos del pago individual si está disponible, sino usar plan
  const isIndividualPayment = !!individualPayment
  const isAIAction = individualPayment?.actionType !== undefined
  const plan = planType ? STRIPE_PRODUCTS[planType] : null
  const paymentAmount = individualPayment ? individualPayment.amount : plan?.price || 0
  const paymentDescription = individualPayment ? individualPayment.description : plan?.description || ''
  
  // Determinar el nombre del pago según el tipo
  let paymentName = ''
  if (individualPayment) {
    if (isAIAction) {
      paymentName = `Función IA: ${individualPayment.description}`
    } else {
      paymentName = `Descarga Individual (${individualPayment.language === 'english' ? 'Inglés' : 'Español'})`
    }
  } else {
    paymentName = plan?.name || ''
  }

  // CardElement options - SIN LINK, LIMPIO
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#1f2937',
        fontFamily: 'system-ui, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
        iconColor: '#6b7280',
      },
      invalid: {
        color: '#dc2626',
        iconColor: '#dc2626',
      },
    },
    hidePostalCode: true, // No código postal
    disableLink: true, // DESHABILITAR LINK EXPLÍCITAMENTE
  }

  // Crear payment intent
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        // Esperar a que esté disponible el fingerprint
        if (!fingerprint) return

        let requestBody
        if (individualPayment) {
          if (isAIAction) {
            // For AI actions (email, cover-letter, adapt-cv)
            requestBody = {
              type: 'individual_action',
              amount: Math.round(individualPayment.amount * 100),
              currency: 'usd',
              actionType: individualPayment.actionType,
              fingerprint: fingerprint
            }
          } else {
            // For PDF downloads (english/spanish)
            requestBody = {
              type: 'individual_download',
              amount: Math.round(individualPayment.amount * 100),
              currency: 'usd',
              language: individualPayment.language,
              fingerprint: fingerprint
            }
          }
        } else {
          // For plan upgrades
          requestBody = {
            planType: planType,
            fingerprint: fingerprint
          }
        }
        
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent')
        }

        setClientSecret(data.clientSecret)
      } catch (error) {
        console.error('Payment intent error:', error)
        setError('Error al preparar el pago')
      }
    }

    if ((planType || individualPayment) && fingerprint) {
      createPaymentIntent()
    }
  }, [planType, individualPayment, fingerprint])

  // Actualizar campos cuando cambie la sesión
  useEffect(() => {
    if (session?.user?.name && !customerName) {
      setCustomerName(session.user.name)
    }
    if (session?.user?.email && !customerEmail) {
      setCustomerEmail(session.user.email)
    }
  }, [session])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements || !customerName.trim() || !customerEmail.trim() || !clientSecret) {
      setError('Por favor completa todos los campos')
      return
    }

    setIsLoading(true)
    setError('')

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setError('Error al cargar el formulario de tarjeta')
      setIsLoading(false)
      return
    }

    try {
      // Confirmar pago con CardElement (SIN LINK)
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: customerName.trim(),
            email: customerEmail.trim(),
          },
        }
      })

      if (error) {
        console.error('Payment error:', error)
        setError(error.message || 'Error en el pago')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent)
        
        // Process payment in our backend
        try {
          const processResponse = await fetch('/api/stripe/process-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              paymentIntentId: paymentIntent.id,
              fingerprint: fingerprint // Pasar fingerprint también al procesamiento
            }),
          })

          const processData = await processResponse.json()

          if (!processResponse.ok) {
            throw new Error(processData.error || 'Error al procesar el pago')
          }

          onSuccess()
        } catch (processError) {
          console.error('Process payment error:', processError)
          setError(processError instanceof Error ? processError.message : 'Error al completar la compra')
        }
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setError('Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  // Mostrar loading si no hay fingerprint aún
  if (!fingerprint) {
    return (
      <Card className="w-full max-w-4xl mx-auto shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Preparando el pago...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-2xl bg-white/95 backdrop-blur-sm">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg relative">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Información de Pago
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm">Seguro</span>
            </div>
            <Button
              onClick={onCancel}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda: Resumen */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-gray-900">{paymentName}</h3>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">${paymentAmount}</div>
                  {plan?.interval === 'month' && (
                    <div className="text-sm text-gray-500">/mes</div>
                  )}
                  {plan?.interval === 'one_time' && (
                    <div className="text-sm text-gray-500">pago único</div>
                  )}
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{paymentDescription}</p>
              
              {/* Features */}
              <div className="space-y-2">
                {individualPayment ? (
                  isAIAction ? (
                    // Features for AI actions
                    <>
                      <div className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        Contenido generado con IA avanzada
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        Personalizado para tu perfil profesional
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        {individualPayment.actionType === 'email' ? 'Email optimizado para captar atención' : 
                         individualPayment.actionType === 'cover-letter' ? 'Carta formal y profesional' : 
                         'CV adaptado a la vacante específica'}
                      </div>
                    </>
                  ) : (
                    // Features for PDF downloads
                    <>
                      <div className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        CV optimizado para ATS
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        Formato profesional en PDF
                      </div>
                      <div className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        {individualPayment.language === 'english' ? 'Optimizado para mercado internacional' : 'Optimizado para mercado español'}
                      </div>
                    </>
                  )
                ) : (
                  plan?.features.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                      {feature}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Security Features */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <Shield className="w-6 h-6 text-green-600 mb-2" />
                  <span className="text-xs text-gray-600 font-medium">Stripe Secure</span>
                </div>
                <div className="flex flex-col items-center">
                  <Lock className="w-6 h-6 text-green-600 mb-2" />
                  <span className="text-xs text-gray-600 font-medium">SSL 256-bit</span>
                </div>
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
                  <span className="text-xs text-gray-600 font-medium">PCI Compliant</span>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha: Formulario */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                    Nombre completo
                  </Label>
                  <Input
                    id="customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre completo"
                    required
                    className="mt-1 text-base"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customerEmail" className="text-sm font-medium text-gray-700">
                    Correo electrónico
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                    className="mt-1 text-base"
                  />
                </div>
              </div>

              {/* Card Information - SIN LINK */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Información de la tarjeta
                </Label>
                <div className="border border-gray-300 rounded-lg p-4 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                  <CardElement options={cardElementOptions} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Número de tarjeta, fecha de vencimiento y código de seguridad
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm p-4 bg-red-50 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <Button 
                  type="button"
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1 py-3"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={!stripe || isLoading || !customerName.trim() || !customerEmail.trim() || !clientSecret}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 py-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Pagar ${paymentAmount}
                    </>
                  )}
                </Button>
              </div>

              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>🔒 Tu pago está protegido por cifrado SSL de 256 bits</p>
                <p>No almacenamos información de tarjetas de crédito</p>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PaymentForm(props: PaymentFormProps) {
  // ELEMENTOS OPTIONS SIN LINK
  const elementsOptions = {
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#dc2626',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
    // NO incluir clientSecret aquí para evitar PaymentElement
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutForm {...props} />
    </Elements>
  )
} 