// src/app/(dashboard)/infraestructura/proyectos/[id]/page.tsx
'use client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft,
  Building2, 
  MapPin, 
  Users, 
  TrendingUp,
  Loader2,
  DollarSign,
  ListTree,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface Actividad {
  id_actividad: number
  nombre_actividad: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string
  duracion: number
  responsable: {
    id_usuario: number
    nombre: string
  }
}

interface Fase {
  id_fase: number
  nombre_fase: string
  fecha_inicio: string
  fecha_fin: string
  actividades: Actividad[]
}

interface ReporteTecnico {
  avance_fisico: number
  hitos_cumplidos: string | null
  observaciones: string | null
}

interface Reporte {
  id_reporte: number
  tipo_reporte: string
  fecha_generacion: string
  reporte_tecnico: ReporteTecnico | null
  usuario: { nombre: string }
}

interface HistorialEstado {
  id_historial: number
  estado: string
  fecha_cambio: string
  justificacion: string
  usuario: { nombre: string }
}

interface Obra {
  id_obra: number
  nombre_obra: string
  ubicacion: string
  coordenadas: string | null
  estado: string
  presupuesto_inicial: number
  fecha_inicio_prevista: string
  fecha_creacion: string
  responsable: {
    id_usuario: number
    nombre: string
    correo: string
    rol: { nombre: string }
  }
  fases: Fase[]
  reportes: Reporte[]
  historial_estados: HistorialEstado[]
}

interface Estadisticas {
  totalFases: number
  totalActividades: number
  actividadesCompletadas: number
  actividadesEnCurso: number
  actividadesPendientes: number
  avanceFisico: number
  presupuestoInicial: number
  presupuestoEjecutado: number
  porcentajeEjecucion: number
  totalDocumentos: number
  totalReportes: number
}

