import Image from 'next/image'

interface AIToolsProps {
  onStartBuilder?: () => void
}

const aiTools = [
  {
    title: "Creador de CVs con IA",
    description: "Genera currículums profesionales optimizados para ATS. La IA personaliza cada sección según tu perfil profesional.",
    image: "/images/grid/creador de cv con ia.png",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    title: "Cartas de Presentación Inteligentes",
    description: "Crea cartas de presentación personalizadas que destacan tus fortalezas y se adaptan a cada oportunidad laboral.",
    image: "/images/grid/carta de presentacion.png",
    gradient: "from-pink-500 to-rose-500"
  },
  {
    title: "Traductor CV Español-Inglés",
    description: "Traduce tu currículum manteniendo el contexto profesional. Expande tus oportunidades al mercado internacional.",
    image: "/images/grid/traductor de cv.png",
    gradient: "from-green-500 to-emerald-600"
  },
  {
    title: "Adaptador de CV por Vacante",
    description: "Optimiza tu currículum para cada oferta laboral. La IA ajusta palabras clave y enfoque según los requisitos.",
    image: "/images/grid/cv con vacante ia.png",
    gradient: "from-orange-500 to-red-500"
  },
  {
    title: "Hub de Currículums",
    description: "Almacena, organiza y gestiona múltiples versiones de tu CV. Accede a todos tus currículums desde cualquier lugar.",
    image: "/images/grid/hub de cv.png",
    gradient: "from-indigo-500 to-blue-600"
  },
  {
    title: "Emails de Postulación con IA",
    description: "Genera emails profesionales para postulaciones. La IA crea mensajes persuasivos que aumentan tus posibilidades.",
    image: "/images/grid/email con ia.png",
    gradient: "from-purple-500 to-pink-500"
  }
]

export function AITools({ onStartBuilder }: AIToolsProps) {
  return (
    <section id="herramientas" className="py-20 bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Herramientas Inteligentes
            <span className="block text-blue-600">para tu Éxito Profesional</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Potencia tu búsqueda laboral con nuestras herramientas de IA. 
            Cada funcionalidad está diseñada para maximizar tus oportunidades de empleo.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {aiTools.map((tool, index) => (
            <div
              key={index}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              
              {/* Content */}
              <div className="relative p-8">
                {/* Image Container */}
                <div className="mb-6 relative">
                  <div className="w-full h-48 bg-gray-100 rounded-xl overflow-hidden relative">
                    <Image
                      src={tool.image}
                      alt={tool.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${tool.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl`} />
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
                    {tool.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                {/* Hover Indicator */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${tool.gradient}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 rounded-full text-blue-700 font-medium mb-8">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Todas las herramientas incluidas en nuestros planes
          </div>
          
          {/* Main CTA Button */}
          <div>
            <button 
              onClick={onStartBuilder}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🚀 ¡Empieza ya es gratis!
            </button>
            <p className="text-sm text-gray-500 mt-3">
              Sin tarjeta de crédito • 3 descargas gratuitas
            </p>
          </div>
        </div>
      </div>
    </section>
  )
} 