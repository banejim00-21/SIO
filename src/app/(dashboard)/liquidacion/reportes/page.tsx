// src/app/(dashboard)/liquidacion/reportes/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  FileText,
  Loader2, 
  Download,
  Eye,
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw
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
  presupuesto_inicial: number
}

interface Reporte {
  id_reporte: number
  id_obra: number
  tipo_reporte: string
  fecha_generacion: string
  ruta_archivo: string | null
  obra?: {
    nombre_obra: string
  }
  usuario?: {
    nombre: string
  }
}

const TIPOS_REPORTE = [
  { value: 'TECNICO', label: 'Reporte Técnico', descripcion: 'Avance físico y cumplimiento de hitos', icon: BarChart3 },
  { value: 'FINANCIERO', label: 'Reporte Financiero', descripcion: 'Ejecución presupuestal y gastos', icon: DollarSign },
  { value: 'COMPARATIVO', label: 'Reporte Comparativo', descripcion: 'Planificado vs Ejecutado', icon: TrendingUp },
  { value: 'CONSOLIDADO', label: 'Reporte Consolidado', descripcion: 'Resumen general de la obra', icon: FileText },
]

export default function ReportesLiquidacionPage() {
  const [loading, setLoading] = useState(true)
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState<string>('')
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  const [generateDialog, setGenerateDialog] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState<string>('')
  
  const [viewDialog, setViewDialog] = useState(false)
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null)

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

  const fetchReportes = useCallback(async () => {
    if (!selectedObra) {
      setReportes([])
      return
    }
    try {
      setLoading(true)
      const response = await fetch(`/api/liquidacion/reportes?id_obra=${selectedObra}`)
      if (response.ok) {
        const data = await response.json()
        setReportes(data.reportes || [])
      }
    } catch (error) {
      console.error('Error al cargar reportes:', error)
      toast.error('Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }, [selectedObra])

  useEffect(() => { fetchObras() }, [fetchObras])
  useEffect(() => {
    if (selectedObra) {
      fetchReportes()
    }
  }, [selectedObra, fetchReportes])

  const handleGenerateReport = async () => {
    if (!selectedObra || !selectedTipo) {
      toast.error('Seleccione obra y tipo de reporte')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/liquidacion/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_obra: parseInt(selectedObra),
          tipo_reporte: selectedTipo
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al generar reporte')
      }

      const data = await response.json()
      toast.success('Reporte generado correctamente')
      setGenerateDialog(false)
      setSelectedTipo('')
      fetchReportes()

      // Descargar automáticamente el PDF
      if (data.reporte?.ruta_archivo) {
        window.open(data.reporte.ruta_archivo, '_blank')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = (reporte: Reporte) => {
    if (reporte.ruta_archivo) {
      window.open(reporte.ruta_archivo, '_blank')
      toast.success('Descargando reporte...')
    } else {
      toast.error('El archivo no está disponible')
    }
  }

  const getTipoInfo = (tipo: string) => {
    return TIPOS_REPORTE.find(t => t.value === tipo)
  }

  const filteredReportes = reportes.filter(r =>
    r.tipo_reporte.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Generación de reportes técnicos y financieros en PDF</p>
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
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seleccione una obra</h3>
              <p className="text-muted-foreground">Para generar reportes, primero seleccione una obra</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Tipos de Reporte Disponibles */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TIPOS_REPORTE.map((tipo) => {
              const Icon = tipo.icon
              return (
                <Card 
                  key={tipo.value}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-emerald-400"
                  onClick={() => {
                    setSelectedTipo(tipo.value)
                    setGenerateDialog(true)
                  }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-emerald-100 rounded-lg">
                        <Icon className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{tipo.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{tipo.descripcion}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Historial de Reportes */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Historial de Reportes</CardTitle>
                  <CardDescription>Reportes generados para: {obraSeleccionada?.nombre_obra}</CardDescription>
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
                    variant="outline"
                    onClick={fetchReportes}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredReportes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay reportes generados</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seleccione un tipo de reporte arriba para generar uno nuevo
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha de Generación</TableHead>
                      <TableHead>Generado por</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReportes.map((reporte) => {
                      const tipoInfo = getTipoInfo(reporte.tipo_reporte)
                      return (
                        <TableRow key={reporte.id_reporte}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {tipoInfo && <tipoInfo.icon className="h-4 w-4 text-emerald-600" />}
                              <span className="font-medium">{tipoInfo?.label || reporte.tipo_reporte}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(reporte.fecha_generacion), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </div>
                          </TableCell>
                          <TableCell>{reporte.usuario?.nombre || 'Usuario'}</TableCell>
                          <TableCell>
                            {reporte.ruta_archivo ? (
                              <Badge className="bg-green-100 text-green-800">Disponible</Badge>
                            ) : (
                              <Badge variant="secondary">Procesando</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedReporte(reporte)
                                  setViewDialog(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDownload(reporte)}
                                disabled={!reporte.ruta_archivo}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog Generar Reporte */}
      <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Reporte</DialogTitle>
            <DialogDescription>
              Se generará un reporte PDF para la obra seleccionada
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-emerald-50 rounded-lg">
              <p className="font-medium text-emerald-800">
                Obra: {obraSeleccionada?.nombre_obra}
              </p>
              <p className="text-sm text-emerald-700 mt-1">
                Tipo: {getTipoInfo(selectedTipo)?.label}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Reporte</Label>
              <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_REPORTE.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">El reporte incluirá:</p>
              <ul className="list-disc list-inside space-y-1">
                {selectedTipo === 'TECNICO' && (
                  <>
                    <li>Avance físico de la obra</li>
                    <li>Cumplimiento de hitos</li>
                    <li>Observaciones técnicas</li>
                  </>
                )}
                {selectedTipo === 'FINANCIERO' && (
                  <>
                    <li>Presupuesto planificado vs ejecutado</li>
                    <li>Desglose de gastos por partida</li>
                    <li>Saldo disponible</li>
                  </>
                )}
                {selectedTipo === 'COMPARATIVO' && (
                  <>
                    <li>Comparación planificado vs real</li>
                    <li>Desviaciones de tiempo y costo</li>
                    <li>Indicadores de gestión</li>
                  </>
                )}
                {selectedTipo === 'CONSOLIDADO' && (
                  <>
                    <li>Resumen ejecutivo</li>
                    <li>Estado técnico y financiero</li>
                    <li>Documentación asociada</li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialog(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerateReport}
              disabled={generating || !selectedTipo}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Reporte */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Vista del Reporte</DialogTitle>
            <DialogDescription>
              {getTipoInfo(selectedReporte?.tipo_reporte || '')?.label}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedReporte?.ruta_archivo ? (
              <iframe 
                src={selectedReporte.ruta_archivo}
                className="w-full h-[500px] border rounded-lg"
                title="Vista previa del reporte"
              />
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">El archivo no está disponible para vista previa</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => selectedReporte && handleDownload(selectedReporte)}
              disabled={!selectedReporte?.ruta_archivo}
              className="bg-emerald-600 hover:bg-emerald-700"
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
