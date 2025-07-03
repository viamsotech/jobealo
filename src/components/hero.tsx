"use client"

import { Button } from "@/components/ui/button"

interface HeroProps {
  onStartBuilder: () => void
}

export function Hero({ onStartBuilder }: HeroProps) {
  return (
    <section className="py-8 md:py-20 px-4 md:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="space-y-6 md:space-y-8">
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

          <div className="flex-1 p-0 m-0">
            <img
              src="/images/optimizadohero.png"
              alt="CV optimizado para ATS con diseño profesional"
              className="w-full h-auto max-w-full rounded-2xl shadow-2xl drop-shadow-xl block m-0 p-0 border-0 outline-0"
              style={{ 
                display: 'block',
                margin: 0,
                padding: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
