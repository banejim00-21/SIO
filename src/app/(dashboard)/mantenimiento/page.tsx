// src/app/(dashboard)/mantenimiento/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Wrench, 
  FileText, 
  Calendar,
  TrendingUp,
  Loader2,
  ArrowRight,
  Building2,
  FolderOpen,
  ClipboardList,
  BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

interface DashboardStats {
  totalReportes: number
  reportesMes: number
  obrasActivas: number
  avancePromedio: number
}

interface ObraInfo {
  id_obra: number
  nombre_obra: string
}

interface ReporteTecnicoInfo {
  avance_fisico: number
  observaciones: string | null
}

interface ReporteReciente {
  id_reporte: number
  fecha_generacion: string
  obra: ObraInfo
  reporte_tecnico: ReporteTecnicoInfo | null
}

interface ObraAsignada {
  id_obra: number
  nombre_obra: string
  ubicacion: string
  estado: string
  avance: number
}

interface DashboardData {
  stats: DashboardStats
  reportesRecientes: ReporteReciente[]
  obrasAsignadas: ObraAsignada[]
}

export default function MantenimientoDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalReportes: 0,
    reportesMes: 0,
    obrasActivas: 0,
    avancePromedio: 0
  })
  const [reportesRecientes, setReportesRecientes] = useState<ReporteReciente[]>([])
  const [obrasAsignadas, setObrasAsignadas] = useState<ObraAsignada[]>([])

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/mantenimiento/dashboard')
      
      if (!response.ok) throw new Error('Error al cargar dashboard')
      
      const data: DashboardData = await response.json()
      setStats(data.stats)
      setReportesRecientes(data.reportesRecientes || [])
      setObrasAsignadas(data.obrasAsignadas || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar el dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'EN_EJECUCION': return <Badge className="bg-blue-600">En Ejecución</Badge>
      case 'PLANEADA': return <Badge variant="secondary">Planeada</Badge>
      case 'CONCLUIDA': return <Badge className="bg-green-600">Concluida</Badge>
      case 'LIQUIDADA': return <Badge variant="outline">Liquidada</Badge>
      default: return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Panel de Mantenimiento</h1>
        <p className="text-muted-foreground">
          Gestión y supervisión de actividades de mantenimiento
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Obras Activas</p>
                <p className="text-3xl font-bold text-blue-600">{stats.obrasActivas}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reportes Este Mes</p>
                <p className="text-3xl font-bold text-green-600">{stats.reportesMes}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reportes</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalReportes}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avance Promedio</p>
                <p className="text-3xl font-bold text-amber-600">{stats.avancePromedio.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Button 
          className="h-24 flex flex-col gap-2 bg-amber-600 hover:bg-amber-700"
          onClick={() => router.push('/mantenimiento/reportes?nuevo=true')}
        >
          <FileText className="h-6 w-6" />
          <span>Nuevo Reporte Técnico</span>
        </Button>
        <Button 
          variant="outline"
          className="h-24 flex flex-col gap-2"
          onClick={() => router.push('/mantenimiento/documentos')}
        >
          <FolderOpen className="h-6 w-6" />
          <span>Gestión Documental</span>
        </Button>
        <Button 
          variant="outline"
          className="h-24 flex flex-col gap-2"
          onClick={() => router.push('/mantenimiento/calendario')}
        >
          <Calendar className="h-6 w-6" />
          <span>Calendario</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reportes Recientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reportes Recientes</CardTitle>
                <CardDescription>Últimos reportes técnicos registrados</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => router.push('/mantenimiento/reportes')}>
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {reportesRecientes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay reportes recientes
              </p>
            ) : (
              <div className="space-y-3">
                {reportesRecientes.map((reporte) => (
                  <div 
                    key={reporte.id_reporte} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/mantenimiento/reportes`)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{reporte.obra.nombre_obra}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(reporte.fecha_generacion).toLocaleDateString('es-PE')}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-lg">
                      {reporte.reporte_tecnico?.avance_fisico || 0}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Obras Asignadas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Obras en Seguimiento</CardTitle>
                <CardDescription>Estado actual de las obras</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {obrasAsignadas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay obras activas
              </p>
            ) : (
              <div className="space-y-3">
                {obrasAsignadas.map((obra) => (
                  <div key={obra.id_obra} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{obra.nombre_obra}</div>
                        <div className="text-sm text-muted-foreground">{obra.ubicacion}</div>
                      </div>
                      {getEstadoBadge(obra.estado)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avance</span>
                        <span className="font-medium">{obra.avance}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-600 h-2 rounded-full transition-all" 
                          style={{ width: `${obra.avance}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Acceso Rápido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Acceso Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button 
              variant="outline" 
              className="h-16 justify-start"
              onClick={() => router.push('/mantenimiento/documentos')}
            >
              <FolderOpen className="h-5 w-5 mr-3 text-amber-600" />
              <div className="text-left">
                <div className="font-medium">Documentos</div>
                <div className="text-xs text-muted-foreground">Gestión documental</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 justify-start"
              onClick={() => router.push('/mantenimiento/reportes')}
            >
              <BarChart3 className="h-5 w-5 mr-3 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Reportes</div>
                <div className="text-xs text-muted-foreground">Reportes técnicos</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 justify-start"
              onClick={() => router.push('/mantenimiento/calendario')}
            >
              <Calendar className="h-5 w-5 mr-3 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Calendario</div>
                <div className="text-xs text-muted-foreground">Programación</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
