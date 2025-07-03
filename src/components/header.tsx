"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Menu, X } from "lucide-react"

interface HeaderProps {
  onStartBuilder: () => void
}

export function Header({ onStartBuilder }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2">
          <Image
            src="/images/jobealologo2.svg"
            alt="Jobealo"
            width={120}
            height={30}
            className="h-8 w-auto"
          />
        </div>

        {/* Desktop Navigation */}
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

        {/* Desktop CTA Button */}
        <Button onClick={onStartBuilder} className="hidden md:flex bg-[#0052CC] hover:bg-[#0052CC]/90 text-white">
          Crear CV Gratis
        </Button>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          {isMenuOpen ? (
            <X className="w-6 h-6 text-gray-700" />
          ) : (
            <Menu className="w-6 h-6 text-gray-700" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-b shadow-lg">
          <nav className="container mx-auto max-w-6xl px-4 py-4 space-y-4">
            <button
              onClick={() => {
                onStartBuilder()
                closeMenu()
              }}
              className="block w-full text-left text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2"
            >
              Construir CV
            </button>
            <a
              href="#pricing"
              onClick={closeMenu}
              className="block text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2"
            >
              Precios
            </a>
            <a
              href="#contact"
              onClick={closeMenu}
              className="block text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2"
            >
              Contacto
            </a>
            <a
              href="#login"
              onClick={closeMenu}
              className="block text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2"
            >
              Iniciar Sesión
            </a>
            <div className="pt-4 border-t">
              <Button
                onClick={() => {
                  onStartBuilder()
                  closeMenu()
                }}
                className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90 text-white"
              >
                Crear CV Gratis
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
