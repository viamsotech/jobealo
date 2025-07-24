"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AuthButton } from "@/components/auth/auth-button"
import Image from "next/image"
import { Menu, X, FileText } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface HeaderProps {
  onStartBuilder?: () => void
}

export function Header({ onStartBuilder }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleStartBuilder = () => {
    if (onStartBuilder) {
      onStartBuilder()
    } else {
      window.location.href = '/cvs'
    }
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleMyCVs = () => {
    window.location.href = '/cvs'
    closeMenu()
  }

  const handleLogoClick = () => {
    window.location.href = '/'
  }

  return (
    <header className="sticky top-0 z-60 w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={140}
              height={35}
              className="md:w-[180px] md:h-[45px] cursor-pointer"
              onClick={handleLogoClick}
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={handleStartBuilder}
              className="text-gray-700 hover:text-[#0052CC] font-medium transition-colors"
            >
              Construir CV
            </button>
            {session && (
              <button
                onClick={handleMyCVs}
                className="text-gray-700 hover:text-[#0052CC] font-medium transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Mis CVs
              </button>
            )}
            <a
              href="/#pricing"
              className="text-gray-700 hover:text-[#0052CC] font-medium transition-colors"
            >
              Precios
            </a>
            <a
              href="/#contact"
              className="text-gray-700 hover:text-[#0052CC] font-medium transition-colors"
            >
              Contacto
            </a>
          </nav>

          {/* Desktop Auth Button */}
          <div className="hidden md:flex items-center space-x-4">
            <AuthButton />
            <Button
              onClick={handleStartBuilder}
              className="bg-[#0052CC] hover:bg-[#0052CC]/90 text-white px-6 py-2"
            >
              Crear CV Gratis
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-[#0052CC] hover:bg-gray-100 transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-70">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="py-4 space-y-4">
                {session && (
                  <button
                    onClick={handleMyCVs}
                    className="w-full text-left text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Mis CVs</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    handleStartBuilder()
                    closeMenu()
                  }}
                  className="w-full text-left text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2"
                >
                  Construir CV
                </button>
                <a
                  href="/#pricing"
                  onClick={closeMenu}
                  className="w-full text-left text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2 inline-block"
                >
                  Precios
                </a>
                <a
                  href="/#contact"
                  onClick={closeMenu}
                  className="w-full text-left text-base font-medium text-gray-700 hover:text-[#0052CC] transition-colors py-2 inline-block"
                >
                  Contacto
                </a>
                
                {/* Mobile Auth Button */}
                <div className="py-2">
                  <AuthButton />
                </div>
                
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleStartBuilder()
                      closeMenu()
                    }}
                    className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90 text-white"
                  >
                    Crear CV Gratis
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
