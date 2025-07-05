import Image from 'next/image'

interface TestimonialsProps {
  onStartBuilder?: () => void
}

const testimonials = [
  {
    name: "María González",
    role: "Recién graduada en Marketing",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "Jobealo fue un salvavidas. Sus herramientas me ayudaron a identificar las habilidades clave que necesitaba destacar y me conectaron con las oportunidades adecuadas. ¡Conseguí el trabajo de mis sueños en un mes!",
    date: "Jun 15, 2025"
  },
  {
    name: "Carlos Mendoza",
    role: "Profesional a mitad de carrera",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "Debo decir que estoy muy impresionado. Utilicé la herramienta para generar mi nuevo currículum y una carta de presentación relevante para una serie de trabajos y recibí respuesta de cada uno de ellos.",
    date: "Jun 8, 2025"
  },
  {
    name: "Ana Rodríguez",
    role: "Administradora de Empresas",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "Finalmente comencé a obtener entrevistas en empresas locales y logré las entrevistas con la ayuda de Jobealo. Gracias por esta herramienta tan útil.",
    date: "Jun 3, 2025"
  },
  {
    name: "Luis Herrera",
    role: "Contador Público",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "¡Adiós a las cartas de presentación genéricas, hola ofertas de trabajo! Jobealo me ayudó a crear contenido personalizado que realmente destaca.",
    date: "May 28, 2025"
  },
  {
    name: "Patricia Vega",
    role: "Ing. en Sistemas",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "¡ME ALEGRO MUCHO DE HABERME SUSCRITO! Conseguí un trabajo en una semana utilizando el kit de solicitud y la ayuda para la entrevista.",
    date: "May 22, 2025"
  },
  {
    name: "Roberto Silva",
    role: "Especialista en Ventas",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "La herramienta de preparación de entrevistas de Jobealo fue fenomenal. Utilizó la IA para analizar mis patrones de habla y proporcionó comentarios personalizados, lo que me hizo tener mucha más confianza en mis entrevistas. Realmente marcó la diferencia.",
    date: "May 15, 2025"
  },
  {
    name: "Sofía Ramírez",
    role: "Psicóloga Organizacional",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "Solía temer escribir cartas de presentación, pero esta herramienta de IA lo ha hecho pan comido. Es como si leyera mi mente y supiera exactamente qué decir. ¡Muy recomendable!",
    date: "May 10, 2025"
  },
  {
    name: "Diego Morales",
    role: "Gerente de Proyectos",
    avatar: "/api/placeholder/40/40",
    rating: 5,
    text: "El creador de currículums impulsado por IA de Jobealo me ayudó a elaborar un currículum que realmente se destacara. Recibí devoluciones de llamadas de empresas locales a las que he estado mirando durante años. Esta herramienta realmente entiende el mercado laboral.",
    date: "May 5, 2025"
  }
]

export function Testimonials({ onStartBuilder }: TestimonialsProps) {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Opiniones de profesionales que confían en
          </h2>
          
          {/* Logo with more prominence */}
          <div className="flex justify-center mb-6">
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={220}
              height={55}
              className="md:w-[280px] md:h-[70px]"
            />
          </div>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Únete a cientos de profesionales en Latinoamérica han transformado su búsqueda laboral con nuestras herramientas de IA.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 p-6"
            >
              {/* User Info */}
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {testimonial.name.charAt(0)}
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold text-gray-900 text-sm">{testimonial.name}</h4>
                  <p className="text-gray-600 text-xs">{testimonial.role}</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-4 h-4 text-yellow-400 fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                {testimonial.text}
              </p>

              {/* Date */}
              <p className="text-gray-500 text-xs">
                {testimonial.date}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ¿Listo para ser el próximo en conseguir tu trabajo ideal?
            </h3>
            <p className="text-gray-600 mb-6">
              Únete a miles de profesionales que ya han transformado su carrera con Jobealo.
            </p>
            <button 
              onClick={onStartBuilder}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Comenzar Ahora - Es Gratis
            </button>
          </div>
        </div>
      </div>
    </section>
  )
} 