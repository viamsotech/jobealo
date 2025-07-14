"use client"

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

const faqData: FAQItem[] = [
  {
    question: "¿Cómo funciona?",
    answer: "Jobealo es muy simple de usar. Completas tu información personal, experiencia y habilidades paso a paso. Nuestra IA optimiza automáticamente tu CV para sistemas ATS, genera traducciones al inglés, y crea cartas de presentación personalizadas. Todo en cuestión de minutos."
  },
  {
    question: "¿Hay una prueba gratuita?",
    answer: "¡Sí! Ofrecemos acceso completo gratuito hasta 3 descargas. Puedes crear tu CV, usar todas las funciones de IA, generar traducciones y cartas de presentación sin costo alguno. Después de las 3 descargas, puedes pagar por descarga individual ($1.99) o upgrade a nuestros planes."
  },
  {
    question: "¿Qué incluye la suscripción premium?",
    answer: "Nuestro plan Pro ($14.99/mes) incluye descargas ilimitadas, mejoras con IA ilimitadas, traducciones automáticas ilimitadas y cartas de presentación. El plan Lifetime ($59.99 pago único) incluye todo lo anterior de por vida, más funciones futuras, emails para vacantes con IA y soporte prioritario."
  },
  {
    question: "¿Qué pasa si me falta una función?",
    answer: "Escuchamos a nuestra comunidad. Si necesitas una función específica, puedes contactarnos a través del soporte y evaluaremos incluirla en futuras actualizaciones. Los usuarios Lifetime tienen acceso prioritario a todas las nuevas funciones."
  },
  {
    question: "¿Puedo encontrar trabajos directamente en este sitio web?",
    answer: "Jobealo se enfoca en crear los mejores CVs y materiales de postulación. No somos un portal de empleos, pero nuestras herramientas están optimizadas para plataformas como LinkedIn, Indeed, y portales de empleo locales en Latinoamérica."
  },
  {
    question: "¿Ofrecen descuentos para estudiantes?",
    answer: "Actualmente no tenemos descuentos específicos para estudiantes, pero nuestro plan Freemium es perfecto para estudiantes que buscan su primer empleo. Con 3 descargas gratuitas y todas las funciones de IA incluidas, es ideal para comenzar tu búsqueda laboral."
  },
  {
    question: "¿Tienes una API?",
    answer: "No tenemos una API de acceso público. Sin embargo, si estás interesado en obtener acceso a nuestra infraestructura avanzada, envíanos un correo electrónico a support@jobealo.com y haremos todo lo posible para ofrecer una asociación beneficiosa para todos."
  },
  {
    question: "¿Se enterará mi empleador de que utilicé Jobealo?",
    answer: "No, tu empleador no se enterará. Jobealo es una herramienta privada que te ayuda a crear mejores CVs y materiales de postulación. No contactamos empleadores ni compartimos información personal. Tu privacidad es nuestra prioridad."
  }
]

export function FAQ() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <section id="faq" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Preguntas frecuentes
          </h2>
          <p className="text-xl text-gray-600">
            Resolvemos las dudas más comunes sobre Jobealo
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <h3 className="text-lg font-semibold text-gray-900 pr-4">
                  {item.question}
                </h3>
                <div className="flex-shrink-0">
                  {openItems.includes(index) ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </button>
              
              {openItems.includes(index) && (
                <div className="px-6 pb-5">
                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-gray-700 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Tienes más preguntas?
            </h3>
            <p className="text-gray-600 mb-6">
              Nuestro equipo está aquí para ayudarte. Contáctanos y te responderemos lo antes posible.
            </p>
            <button 
              onClick={() => window.location.href = 'mailto:soporte@jobealo.com'}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Contactar Soporte
            </button>
          </div>
        </div>
      </div>
    </section>
  )
} 