// src/app/(dashboard)/liquidacion/expedientes/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Plus,
  Loader2, 
  Archive,
  Eye,
  Download,
  FileText,
  FolderOpen,
  CheckCircle,
  Clock
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
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Obra {
  id_obra: number
  nombre_obra: string
  estado: string
}

interface Expediente {
  id_expediente: number
  id_obra: number
  codigo: string
  descripcion: string
  estado: string
  fecha_generacion: string
  total_documentos: number
  ruta_archivo?: string
  obra?: {
    nombre_obra: string
  }
}

interface ResumenCarpetas {
  codigo: string
  nombre: string
  cantidad: number
}

export default function ExpedientesLiquidacionPage() {
  const [loading, setLoading] = useState(true)
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState<string>('')
  const [expedientes, setExpedientes] = useState<Expediente[]>([])
  const [resumenCarpetas, setResumenCarpetas] = useState<ResumenCarpetas[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const [createDialog, setCreateDialog] = useState(false)
  const [viewDialog, setViewDialog] = useState(false)
  const [generating, setGenerating] = useState(false)
  
  const [selectedExpediente, setSelectedExpediente] = useState<Expediente | null>(null)

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

  const fetchExpedientes = useCallback(async () => {
    if (!selectedObra) {
      setExpedientes([])
      return
    }
    try {
      setLoading(true)
      const response = await fetch(`/api/liquidacion/expedientes?id_obra=${selectedObra}`)
      if (response.ok) {
        const data = await response.json()
        setExpedientes(data.expedientes || [])
        setResumenCarpetas(data.resumenCarpetas || [])
      }
    } catch (error) {
      console.error('Error al cargar expedientes:', error)
      toast.error('Error al cargar expedientes')
    } finally {
      setLoading(false)
    }
  }, [selectedObra])

  useEffect(() => { fetchObras() }, [fetchObras])
  useEffect(() => {
    if (selectedObra) {
      fetchExpedientes()
    }
  }, [selectedObra, fetchExpedientes])

  const handleGenerarExpediente = async () => {
    if (!selectedObra) return
    
    setGenerating(true)
    try {
      const response = await fetch('/api/liquidacion/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_obra: parseInt(selectedObra) })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al generar expediente')
      }

      const data = await response.json()
      toast.success('Expediente digital generado correctamente')
      setCreateDialog(false)
      fetchExpedientes()

      // Si hay ruta de archivo, abrir para descarga
      if (data.expediente?.ruta_archivo) {
        window.open(data.expediente.ruta_archivo, '_blank')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = (expediente: Expediente) => {
    if (expediente.ruta_archivo) {
      window.open(expediente.ruta_archivo, '_blank')
      toast.success('Descargando expediente...')
    } else {
      // Si no hay archivo, generar reporte consolidado
      toast.info('Generando expediente PDF...')
      // Redirigir a generar reporte consolidado
      window.location.href = `/liquidacion/reportes?obra=${expediente.id_obra}&tipo=CONSOLIDADO`
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'COMPLETO':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completo</Badge>
      case 'PENDIENTE':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  const filteredExpedientes = expedientes.filter(e =>
    e.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalDocumentos = resumenCarpetas.reduce((sum, c) => sum + c.cantidad, 0)
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
        <h1 className="text-3xl font-bold tracking-tight">Expediente Digital</h1>
        <p className="text-muted-foreground">Consolidación de documentación de obras</p>
      </div>

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
              <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seleccione una obra</h3>
              <p className="text-muted-foreground">Para ver o generar expedientes digitales</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Resumen de Carpetas */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Expediente</CardTitle>
              <CardDescription>
                Obra: {obraSeleccionada?.nombre_obra} - Total: {totalDocumentos} documentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-4 lg:grid-cols-5">
                {resumenCarpetas.map((carpeta) => (
                  <div 
                    key={carpeta.codigo}
                    className="flex items-center gap-2 p-2 border rounded-lg"
                  >
                    <FolderOpen className="h-4 w-4 text-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{carpeta.nombre}</p>
                      <p className="text-xs text-muted-foreground">{carpeta.cantidad} docs</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lista de Expedientes Generados */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Expedientes Generados</CardTitle>
                  <CardDescription>Historial de expedientes digitales</CardDescription>
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
                    Generar Expediente
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredExpedientes.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay expedientes generados</p>
                  <Button 
                    variant="link" 
                    onClick={() => setCreateDialog(true)}
                    className="mt-2"
                  >
                    Generar el primer expediente
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Documentos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpedientes.map((exp) => (
                      <TableRow key={exp.id_expediente}>
                        <TableCell>
                          <Badge variant="outline">{exp.codigo}</Badge>
                        </TableCell>
                        <TableCell>{exp.descripcion}</TableCell>
                        <TableCell>
                          {format(new Date(exp.fecha_generacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {exp.total_documentos}
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(exp.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setSelectedExpediente(exp)
                                setViewDialog(true)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDownload(exp)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Generar Expediente */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Expediente Digital</DialogTitle>
            <DialogDescription>
              Se consolidará toda la documentación vigente de la obra seleccionada
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-emerald-50 rounded-lg space-y-2">
              <p className="font-medium text-emerald-800">
                Obra: {obraSeleccionada?.nombre_obra}
              </p>
              <p className="text-sm text-emerald-700">
                Se incluirán {totalDocumentos} documentos de las 20 carpetas
              </p>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>El expediente digital incluirá:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Índice general de documentos</li>
                <li>Documentos organizados por carpeta</li>
                <li>Metadatos y fechas de cada archivo</li>
                <li>Resumen de presupuesto y gastos</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerarExpediente}
              disabled={generating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar Expediente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Expediente */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Expediente</DialogTitle>
          </DialogHeader>
          {selectedExpediente && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-medium">{selectedExpediente.codigo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getEstadoBadge(selectedExpediente.estado)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="font-medium">{selectedExpediente.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Generación</p>
                  <p className="font-medium">
                    {format(new Date(selectedExpediente.fecha_generacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                  <p className="font-medium">{selectedExpediente.total_documentos}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>
              Cerrar
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => selectedExpediente && handleDownload(selectedExpediente)}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
