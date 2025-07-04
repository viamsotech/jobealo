"use client"

import { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Lock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

function ResetPasswordContent() {
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [success, setSuccess] = useState(false)
  const [validToken, setValidToken] = useState<boolean | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      router.push('/auth/signin')
      return
    }
    
    // Verify token is valid
    verifyToken(token)
  }, [token, router])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-reset-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (response.ok) {
        setValidToken(true)
      } else {
        setValidToken(false)
        setMessage({ 
          type: 'error', 
          text: 'El enlace de restablecimiento es inválido o ha expirado' 
        })
      }
    } catch (error) {
      console.error('Token verification error:', error)
      setValidToken(false)
      setMessage({ 
        type: 'error', 
        text: 'Error al verificar el enlace de restablecimiento' 
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage({ type: '', text: '' })

    // Validations
    if (passwordData.password !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden' })
      setIsLoading(false)
      return
    }

    if (passwordData.password.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' })
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: passwordData.password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess(true)
      setMessage({ 
        type: 'success', 
        text: 'Tu contraseña ha sido restablecida exitosamente' 
      })
    } catch (error) {
      console.error('Reset password error:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Error al restablecer la contraseña' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (validToken === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (validToken === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">Enlace Inválido</h1>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-xl text-center text-red-600">
                Enlace Expirado
              </CardTitle>
              <CardDescription className="text-center">
                El enlace de restablecimiento es inválido o ha expirado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Los enlaces de restablecimiento expiran después de 1 hora por seguridad.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  asChild
                  className="w-full"
                >
                  <Link href="/auth/forgot-password">
                    Solicitar nuevo enlace
                  </Link>
                </Button>

                <Button
                  variant="outline"
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

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Image
              src="/images/jobealologo2.svg"
              alt="Jobealo"
              width={120}
              height={30}
              className="h-8 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">¡Contraseña Restablecida!</h1>
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
                Tu contraseña ha sido restablecida exitosamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Ahora puedes iniciar sesión con tu nueva contraseña.
                </p>
              </div>

              <Button
                asChild
                className="w-full"
              >
                <Link href="/auth/signin">
                  Iniciar sesión ahora
                </Link>
              </Button>
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
          <h1 className="text-2xl font-bold text-gray-900">Nueva Contraseña</h1>
          <p className="text-gray-600 mt-2">
            Ingresa tu nueva contraseña
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center flex items-center justify-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>Restablecer contraseña</span>
            </CardTitle>
            <CardDescription className="text-center">
              Crea una nueva contraseña segura para tu cuenta
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
                <Label htmlFor="password">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    placeholder="Nueva contraseña (mínimo 6 caracteres)"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirma tu nueva contraseña"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Restableciendo...
                  </>
                ) : (
                  'Restablecer contraseña'
                )}
              </Button>
            </form>

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
      </div>
    </div>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
} 