'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Calendar, Plus, Eye, Edit, Trash2, Loader2, Building2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import Link from 'next/link'

interface Obra {
  id_obra: number
  nombre_obra: string
  estado: string
  responsable: {
    nombre: string
  }
  cronogramas: Array<{
    id_cronograma: number
    fecha_creacion: string
    estado: string
    hitos: Array<{
      id_hito: number
      descripcion: string
      fecha_hito: string
      tipo: string
    }>
  }>
}

interface CronogramaFormData {
  id_obra: string
  estado: string
  hitos: Array<{
    descripcion: string
    fecha_hito: string
    tipo: string
  }>
}

export default function CronogramasPage() {
  const [obras, setObras] = useState<Obra[]>([])
  const [obrasDisponibles, setObrasDisponibles] = useState<Array<{id_obra: number, nombre_obra: string, estado: string}>>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [openDialog, setOpenDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cronogramaToDelete, setCronogramaToDelete] = useState<{id: number, nombre: string} | null>(null)
  const [formData, setFormData] = useState<CronogramaFormData>({
    id_obra: '',
    estado: 'ACTIVO',
    hitos: [{ descripcion: '', fecha_hito: '', tipo: 'HITO_PRINCIPAL' }]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true)
      const response = await fetch('/api/infraestructura/cronogramas')
      
      if (response.ok) {
        const data = await response.json()
        setObras(data.obras || [])
        
        // Preparar lista de obras disponibles para el desplegable
        const obrasParaSelect = data.obras
          .filter((obra: Obra) => ['EN_EJECUCION', 'PLANEADA'].includes(obra.estado))
          .map((obra: Obra) => ({
            id_obra: obra.id_obra,
            nombre_obra: obra.nombre_obra,
            estado: obra.estado
          }))
        setObrasDisponibles(obrasParaSelect)
      } else {
        throw new Error('Error al cargar cronogramas')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('No se pudieron cargar los cronogramas')
    } finally {
      setLoading(false)
    }
  }

  const handleAddHito = (): void => {
    setFormData(prev => ({
      ...prev,
      hitos: [...prev.hitos, { descripcion: '', fecha_hito: '', tipo: 'HITO_PRINCIPAL' }]
    }))
  }

  const handleRemoveHito = (index: number): void => {
    if (formData.hitos.length > 1) {
      setFormData(prev => ({
        ...prev,
        hitos: prev.hitos.filter((_, i) => i !== index)
      }))
    }
  }

  const handleHitoChange = (index: number, field: string, value: string): void => {
    setFormData(prev => ({
      ...prev,
      hitos: prev.hitos.map((hito, i) => 
        i === index ? { ...hito, [field]: value } : hito
      )
    }))
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    if (!formData.id_obra) {
      toast.error('Debe seleccionar una obra')
      return
    }

    // Validar que todos los hitos tengan descripción y fecha
    const hitosInvalidos = formData.hitos.some(hito => !hito.descripcion.trim() || !hito.fecha_hito)
    if (hitosInvalidos) {
      toast.error('Todos los hitos deben tener descripción y fecha')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/infraestructura/cronogramas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear cronograma')
      }

      toast.success('Cronograma creado correctamente')
      setOpenDialog(false)
      setFormData({
        id_obra: '',
        estado: 'ACTIVO',
        hitos: [{ descripcion: '', fecha_hito: '', tipo: 'HITO_PRINCIPAL' }]
      })
      fetchData()
    } catch (error) {
      console.error('Error detallado:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear cronograma')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCronograma = async (): Promise<void> => {
    if (!cronogramaToDelete) return

    try {
      const response = await fetch(`/api/infraestructura/cronogramas/${cronogramaToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar cronograma')
      }

      toast.success('Cronograma eliminado correctamente')
      setDeleteDialogOpen(false)
      setCronogramaToDelete(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar cronograma')
    }
  }

  const filteredObras = obras.filter(obra =>
    obra.nombre_obra.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const calcularProgresoCronograma = (cronograma: Obra['cronogramas'][0]): number => {
    const totalHitos = cronograma.hitos.length
    if (totalHitos === 0) return 0
    
    const hoy = new Date()
    const hitosCompletados = cronograma.hitos.filter(hito => 
      new Date(hito.fecha_hito) < hoy
    ).length
    
    return Math.round((hitosCompletados / totalHitos) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Cronogramas</h1>
          <p className="text-muted-foreground">
            Administra los cronogramas y hitos de los proyectos
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setOpenDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cronograma
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Cronograma</DialogTitle>
                <DialogDescription>
                  Define el cronograma y los hitos importantes del proyecto
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="id_obra">Proyecto *</Label>
                  <Select
                    value={formData.id_obra}
                    onValueChange={(value) => setFormData({ ...formData, id_obra: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un proyecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {obrasDisponibles.length > 0 ? (
                        obrasDisponibles.map(obra => (
                          <SelectItem key={obra.id_obra} value={obra.id_obra.toString()}>
                            {obra.nombre_obra} ({obra.estado})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No hay proyectos disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Solo se muestran proyectos en estado En Ejecución o Planeada
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado del Cronograma</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => setFormData({ ...formData, estado: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">Activo</SelectItem>
                      <SelectItem value="PAUSADO">Pausado</SelectItem>
                      <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Hitos del Cronograma *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleAddHito}>
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Hito
                    </Button>
                  </div>
                  
                  {formData.hitos.map((hito, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-lg">
                      <div className="space-y-2">
                        <Label>Descripción *</Label>
                        <Input
                          value={hito.descripcion}
                          onChange={(e) => handleHitoChange(index, 'descripcion', e.target.value)}
                          placeholder="Ej: Inicio de cimentación"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Fecha *</Label>
                        <Input
                          type="date"
                          value={hito.fecha_hito}
                          onChange={(e) => handleHitoChange(index, 'fecha_hito', e.target.value)}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={hito.tipo}
                          onValueChange={(value) => handleHitoChange(index, 'tipo', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HITO_PRINCIPAL">Hito Principal</SelectItem>
                            <SelectItem value="ENTREGA_PARCIAL">Entrega Parcial</SelectItem>
                            <SelectItem value="REVISION">Revisión</SelectItem>
                            <SelectItem value="FINALIZACION">Finalización</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {formData.hitos.length > 1 && (
                        <div className="md:col-span-3 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveHito(index)}
                            className="text-red-600"
                          >
                            Eliminar Hito
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
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
                  disabled={submitting || !formData.id_obra || formData.hitos.some(h => !h.descripcion || !h.fecha_hito)} 
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Cronograma'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista de Cronogramas</CardTitle>
              <CardDescription>
                {filteredObras.reduce((acc, obra) => acc + obra.cronogramas.length, 0)} cronogramas encontrados
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
            {filteredObras.map(obra => (
              <Card key={obra.id_obra} className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        {obra.nombre_obra}
                      </CardTitle>
                      <CardDescription>
                        Responsable: {obra.responsable.nombre} | Estado: {obra.estado}
                      </CardDescription>
                    </div>
                    <Badge variant={obra.estado === 'EN_EJECUCION' ? 'default' : 'secondary'}>
                      {obra.estado}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {obra.cronogramas.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha Creación</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Progreso</TableHead>
                          <TableHead>Total Hitos</TableHead>
                          <TableHead>Próximo Hito</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {obra.cronogramas.map(cronograma => {
                          const progreso = calcularProgresoCronograma(cronograma)
                          const hitosFuturos = cronograma.hitos
                            .filter(hito => new Date(hito.fecha_hito) > new Date())
                            .sort((a, b) => new Date(a.fecha_hito).getTime() - new Date(b.fecha_hito).getTime())
                          const proximoHito = hitosFuturos[0]

                          return (
                            <TableRow key={cronograma.id_cronograma}>
                              <TableCell>
                                {new Date(cronograma.fecha_creacion).toLocaleDateString('es-PE')}
                              </TableCell>
                              <TableCell>
                                <Badge variant={cronograma.estado === 'ACTIVO' ? 'default' : 'secondary'}>
                                  {cronograma.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-green-600 h-2 rounded-full transition-all" 
                                      style={{ width: `${progreso}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium w-8">{progreso}%</span>
                                </div>
                              </TableCell>
                              <TableCell>{cronograma.hitos.length}</TableCell>
                              <TableCell>
                                {proximoHito ? (
                                  <div className="text-sm">
                                    <div className="font-medium">{proximoHito.descripcion}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(proximoHito.fecha_hito).toLocaleDateString('es-PE')}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">No hay hitos futuros</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Link href={`/infraestructura/proyectos/${obra.id_obra}/cronograma`}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => {
                                      setCronogramaToDelete({
                                        id: cronograma.id_cronograma,
                                        nombre: `Cronograma de ${obra.nombre_obra}`
                                      })
                                      setDeleteDialogOpen(true)
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No hay cronogramas para este proyecto
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Crea el primer cronograma para comenzar a planificar
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredObras.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No se encontraron proyectos
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Intenta ajustar los términos de búsqueda' : 'No hay proyectos disponibles'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cronograma{' '}
              <strong>{cronogramaToDelete?.nombre}</strong> y todos sus hitos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCronograma}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}