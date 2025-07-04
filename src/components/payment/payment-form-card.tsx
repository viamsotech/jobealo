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
import { Loader2, CreditCard, Lock, Shield, CheckCircle } from 'lucide-react'
import { type PlanType, STRIPE_PRODUCTS } from '@/lib/stripe'
import { useSession } from 'next-auth/react'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder')

interface PaymentFormProps {
  planType: PlanType
  onSuccess: () => void
  onCancel: () => void
}

function CheckoutForm({ planType, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [customerName, setCustomerName] = useState(session?.user?.name || '')
  const [customerEmail, setCustomerEmail] = useState(session?.user?.email || '')

  const plan = STRIPE_PRODUCTS[planType]

  // CardElement options - Sin postal code y estilo limpio
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  }

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

    if (!stripe || !elements || !customerName.trim() || !customerEmail.trim()) {
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
      // Crear payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: customerName.trim(),
          email: customerEmail.trim(),
          phone: '+1234567890',
          address: {
            line1: 'N/A',
            city: 'N/A',
            country: 'US',
            postal_code: '00000',
            state: 'N/A',
          },
        },
      })

      if (pmError) {
        setError(pmError.message || 'Error al procesar la tarjeta')
        setIsLoading(false)
        return
      }

      // Confirmar pago
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        'placeholder_client_secret', // Se actualizará desde el parent
        {
          payment_method: paymentMethod.id,
        }
      )

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
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          })

          const processData = await processResponse.json()

          if (!processResponse.ok) {
            throw new Error(processData.error || 'Error al procesar el pago')
          }

          // Success - NO llamar session update aquí para evitar loop
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

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Información de Pago
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span className="text-sm">Seguro</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Plan Summary */}
        <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{plan.name}</h3>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">${plan.price}</div>
              {plan.interval === 'month' && (
                <div className="text-sm text-gray-500">/mes</div>
              )}
              {plan.interval === 'one_time' && (
                <div className="text-sm text-gray-500">pago único</div>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">{plan.description}</p>
          
          {/* Features */}
          <div className="space-y-1">
            {plan.features.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Nombre completo</Label>
              <Input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Tu nombre completo"
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Correo electrónico</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          {/* Card Element - SIN LINK */}
          <div>
            <Label>Información de la tarjeta</Label>
            <div className="border rounded-md p-3 bg-white mt-2">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm p-3 bg-red-50 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            disabled={!stripe || isLoading || !customerName.trim() || !customerEmail.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando pago...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Completar pago de ${plan.price}
              </>
            )}
          </Button>

          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>🔒 Tu pago está protegido por cifrado SSL de 256 bits</p>
            <p>No almacenamos información de tarjetas de crédito</p>
          </div>
        </form>

        {/* Security Features */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              <span>Stripe Secure</span>
            </div>
            <div className="flex items-center">
              <Lock className="w-3 h-3 mr-1" />
              <span>SSL Protected</span>
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              <span>PCI Compliant</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PaymentFormCard(props: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string>('')

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ planType: props.planType }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create payment intent')
        }

        setClientSecret(data.clientSecret)
      } catch (error) {
        console.error('Payment intent error:', error)
      }
    }

    createPaymentIntent()
  }, [props.planType])

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
        borderRadius: '6px',
      },
    },
  }

  if (!clientSecret) {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-lg">
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
    <Elements stripe={stripePromise} options={elementsOptions}>
      <CheckoutForm {...props} />
    </Elements>
  )
} 