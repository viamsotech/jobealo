import Image from "next/image"

export function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-white py-12 px-4 md:px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto brightness-0 invert"
            />
            <p className="text-gray-400">La plataforma más inteligente para crear CVs optimizados para ATS.</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Producto</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Constructor de CV
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Plantillas
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Ejemplos
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Soporte</h3>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Centro de Ayuda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contacto
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Contacto</h3>
            <ul className="space-y-2 text-gray-400">
              <li>soporte@jobealo.com</li>
              <li>+1 (555) 123-4567</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Jobealo. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
