"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return {
          title: 'Error de configuración',
          description: 'Hay un problema con la configuración del servidor. Intenta más tarde.',
          action: 'Intenta más tarde'
        }
      case 'AccessDenied':
        return {
          title: 'Acceso denegado',
          description: 'No tienes permiso para acceder a esta aplicación.',
          action: 'Contacta soporte'
        }
      case 'Verification':
        return {
          title: 'Error de verificación',
          description: 'La verificación no pudo ser completada. El enlace puede haber expirado.',
          action: 'Intenta registrarte de nuevo'
        }
      case 'OAuthAccountNotLinked':
        return {
          title: 'Cuenta no vinculada',
          description: 'Para confirmar tu identidad, inicia sesión con la misma cuenta que usaste originalmente.',
          action: 'Intenta con la cuenta original'
        }
      case 'EmailCreateAccount':
        return {
          title: 'Error al crear cuenta',
          description: 'No se pudo crear la cuenta con este email. Puede que ya exista una cuenta con este email.',
          action: 'Intenta iniciar sesión'
        }
      case 'Callback':
        return {
          title: 'Error de callback',
          description: 'Hubo un problema al procesar la respuesta del proveedor de autenticación.',
          action: 'Intenta de nuevo'
        }
      case 'OAuthCallback':
        return {
          title: 'Error de OAuth',
          description: 'No se pudo completar la autenticación con el proveedor seleccionado.',
          action: 'Intenta con otro método'
        }
      case 'OAuthSignin':
        return {
          title: 'Error de inicio de sesión',
          description: 'No se pudo iniciar sesión con el proveedor seleccionado.',
          action: 'Intenta de nuevo'
        }
      case 'SessionRequired':
        return {
          title: 'Sesión requerida',
          description: 'Necesitas iniciar sesión para acceder a esta página.',
          action: 'Inicia sesión'
        }
      case 'Default':
      default:
        return {
          title: 'Error de autenticación',
          description: 'Ha ocurrido un error durante el proceso de autenticación.',
          action: 'Intenta de nuevo'
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/images/jobealologo2.svg"
            alt="Jobealo"
            width={120}
            height={30}
            className="h-8 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Oops!</h1>
          <p className="text-gray-600 mt-2">
            Ha ocurrido un problema
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl text-center text-red-600">
              {errorInfo.title}
            </CardTitle>
            <CardDescription className="text-center">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error Code */}
            {error && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 font-mono">
                  Código de error: {error}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                asChild
                className="w-full"
              >
                <Link href="/auth/signin">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {errorInfo.action}
                </Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full"
              >
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio
                </Link>
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-600">
              <p>
                ¿Sigues teniendo problemas?{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  Contacta soporte
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Help */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>
            Sugerencias:
          </p>
          <ul className="mt-2 space-y-1">
            <li>• Verifica tu conexión a internet</li>
            <li>• Intenta cerrar y abrir el navegador</li>
            <li>• Asegúrate de que tu email sea válido</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
} 