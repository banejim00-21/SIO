// src/app/(dashboard)/infraestructura/proyectos/[id]/cronograma/page.tsx
'use client'

import { useState, useEffect, use, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft, 
  Loader2, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface Actividad {
  id_actividad: number
  nombre_actividad: string
  fecha_inicio: string
  fecha_fin: string
  duracion: number
  responsable: { nombre: string }
}

interface Fase {
  id_fase: number
  nombre_fase: string
  fecha_inicio: string
  fecha_fin: string
  actividades: Actividad[]
}

interface Obra {
  id_obra: number
  nombre_obra: string
  estado: string
}

export default function CronogramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  
  const [obra, setObra] = useState<Obra | null>(null)
  const [fases, setFases] = useState<Fase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/obras/${id}/fases`)
      
      if (!response.ok) throw new Error('Error al cargar cronograma')
      
      const data = await response.json()
      setObra(data.obra)
      setFases(data.fases || [])
      
      if (data.fases?.length > 0) {
        const primeraFecha = new Date(data.fases[0].fecha_inicio)
        setCurrentMonth(startOfMonth(primeraFecha))
      }
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
      toast.error('Error al cargar el cronograma')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const diasDelMes = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    })
  }, [currentMonth])

  const calcularBarra = (fechaInicio: string, fechaFin: string) => {
    const inicio = new Date(fechaInicio)
    const fin = new Date(fechaFin)
    const mesInicio = startOfMonth(currentMonth)
    const mesFin = endOfMonth(currentMonth)
    
    if (fin < mesInicio || inicio > mesFin) return null
    
    const inicioVisible = inicio < mesInicio ? mesInicio : inicio
    const finVisible = fin > mesFin ? mesFin : fin
    
    const diaInicio = inicioVisible.getDate()
    const diaFin = finVisible.getDate()
    const totalDias = diasDelMes.length
    
    const left = ((diaInicio - 1) / totalDias) * 100
    const width = ((diaFin - diaInicio + 1) / totalDias) * 100
    
    return { left: `${left}%`, width: `${width}%` }
  }

  const getActividadEstado = (actividad: Actividad) => {
    const hoy = new Date()
    const fin = new Date(actividad.fecha_fin)
    const inicio = new Date(actividad.fecha_inicio)
    
    if (hoy > fin) return { color: 'bg-green-500', label: 'Completada' }
    if (hoy >= inicio && hoy <= fin) return { color: 'bg-blue-500', label: 'En Curso' }
    return { color: 'bg-gray-300', label: 'Pendiente' }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button variant="link" onClick={() => router.back()} className="ml-2">Volver</Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const totalActividades = fases.reduce((acc, f) => acc + f.actividades.length, 0)
  const actividadesCompletadas = fases.reduce((acc, fase) => 
    acc + fase.actividades.filter(a => new Date() > new Date(a.fecha_fin)).length, 0
  )
  const actividadesEnCurso = fases.reduce((acc, fase) => 
    acc + fase.actividades.filter(a => {
      const hoy = new Date()
      const inicio = new Date(a.fecha_inicio)
      const fin = new Date(a.fecha_fin)
      return hoy >= inicio && hoy <= fin
    }).length, 0
  )
  const actividadesPendientes = fases.reduce((acc, fase) => 
    acc + fase.actividades.filter(a => new Date() < new Date(a.fecha_inicio)).length, 0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cronograma</h1>
            <p className="text-muted-foreground">{obra?.nombre_obra}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-gray-100 rounded-lg min-w-[200px] text-center">
            <span className="font-semibold capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
            Hoy
          </Button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 items-center flex-wrap">
        <span className="text-sm text-muted-foreground">Leyenda:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-sm">Completada</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm">En Curso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-gray-300"></div>
          <span className="text-sm">Pendiente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-blue-200"></div>
          <span className="text-sm">Fase</span>
        </div>
      </div>

      {/* Cronograma */}
      {fases.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay fases registradas para mostrar el cronograma.
            <Button variant="link" onClick={() => router.push(`/infraestructura/proyectos/${id}/fases`)} className="ml-1">
              Crear fases
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Vista del Cronograma</CardTitle>
            <CardDescription>
              {fases.length} fases, {totalActividades} actividades
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="border rounded-lg min-w-[800px]">
              {/* Encabezado de días */}
              <div className="flex border-b bg-gray-50 sticky top-0">
                <div className="w-64 flex-shrink-0 p-2 border-r font-semibold">
                  Actividad
                </div>
                <div className="flex-1 flex">
                  {diasDelMes.map((dia, index) => (
                    <div 
                      key={index} 
                      className={`flex-1 text-center text-xs p-1 border-r last:border-r-0 min-w-[30px] ${
                        dia.getDay() === 0 || dia.getDay() === 6 ? 'bg-gray-100' : ''
                      } ${format(dia, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-red-100' : ''}`}
                    >
                      <div className="font-semibold">{format(dia, 'd')}</div>
                      <div className="text-muted-foreground hidden sm:block">{format(dia, 'EEE', { locale: es })}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fases y actividades */}
              {fases.map((fase) => (
                <div key={fase.id_fase}>
                  {/* Encabezado de fase */}
                  <div className="flex border-b bg-blue-50">
                    <div className="w-64 flex-shrink-0 p-2 border-r">
                      <div className="font-semibold text-blue-800">{fase.nombre_fase}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(fase.fecha_inicio), 'dd/MM')} - {format(new Date(fase.fecha_fin), 'dd/MM')}
                      </div>
                    </div>
                    <div className="flex-1 relative h-12">
                      {(() => {
                        const barra = calcularBarra(fase.fecha_inicio, fase.fecha_fin)
                        if (!barra) return null
                        return (
                          <div 
                            className="absolute top-2 h-8 bg-blue-200 rounded opacity-60"
                            style={{ left: barra.left, width: barra.width }}
                          />
                        )
                      })()}
                    </div>
                  </div>

                  {/* Actividades */}
                  {fase.actividades.map((actividad) => {
                    const estado = getActividadEstado(actividad)
                    const barra = calcularBarra(actividad.fecha_inicio, actividad.fecha_fin)
                    
                    return (
                      <div key={actividad.id_actividad} className="flex border-b hover:bg-gray-50">
                        <div className="w-64 flex-shrink-0 p-2 border-r">
                          <div className="text-sm font-medium pl-4 truncate" title={actividad.nombre_actividad}>
                            {actividad.nombre_actividad}
                          </div>
                          <div className="text-xs text-muted-foreground pl-4">
                            {actividad.responsable?.nombre || 'Sin asignar'} | {actividad.duracion}d
                          </div>
                        </div>
                        <div className="flex-1 relative h-12">
                          {barra && (
                            <div 
                              className={`absolute top-3 h-6 ${estado.color} rounded shadow-sm flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`}
                              style={{ left: barra.left, width: barra.width, minWidth: '24px' }}
                              title={`${actividad.nombre_actividad}\n${estado.label}\n${format(new Date(actividad.fecha_inicio), 'dd/MM')} - ${format(new Date(actividad.fecha_fin), 'dd/MM')}`}
                            >
                              <span className="text-xs text-white font-medium truncate px-1">
                                {actividad.duracion}d
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            {isSameMonth(new Date(), currentMonth) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>Hoy: {format(new Date(), "EEEE dd 'de' MMMM yyyy", { locale: es })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{actividadesCompletadas}</div>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{actividadesEnCurso}</div>
                <p className="text-xs text-muted-foreground">En Curso</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold text-gray-600">{actividadesPendientes}</div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}