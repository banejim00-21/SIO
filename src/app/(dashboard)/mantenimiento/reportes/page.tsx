// src/app/(dashboard)/mantenimiento/reportes/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Search, 
  Plus, 
  Loader2, 
  FileText,
  Building2,
  Calendar,
  Eye,
  Edit,
  Trash2,
  User
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Obra {
  id_obra: number
  nombre_obra: string
  ubicacion: string
  estado: string
}

interface ReporteTecnico {
  id_reporte_tecnico: number
  avance_fisico: number
  hitos_cumplidos: string | null
  observaciones: string | null
}

interface Usuario {
  id_usuario: number
  nombre: string
}

interface Reporte {
  id_reporte: number
  fecha_generacion: string
  id_usuario: number
  obra: Obra
  usuario: Usuario
  reporte_tecnico: ReporteTecnico | null
}

interface Stats {
  total: number
  esteMes: number
}

interface FormData {
  id_obra: string
  avance_fisico: string
  hitos_cumplidos: string
  observaciones: string
}

export default function ReportesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({ total: 0, esteMes: 0 })
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filterObra, setFilterObra] = useState('TODOS')
  
  // Modal crear/editar
  const [openDialog, setOpenDialog] = useState(searchParams.get('nuevo') === 'true')
  const [editingReporte, setEditingReporte] = useState<Reporte | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    id_obra: '',
    avance_fisico: '',
    hitos_cumplidos: '',
    observaciones: ''
  })
  
  // Modal detalle
  const [detailDialog, setDetailDialog] = useState(false)
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null)
  
  // Modal eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [reporteToDelete, setReporteToDelete] = useState<Reporte | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterObra !== 'TODOS') params.append('id_obra', filterObra)
      
      const response = await fetch(`/api/mantenimiento/reportes?${params}`)
      
      if (!response.ok) throw new Error('Error al cargar reportes')
      
      const data = await response.json()
      setReportes(data.reportes || [])
      setStats(data.stats || { total: 0, esteMes: 0 })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }, [filterObra])

  const fetchObras = useCallback(async () => {
    try {
      // Obtener TODAS las obras, no solo las de infraestructura
      const response = await fetch('/api/admin/obras')
      if (response.ok) {
        const data = await response.json()
        // Filtrar solo obras en ejecución
        const obrasEnEjecucion = (data.obras || []).filter(
          (o: Obra) => o.estado === 'EN_EJECUCION'
        )
        setObras(obrasEnEjecucion)
      }
    } catch (error) {
      console.error('Error al cargar obras:', error)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchObras()
  }, [fetchData, fetchObras])

  const openCreateDialog = () => {
    setEditingReporte(null)
    setFormData({
      id_obra: '',
      avance_fisico: '',
      hitos_cumplidos: '',
      observaciones: ''
    })
    setOpenDialog(true)
  }

  const openEditDialog = (reporte: Reporte) => {
    setEditingReporte(reporte)
    setFormData({
      id_obra: reporte.obra.id_obra.toString(),
      avance_fisico: reporte.reporte_tecnico?.avance_fisico.toString() || '',
      hitos_cumplidos: reporte.reporte_tecnico?.hitos_cumplidos || '',
      observaciones: reporte.reporte_tecnico?.observaciones || ''
    })
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.id_obra || !formData.avance_fisico) {
      toast.error('Complete los campos obligatorios')
      return
    }

    const avanceNumero = parseFloat(formData.avance_fisico)
    if (isNaN(avanceNumero) || avanceNumero < 0 || avanceNumero > 100) {
      toast.error('El avance debe ser un número entre 0 y 100')
      return
    }

    setSubmitting(true)
    try {
      const url = editingReporte 
        ? `/api/mantenimiento/reportes/${editingReporte.id_reporte}`
        : '/api/mantenimiento/reportes'
      
      const response = await fetch(url, {
        method: editingReporte ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          avance_fisico: avanceNumero
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al guardar reporte')
      }

      toast.success(`Reporte ${editingReporte ? 'actualizado' : 'creado'} correctamente`)
      setOpenDialog(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar reporte')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!reporteToDelete) return
    
    try {
      const response = await fetch(`/api/mantenimiento/reportes/${reporteToDelete.id_reporte}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Reporte eliminado')
      setDeleteDialogOpen(false)
      setReporteToDelete(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const openDetail = (reporte: Reporte) => {
    setSelectedReporte(reporte)
    setDetailDialog(true)
  }

  const canEditOrDelete = (reporte: Reporte) => {
    const hoy = new Date()
    const fechaReporte = new Date(reporte.fecha_generacion)
    return hoy.toDateString() === fechaReporte.toDateString()
  }

  const filteredReportes = reportes.filter(r =>
    r.obra.nombre_obra.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold tracking-tight">Reportes Técnicos</h1>
          <p className="text-muted-foreground">
            Registro de avances físicos de las obras
          </p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Reporte
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total Reportes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.esteMes}</div>
                <p className="text-sm text-muted-foreground">Este Mes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Lista de Reportes</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterObra} onValueChange={setFilterObra}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todas las obras</SelectItem>
                  {obras.map((obra) => (
                    <SelectItem key={obra.id_obra} value={obra.id_obra.toString()}>
                      {obra.nombre_obra}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Avance Físico</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReportes.map((reporte) => (
                <TableRow key={reporte.id_reporte}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(reporte.fecha_generacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{reporte.obra.nombre_obra}</div>
                      <div className="text-sm text-muted-foreground">{reporte.obra.ubicacion}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-amber-600 h-2 rounded-full" 
                          style={{ width: `${reporte.reporte_tecnico?.avance_fisico || 0}%` }}
                        />
                      </div>
                      <Badge variant="outline" className="font-mono">
                        {reporte.reporte_tecnico?.avance_fisico || 0}%
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{reporte.usuario.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openDetail(reporte)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canEditOrDelete(reporte) && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(reporte)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600"
                            onClick={() => {
                              setReporteToDelete(reporte)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredReportes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No hay reportes registrados</p>
                    <Button 
                      variant="link" 
                      onClick={openCreateDialog}
                      className="mt-2"
                    >
                      Crear primer reporte
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar Reporte */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingReporte ? 'Editar Reporte' : 'Nuevo Reporte Técnico'}
              </DialogTitle>
              <DialogDescription>
                Registra el avance físico de una obra
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Obra *</Label>
                <Select 
                  value={formData.id_obra}
                  onValueChange={(value) => setFormData({ ...formData, id_obra: value })}
                  disabled={!!editingReporte}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar obra" />
                  </SelectTrigger>
                  <SelectContent>
                    {obras.map((obra) => (
                      <SelectItem key={obra.id_obra} value={obra.id_obra.toString()}>
                        {obra.nombre_obra}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {obras.length === 0 && (
                  <p className="text-xs text-amber-600">
                    No hay obras en ejecución disponibles
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Avance Físico (%) *</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.avance_fisico}
                    onChange={(e) => setFormData({ ...formData, avance_fisico: e.target.value })}
                    placeholder="0.0"
                    className="w-24"
                    required
                  />
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.avance_fisico || 0}
                      onChange={(e) => setFormData({ ...formData, avance_fisico: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hitos Cumplidos</Label>
                <Textarea
                  value={formData.hitos_cumplidos}
                  onChange={(e) => setFormData({ ...formData, hitos_cumplidos: e.target.value })}
                  placeholder="Liste los hitos o metas alcanzadas..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Observaciones adicionales, dificultades encontradas..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || obras.length === 0} className="bg-amber-600 hover:bg-amber-700">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingReporte ? 'Actualizar' : 'Crear Reporte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalle del Reporte</DialogTitle>
            <DialogDescription>
              {selectedReporte && format(new Date(selectedReporte.fecha_generacion), "EEEE dd 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          {selectedReporte && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedReporte.obra.nombre_obra}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedReporte.obra.ubicacion}</p>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avance Físico</span>
                  <span className="text-2xl font-bold text-amber-600">
                    {selectedReporte.reporte_tecnico?.avance_fisico || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
                  <div 
                    className="bg-amber-600 h-3 rounded-full transition-all" 
                    style={{ width: `${selectedReporte.reporte_tecnico?.avance_fisico || 0}%` }}
                  />
                </div>
              </div>

              {selectedReporte.reporte_tecnico?.hitos_cumplidos && (
                <div>
                  <Label className="text-muted-foreground">Hitos Cumplidos</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedReporte.reporte_tecnico.hitos_cumplidos}</p>
                </div>
              )}

              {selectedReporte.reporte_tecnico?.observaciones && (
                <div>
                  <Label className="text-muted-foreground">Observaciones</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedReporte.reporte_tecnico.observaciones}</p>
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  Registrado por: {selectedReporte.usuario.nombre}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el reporte del {reporteToDelete && format(new Date(reporteToDelete.fecha_generacion), "dd/MM/yyyy", { locale: es })}. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