export default function ProyectoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [obra, setObra] = useState<Obra | null>(null)
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch(`/api/infraestructura/proyectos/${id}`)
        
        if (!response.ok) {
          throw new Error('Error al cargar el proyecto')
        }
        
        const data = await response.json()
        setObra(data.obra)
        setEstadisticas(data.estadisticas)
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'Error desconocido')
        toast.error('No se pudo cargar el proyecto')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'PLANEADA': return 'secondary'
      case 'EN_EJECUCION': return 'default'
      case 'CONCLUIDA': return 'outline'
      case 'LIQUIDADA': return 'outline'
      default: return 'secondary'
    }
  }

  const getActividadEstado = (actividad: Actividad) => {
    const hoy = new Date()
    const inicio = new Date(actividad.fecha_inicio)
    const fin = new Date(actividad.fecha_fin)
    
    if (hoy > fin) return { label: 'Completada', variant: 'default', icon: CheckCircle2 }
    if (hoy >= inicio && hoy <= fin) return { label: 'En Curso', variant: 'secondary', icon: Clock }
    return { label: 'Pendiente', variant: 'outline', icon: AlertCircle }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !obra) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Proyecto no encontrado'}
            <Button variant="link" onClick={() => router.back()} className="ml-2">
              Volver
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{obra.nombre_obra}</h1>
              <Badge variant={getEstadoBadgeVariant(obra.estado) as "default" | "secondary" | "outline" | "destructive"}>
                {obra.estado.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>{obra.ubicacion}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => router.push(`/infraestructura/proyectos/${id}/fases`)}
          >
            <ListTree className="h-4 w-4 mr-2" />
            Gestionar Fases
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/infraestructura/proyectos/${id}/cronograma`)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Cronograma
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push('/infraestructura/avances')}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Registrar Avance
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {estadisticas && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avance Físico</p>
                  <p className="text-2xl font-bold text-blue-600">{estadisticas.avanceFisico}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-200" />
              </div>
              <Progress value={estadisticas.avanceFisico} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Actividades</p>
                  <p className="text-2xl font-bold">
                    {estadisticas.actividadesCompletadas}/{estadisticas.totalActividades}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-200" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {estadisticas.actividadesEnCurso} en curso, {estadisticas.actividadesPendientes} pendientes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Presupuesto</p>
                  <p className="text-2xl font-bold">
                    S/ {(estadisticas.presupuestoInicial / 1000000).toFixed(2)}M
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-200" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {estadisticas.porcentajeEjecucion.toFixed(1)}% ejecutado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Documentos</p>
                  <p className="text-2xl font-bold">{estadisticas.totalDocumentos}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-amber-200" />
              </div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs"
                onClick={() => router.push('/infraestructura/documentos')}
              >
                Ver documentos →
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="fases">Fases y Actividades</TabsTrigger>
          <TabsTrigger value="reportes">Historial de Reportes</TabsTrigger>
          <TabsTrigger value="historial">Historial de Estados</TabsTrigger>
        </TabsList>

        {/* Tab: Información General */}
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Datos del Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">ID</Label>
                    <p className="font-medium">{obra.id_obra}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <p className="font-medium">{obra.estado.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Fecha Inicio Prevista</Label>
                    <p className="font-medium">
                      {new Date(obra.fecha_inicio_prevista).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Fecha de Registro</Label>
                    <p className="font-medium">
                      {new Date(obra.fecha_creacion).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ubicación</Label>
                  <p className="font-medium">{obra.ubicacion}</p>
                </div>
                {obra.coordenadas && (
                  <div>
                    <Label className="text-muted-foreground">Coordenadas</Label>
                    <p className="font-medium">{obra.coordenadas}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Presupuesto Inicial</Label>
                  <p className="font-medium text-lg">
                    S/ {Number(obra.presupuesto_inicial).toLocaleString('es-PE')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsable del Proyecto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{obra.responsable?.nombre || 'Sin asignar'}</p>
                    <p className="text-muted-foreground">{obra.responsable?.rol.nombre}</p>
                    <p className="text-sm text-muted-foreground">{obra.responsable?.correo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Fases y Actividades */}
        <TabsContent value="fases">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fases del Proyecto</CardTitle>
                  <CardDescription>
                    {obra.fases.length} fases registradas
                  </CardDescription>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => router.push(`/infraestructura/proyectos/${id}/fases`)}
                >
                  <ListTree className="h-4 w-4 mr-2" />
                  Gestionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {obra.fases.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Este proyecto no tiene fases registradas. 
                    <Button 
                      variant="link" 
                      className="p-0 h-auto ml-1"
                      onClick={() => router.push(`/infraestructura/proyectos/${id}/fases`)}
                    >
                      Crear primera fase
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {obra.fases.map((fase) => (
                    <div key={fase.id_fase} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{fase.nombre_fase}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(fase.fecha_inicio).toLocaleDateString('es-PE')} - {new Date(fase.fecha_fin).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {fase.actividades.length} actividades
                        </Badge>
                      </div>
                      
                      {fase.actividades.length > 0 && (
                        <div className="space-y-2">
                          {fase.actividades.slice(0, 3).map((actividad) => {
                            const estado = getActividadEstado(actividad)
                            return (
                              <div key={actividad.id_actividad} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                                <div>
                                  <span className="font-medium">{actividad.nombre_actividad}</span>
                                  <span className="text-muted-foreground ml-2">
                                    ({actividad.duracion}d)
                                  </span>
                                </div>
                                <Badge variant={estado.variant as "default" | "secondary" | "outline" | "destructive"}>{estado.label}</Badge>
                              </div>
                            )
                          })}
                          {fase.actividades.length > 3 && (
                            <p className="text-sm text-muted-foreground text-center">
                              +{fase.actividades.length - 3} actividades más
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial de Reportes */}
        <TabsContent value="reportes">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Reportes</CardTitle>
              <CardDescription>
                Últimos reportes técnicos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {obra.reportes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay reportes registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {obra.reportes.map((reporte) => (
                    <div key={reporte.id_reporte} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          Reporte del {new Date(reporte.fecha_generacion).toLocaleDateString('es-PE')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Por: {reporte.usuario.nombre}
                        </div>
                        {reporte.reporte_tecnico?.observaciones && (
                          <p className="text-sm mt-1">{reporte.reporte_tecnico.observaciones}</p>
                        )}
                      </div>
                      {reporte.reporte_tecnico && (
                        <Badge variant="outline" className="text-lg">
                          {reporte.reporte_tecnico.avance_fisico}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial de Estados */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Estados</CardTitle>
              <CardDescription>
                Cambios de estado del proyecto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {obra.historial_estados.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No hay historial de estados
                </p>
              ) : (
                <div className="space-y-3">
                  {obra.historial_estados.map((historial) => (
                    <div key={historial.id_historial} className="flex items-start gap-4 p-4 border rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getEstadoBadgeVariant(historial.estado) as "default" | "secondary" | "outline" | "destructive"}>
                            {historial.estado.replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(historial.fecha_cambio).toLocaleDateString('es-PE')}
                          </span>
                        </div>
                        <p className="mt-1">{historial.justificacion}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Por: {historial.usuario.nombre}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}