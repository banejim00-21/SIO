// src/app/(auth)/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROLE_ROUTES, type RolNombre } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({ usuario: '', clave: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error en el login')
      }

      const rolRoute = ROLE_ROUTES[data.user.rol.nombre as RolNombre]
      router.push(rolRoute)
      router.refresh()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl">
                  <Building2 className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Sistema Integral de Obras
              </CardTitle>
              <CardDescription className="text-base">
                Universidad Nacional Daniel Alcides Carrión
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="usuario" className="text-sm font-semibold text-gray-700">
                  Usuario
                </Label>
                <Input
                  id="usuario"
                  type="text"
                  required
                  value={formData.usuario}
                  onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                  placeholder="Ingrese su usuario"
                  className="h-11 transition-all"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clave" className="text-sm font-semibold text-gray-700">
                  Contraseña
                </Label>
                <Input
                  id="clave"
                  type="password"
                  required
                  value={formData.clave}
                  onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                  placeholder="Ingrese su contraseña"
                  className="h-11 transition-all"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>

            {process.env.NODE_ENV === 'development' && (
              <div className="pt-4 border-t">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-semibold text-amber-900 mb-2">
                    🔑 Acceso de prueba (desarrollo)
                  </p>
                  <div className="space-y-1 text-xs text-amber-800">
                    <p>Usuario: <code className="bg-amber-100 px-1.5 py-0.5 rounded">admin</code></p>
                    <p>Contraseña: <code className="bg-amber-100 px-1.5 py-0.5 rounded">admin123</code></p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-gray-500 mt-6">
          © 2024 UNDAC - Todos los derechos reservados
        </p>
      </div>
    </div>
  )
}