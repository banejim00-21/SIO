// src/app/(dashboard)/liquidacion/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  DollarSign, 
  FileText, 
  FolderOpen, 
  TrendingUp,
  Loader2,
  ArrowRight,
  Building2,
  Calculator,
  Receipt,
  Archive
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardStats {
  obrasActivas: number
  presupuestoTotal: number
  gastoTotal: number
  documentosMes: number
  expedientesGenerados: number
  obrasRecientes: Array<{
    id_obra: number
    nombre_obra: string
    estado: string
    presupuesto_inicial: number
  }>
}

export default function LiquidacionDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    obrasActivas: 0,
    presupuestoTotal: 0,
    gastoTotal: 0,
    documentosMes: 0,
    expedientesGenerados: 0,
    obrasRecientes: []
  })

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch('/api/liquidacion/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount)
  }

  const getEstadoBadge = (estado: string) => {
    const estilos: Record<string, string> = {
      'PLANEADA': 'bg-yellow-100 text-yellow-800',
      'EN_EJECUCION': 'bg-blue-100 text-blue-800',
      'CONCLUIDA': 'bg-green-100 text-green-800',
      'LIQUIDADA': 'bg-purple-100 text-purple-800'
    }
    return estilos[estado] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  const porcentajeEjecucion = stats.presupuestoTotal > 0 
    ? ((stats.gastoTotal / stats.presupuestoTotal) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Liquidación</h1>
        <p className="text-muted-foreground">
          Gestión presupuestal y cierre financiero de obras
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras Activas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.obrasActivas}</div>
            <p className="text-xs text-muted-foreground">
              En ejecución o por liquidar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presupuesto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.presupuestoTotal)}</div>
            <p className="text-xs text-muted-foreground">
              Suma de todas las obras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gasto Ejecutado</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.gastoTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {porcentajeEjecucion}% del presupuesto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos del Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documentosMes}</div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), 'MMMM yyyy', { locale: es })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/liquidacion/documentos">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-emerald-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Documentos</h3>
                  <p className="text-sm text-muted-foreground">Gestión documental</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/liquidacion/presupuestos">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-emerald-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Calculator className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Presupuestos</h3>
                  <p className="text-sm text-muted-foreground">Partidas y montos</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/liquidacion/gastos">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-emerald-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Gastos</h3>
                  <p className="text-sm text-muted-foreground">Ejecución financiera</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/liquidacion/expedientes">
          <Card className="cursor-pointer transition-all hover:shadow-md hover:border-emerald-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Archive className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Expedientes</h3>
                  <p className="text-sm text-muted-foreground">Consolidación digital</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Obras Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Obras Recientes</CardTitle>
          <CardDescription>Últimas obras en gestión</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.obrasRecientes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No hay obras registradas
            </p>
          ) : (
            <div className="space-y-4">
              {stats.obrasRecientes.map((obra) => (
                <div 
                  key={obra.id_obra}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{obra.nombre_obra}</h4>
                    <p className="text-sm text-muted-foreground">
                      Presupuesto: {formatCurrency(obra.presupuesto_inicial || 0)}
                    </p>
                  </div>
                  <Badge className={getEstadoBadge(obra.estado)}>
                    {obra.estado.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indicador de Ejecución */}
      <Card>
        <CardHeader>
          <CardTitle>Ejecución Presupuestal Global</CardTitle>
          <CardDescription>Comparativo presupuesto vs gasto ejecutado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Ejecutado</span>
              <span className="font-medium">{porcentajeEjecucion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full ${
                  Number(porcentajeEjecucion) > 100 
                    ? 'bg-red-500' 
                    : Number(porcentajeEjecucion) > 80 
                      ? 'bg-yellow-500' 
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(Number(porcentajeEjecucion), 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Gasto: {formatCurrency(stats.gastoTotal)}</span>
              <span>Presupuesto: {formatCurrency(stats.presupuestoTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
