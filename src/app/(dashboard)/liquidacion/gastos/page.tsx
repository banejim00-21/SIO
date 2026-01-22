// src/app/(dashboard)/liquidacion/gastos/page.tsx
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
  Receipt,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  CheckCircle
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
  presupuesto_inicial: number
}

interface Partida {
  id_partida: number
  codigo: string
  descripcion: string
  monto_total?: number
}

interface Gasto {
  id_gasto: number
  id_obra: number
  id_partida: number | null
  descripcion: string
  monto: number
  tipo_documento: string
  numero_documento: string
  fecha_documento: string
  fecha_registro: string
  observaciones: string | null
  partida?: Partida
}

interface FormGasto {
  id_partida: string
  descripcion: string
  monto: string
  tipo_documento: string
  numero_documento: string
  fecha_documento: string
  observaciones: string
}

export default function GastosLiquidacionPage() {
  const [loading, setLoading] = useState(true)
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState<string>('')
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const [createDialog, setCreateDialog] = useState(false)
  const [editDialog, setEditDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [viewDialog, setViewDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  const [selectedGasto, setSelectedGasto] = useState<Gasto | null>(null)
  const [formData, setFormData] = useState<FormGasto>({
    id_partida: 'none',
    descripcion: '',
    monto: '',
    tipo_documento: 'FACTURA',
    numero_documento: '',
    fecha_documento: format(new Date(), 'yyyy-MM-dd'),
    observaciones: ''
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
    if (!selectedObra) return
    try {
      const response = await fetch(`/api/liquidacion/presupuestos?id_obra=${selectedObra}`)
      if (response.ok) {
        const data = await response.json()
        setPartidas(data.partidas || [])
      }
    } catch (error) {
      console.error('Error al cargar partidas:', error)
    }
  }, [selectedObra])

  const fetchGastos = useCallback(async () => {
    if (!selectedObra) {
      setGastos([])
      return
    }
    try {
      setLoading(true)
      const response = await fetch(`/api/liquidacion/gastos?id_obra=${selectedObra}`)
      if (response.ok) {
        const data = await response.json()
        setGastos(data.gastos || [])
      }
    } catch (error) {
      console.error('Error al cargar gastos:', error)
      toast.error('Error al cargar gastos')
    } finally {
      setLoading(false)
    }
  }, [selectedObra])

  useEffect(() => { fetchObras() }, [fetchObras])
  useEffect(() => {
    if (selectedObra) {
      fetchPartidas()
      fetchGastos()
    }
  }, [selectedObra, fetchPartidas, fetchGastos])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)
  }

  const resetForm = () => {
    setFormData({
      id_partida: 'none',
      descripcion: '',
      monto: '',
      tipo_documento: 'FACTURA',
      numero_documento: '',
      fecha_documento: format(new Date(), 'yyyy-MM-dd'),
      observaciones: ''
    })
  }

  const handleCreate = async () => {
    if (!formData.id_partida || formData.id_partida === 'none') {
      toast.error('Debe seleccionar una partida presupuestal')
      return
    }
    if (!formData.descripcion || !formData.monto) {
      toast.error('Complete los campos requeridos')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/liquidacion/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_obra: parseInt(selectedObra),
          id_partida: parseInt(formData.id_partida),
          descripcion: formData.descripcion,
          monto: parseFloat(formData.monto),
          numero_documento: formData.numero_documento || '-',
          fecha_documento: formData.fecha_documento
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al registrar gasto')
      }
      toast.success('Gasto registrado correctamente')
      setCreateDialog(false)
      resetForm()
      fetchGastos()
      fetchPartidas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al registrar')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedGasto) return
    setSaving(true)
    try {
      const response = await fetch(`/api/liquidacion/gastos/${selectedGasto.id_gasto}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_partida: formData.id_partida !== 'none' ? parseInt(formData.id_partida) : null,
          descripcion: formData.descripcion,
          monto: parseFloat(formData.monto),
          numero_documento: formData.numero_documento,
          fecha_documento: formData.fecha_documento
        })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al actualizar')
      }
      toast.success('Gasto actualizado')
      setEditDialog(false)
      setSelectedGasto(null)
      resetForm()
      fetchGastos()
      fetchPartidas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedGasto) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/liquidacion/gastos/${selectedGasto.id_gasto}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }
      toast.success('Gasto eliminado')
      setDeleteDialog(false)
      setSelectedGasto(null)
      fetchGastos()
      fetchPartidas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setDeleting(false)
    }
  }

  const openEditDialog = (gasto: Gasto) => {
    setSelectedGasto(gasto)
    setFormData({
      id_partida: gasto.id_partida?.toString() || 'none',
      descripcion: gasto.descripcion,
      monto: gasto.monto.toString(),
      tipo_documento: gasto.tipo_documento || 'FACTURA',
      numero_documento: gasto.numero_documento || '',
      fecha_documento: gasto.fecha_documento ? format(new Date(gasto.fecha_documento), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      observaciones: gasto.observaciones || ''
    })
    setEditDialog(true)
  }

  const filteredGastos = gastos.filter(g =>
    g.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.numero_documento?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPresupuesto = partidas.reduce((sum, p) => sum + (p.monto_total || 0), 0)
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0)
  const saldoDisponible = totalPresupuesto - totalGastos
  const porcentajeEjecucion = totalPresupuesto > 0 ? (totalGastos / totalPresupuesto) * 100 : 0

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
        <h1 className="text-3xl font-bold tracking-tight">Control de Gastos</h1>
        <p className="text-muted-foreground">Registro y seguimiento de la ejecución financiera</p>
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
              <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seleccione una obra</h3>
              <p className="text-muted-foreground">Para ver los gastos, primero seleccione una obra</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen Financiero */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Presupuesto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPresupuesto)}</div>
                <p className="text-xs text-muted-foreground">{partidas.length} partida(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ejecutado</CardTitle>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalGastos)}</div>
                <p className="text-xs text-muted-foreground">{gastos.length} registro(s)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Disponible</CardTitle>
                {saldoDisponible < 0 ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${saldoDisponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(saldoDisponible)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">% Ejecución</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${porcentajeEjecucion > 100 ? 'text-red-600' : porcentajeEjecucion > 80 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                  {porcentajeEjecucion.toFixed(1)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full ${porcentajeEjecucion > 100 ? 'bg-red-600' : porcentajeEjecucion > 80 ? 'bg-yellow-500' : 'bg-emerald-600'}`}
                    style={{ width: `${Math.min(porcentajeEjecucion, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Gastos */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Registro de Gastos</CardTitle>
                  <CardDescription>{obraSeleccionada?.nombre_obra}</CardDescription>
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
                    onClick={() => {
                      resetForm()
                      setCreateDialog(true)
                    }}
                    disabled={partidas.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Gasto
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {partidas.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Primero debe crear partidas presupuestales</p>
                  <Button variant="link" onClick={() => window.location.href = '/liquidacion/presupuestos'}>
                    Ir a Presupuestos
                  </Button>
                </div>
              ) : loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredGastos.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay gastos registrados</p>
                  <Button variant="link" onClick={() => setCreateDialog(true)} className="mt-2">
                    Registrar el primer gasto
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Partida</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGastos.map((gasto) => (
                      <TableRow key={gasto.id_gasto}>
                        <TableCell>{format(new Date(gasto.fecha_documento), 'dd/MM/yyyy', { locale: es })}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{gasto.descripcion}</TableCell>
                        <TableCell>
                          {gasto.partida ? <Badge variant="outline">{gasto.partida.codigo}</Badge> : <span className="text-muted-foreground text-sm">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-muted-foreground">{gasto.numero_documento || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(gasto.monto)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedGasto(gasto); setViewDialog(true) }}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(gasto)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => { setSelectedGasto(gasto); setDeleteDialog(true) }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={4} className="text-right">TOTAL EJECUTADO:</TableCell>
                      <TableCell className="text-right text-orange-600">{formatCurrency(totalGastos)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Crear */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Gasto</DialogTitle>
            <DialogDescription>Ingrese los datos del gasto ejecutado</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Partida Presupuestal *</Label>
              <Select value={formData.id_partida} onValueChange={(v) => setFormData({...formData, id_partida: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccione una partida" /></SelectTrigger>
                <SelectContent>
                  {partidas.map((p) => (
                    <SelectItem key={p.id_partida} value={p.id_partida.toString()}>
                      {p.codigo} - {p.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Debe seleccionar una partida para registrar el gasto</p>
            </div>
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea placeholder="Descripción del gasto" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={formData.fecha_documento} onChange={(e) => setFormData({...formData, fecha_documento: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Monto (S/) *</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>N° Documento</Label>
              <Input placeholder="Ej: F001-00123 (opcional)" value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Partida *</Label>
              <Select value={formData.id_partida} onValueChange={(v) => setFormData({...formData, id_partida: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  {partidas.map((p) => (
                    <SelectItem key={p.id_partida} value={p.id_partida.toString()}>{p.codigo} - {p.descripcion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={formData.fecha_documento} onChange={(e) => setFormData({...formData, fecha_documento: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({...formData, monto: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>N° Documento</Label>
              <Input value={formData.numero_documento} onChange={(e) => setFormData({...formData, numero_documento: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalle del Gasto</DialogTitle></DialogHeader>
          {selectedGasto && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="font-medium">{selectedGasto.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Partida</p>
                  <p className="font-medium">{selectedGasto.partida?.codigo || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(selectedGasto.monto)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">N° Documento</p>
                  <p className="font-medium">{selectedGasto.numero_documento || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p>{format(new Date(selectedGasto.fecha_documento), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialog(false)}>Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará el gasto &quot;{selectedGasto?.descripcion}&quot;. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
