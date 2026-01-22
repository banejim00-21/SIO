// src/app/(dashboard)/mantenimiento/calendario/page.tsx
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, 
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  Building2,
  TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday
} from 'date-fns'
import { es } from 'date-fns/locale'

interface ObraInfo {
  id_obra: number
  nombre_obra: string
}

interface ReporteTecnicoInfo {
  avance_fisico: number
  observaciones: string | null
}

interface Reporte {
  id_reporte: number
  fecha_generacion: string
  obra: ObraInfo
  reporte_tecnico: ReporteTecnicoInfo | null
}

export default function CalendarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      const inicioMes = startOfMonth(currentMonth)
      const finMes = endOfMonth(currentMonth)
      
      const params = new URLSearchParams()
      params.append('fecha_desde', inicioMes.toISOString())
      params.append('fecha_hasta', finMes.toISOString())
      
      const response = await fetch(`/api/mantenimiento/reportes?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportes(data.reportes || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar el calendario')
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generar días del mes
  const diasDelMes = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Obtener día de inicio de la semana
  const startDayOfWeek = getDay(startOfMonth(currentMonth))

  // Agrupar reportes por día
  const reportesPorDia = useMemo(() => {
    const map = new Map<string, Reporte[]>()
    
    reportes.forEach(reporte => {
      const key = format(new Date(reporte.fecha_generacion), 'yyyy-MM-dd')
      
      if (!map.has(key)) {
        map.set(key, [])
      }
      map.get(key)!.push(reporte)
    })

    return map
  }, [reportes])

  // Reportes del día seleccionado
  const reportesDelDia = useMemo(() => {
    if (!selectedDate) return []
    const key = format(selectedDate, 'yyyy-MM-dd')
    return reportesPorDia.get(key) || []
  }, [selectedDate, reportesPorDia])

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
    setSelectedDate(null)
  }

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  // Estadísticas del mes
  const statsDelMes = useMemo(() => {
    const totalReportes = reportes.length
    const obrasUnicas = new Set(reportes.map(r => r.obra.id_obra)).size
    const promedioAvance = reportes.length > 0
      ? reportes.reduce((acc, r) => acc + (r.reporte_tecnico?.avance_fisico || 0), 0) / reportes.length
      : 0
    
    return { totalReportes, obrasUnicas, promedioAvance }
  }, [reportes])

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
          <p className="text-muted-foreground">
            Visualiza los reportes técnicos por fecha
          </p>
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
          <Button variant="outline" onClick={() => {
            setCurrentMonth(new Date())
            setSelectedDate(new Date())
          }}>
            Hoy
          </Button>
        </div>
      </div>

      {/* Stats del mes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{statsDelMes.totalReportes}</div>
                <p className="text-xs text-muted-foreground">Reportes del mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{statsDelMes.obrasUnicas}</div>
                <p className="text-xs text-muted-foreground">Obras reportadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <div>
                <div className="text-2xl font-bold text-amber-600">{statsDelMes.promedioAvance.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">Avance promedio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendario */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            {/* Encabezado días de la semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {diasSemana.map((dia) => (
                <div key={dia} className="text-center text-sm font-semibold text-muted-foreground py-2">
                  {dia}
                </div>
              ))}
            </div>

            {/* Días del mes */}
            <div className="grid grid-cols-7 gap-1">
              {/* Espacios vacíos al inicio */}
              {Array.from({ length: startDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-20 bg-gray-50 rounded-lg"></div>
              ))}

              {/* Días del mes */}
              {diasDelMes.map((dia) => {
                const key = format(dia, 'yyyy-MM-dd')
                const reportesDelDiaActual = reportesPorDia.get(key) || []
                const tieneReportes = reportesDelDiaActual.length > 0
                const esHoy = isToday(dia)
                const estaSeleccionado = selectedDate && isSameDay(dia, selectedDate)

                return (
                  <div
                    key={key}
                    className={`h-20 p-1 rounded-lg border cursor-pointer transition-colors ${
                      esHoy ? 'bg-amber-50 border-amber-300' : 'bg-white hover:bg-gray-50'
                    } ${estaSeleccionado ? 'ring-2 ring-amber-500' : ''}`}
                    onClick={() => setSelectedDate(dia)}
                  >
                    <div className={`text-sm font-medium mb-1 ${esHoy ? 'text-amber-600' : ''}`}>
                      {format(dia, 'd')}
                    </div>
                    
                    {tieneReportes && (
                      <div className="space-y-1">
                        {reportesDelDiaActual.slice(0, 2).map((reporte) => (
                          <div
                            key={reporte.id_reporte}
                            className="text-xs px-1 py-0.5 rounded truncate bg-amber-500 text-white"
                            title={`${reporte.obra.nombre_obra} - ${reporte.reporte_tecnico?.avance_fisico || 0}%`}
                          >
                            {reporte.reporte_tecnico?.avance_fisico || 0}%
                          </div>
                        ))}
                        {reportesDelDiaActual.length > 2 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{reportesDelDiaActual.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Panel lateral - Detalles del día */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDate 
                ? format(selectedDate, "d 'de' MMMM", { locale: es })
                : 'Selecciona un día'
              }
            </CardTitle>
            <CardDescription>
              {selectedDate 
                ? `${reportesDelDia.length} reporte(s)`
                : 'Haz clic en un día para ver detalles'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <div className="space-y-3">
                {reportesDelDia.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay reportes este día</p>
                    {isToday(selectedDate) && (
                      <Button 
                        variant="link" 
                        onClick={() => router.push('/mantenimiento/reportes?nuevo=true')}
                        className="mt-2"
                      >
                        Crear reporte
                      </Button>
                    )}
                  </div>
                ) : (
                  reportesDelDia.map((reporte) => (
                    <div
                      key={reporte.id_reporte}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push('/mantenimiento/reportes')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{reporte.obra.nombre_obra}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(reporte.fecha_generacion), 'HH:mm', { locale: es })}
                          </div>
                        </div>
                        <Badge variant="outline" className="font-mono">
                          {reporte.reporte_tecnico?.avance_fisico || 0}%
                        </Badge>
                      </div>
                      {reporte.reporte_tecnico?.observaciones && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {reporte.reporte_tecnico.observaciones}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Selecciona un día del calendario para ver los reportes
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Botón de acción */}
      <div className="flex justify-center">
        <Button 
          className="bg-amber-600 hover:bg-amber-700"
          onClick={() => router.push('/mantenimiento/reportes?nuevo=true')}
        >
          <FileText className="mr-2 h-4 w-4" />
          Crear Nuevo Reporte
        </Button>
      </div>
    </div>
  )
}
