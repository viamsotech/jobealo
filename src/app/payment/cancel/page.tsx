"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { XCircle, ArrowLeft, CreditCard, Crown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function PaymentCancel() {
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
          <h1 className="text-3xl font-bold text-gray-900">Pago Cancelado</h1>
          <p className="text-gray-600 mt-2">
            No te preocupes, puedes intentar de nuevo cuando quieras
          </p>
        </div>

        {/* Cancel Card */}
        <Card className="mb-6">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-gray-500" />
              </div>
            </div>
            <CardTitle className="text-2xl text-gray-700">
              Pago Cancelado
            </CardTitle>
            <CardDescription className="text-lg">
              El proceso de pago ha sido cancelado. Tu cuenta no ha sido modificada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 text-blue-900">
                ¿Qué pasó?
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• El proceso de pago fue cancelado antes de completarse</li>
                <li>• No se realizó ningún cargo a tu tarjeta</li>
                <li>• Tu cuenta sigue en el plan actual</li>
                <li>• Puedes intentar de nuevo cuando lo desees</li>
              </ul>
            </div>

            {/* Reminder of Benefits */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center text-yellow-900">
                <Crown className="w-5 h-5 mr-2 text-yellow-600" />
                Recuerda lo que te estás perdiendo:
              </h3>
              <ul className="space-y-2 text-sm text-yellow-800">
                <li>• Descargas ilimitadas en español e inglés</li>
                <li>• Mejoras con IA sin límites</li>
                <li>• Traducción automática al inglés</li>
                <li>• Soporte prioritario</li>
                <li>• Herramientas de cartas de presentación (plan Lifetime)</li>
              </ul>
            </div>

            {/* Call to Action */}
            <div className="space-y-4">
              <Button asChild className="w-full" size="lg">
                <Link href="/#pricing">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Intentar de nuevo
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  Continuar con plan gratuito
                </Link>
              </Button>
            </div>

            {/* Help */}
            <div className="pt-4 border-t text-center text-sm text-gray-600">
              <p className="mb-2">
                <strong>¿Tuviste problemas con el pago?</strong>
              </p>
              <p>
                Contáctanos en{' '}
                <a href="mailto:soporte@jobealo.com" className="text-blue-600 hover:text-blue-500">
                  soporte@jobealo.com
                </a>{' '}
                y te ayudaremos a resolverlo.
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