// src/app/(dashboard)/liquidacion/presupuestos/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Calculator,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  TrendingUp,
  History
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

interface Obra {
  id_obra: number
  nombre_obra: string
  presupuesto_inicial: number
}

interface Partida {
  id_partida: number
  id_presupuesto?: number
  codigo: string
  descripcion: string
  unidad?: string
  cantidad?: number
  precio_unitario?: number
  monto_total: number
  monto_ejecutado?: number
}

interface FormPartida {
  descripcion: string
  monto_asignado: string
}

export default function PresupuestosLiquidacionPage() {
  const [loading, setLoading] = useState(true)
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState<string>('')
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modales
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [viewDialog, setViewDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [selectedPartida, setSelectedPartida] = useState<Partida | null>(null)
  const [formData, setFormData] = useState<FormPartida>({
    descripcion: '',
    monto_asignado: ''
  })

  const fetchObras = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/obras')
      if (response.ok) {
        const data = await response.json()
        setObras(data.obras || [])
      }
    } catch (error) {
      console.error('Error al cargar obras:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPartidas = useCallback(async () => {
    if (!selectedObra) {
      setPartidas([])
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/liquidacion/presupuestos?id_obra=${selectedObra}`)
      
      if (response.ok) {
        const data = await response.json()
        setPartidas(data.partidas || [])
      }
    } catch (error) {
      console.error('Error al cargar partidas:', error)
      toast.error('Error al cargar partidas')
    } finally {
      setLoading(false)
    }
  }, [selectedObra])

  useEffect(() => {
    fetchObras()
  }, [fetchObras])

  useEffect(() => {
    if (selectedObra) {
      fetchPartidas()
    }
  }, [selectedObra, fetchPartidas])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount)
  }

  const resetForm = () => {
    setFormData({
      descripcion: '',
      monto_asignado: ''
    })
  }

  const handleCreate = async () => {
    if (!formData.descripcion || !formData.monto_asignado) {
      toast.error('Complete todos los campos requeridos')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/liquidacion/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_obra: parseInt(selectedObra),
          descripcion: formData.descripcion,
          monto_asignado: parseFloat(formData.monto_asignado)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear partida')
      }

      toast.success('Partida creada correctamente')
      setCreateDialog(false)
      resetForm()
      fetchPartidas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear partida')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedPartida) return

    setSaving(true)
    try {
      const response = await fetch(`/api/liquidacion/presupuestos/${selectedPartida.id_partida}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: formData.descripcion,
          monto_asignado: parseFloat(formData.monto_asignado)
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al actualizar partida')
      }

      toast.success('Partida actualizada correctamente')
      setEditDialog(false)
      setSelectedPartida(null)
      resetForm()
      fetchPartidas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al actualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedPartida) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/liquidacion/presupuestos/${selectedPartida.id_partida}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Partida eliminada correctamente')
      setDeleteDialog(false)
      setSelectedPartida(null)
      fetchPartidas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const openEditDialog = (partida: Partida) => {
    setSelectedPartida(partida)
    setFormData({
      descripcion: partida.descripcion,
      monto_asignado: partida.monto_total.toString()
    })
    setEditDialog(true)
  }

  const filteredPartidas = partidas.filter(p =>
    p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPartidas = partidas.reduce((sum, p) => sum + (p.monto_total || 0), 0)
  const totalEjecutado = partidas.reduce((sum, p) => sum + (p.monto_ejecutado || 0), 0)
  const obraSeleccionada = obras.find(o => o.id_obra.toString() === selectedObra)

  if (loading && obras.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión Presupuestal</h1>
        <p className="text-muted-foreground">Administra las partidas presupuestales de las obras</p>
      </div>

      {/* Selector de Obra */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Seleccionar Obra</Label>
              <Select value={selectedObra} onValueChange={setSelectedObra}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una obra..." />
                </SelectTrigger>
                <SelectContent>
                  {obras.map((obra) => (
                    <SelectItem key={obra.id_obra} value={obra.id_obra.toString()}>
                      {obra.nombre_obra}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedObra ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seleccione una obra</h3>
              <p className="text-muted-foreground">
                Para ver las partidas presupuestales, primero seleccione una obra
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Presupuesto Inicial</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(Number(obraSeleccionada?.presupuesto_inicial) || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Partidas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(totalPartidas)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {partidas.length} partida(s)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ejecutado</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(totalEjecutado)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalPartidas > 0 ? ((totalEjecutado / totalPartidas) * 100).toFixed(1) : 0}% del total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Partidas */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Partidas Presupuestales</CardTitle>
                  <CardDescription>
                    Gestión de partidas para {obraSeleccionada?.nombre_obra}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-8 w-[200px]"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => setCreateDialog(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Partida
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredPartidas.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay partidas registradas</p>
                  <Button 
                    variant="link" 
                    onClick={() => setCreateDialog(true)}
                    className="mt-2"
                  >
                    Crear la primera partida
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto Asignado</TableHead>
                      <TableHead className="text-right">Ejecutado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartidas.map((partida) => (
                      <TableRow key={partida.id_partida}>
                        <TableCell>
                          <Badge variant="outline">{partida.codigo}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {partida.descripcion}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(partida.monto_total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={partida.monto_ejecutado && partida.monto_ejecutado > 0 ? 'text-blue-600' : 'text-muted-foreground'}>
                            {formatCurrency(partida.monto_ejecutado || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedPartida(partida)
                                setViewDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditDialog(partida)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-600"
                              onClick={() => {
                                setSelectedPartida(partida)
                                setDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Fila de totales */}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalPartidas)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(totalEjecutado)}</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Crear Partida */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Partida</DialogTitle>
            <DialogDescription>
              Agregue una nueva partida presupuestal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                placeholder="Descripción de la partida"
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto Asignado (S/) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.monto_asignado}
                onChange={(e) => setFormData({...formData, monto_asignado: e.target.value})}
              />
            </div>
            {formData.monto_asignado && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <strong>Monto:</strong>{' '}
                  {formatCurrency(parseFloat(formData.monto_asignado) || 0)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Partida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Partida */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Partida</DialogTitle>
            <DialogDescription>
              Modifique los datos de la partida
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto Asignado (S/) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.monto_asignado}
                onChange={(e) => setFormData({...formData, monto_asignado: e.target.value})}
              />
            </div>
            {formData.monto_asignado && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-800">
                  <strong>Monto:</strong>{' '}
                  {formatCurrency(parseFloat(formData.monto_asignado) || 0)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEdit} 
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Partida */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalle de Partida</DialogTitle>
          </DialogHeader>
          {selectedPartida && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-medium">{selectedPartida.codigo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="font-medium">{selectedPartida.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Monto Asignado</p>
                  <p className="font-bold text-emerald-600">
                    {formatCurrency(selectedPartida.monto_total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ejecutado</p>
                  <p className="font-bold text-blue-600">
                    {formatCurrency(selectedPartida.monto_ejecutado || 0)}
                  </p>
                </div>
              </div>
              {selectedPartida.monto_total > 0 && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-1">Progreso de Ejecución</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${Math.min(((selectedPartida.monto_ejecutado || 0) / selectedPartida.monto_total) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((selectedPartida.monto_ejecutado || 0) / selectedPartida.monto_total * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar partida?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la partida &quot;{selectedPartida?.codigo} - {selectedPartida?.descripcion}&quot;. 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
