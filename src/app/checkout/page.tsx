"use client"

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Shield, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PaymentForm from '@/components/payment/payment-form'
import { type PlanType, STRIPE_PRODUCTS } from '@/lib/stripe'
import Image from 'next/image'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [planType, setPlanType] = useState<PlanType | null>(null)

  useEffect(() => {
    const plan = searchParams.get('plan') as PlanType
    if (plan && STRIPE_PRODUCTS[plan]) {
      setPlanType(plan)
    } else {
      router.push('/#pricing')
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
    }
  }, [session, router])

  const handleSuccess = () => {
    router.push('/checkout/success')
  }

  const handleCancel = () => {
    router.push('/#pricing')
  }

  if (!planType || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const plan = STRIPE_PRODUCTS[planType]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
            <div className="h-6 w-px bg-gray-300" />
            <span className="text-gray-600 font-medium">Checkout</span>
          </div>
          <Button variant="ghost" onClick={handleCancel} className="flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Volver</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Side - Plan Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Completar tu compra
              </h1>
              <p className="text-gray-600">
                Únete a miles de profesionales que ya usan Jobealo para crear CVs exitosos.
              </p>
            </div>

            {/* Plan Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
                  <p className="text-gray-600 mt-1">{plan.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">${plan.price}</div>
                  {plan.interval === 'month' && (
                    <div className="text-sm text-gray-500">/mes</div>
                  )}
                  {plan.interval === 'one_time' && (
                    <div className="text-sm text-gray-500">pago único</div>
                  )}
                </div>
              </div>

              {/* Plan Features */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Lo que incluye:</h3>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-600">
                      <Shield className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lifetime Discount */}
              {planType === 'LIFETIME' && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-green-800">
                    <Shield className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">
                      ¡Ahorras $40! Precio regular: $99.99
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Security Badges */}
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Lock className="w-4 h-4 mr-2" />
                <span>Pago seguro con Stripe</span>
              </div>
              <div className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                <span>Cifrado SSL 256-bit</span>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{session.user.name}</div>
                  <div className="text-sm text-gray-500">{session.user.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Form */}
          <div className="lg:sticky lg:top-8">
            <PaymentForm
              planType={planType}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <span>© 2024 Jobealo</span>
              <span>•</span>
              <a href="#" className="hover:text-gray-700">Términos</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-700">Privacidad</a>
            </div>
            <div className="flex items-center space-x-4">
              <span>Soporte: soporte@jobealo.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
} 