"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"

interface PricingProps {
  onStartBuilder: () => void
}

export function Pricing({ onStartBuilder }: PricingProps) {
  return (
    <section id="pricing" className="py-20 px-4 md:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Planes simples y transparentes</h2>
          <p className="text-xl text-gray-600">Elige el plan que mejor se adapte a tus necesidades profesionales.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative border-2 border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold">Freemium</CardTitle>
              <div className="text-4xl font-bold text-gray-900 mt-4">Gratis</div>
              <p className="text-gray-600 mt-2">Prueba cómo funciona. Sin tarjeta requerida.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>2 descargas gratuitas</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>Todas las secciones del CV</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>Optimización ATS básica</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>Descargas adicionales: $1.99 c/u</span>
                </li>
              </ul>
              <Button onClick={onStartBuilder} className="w-full bg-gray-100 text-gray-900 hover:bg-gray-200">
                Comenzar Gratis
              </Button>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-[#0052CC] bg-gradient-to-br from-[#0052CC] to-[#0052CC]/90 text-white">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-[#00C47A] text-white px-4 py-1 rounded-full text-sm font-semibold">Más Popular</div>
            </div>
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-2xl font-bold">Lifetime</CardTitle>
              <div className="text-4xl font-bold mt-4">$49.99</div>
              <p className="text-blue-100 mt-2">Acceso completo con un solo pago.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3">
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>Descargas ilimitadas</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>Mejoras con IA ilimitadas</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>Plantillas premium</span>
                </li>
                <li className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-[#00C47A]" />
                  <span>Soporte prioritario</span>
                </li>
              </ul>
              <Button onClick={onStartBuilder} className="w-full bg-white text-[#0052CC] hover:bg-gray-100">
                Comenzar Ahora
              </Button>
              <div className="flex items-center justify-center space-x-2 text-sm text-blue-100">
                <Check className="w-4 h-4 text-[#00C47A]" />
                <span>Garantía de devolución 100%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
