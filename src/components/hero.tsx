"use client"

import { Button } from "@/components/ui/button"

interface HeroProps {
  onStartBuilder: () => void
}

export function Hero({ onStartBuilder }: HeroProps) {
  return (
    <section className="py-8 md:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-center">
          {/* Texto - Ocupa 2 columnas */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Constructor de CV con IA.
                <br />
                <span className="text-[#0052CC]">Tu CV listo en minutos.</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Jobealo automatiza cada paso de la creación de tu CV: escribe, edita, optimiza y asegura que el formato
                sea perfecto para sistemas ATS.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={onStartBuilder}
                size="lg"
                className="bg-[#0052CC] hover:bg-[#0052CC]/90 text-white px-8 py-3 text-lg"
              >
                Comenzar—es gratis
              </Button>
            </div>
          </div>

          {/* Imagen - Ocupa 3 columnas y es más grande */}
          <div className="lg:col-span-3">
            <div className="transform lg:scale-110 lg:translate-x-8 transition-transform duration-300 hover:scale-125 lg:hover:scale-125">
              <img
                src="/images/optimizadohero.png"
                alt="CV optimizado para ATS con diseño profesional"
                className="w-full h-auto block cursor-pointer drop-shadow-2xl hover:drop-shadow-[0_25px_50px_rgba(0,0,0,0.25)] transition-all duration-300"
                style={{ 
                  display: 'block',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                  background: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
