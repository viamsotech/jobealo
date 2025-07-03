import { Card, CardContent } from "@/components/ui/card"
import { Zap, Target, Shield, Sparkles } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: <Zap className="w-8 h-8 text-[#0052CC]" />,
      title: "Rápido y Guiado",
      description: "Completa tu CV en minutos con nuestro flujo paso a paso optimizado.",
    },
    {
      icon: <Target className="w-8 h-8 text-[#00C47A]" />,
      title: "Optimizado para ATS",
      description: "Formato perfecto para pasar los sistemas de seguimiento de candidatos.",
    },
    {
      icon: <Shield className="w-8 h-8 text-[#0052CC]" />,
      title: "Revisable y Editable",
      description: "Navega entre secciones y previsualiza tu CV en tiempo real.",
    },
    {
      icon: <Sparkles className="w-8 h-8 text-[#00C47A]" />,
      title: "Mejorado con IA",
      description: "Optimiza tu contenido con sugerencias inteligentes de IA.",
    },
  ]

  return (
    <section className="py-20 px-4 md:px-6 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">¿Por qué elegir Jobealo?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            La forma más inteligente de crear un CV profesional que destaque ante reclutadores.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex justify-center">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
