"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"

interface HeaderProps {
  onStartBuilder: () => void
}

export function Header({ onStartBuilder }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2">
          <Image
            src="/images/jobealologo2.svg"
            alt="Jobealo"
            width={120}
            height={30}
            className="h-8 w-auto"
          />
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          <button
            onClick={onStartBuilder}
            className="text-sm font-medium text-gray-700 hover:text-[#0052CC] transition-colors"
          >
            Construir CV
          </button>
          <a href="#pricing" className="text-sm font-medium text-gray-700 hover:text-[#0052CC] transition-colors">
            Precios
          </a>
          <a href="#contact" className="text-sm font-medium text-gray-700 hover:text-[#0052CC] transition-colors">
            Contacto
          </a>
          <a href="#login" className="text-sm font-medium text-gray-700 hover:text-[#0052CC] transition-colors">
            Iniciar Sesión
          </a>
        </nav>

        <Button onClick={onStartBuilder} className="bg-[#0052CC] hover:bg-[#0052CC]/90 text-white">
          Crear CV Gratis
        </Button>
      </div>
    </header>
  )
}
