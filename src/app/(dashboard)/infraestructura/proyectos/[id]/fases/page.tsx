// src/app/(dashboard)/infraestructura/proyectos/[id]/fases/page.tsx
'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Loader2, 
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronRight,
  Users,
  Clock,
  AlertCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Usuario {
  id_usuario: number
  nombre: string
  rol?: { nombre: string }
}

interface Actividad {
  id_actividad: number
  nombre_actividad: string
  descripcion: string | null
  fecha_inicio: string
  fecha_fin: string
  duracion: number
  responsable: Usuario
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
}

export default function FasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  
  const [obra, setObra] = useState<Obra | null>(null)
  const [fases, setFases] = useState<Fase[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedFases, setExpandedFases] = useState<Set<number>>(new Set())
  
  // Estados para modal de Fase
  const [faseDialogOpen, setFaseDialogOpen] = useState(false)
  const [editingFase, setEditingFase] = useState<Fase | null>(null)
  const [faseSubmitting, setFaseSubmitting] = useState(false)
  const [faseFormData, setFaseFormData] = useState({
    nombre_fase: '',
    fecha_inicio: undefined as Date | undefined,
    fecha_fin: undefined as Date | undefined
  })
  
  // Estados para modal de Actividad
  const [actividadDialogOpen, setActividadDialogOpen] = useState(false)
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null)
  const [actividadFaseId, setActividadFaseId] = useState<number | null>(null)
  const [actividadSubmitting, setActividadSubmitting] = useState(false)
  const [actividadFormData, setActividadFormData] = useState({
    nombre_actividad: '',
    descripcion: '',
    fecha_inicio: undefined as Date | undefined,
    fecha_fin: undefined as Date | undefined,
    duracion: '',
    id_responsable: ''
  })
  
  // Estados para eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ type: 'fase' | 'actividad', id: number, faseId?: number, nombre: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Usamos las APIs del admin que ya funcionan
      const [fasesRes, usuariosRes] = await Promise.all([
        fetch(`/api/admin/obras/${id}/fases`),
        fetch('/api/admin/usuarios')
      ])

      if (!fasesRes.ok) throw new Error('Error al cargar fases')

      const fasesData = await fasesRes.json()
      const usuariosData = await usuariosRes.json()

      setObra(fasesData.obra)
      setFases(fasesData.fases || [])
      
      const usuariosFiltrados = (usuariosData.usuarios || []).filter(
        (u: Usuario) => u.rol && ['ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(u.rol.nombre)
      )
      setUsuarios(usuariosFiltrados)
      setExpandedFases(new Set(fasesData.fases?.map((f: Fase) => f.id_fase) || []))
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleFase = (faseId: number) => {
    setExpandedFases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(faseId)) newSet.delete(faseId)
      else newSet.add(faseId)
      return newSet
    })
  }

  // FASE HANDLERS
  const openFaseDialog = (fase?: Fase) => {
    if (fase) {
      setEditingFase(fase)
      setFaseFormData({
        nombre_fase: fase.nombre_fase,
        fecha_inicio: new Date(fase.fecha_inicio),
        fecha_fin: new Date(fase.fecha_fin)
      })
    } else {
      setEditingFase(null)
      setFaseFormData({ nombre_fase: '', fecha_inicio: undefined, fecha_fin: undefined })
    }
    setFaseDialogOpen(true)
  }

  const handleFaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!faseFormData.fecha_inicio || !faseFormData.fecha_fin) {
      toast.error('Debe seleccionar las fechas')
      return
    }
    
    setFaseSubmitting(true)
    try {
      const url = editingFase 
        ? `/api/admin/obras/${id}/fases/${editingFase.id_fase}`
        : `/api/admin/obras/${id}/fases`
      
      const response = await fetch(url, {
        method: editingFase ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_fase: faseFormData.nombre_fase,
          fecha_inicio: format(faseFormData.fecha_inicio, 'yyyy-MM-dd'),
          fecha_fin: format(faseFormData.fecha_fin, 'yyyy-MM-dd')
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar fase')
      }

      toast.success(`Fase ${editingFase ? 'actualizada' : 'creada'} correctamente`)
      setFaseDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar fase')
    } finally {
      setFaseSubmitting(false)
    }
  }

  // ACTIVIDAD HANDLERS
  const openActividadDialog = (faseId: number, actividad?: Actividad) => {
    setActividadFaseId(faseId)
    if (actividad) {
      setEditingActividad(actividad)
      setActividadFormData({
        nombre_actividad: actividad.nombre_actividad,
        descripcion: actividad.descripcion || '',
        fecha_inicio: new Date(actividad.fecha_inicio),
        fecha_fin: new Date(actividad.fecha_fin),
        duracion: actividad.duracion.toString(),
        id_responsable: actividad.responsable.id_usuario.toString()
      })
    } else {
      setEditingActividad(null)
      setActividadFormData({
        nombre_actividad: '',
        descripcion: '',
        fecha_inicio: undefined,
        fecha_fin: undefined,
        duracion: '',
        id_responsable: ''
      })
    }
    setActividadDialogOpen(true)
  }

  const handleActividadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actividadFormData.fecha_inicio || !actividadFormData.fecha_fin || !actividadFaseId) {
      toast.error('Complete todos los campos obligatorios')
      return
    }
    
    setActividadSubmitting(true)
    try {
      const url = editingActividad 
        ? `/api/admin/obras/${id}/fases/${actividadFaseId}/actividades/${editingActividad.id_actividad}`
        : `/api/admin/obras/${id}/fases/${actividadFaseId}/actividades`
      
      const response = await fetch(url, {
        method: editingActividad ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_actividad: actividadFormData.nombre_actividad,
          descripcion: actividadFormData.descripcion || null,
          fecha_inicio: format(actividadFormData.fecha_inicio, 'yyyy-MM-dd'),
          fecha_fin: format(actividadFormData.fecha_fin, 'yyyy-MM-dd'),
          duracion: actividadFormData.duracion ? parseInt(actividadFormData.duracion) : undefined,
          id_responsable: actividadFormData.id_responsable
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar actividad')
      }

      toast.success(`Actividad ${editingActividad ? 'actualizada' : 'creada'} correctamente`)
      setActividadDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar actividad')
    } finally {
      setActividadSubmitting(false)
    }
  }

  // DELETE HANDLER
  const confirmDelete = (type: 'fase' | 'actividad', itemId: number, nombre: string, faseId?: number) => {
    setItemToDelete({ type, id: itemId, faseId, nombre })
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    try {
      const url = itemToDelete.type === 'fase'
        ? `/api/admin/obras/${id}/fases/${itemToDelete.id}`
        : `/api/admin/obras/${id}/fases/${itemToDelete.faseId}/actividades/${itemToDelete.id}`

      const response = await fetch(url, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success(`${itemToDelete.type === 'fase' ? 'Fase' : 'Actividad'} eliminada`)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
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
            <Button variant="link" onClick={fetchData} className="ml-2">Reintentar</Button>
            <Button variant="link" onClick={() => router.back()} className="ml-2">Volver</Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const totalActividades = fases.reduce((acc, fase) => acc + fase.actividades.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fases y Actividades</h1>
            <p className="text-muted-foreground">{obra?.nombre_obra}</p>
          </div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openFaseDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Fase
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{fases.length}</div>
            <p className="text-xs text-muted-foreground">Total Fases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totalActividades}</div>
            <p className="text-xs text-muted-foreground">Total Actividades</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{usuarios.length}</div>
            <p className="text-xs text-muted-foreground">Responsables Disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Fases */}
      {fases.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay fases registradas. Crea la primera fase del cronograma.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {fases.map((fase) => (
            <Card key={fase.id_fase}>
              <Collapsible open={expandedFases.has(fase.id_fase)} onOpenChange={() => toggleFase(fase.id_fase)}>
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 hover:opacity-80 flex-1">
                      {expandedFases.has(fase.id_fase) ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      <div className="text-left">
                        <CardTitle className="text-lg">{fase.nombre_fase}</CardTitle>
                        <CardDescription>
                          {format(new Date(fase.fecha_inicio), 'dd/MM/yyyy')} - {format(new Date(fase.fecha_fin), 'dd/MM/yyyy')}
                        </CardDescription>
                      </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{fase.actividades.length} actividades</Badge>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openFaseDialog(fase) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-600" onClick={(e) => { e.stopPropagation(); confirmDelete('fase', fase.id_fase, fase.nombre_fase) }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-sm">Actividades</h4>
                      <Button variant="outline" size="sm" onClick={() => openActividadDialog(fase.id_fase)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nueva Actividad
                      </Button>
                    </div>
                    
                    {fase.actividades.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic text-center py-4 border rounded-lg">
                        No hay actividades. Crea la primera.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {fase.actividades.map((actividad) => (
                          <div key={actividad.id_actividad} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                            <div className="flex-1">
                              <div className="font-medium">{actividad.nombre_actividad}</div>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {actividad.responsable?.nombre || 'Sin asignar'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {actividad.duracion} días
                                </span>
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {format(new Date(actividad.fecha_inicio), 'dd/MM/yy')} - {format(new Date(actividad.fecha_fin), 'dd/MM/yy')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openActividadDialog(fase.id_fase, actividad)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600" onClick={() => confirmDelete('actividad', actividad.id_actividad, actividad.nombre_actividad, fase.id_fase)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Fase */}
      <Dialog open={faseDialogOpen} onOpenChange={setFaseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleFaseSubmit}>
            <DialogHeader>
              <DialogTitle>{editingFase ? 'Editar Fase' : 'Nueva Fase'}</DialogTitle>
              <DialogDescription>Define una fase del cronograma del proyecto</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre de la Fase *</Label>
                <Input value={faseFormData.nombre_fase} onChange={(e) => setFaseFormData({ ...faseFormData, nombre_fase: e.target.value })} placeholder="Ej: Fase 1 - Preparación" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicio *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${!faseFormData.fecha_inicio && 'text-muted-foreground'}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {faseFormData.fecha_inicio ? format(faseFormData.fecha_inicio, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={faseFormData.fecha_inicio} onSelect={(date) => setFaseFormData({ ...faseFormData, fecha_inicio: date })} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Fecha Fin *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${!faseFormData.fecha_fin && 'text-muted-foreground'}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {faseFormData.fecha_fin ? format(faseFormData.fecha_fin, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={faseFormData.fecha_fin} onSelect={(date) => setFaseFormData({ ...faseFormData, fecha_fin: date })} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFaseDialogOpen(false)} disabled={faseSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={faseSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {faseSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingFase ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Actividad */}
      <Dialog open={actividadDialogOpen} onOpenChange={setActividadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleActividadSubmit}>
            <DialogHeader>
              <DialogTitle>{editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}</DialogTitle>
              <DialogDescription>Define una actividad dentro de la fase</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={actividadFormData.nombre_actividad} onChange={(e) => setActividadFormData({ ...actividadFormData, nombre_actividad: e.target.value })} placeholder="Ej: Excavación" required />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={actividadFormData.descripcion} onChange={(e) => setActividadFormData({ ...actividadFormData, descripcion: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Responsable *</Label>
                <Select value={actividadFormData.id_responsable} onValueChange={(value) => setActividadFormData({ ...actividadFormData, id_responsable: value })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id_usuario} value={String(u.id_usuario)}>
                        {u.nombre} {u.rol ? `- ${u.rol.nombre}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Inicio *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${!actividadFormData.fecha_inicio && 'text-muted-foreground'}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {actividadFormData.fecha_inicio ? format(actividadFormData.fecha_inicio, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={actividadFormData.fecha_inicio} onSelect={(date) => setActividadFormData({ ...actividadFormData, fecha_inicio: date })} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Fecha Fin *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={`w-full justify-start ${!actividadFormData.fecha_fin && 'text-muted-foreground'}`}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {actividadFormData.fecha_fin ? format(actividadFormData.fecha_fin, 'dd/MM/yyyy') : 'Seleccionar'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={actividadFormData.fecha_fin} onSelect={(date) => setActividadFormData({ ...actividadFormData, fecha_fin: date })} locale={es} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Duración (días)</Label>
                <Input type="number" min="1" value={actividadFormData.duracion} onChange={(e) => setActividadFormData({ ...actividadFormData, duracion: e.target.value })} placeholder="Auto-calculado" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActividadDialogOpen(false)} disabled={actividadSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={actividadSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {actividadSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingActividad ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {itemToDelete?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <strong>{itemToDelete?.nombre}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}