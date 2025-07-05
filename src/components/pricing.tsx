"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Users, Sparkles, Mail, FileText, Star, DollarSign } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface PricingFeature {
  text: string
  included: boolean
  isPaid?: boolean
}

interface PricingPlan {
  name: string
  price: string
  originalPrice?: string
  description: string
  features: PricingFeature[]
  popular?: boolean
  badge?: string
  badgeColor?: string
  buttonText: string
  buttonVariant?: 'default' | 'outline'
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Freemium',
    price: '$0',
    description: 'Acceso completo hasta 3 descargas',
    features: [
      { text: 'Acceso completo hasta 3 descargas', included: true },
      { text: 'Plantillas Optimizada ATS premium', included: true },
      { text: 'Todas las partes del CV', included: true },
      { text: 'Mejoras con IA incluidas', included: true },
      { text: 'Traducciones al inglés con IA incluidas', included: true },
      { text: 'Después de 3 descargas:', included: true, isPaid: false },
      { text: '• Descargas adicionales $1.99 c/u', included: true, isPaid: true },
      { text: '• Traducciones al inglés $1.99 c/u', included: true, isPaid: true },
    ],
    buttonText: 'Comenzar Gratis',
    buttonVariant: 'outline',
  },
  {
    name: 'Pro',
    price: '$14.99',
    description: 'Para profesionales serios',
    features: [
      { text: 'Descargas ilimitadas', included: true },
      { text: 'Plantillas Optimizada ATS premium', included: true },
      { text: 'Mejoras con IA ilimitadas', included: true },
      { text: 'Traducción automática al inglés ilimitada', included: true },
      { text: 'Carta de presentación', included: true },
      { text: 'Correos para vacantes con IA ilimitado', included: true },
      { text: 'Generador de CV a partir de una vacante ilimitado', included: true },
    ],
    buttonText: 'Comenzar Ahora',
  },
  {
    name: 'Lifetime',
    price: '$59.99',
    originalPrice: '$99.99',
    description: 'La mejor inversión para tu carrera',
    features: [
      { text: 'Todo de Pro incluido', included: true },
      { text: 'Descargas ilimitadas de por vida', included: true },
      { text: 'Todas las funciones futuras', included: true },
      { text: 'Cartas de presentación personalizadas', included: true },
      { text: 'Correos para vacantes con IA', included: true },
      { text: 'Soporte prioritario', included: true },
      { text: 'Acceso a beta features', included: true },
      { text: 'Sin pagos mensuales', included: true },
    ],
    popular: true,
    badge: 'Recomendado',
    badgeColor: 'bg-yellow-500',
    buttonText: 'Comprar de por Vida',
  },
]

export default function Pricing() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSelectPlan = (planName: string) => {
    if (planName === 'Freemium') {
      if (!session) {
        router.push('/auth/signin')
      } else {
        router.push('/')
      }
      return
    }

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Redirect to checkout page
    const planParam = planName === 'Pro' ? 'PRO' : 'LIFETIME'
    router.push(`/checkout?plan=${planParam}`)
  }

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Planes que se adaptan a ti
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Desde emprendedores hasta profesionales establecidos, tenemos el plan perfecto para impulsar tu carrera
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative flex flex-col h-full ${plan.popular ? 'border-2 border-blue-500 shadow-lg scale-105' : 'border border-gray-200'}`}
            >
              {plan.badge && (
                <Badge 
                  className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${plan.badgeColor} text-white`}
                >
                  {plan.badge}
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  {plan.name === 'Freemium' && <Users className="w-8 h-8 text-gray-500" />}
                  {plan.name === 'Pro' && <Crown className="w-8 h-8 text-blue-500" />}
                  {plan.name === 'Lifetime' && <Sparkles className="w-8 h-8 text-yellow-500" />}
                </div>
                
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">{plan.description}</CardDescription>
                
                <div className="mt-4">
                  {plan.originalPrice && (
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-lg text-gray-400 line-through">{plan.originalPrice}</span>
                      <Badge variant="destructive" className="text-xs">OFERTA</Badge>
                    </div>
                  )}
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.name === 'Pro' && <span className="text-gray-600 ml-2">/mes</span>}
                  {plan.name === 'Lifetime' && (
                    <div className="text-gray-600 text-sm mt-1">
                      <div className="font-semibold text-green-600">Pago único • Sin mensualidades</div>
                      <div className="text-xs">Acceso de por vida garantizado</div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      {feature.isPaid ? (
                        <DollarSign 
                          className="w-5 h-5 mr-3 mt-0.5 text-orange-500" 
                        />
                      ) : (
                        <Check 
                          className={`w-5 h-5 mr-3 mt-0.5 ${
                            feature.included ? 'text-green-500' : 'text-gray-300'
                          }`} 
                        />
                      )}
                      <span className={
                        feature.included 
                          ? feature.isPaid 
                            ? 'text-orange-600 font-medium' 
                            : 'text-gray-900' 
                          : 'text-gray-400'
                      }>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  variant={plan.buttonVariant || 'default'}
                  onClick={() => handleSelectPlan(plan.name)}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
