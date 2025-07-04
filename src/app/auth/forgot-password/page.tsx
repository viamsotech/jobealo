"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      setEmailSent(true)
      setMessage({ 
        type: 'success', 
        text: 'Si existe una cuenta con este email, recibirás un enlace para restablecer tu contraseña.' 
      })
    } catch (error) {
      console.error('Forgot password error:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al enviar el email de restablecimiento' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
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
            <h1 className="text-2xl font-bold text-gray-900">Email Enviado</h1>
            <p className="text-gray-600 mt-2">
              Revisa tu bandeja de entrada
            </p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-xl text-center text-green-600">
                ¡Listo!
              </CardTitle>
              <CardDescription className="text-center">
                Te hemos enviado un enlace para restablecer tu contraseña
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Próximos pasos:</strong>
                </p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1">
                  <li>• Revisa tu bandeja de entrada</li>
                  <li>• Busca un email de Jobealo</li>
                  <li>• Haz clic en el enlace para restablecer</li>
                  <li>• Si no lo encuentras, revisa spam</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => setEmailSent(false)}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar otro email
                </Button>

                <Button
                  asChild
                  className="w-full"
                >
                  <Link href="/auth/signin">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al inicio de sesión
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

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
          <h1 className="text-2xl font-bold text-gray-900">¿Olvidaste tu contraseña?</h1>
          <p className="text-gray-600 mt-2">
            Te ayudamos a recuperar el acceso a tu cuenta
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">Restablecer contraseña</CardTitle>
            <CardDescription className="text-center">
              Ingresa tu email y te enviaremos un enlace para crear una nueva contraseña
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Message */}
            {message.text && (
              <div className={`p-3 text-sm rounded-lg flex items-center space-x-2 ${
                message.type === 'success' 
                  ? 'text-green-800 bg-green-50 border border-green-200' 
                  : 'text-red-800 bg-red-50 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@ejemplo.com"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500">
                  Ingresa el email con el que te registraste
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar enlace de restablecimiento
                  </>
                )}
              </Button>
            </form>

            {/* Links */}
            <div className="space-y-3">
              <div className="text-center text-sm">
                <span className="text-gray-600">¿Recordaste tu contraseña? </span>
                <Link 
                  href="/auth/signin" 
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Inicia sesión
                </Link>
              </div>

              <div className="text-center text-sm">
                <span className="text-gray-600">¿No tienes cuenta? </span>
                <Link 
                  href="/auth/signup" 
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Regístrate
                </Link>
              </div>
            </div>

            {/* Back to Home */}
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="w-full flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al inicio</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>
            <strong>Nota:</strong> Solo los usuarios registrados con email y contraseña 
            pueden restablecer su contraseña. Las cuentas de Google se gestionan 
            directamente en Google.
          </p>
        </div>
      </div>
    </div>
  )
} 