// src/app/(dashboard)/admin/obras/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  Building2, Plus, Search, FolderOpen, Users, Calendar, 
  DollarSign, Loader2, FileText, Edit, Trash2, History,
  ChevronRight, MapPin, Upload, X
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Usuario {
  id_usuario: number
  nombre: string
  rol?: { nombre: string }
}

interface HistorialEstado {
  id_historial: number
  estado: string
  fecha_cambio: string
  justificacion: string | null
  usuario: { nombre: string }
}

interface Obra {
  id_obra: number
  nombre_obra: string
  ubicacion: string
  coordenadas: string | null
  presupuesto_inicial: number
  fecha_inicio_prevista: string
  fecha_fin_prevista?: string | null
  total_partidas_inicial?: number | null
  archivo_adjunto_url?: string | null
  estado: string
  fecha_creacion: string
  responsable: Usuario
  total_partidas: number
  total_documentos: number
  avance_porcentaje: number
  historial_estados: HistorialEstado[]
  responsables_adicionales: Usuario[]
}

interface Carpeta {
  id_carpeta_tipo: number
  codigo: string
  nombre_carpeta: string
}

const ESTADOS_OBRA = ['PLANEADA', 'EN_EJECUCION', 'CONCLUIDA', 'LIQUIDADA']
const COLORES_ESTADO: Record<string, string> = {
  'PLANEADA': 'bg-blue-100 text-blue-800',
  'EN_EJECUCION': 'bg-yellow-100 text-yellow-800',
  'CONCLUIDA': 'bg-green-100 text-green-800',
  'LIQUIDADA': 'bg-purple-100 text-purple-800'
}

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  'PLANEADA': ['EN_EJECUCION'],
  'EN_EJECUCION': ['CONCLUIDA', 'PLANEADA'],
  'CONCLUIDA': ['LIQUIDADA', 'EN_EJECUCION'],
  'LIQUIDADA': []
}

