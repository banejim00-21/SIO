// src/app/(dashboard)/infraestructura/avances/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, TrendingUp, Plus, Loader2, Building2, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface Responsable {
  nombre: string
}

interface Actividad {
  id_actividad: number
  nombre_actividad: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string
  duracion: number
  responsable: Responsable
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
}

interface Obra {
  id_obra: number
  nombre_obra: string
  estado: string
  responsable: Responsable | null
  fases: Fase[]
  reportes: Reporte[]
}

interface AvanceFormData {
  id_obra: string
  id_fase: string
  id_actividad: string
  avance_fisico: string
  observaciones: string
  fecha_avance: string
}

export default function AvancesPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<AvanceFormData>({
    id_obra: '',
    id_fase: '',
    id_actividad: '',
    avance_fisico: '',
    observaciones: '',
    fecha_avance: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Cargando avances...')
      const response = await fetch('/api/infraestructura/avances')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error response:', errorText)
        throw new Error(`Error ${response.status}: ${errorText}`)
      }
      
      const data = await response.json()
      console.log('✅ Datos recibidos:', data)
      console.log('📊 Obras:', data.obras?.length || 0)
      
      // Debug: verificar estructura de fases
      if (data.obras && data.obras.length > 0) {
        data.obras.forEach((obra: Obra) => {
          console.log(`   Obra "${obra.nombre_obra}": ${obra.fases?.length || 0} fases`)
          obra.fases?.forEach((fase: Fase) => {
            console.log(`      Fase "${fase.nombre_fase}": ${fase.actividades?.length || 0} actividades`)
          })
        })
      }
      
      setObras(data.obras || [])
    } catch (error) {
      console.error('❌ Error al cargar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('No se pudieron cargar los avances')
    } finally {
      setLoading(false)
    }
  }

  // Datos derivados usando useMemo para mejor rendimiento
  const obraSeleccionada = useMemo(() => {
    if (!formData.id_obra) return undefined
    const obra = obras.find(o => o.id_obra.toString() === formData.id_obra)
    console.log('🏗️ Obra seleccionada:', obra?.nombre_obra, 'Fases:', obra?.fases?.length)
    return obra
  }, [formData.id_obra, obras])

  const fases = useMemo(() => {
    const fasesArray = obraSeleccionada?.fases || []
    console.log('📁 Fases disponibles:', fasesArray.length)
    return fasesArray
  }, [obraSeleccionada])

  const faseSeleccionada = useMemo(() => {
    if (!formData.id_fase) return undefined
    const fase = fases.find(f => f.id_fase.toString() === formData.id_fase)
    console.log('📂 Fase seleccionada:', fase?.nombre_fase, 'Actividades:', fase?.actividades?.length)
    return fase
  }, [formData.id_fase, fases])

  const actividades = useMemo(() => {
    const actividadesArray = faseSeleccionada?.actividades || []
    console.log('📋 Actividades disponibles:', actividadesArray.length)
    return actividadesArray
  }, [faseSeleccionada])

  // Obras en ejecución para el formulario
  const obrasEnEjecucion = useMemo(() => {
    return obras.filter(obra => obra.estado === 'EN_EJECUCION')
  }, [obras])

  const handleObraChange = (value: string) => {
    console.log('🔄 Cambiando obra a:', value)
    setFormData({ 
      ...formData, 
      id_obra: value,
      id_fase: '',
      id_actividad: ''
    })
  }

  const handleFaseChange = (value: string) => {
    console.log('🔄 Cambiando fase a:', value)
    setFormData({ 
      ...formData, 
      id_fase: value,
      id_actividad: ''
    })
  }

  const handleActividadChange = (value: string) => {
    console.log('🔄 Cambiando actividad a:', value)
    setFormData({ ...formData, id_actividad: value })
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    if (!formData.id_obra || !formData.id_actividad || !formData.avance_fisico) {
      toast.error('Complete todos los campos obligatorios')
      return
    }

    const avanceNumero = parseFloat(formData.avance_fisico)
    if (isNaN(avanceNumero) || avanceNumero < 0 || avanceNumero > 100) {
      toast.error('El avance físico debe ser un número entre 0 y 100')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/infraestructura/avances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          avance_fisico: avanceNumero
        })
      })

      let data
      try {
        data = await response.json()
      } catch {
        throw new Error('Error al procesar respuesta del servidor')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al registrar avance')
      }

      toast.success('Avance registrado correctamente')
      setOpenDialog(false)
      setFormData({
        id_obra: '',
        id_fase: '',
        id_actividad: '',
        avance_fisico: '',
        observaciones: '',
        fecha_avance: new Date().toISOString().split('T')[0]
      })
      fetchData()
    } catch (error) {
      console.error('Error al registrar:', error)
      toast.error(error instanceof Error ? error.message : 'Error al registrar avance')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredObras = obras.filter(obra =>
    obra.nombre_obra.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular estadísticas
  const calcularAvancePromedio = (obra: Obra): number => {
    const reportesTecnicos = obra.reportes.filter(r => r.reporte_tecnico)
    if (reportesTecnicos.length === 0) return 0
    
    const ultimoReporte = reportesTecnicos[0]
    return ultimoReporte.reporte_tecnico?.avance_fisico || 0
  }

  const calcularActividadesEnCurso = (obra: Obra): number => {
    const hoy = new Date()
    return obra.fases.flatMap(f => f.actividades).filter(a => {
      const inicio = new Date(a.fecha_inicio)
      const fin = new Date(a.fecha_fin)
      return hoy >= inicio && hoy <= fin
    }).length
  }

  const calcularActividadesCompletadas = (obra: Obra): number => {
    const hoy = new Date()
    return obra.fases.flatMap(f => f.actividades).filter(a => {
      const fin = new Date(a.fecha_fin)
      return hoy > fin
    }).length
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
            Error al cargar los datos: {error}
            <Button variant="link" onClick={fetchData} className="ml-2">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registro de Avances</h1>
          <p className="text-muted-foreground">
            Registra y monitorea el avance físico de los proyectos
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Registrar Avance
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Avance</DialogTitle>
                <DialogDescription>
                  Registra el progreso físico de las actividades del proyecto
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Selector de Proyecto */}
                <div className="space-y-2">
                  <Label htmlFor="id_obra">Proyecto *</Label>
                  <Select
                    value={formData.id_obra}
                    onValueChange={handleObraChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {obrasEnEjecucion.length > 0 ? (
                        obrasEnEjecucion.map(obra => (
                          <SelectItem key={obra.id_obra} value={obra.id_obra.toString()}>
                            {obra.nombre_obra}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No hay proyectos en ejecución
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {obrasEnEjecucion.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No hay proyectos en ejecución disponibles
                    </p>
                  )}
                </div>

                {/* Selector de Fase */}
                <div className="space-y-2">
                  <Label htmlFor="id_fase">Fase *</Label>
                  <Select
                    value={formData.id_fase}
                    onValueChange={handleFaseChange}
                    disabled={!formData.id_obra || fases.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          !formData.id_obra 
                            ? "Primero selecciona un proyecto" 
                            : fases.length === 0 
                              ? "Este proyecto no tiene fases" 
                              : "Selecciona una fase"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {fases.map(fase => (
                        <SelectItem key={fase.id_fase} value={fase.id_fase.toString()}>
                          {fase.nombre_fase} ({new Date(fase.fecha_inicio).toLocaleDateString('es-PE')} - {new Date(fase.fecha_fin).toLocaleDateString('es-PE')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.id_obra && fases.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Este proyecto no tiene fases registradas. Contacta al administrador.
                    </p>
                  )}
                  {formData.id_obra && fases.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {fases.length} fase(s) disponible(s)
                    </p>
                  )}
                </div>

                {/* Selector de Actividad */}
                <div className="space-y-2">
                  <Label htmlFor="id_actividad">Actividad *</Label>
                  <Select
                    value={formData.id_actividad}
                    onValueChange={handleActividadChange}
                    disabled={!formData.id_fase || actividades.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          !formData.id_fase 
                            ? "Primero selecciona una fase" 
                            : actividades.length === 0 
                              ? "Esta fase no tiene actividades" 
                              : "Selecciona una actividad"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {actividades.map(actividad => (
                        <SelectItem key={actividad.id_actividad} value={actividad.id_actividad.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{actividad.nombre_actividad}</span>
                            <span className="text-xs text-muted-foreground">
                              {actividad.responsable?.nombre || 'Sin responsable'} | {actividad.duracion}d | {new Date(actividad.fecha_inicio).toLocaleDateString('es-PE')}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.id_fase && actividades.length === 0 && (
                    <p className="text-xs text-amber-600">
                      Esta fase no tiene actividades registradas.
                    </p>
                  )}
                  {formData.id_fase && actividades.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {actividades.length} actividad(es) disponible(s)
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="avance_fisico">Avance Físico (%) *</Label>
                    <Input
                      id="avance_fisico"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.avance_fisico}
                      onChange={(e) => setFormData({ ...formData, avance_fisico: e.target.value })}
                      placeholder="0.0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha_avance">Fecha del Avance</Label>
                    <Input
                      id="fecha_avance"
                      type="date"
                      value={formData.fecha_avance}
                      onChange={(e) => setFormData({ ...formData, fecha_avance: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Describa el avance realizado, hitos cumplidos, dificultades encontradas..."
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting || !formData.id_actividad || !formData.avance_fisico} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar Avance'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{obras.length}</div>
            <p className="text-xs text-muted-foreground">Total Proyectos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {obrasEnEjecucion.length}
            </div>
            <p className="text-xs text-muted-foreground">En Ejecución</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {obras.reduce((acc, obra) => acc + obra.reportes.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Reportes Registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">
              {obras.reduce((acc, obra) => acc + calcularActividadesEnCurso(obra), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Actividades en Curso</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Proyectos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Avances por Proyecto</CardTitle>
              <CardDescription>
                Resumen de avances físicos registrados
              </CardDescription>
            </div>
            <div className="relative flex-1 md:max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proyectos..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {filteredObras.map(obra => {
              const avanceActual = calcularAvancePromedio(obra)
              const actividadesEnCurso = calcularActividadesEnCurso(obra)
              const actividadesCompletadas = calcularActividadesCompletadas(obra)
              const totalActividades = obra.fases.reduce((acc, fase) => acc + fase.actividades.length, 0)
              const ultimoReporte = obra.reportes[0]

              return (
                <Card key={obra.id_obra} className="overflow-hidden">
                  <CardHeader className="bg-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-blue-600" />
                        <div>
                          <CardTitle className="text-lg">{obra.nombre_obra}</CardTitle>
                          <CardDescription>
                            {obra.responsable?.nombre ? `Responsable: ${obra.responsable.nombre}` : 'Sin responsable'} | {obra.fases.length} fases
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={obra.estado === 'EN_EJECUCION' ? 'default' : 'secondary'}>
                        {obra.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
                      <div className="space-y-2">
                        <Label>Avance Físico General</Label>
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-green-600 h-3 rounded-full transition-all" 
                              style={{ width: `${avanceActual}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold w-12">{avanceActual}%</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Actividades</Label>
                        <div className="text-sm">
                          <div className="font-medium">
                            {actividadesCompletadas}/{totalActividades} completadas
                          </div>
                          <div className="text-muted-foreground">
                            {actividadesEnCurso} en curso
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Último Reporte</Label>
                        <div className="text-sm">
                          {ultimoReporte ? (
                            <>
                              <div className="font-medium">
                                {new Date(ultimoReporte.fecha_generacion).toLocaleDateString('es-PE')}
                              </div>
                              <div className="text-muted-foreground">
                                {obra.reportes.length} reportes total
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Sin reportes</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Acciones</Label>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={obra.estado !== 'EN_EJECUCION'}
                          onClick={() => {
                            const primeraFase = obra.fases[0]
                            setFormData({
                              id_obra: obra.id_obra.toString(),
                              id_fase: primeraFase?.id_fase.toString() || '',
                              id_actividad: '',
                              avance_fisico: '',
                              observaciones: '',
                              fecha_avance: new Date().toISOString().split('T')[0]
                            })
                            setOpenDialog(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Registrar Avance
                        </Button>
                      </div>
                    </div>

                    {/* Fases y actividades */}
                    {obra.fases.length > 0 ? (
                      <div className="space-y-4">
                        <Label>Detalle por Fases</Label>
                        {obra.fases.map(fase => (
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
                            {fase.actividades.length > 0 ? (
                              <div className="space-y-2">
                                {fase.actividades.map(actividad => {
                                  const hoy = new Date()
                                  const inicio = new Date(actividad.fecha_inicio)
                                  const fin = new Date(actividad.fecha_fin)
                                  const estaEnCurso = hoy >= inicio && hoy <= fin
                                  const estaCompletada = hoy > fin

                                  return (
                                    <div key={actividad.id_actividad} className="flex items-center justify-between text-sm p-2 border rounded">
                                      <div className="flex-1">
                                        <div className="font-medium">{actividad.nombre_actividad}</div>
                                        <div className="text-muted-foreground text-xs">
                                          {actividad.responsable?.nombre || 'Sin responsable'} | {actividad.duracion}d
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <Badge variant={
                                          estaCompletada ? 'default' : 
                                          estaEnCurso ? 'secondary' : 'outline'
                                        }>
                                          {estaCompletada ? 'Completada' : 
                                           estaEnCurso ? 'En Curso' : 'Pendiente'}
                                        </Badge>
                                        <div className="text-right text-xs text-muted-foreground">
                                          <div>Inicio: {new Date(actividad.fecha_inicio).toLocaleDateString('es-PE')}</div>
                                          <div>Fin: {new Date(actividad.fecha_fin).toLocaleDateString('es-PE')}</div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                Esta fase no tiene actividades registradas
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Este proyecto no tiene fases registradas. Contacta al administrador para agregar fases y actividades.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Historial de reportes */}
                    {obra.reportes.length > 0 && (
                      <div className="mt-6">
                        <Label>Historial de Reportes</Label>
                        <div className="mt-2 space-y-2">
                          {obra.reportes.slice(0, 3).map(reporte => (
                            <div key={reporte.id_reporte} className="flex items-center justify-between text-sm p-3 border rounded">
                              <div>
                                <div className="font-medium">
                                  Reporte del {new Date(reporte.fecha_generacion).toLocaleDateString('es-PE')}
                                </div>
                                {reporte.reporte_tecnico?.observaciones && (
                                  <div className="text-muted-foreground text-xs mt-1">
                                    {reporte.reporte_tecnico.observaciones}
                                  </div>
                                )}
                              </div>
                              <Badge variant="outline">
                                {reporte.reporte_tecnico?.avance_fisico || 0}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {filteredObras.length === 0 && (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No se encontraron proyectos
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Intenta ajustar los términos de búsqueda' : 'No hay proyectos disponibles'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