export default function ObrasPage() {
  const router = useRouter()
  const [obras, setObras] = useState<Obra[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carpetas, setCarpetas] = useState<Carpeta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<string>('todos')

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEstadoDialog, setShowEstadoDialog] = useState(false)
  const [showHistorialDialog, setShowHistorialDialog] = useState(false)
  const [showResponsablesDialog, setShowResponsablesDialog] = useState(false)

  const [selectedObra, setSelectedObra] = useState<Obra | null>(null)
  const [formTab, setFormTab] = useState<'datos' | 'responsables'>('datos')
  const [saving, setSaving] = useState(false)

  // Form data para crear/editar
  const [formData, setFormData] = useState({
    nombre_obra: '',
    ubicacion: '',
    coordenadas: '',
    presupuesto_inicial: '',
    fecha_inicio_prevista: '',
    fecha_fin_prevista: '',
    total_partidas: '',
    id_responsable: '',
    responsables_ids: [] as number[],
    archivo: null as File | null,
    archivo_carpeta_id: '1'
  })

  // Para cambio de estado
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [justificacionEstado, setJustificacionEstado] = useState('')

  const fetchObras = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/obras')
      const data = await res.json()
      if (data.obras) setObras(data.obras)
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar obras')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/usuarios')
      const data = await res.json()
      if (data.usuarios) setUsuarios(data.usuarios)
    } catch (error) {
      console.error('Error:', error)
    }
  }, [])

  const fetchCarpetas = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/carpetas')
      const data = await res.json()
      if (data.carpetas) setCarpetas(data.carpetas)
    } catch (error) {
      console.error('Error:', error)
    }
  }, [])

  useEffect(() => {
    fetchObras()
    fetchUsuarios()
    fetchCarpetas()
  }, [fetchObras, fetchUsuarios, fetchCarpetas])

  const resetForm = () => {
    setFormData({
      nombre_obra: '',
      ubicacion: '',
      coordenadas: '',
      presupuesto_inicial: '',
      fecha_inicio_prevista: '',
      fecha_fin_prevista: '',
      total_partidas: '',
      id_responsable: '',
      responsables_ids: [],
      archivo: null,
      archivo_carpeta_id: '1'
    })
    setFormTab('datos')
  }

  const handleCreate = async () => {
    if (!formData.nombre_obra || !formData.ubicacion || !formData.presupuesto_inicial || !formData.fecha_inicio_prevista) {
      toast.error('Complete los campos obligatorios')
      return
    }

    setSaving(true)
    try {
      const submitData = new FormData()
      submitData.append('nombre_obra', formData.nombre_obra)
      submitData.append('ubicacion', formData.ubicacion)
      if (formData.coordenadas) submitData.append('coordenadas', formData.coordenadas)
      submitData.append('presupuesto_inicial', formData.presupuesto_inicial)
      submitData.append('fecha_inicio_prevista', formData.fecha_inicio_prevista)
      if (formData.fecha_fin_prevista) submitData.append('fecha_fin_prevista', formData.fecha_fin_prevista)
      if (formData.total_partidas) submitData.append('total_partidas', formData.total_partidas)
      if (formData.id_responsable) submitData.append('id_responsable', formData.id_responsable)
      if (formData.responsables_ids.length > 0) {
        submitData.append('responsables_ids', JSON.stringify(formData.responsables_ids))
      }
      if (formData.archivo) {
        submitData.append('archivo', formData.archivo)
        submitData.append('archivo_carpeta_id', formData.archivo_carpeta_id)
      }

      const res = await fetch('/api/admin/obras', {
        method: 'POST',
        body: submitData
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al crear obra')
      }

      toast.success('Obra creada correctamente')
      setShowCreateDialog(false)
      resetForm()
      fetchObras()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear obra')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedObra) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/obras/${selectedObra.id_obra}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_obra: formData.nombre_obra,
          ubicacion: formData.ubicacion,
          coordenadas: formData.coordenadas || null,
          presupuesto_inicial: formData.presupuesto_inicial,
          fecha_inicio_prevista: formData.fecha_inicio_prevista,
          fecha_fin_prevista: formData.fecha_fin_prevista || null,
          total_partidas: formData.total_partidas || null,
          id_responsable: formData.id_responsable || null
        })
      })

      if (!res.ok) throw new Error('Error al actualizar')

      toast.success('Obra actualizada')
      setShowEditDialog(false)
      fetchObras()
    } catch (error) {
      toast.error('Error al actualizar obra')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedObra) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/obras/${selectedObra.id_obra}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al eliminar')
      }

      toast.success('Obra eliminada')
      setShowDeleteDialog(false)
      setSelectedObra(null)
      fetchObras()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar obra')
    } finally {
      setSaving(false)
    }
  }

  const handleCambiarEstado = async () => {
    if (!selectedObra || !nuevoEstado) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/obras/${selectedObra.id_obra}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          justificacion_estado: justificacionEstado
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Error al cambiar estado')
      }

      toast.success(`Estado cambiado a ${nuevoEstado}`)
      setShowEstadoDialog(false)
      setNuevoEstado('')
      setJustificacionEstado('')
      fetchObras()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cambiar estado')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateResponsables = async () => {
    if (!selectedObra) return

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/obras/${selectedObra.id_obra}/responsables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_responsable_principal: formData.id_responsable,
          responsables_ids: formData.responsables_ids
        })
      })

      if (!res.ok) throw new Error('Error al actualizar responsables')

      toast.success('Responsables actualizados')
      setShowResponsablesDialog(false)
      fetchObras()
    } catch (error) {
      toast.error('Error al actualizar responsables')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const openEditDialog = (obra: Obra) => {
    setSelectedObra(obra)
    setFormData({
      nombre_obra: obra.nombre_obra,
      ubicacion: obra.ubicacion,
      coordenadas: obra.coordenadas || '',
      presupuesto_inicial: String(obra.presupuesto_inicial),
      fecha_inicio_prevista: obra.fecha_inicio_prevista.split('T')[0],
      fecha_fin_prevista: obra.fecha_fin_prevista?.split('T')[0] || '',
      total_partidas: String(obra.total_partidas_inicial || ''),
      id_responsable: String(obra.responsable.id_usuario),
      responsables_ids: obra.responsables_adicionales.map(r => r.id_usuario),
      archivo: null,
      archivo_carpeta_id: '1'
    })
    setShowEditDialog(true)
  }

  const openResponsablesDialog = (obra: Obra) => {
    setSelectedObra(obra)
    setFormData(prev => ({
      ...prev,
      id_responsable: String(obra.responsable.id_usuario),
      responsables_ids: obra.responsables_adicionales.map(r => r.id_usuario)
    }))
    setShowResponsablesDialog(true)
  }

  const openEstadoDialog = (obra: Obra) => {
    setSelectedObra(obra)
    setNuevoEstado('')
    setJustificacionEstado('')
    setShowEstadoDialog(true)
  }

  const openHistorialDialog = (obra: Obra) => {
    setSelectedObra(obra)
    setShowHistorialDialog(true)
  }

  const toggleResponsable = (userId: number) => {
    setFormData(prev => ({
      ...prev,
      responsables_ids: prev.responsables_ids.includes(userId)
        ? prev.responsables_ids.filter(id => id !== userId)
        : [...prev.responsables_ids, userId]
    }))
  }

  // Filtrar obras
  const obrasFiltradas = obras.filter(obra => {
    const matchSearch = obra.nombre_obra.toLowerCase().includes(search.toLowerCase()) ||
                       obra.ubicacion.toLowerCase().includes(search.toLowerCase())
    const matchEstado = estadoFilter === 'todos' || obra.estado === estadoFilter
    return matchSearch && matchEstado
  })

  // Estadísticas
  const stats = {
    total: obras.length,
    planeadas: obras.filter(o => o.estado === 'PLANEADA').length,
    en_ejecucion: obras.filter(o => o.estado === 'EN_EJECUCION').length,
    concluidas: obras.filter(o => o.estado === 'CONCLUIDA').length,
    liquidadas: obras.filter(o => o.estado === 'LIQUIDADA').length,
    presupuesto_total: obras.reduce((sum, o) => sum + Number(o.presupuesto_inicial), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Obras</h1>
          <p className="text-gray-500">Administra los proyectos de construcción</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true) }}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Obra
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.planeadas}</p>
                <p className="text-xs text-gray-500">Planeadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.en_ejecucion}</p>
                <p className="text-xs text-gray-500">En Ejecución</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.concluidas}</p>
                <p className="text-xs text-gray-500">Concluidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.liquidadas}</p>
                <p className="text-xs text-gray-500">Liquidadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-lg font-bold">S/ {stats.presupuesto_total.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Presupuesto</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o ubicación..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                {ESTADOS_OBRA.map(estado => (
                  <SelectItem key={estado} value={estado}>
                    {estado.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de obras */}
      <div className="grid gap-4">
        {obrasFiltradas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No se encontraron obras</p>
            </CardContent>
          </Card>
        ) : (
          obrasFiltradas.map(obra => (
            <Card key={obra.id_obra} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{obra.nombre_obra}</h3>
                          <Badge className={COLORES_ESTADO[obra.estado]}>
                            {obra.estado.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {obra.ubicacion}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> 
                            {new Date(obra.fecha_inicio_prevista).toLocaleDateString()}
                            {obra.fecha_fin_prevista && ` - ${new Date(obra.fecha_fin_prevista).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm pl-12">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium">S/ {Number(obra.presupuesto_inicial).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FolderOpen className="h-4 w-4 text-orange-500" />
                        <span>{obra.total_partidas} partidas</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span>{obra.total_documentos} documentos</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span>{obra.responsable?.nombre || 'Sin asignar'}</span>
                        {obra.responsables_adicionales && obra.responsables_adicionales.length > 0 && (
                          <span className="text-gray-400">+{obra.responsables_adicionales.length}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${Math.min(obra.avance_porcentaje, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{obra.avance_porcentaje}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-12 lg:pl-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/obras/${obra.id_obra}/partidas`)}
                    >
                      <FolderOpen className="h-4 w-4 mr-1" /> Partidas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEstadoDialog(obra)}
                      disabled={TRANSICIONES_VALIDAS[obra.estado]?.length === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openHistorialDialog(obra)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openResponsablesDialog(obra)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(obra)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSelectedObra(obra); setShowDeleteDialog(true) }}
                      disabled={obra.estado !== 'PLANEADA'}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog: Crear Obra */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Obra</DialogTitle>
            <DialogDescription>Registra una nueva obra de construcción</DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`px-4 py-2 font-medium ${formTab === 'datos' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setFormTab('datos')}
            >
              Datos Generales
            </button>
            <button
              className={`px-4 py-2 font-medium ${formTab === 'responsables' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              onClick={() => setFormTab('responsables')}
            >
              Responsables
            </button>
          </div>

          {formTab === 'datos' && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre de la Obra *</Label>
                <Input
                  id="nombre"
                  placeholder="Ej: Construcción del Pabellón A"
                  value={formData.nombre_obra}
                  onChange={(e) => setFormData({ ...formData, nombre_obra: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ubicacion">Ubicación *</Label>
                <Input
                  id="ubicacion"
                  placeholder="Ej: Campus Universitario"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="coordenadas">Coordenadas (opcional)</Label>
                <Input
                  id="coordenadas"
                  placeholder="Ej: -12.0464, -77.0428"
                  value={formData.coordenadas}
                  onChange={(e) => setFormData({ ...formData, coordenadas: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="presupuesto">Total Financiamiento (S/) *</Label>
                  <Input
                    id="presupuesto"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.presupuesto_inicial}
                    onChange={(e) => setFormData({ ...formData, presupuesto_inicial: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="total_partidas">Total de Partidas</Label>
                  <Input
                    id="total_partidas"
                    type="number"
                    min="0"
                    placeholder="Ej: 10"
                    value={formData.total_partidas}
                    onChange={(e) => setFormData({ ...formData, total_partidas: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio_prevista}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio_prevista: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fecha_fin">Fecha Fin (opcional)</Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin_prevista}
                    onChange={(e) => setFormData({ ...formData, fecha_fin_prevista: e.target.value })}
                  />
                </div>
              </div>

              {/* Archivo adjunto */}
              <div className="grid gap-2">
                <Label>Archivo Adjunto (opcional)</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  {formData.archivo ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="text-sm">{formData.archivo.name}</span>
                        <span className="text-xs text-gray-400">
                          ({(formData.archivo.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData({ ...formData, archivo: null })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                      <Upload className="h-8 w-8 text-gray-400" />
                      <span className="text-sm text-gray-500">Click para seleccionar archivo</span>
                      <span className="text-xs text-gray-400">PDF, DOC, XLSX, PNG, JPG (máx. 10MB)</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              toast.error('El archivo excede 10MB')
                              return
                            }
                            setFormData({ ...formData, archivo: file })
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                {formData.archivo && (
                  <div className="grid gap-2">
                    <Label htmlFor="carpeta">Guardar en carpeta</Label>
                    <Select 
                      value={formData.archivo_carpeta_id}
                      onValueChange={(v) => setFormData({ ...formData, archivo_carpeta_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar carpeta" />
                      </SelectTrigger>
                      <SelectContent>
                        {carpetas.map(c => (
                          <SelectItem key={c.id_carpeta_tipo} value={String(c.id_carpeta_tipo)}>
                            {c.codigo} - {c.nombre_carpeta}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {formTab === 'responsables' && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Responsable Principal</Label>
                <Select 
                  value={formData.id_responsable}
                  onValueChange={(v) => setFormData({ ...formData, id_responsable: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => (
                      <SelectItem key={u.id_usuario} value={String(u.id_usuario)}>
                        {u.nombre} {u.rol?.nombre && `(${u.rol.nombre})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Responsables Adicionales</Label>
                <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {usuarios.map(u => (
                    <div key={u.id_usuario} className="flex items-center gap-2">
                      <Checkbox
                        id={`user-${u.id_usuario}`}
                        checked={formData.responsables_ids.includes(u.id_usuario)}
                        onCheckedChange={() => toggleResponsable(u.id_usuario)}
                      />
                      <label htmlFor={`user-${u.id_usuario}`} className="text-sm cursor-pointer">
                        {u.nombre} {u.rol?.nombre && <span className="text-gray-400">({u.rol.nombre})</span>}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Obra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Obra */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Obra</DialogTitle>
            <DialogDescription>Modifica los datos de la obra</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nombre de la Obra *</Label>
              <Input
                value={formData.nombre_obra}
                onChange={(e) => setFormData({ ...formData, nombre_obra: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Ubicación *</Label>
              <Input
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Coordenadas</Label>
              <Input
                value={formData.coordenadas}
                onChange={(e) => setFormData({ ...formData, coordenadas: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Total Financiamiento (S/) *</Label>
                <Input
                  type="number"
                  value={formData.presupuesto_inicial}
                  onChange={(e) => setFormData({ ...formData, presupuesto_inicial: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Total de Partidas</Label>
                <Input
                  type="number"
                  value={formData.total_partidas}
                  onChange={(e) => setFormData({ ...formData, total_partidas: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={formData.fecha_inicio_prevista}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio_prevista: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={formData.fecha_fin_prevista}
                  onChange={(e) => setFormData({ ...formData, fecha_fin_prevista: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Responsable Principal</Label>
              <Select 
                value={formData.id_responsable}
                onValueChange={(v) => setFormData({ ...formData, id_responsable: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar responsable" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => (
                    <SelectItem key={u.id_usuario} value={String(u.id_usuario)}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Eliminar Obra */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Obra</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar la obra &quot;{selectedObra?.nombre_obra}&quot;? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cambiar Estado */}
      <Dialog open={showEstadoDialog} onOpenChange={setShowEstadoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>
              Estado actual: <Badge className={COLORES_ESTADO[selectedObra?.estado || '']}>
                {selectedObra?.estado?.replace('_', ' ')}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nuevo Estado</Label>
              <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar nuevo estado" />
                </SelectTrigger>
                <SelectContent>
                  {(TRANSICIONES_VALIDAS[selectedObra?.estado || ''] || []).map(estado => (
                    <SelectItem key={estado} value={estado}>
                      {estado.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Justificación</Label>
              <Textarea
                placeholder="Ingrese el motivo del cambio de estado..."
                value={justificacionEstado}
                onChange={(e) => setJustificacionEstado(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstadoDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCambiarEstado} disabled={saving || !nuevoEstado}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cambiar Estado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial */}
      <Dialog open={showHistorialDialog} onOpenChange={setShowHistorialDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Historial de Estados</DialogTitle>
            <DialogDescription>{selectedObra?.nombre_obra}</DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {selectedObra?.historial_estados && selectedObra.historial_estados.length > 0 ? (
              <div className="space-y-4">
                {selectedObra.historial_estados.map((h, idx) => (
                  <div key={h.id_historial} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      {idx < selectedObra.historial_estados.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <Badge className={COLORES_ESTADO[h.estado]}>{h.estado.replace('_', ' ')}</Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(h.fecha_cambio).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{h.justificacion || 'Sin justificación'}</p>
                      <p className="text-xs text-gray-400 mt-1">Por: {h.usuario.nombre}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Sin historial de estados</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Responsables */}
      <Dialog open={showResponsablesDialog} onOpenChange={setShowResponsablesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar Responsables</DialogTitle>
            <DialogDescription>{selectedObra?.nombre_obra}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Responsable Principal</Label>
              <Select 
                value={formData.id_responsable}
                onValueChange={(v) => setFormData({ ...formData, id_responsable: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar responsable" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(u => (
                    <SelectItem key={u.id_usuario} value={String(u.id_usuario)}>
                      {u.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Responsables Adicionales</Label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {usuarios.map(u => (
                  <div key={u.id_usuario} className="flex items-center gap-2">
                    <Checkbox
                      id={`resp-${u.id_usuario}`}
                      checked={formData.responsables_ids.includes(u.id_usuario)}
                      onCheckedChange={() => toggleResponsable(u.id_usuario)}
                    />
                    <label htmlFor={`resp-${u.id_usuario}`} className="text-sm cursor-pointer">
                      {u.nombre}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponsablesDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateResponsables} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
