// src/app/(dashboard)/liquidacion/documentos/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, 
  Upload,
  Loader2, 
  FolderOpen,
  FileText,
  Download,
  Eye,
  Trash2,
  ChevronRight,
  Home,
  Lock,
  File,
  Image,
  FileSpreadsheet
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

// =====================================================
// PERMISOS DE LIQUIDACIÓN (según src/lib/permissions.ts)
// carpetas_completas: ['14', '15', '19']
// carpetas_lectura: todas las demás (01-13, 16-18, 20)
// =====================================================
const CARPETAS_CONFIG = [
  { codigo: '01', nombre: 'Resoluciones', descripcion: 'Resoluciones de aprobación', puedeSubir: false },
  { codigo: '02', nombre: 'Contratos', descripcion: 'Contratos y adendas', puedeSubir: false },
  { codigo: '03', nombre: 'Fianzas y Garantías', descripcion: 'Cartas fianza y garantías', puedeSubir: false },
  { codigo: '04', nombre: 'Presupuestos', descripcion: 'Presupuestos y partidas', puedeSubir: false },
  { codigo: '05', nombre: 'Cronogramas', descripcion: 'Cronogramas de ejecución', puedeSubir: false },
  { codigo: '06', nombre: 'Planos', descripcion: 'Planos arquitectónicos y técnicos', puedeSubir: false },
  { codigo: '07', nombre: 'Especificaciones Técnicas', descripcion: 'Especificaciones y memorias', puedeSubir: false },
  { codigo: '08', nombre: 'Estudios de Suelos', descripcion: 'Estudios geotécnicos', puedeSubir: false },
  { codigo: '09', nombre: 'Estudios de Impacto', descripcion: 'Estudios ambientales', puedeSubir: false },
  { codigo: '10', nombre: 'Informes Mensuales', descripcion: 'Informes de avance mensual', puedeSubir: false },
  { codigo: '11', nombre: 'Informes de Supervisión', descripcion: 'Informes del supervisor', puedeSubir: false },
  { codigo: '12', nombre: 'Informes de Mantenimiento', descripcion: 'Informes de actividades', puedeSubir: false },
  { codigo: '13', nombre: 'Actas', descripcion: 'Actas de reuniones y trabajos', puedeSubir: false },
  { codigo: '14', nombre: 'Valorizaciones', descripcion: 'Valorizaciones mensuales', puedeSubir: true },
  { codigo: '15', nombre: 'Documentos Financieros', descripcion: 'Facturas, pagos, comprobantes', puedeSubir: true },
  { codigo: '16', nombre: 'Cuaderno de Obra', descripcion: 'Asientos del cuaderno de obra', puedeSubir: false },
  { codigo: '17', nombre: 'Actas de Recepción', descripcion: 'Actas de recepción de obra', puedeSubir: false },
  { codigo: '18', nombre: 'Garantías', descripcion: 'Documentos de garantía', puedeSubir: false },
  { codigo: '19', nombre: 'Liquidación', descripcion: 'Documentos de liquidación final', puedeSubir: true },
  { codigo: '20', nombre: 'Anexos', descripcion: 'Documentos adicionales', puedeSubir: false },
]

interface Obra {
  id_obra: number
  nombre_obra: string
}

interface CarpetaTipo {
  id_carpeta_tipo: number
  codigo: string
  nombre_carpeta: string
}

interface Usuario {
  id_usuario: number
  nombre: string
}

interface Documento {
  id_documento: number
  nombre_archivo: string
  ruta_archivo: string
  formato: string
  version: number
  estado: string
  fecha_carga: string
  obra: Obra
  carpeta_tipo: CarpetaTipo
  usuario: Usuario
}

interface CarpetaInfo {
  codigo: string
  nombre: string
  descripcion: string
  puedeSubir: boolean
  cantidadDocumentos: number
}

export default function DocumentosLiquidacionPage() {
  const [loading, setLoading] = useState(true)
  const [obras, setObras] = useState<Obra[]>([])
  const [selectedObra, setSelectedObra] = useState<string>('')
  const [carpetas, setCarpetas] = useState<CarpetaInfo[]>([])
  const [selectedCarpeta, setSelectedCarpeta] = useState<CarpetaInfo | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modal subir
  const [uploadDialog, setUploadDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Modal eliminar
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [documentoToDelete, setDocumentoToDelete] = useState<Documento | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Modal ver documento
  const [viewDialog, setViewDialog] = useState(false)
  const [documentoToView, setDocumentoToView] = useState<Documento | null>(null)

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

  const fetchCarpetas = useCallback(async () => {
    if (!selectedObra) {
      setCarpetas([])
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/liquidacion/documentos?id_obra=${selectedObra}`)
      
      if (response.ok) {
        const data = await response.json()
        const documentosData: Documento[] = data.documentos || []
        
        // Contar documentos por carpeta
        const carpetasConConteo = CARPETAS_CONFIG.map(carpeta => {
          const count = documentosData.filter(
            d => d.carpeta_tipo?.codigo === carpeta.codigo
          ).length
          return {
            ...carpeta,
            cantidadDocumentos: count
          }
        })
        
        setCarpetas(carpetasConConteo)
      }
    } catch (error) {
      console.error('Error al cargar carpetas:', error)
      toast.error('Error al cargar carpetas')
    } finally {
      setLoading(false)
    }
  }, [selectedObra])

  const fetchDocumentos = useCallback(async () => {
    if (!selectedObra || !selectedCarpeta) {
      setDocumentos([])
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `/api/liquidacion/documentos?id_obra=${selectedObra}&carpeta=${selectedCarpeta.codigo}`
      )
      
      if (response.ok) {
        const data = await response.json()
        setDocumentos(data.documentos || [])
      }
    } catch (error) {
      console.error('Error al cargar documentos:', error)
      toast.error('Error al cargar documentos')
    } finally {
      setLoading(false)
    }
  }, [selectedObra, selectedCarpeta])

  useEffect(() => {
    fetchObras()
  }, [fetchObras])

  useEffect(() => {
    if (selectedObra) {
      fetchCarpetas()
      setSelectedCarpeta(null)
      setDocumentos([])
    }
  }, [selectedObra, fetchCarpetas])

  useEffect(() => {
    if (selectedCarpeta) {
      fetchDocumentos()
    }
  }, [selectedCarpeta, fetchDocumentos])

  const handleUpload = async () => {
    if (!selectedFile || !selectedObra || !selectedCarpeta) {
      toast.error('Seleccione un archivo')
      return
    }

    if (!selectedCarpeta.puedeSubir) {
      toast.error('No tiene permisos para subir archivos a esta carpeta')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('id_obra', selectedObra)
      formData.append('carpeta', selectedCarpeta.codigo)

      const response = await fetch('/api/liquidacion/documentos', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al subir archivo')
      }

      toast.success('Archivo subido correctamente')
      setUploadDialog(false)
      setSelectedFile(null)
      fetchDocumentos()
      fetchCarpetas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!documentoToDelete) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/liquidacion/documentos/${documentoToDelete.id_documento}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Documento eliminado')
      setDeleteDialog(false)
      setDocumentoToDelete(null)
      fetchDocumentos()
      fetchCarpetas()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const handleView = (documento: Documento) => {
    setDocumentoToView(documento)
    setViewDialog(true)
  }

  const handleDownload = async (documento: Documento) => {
    try {
      // Abrir el archivo en una nueva pestaña para descarga
      const fileUrl = documento.ruta_archivo
      window.open(fileUrl, '_blank')
      toast.success('Descargando archivo...')
    } catch (error) {
      console.error('Error al descargar:', error)
      toast.error('Error al descargar el archivo')
    }
  }

  const getFileIcon = (formato: string) => {
    const formatoLower = formato.toLowerCase()
    if (['pdf'].includes(formatoLower)) return <FileText className="h-5 w-5 text-red-500" />
    if (['jpg', 'jpeg', 'png', 'gif'].includes(formatoLower)) return <Image className="h-5 w-5 text-green-500" />
    if (['xls', 'xlsx'].includes(formatoLower)) return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    if (['doc', 'docx'].includes(formatoLower)) return <FileText className="h-5 w-5 text-blue-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const filteredDocumentos = documentos.filter(d =>
    d.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && obras.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión Documental</h1>
        <p className="text-muted-foreground">
          Administra los documentos de liquidación de obras
        </p>
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
              <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Seleccione una obra</h3>
              <p className="text-muted-foreground">
                Para ver los documentos, primero seleccione una obra del listado
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !selectedCarpeta ? (
        /* Vista de Carpetas */
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Home className="h-4 w-4" />
            <span className="font-medium">Carpetas del Expediente</span>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {carpetas.map((carpeta) => (
              <Card 
                key={carpeta.codigo}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  carpeta.puedeSubir ? 'hover:border-emerald-400' : 'hover:border-gray-400'
                }`}
                onClick={() => setSelectedCarpeta(carpeta)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      carpeta.puedeSubir ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      <FolderOpen className={`h-6 w-6 ${
                        carpeta.puedeSubir ? 'text-emerald-600' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {carpeta.codigo}
                        </Badge>
                        {!carpeta.puedeSubir && (
                          <Lock className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      <h4 className="font-medium text-sm mt-1 truncate">
                        {carpeta.nombre}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {carpeta.cantidadDocumentos} documento(s)
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Leyenda */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Permisos de LIQUIDACIÓN:</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-emerald-100 rounded">
                  <FolderOpen className="h-4 w-4 text-emerald-600" />
                </div>
                <span>Puede subir archivos (carpetas 14, 15, 19)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 bg-gray-100 rounded">
                  <FolderOpen className="h-4 w-4 text-gray-500" />
                </div>
                <Lock className="h-3 w-3 text-gray-400" />
                <span>Solo lectura</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Vista de Documentos dentro de una Carpeta */
        <div>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedCarpeta(null)}
            >
              <Home className="h-4 w-4 mr-1" />
              Carpetas
            </Button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium flex items-center gap-2">
              {selectedCarpeta.nombre}
              {!selectedCarpeta.puedeSubir && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Solo lectura
                </Badge>
              )}
            </span>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>{selectedCarpeta.nombre}</CardTitle>
                  <CardDescription>{selectedCarpeta.descripcion}</CardDescription>
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
                  {selectedCarpeta.puedeSubir && (
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setUploadDialog(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Archivo
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredDocumentos.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos en esta carpeta</p>
                  {selectedCarpeta.puedeSubir && (
                    <Button 
                      variant="link" 
                      onClick={() => setUploadDialog(true)}
                      className="mt-2"
                    >
                      Subir el primer documento
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Versión</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Subido por</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocumentos.map((doc) => (
                      <TableRow key={doc.id_documento}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileIcon(doc.formato)}
                            <div>
                              <div className="font-medium">{doc.nombre_archivo}</div>
                              <div className="text-xs text-muted-foreground uppercase">
                                {doc.formato}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">v{doc.version}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(doc.fecha_carga), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </TableCell>
                        <TableCell>{doc.usuario?.nombre || 'Usuario'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Ver"
                              onClick={() => handleView(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Descargar"
                              onClick={() => handleDownload(doc)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {selectedCarpeta.puedeSubir && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-600"
                                title="Eliminar"
                                onClick={() => {
                                  setDocumentoToDelete(doc)
                                  setDeleteDialog(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog Subir Archivo */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Subir archivo a la carpeta: {selectedCarpeta?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: PDF, Word, Excel, Imágenes
              </p>
            </div>
            {selectedFile && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Documento */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Ver Documento</DialogTitle>
            <DialogDescription>
              {documentoToView?.nombre_archivo}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {documentoToView && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Archivo:</span>
                    <p className="font-medium">{documentoToView.nombre_archivo}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Formato:</span>
                    <p className="font-medium uppercase">{documentoToView.formato}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Versión:</span>
                    <p className="font-medium">v{documentoToView.version}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de carga:</span>
                    <p className="font-medium">
                      {format(new Date(documentoToView.fecha_carga), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Subido por:</span>
                    <p className="font-medium">{documentoToView.usuario?.nombre || 'Usuario'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant={documentoToView.estado === 'VIGENTE' ? 'default' : 'secondary'}>
                      {documentoToView.estado}
                    </Badge>
                  </div>
                </div>
                
                {/* Vista previa para imágenes y PDFs */}
                {['jpg', 'jpeg', 'png', 'gif'].includes(documentoToView.formato.toLowerCase()) && (
                  <div className="border rounded-lg overflow-hidden">
                    <img 
                      src={documentoToView.ruta_archivo} 
                      alt={documentoToView.nombre_archivo}
                      className="max-w-full h-auto mx-auto"
                    />
                  </div>
                )}
                
                {documentoToView.formato.toLowerCase() === 'pdf' && (
                  <div className="border rounded-lg overflow-hidden h-[500px]">
                    <iframe 
                      src={documentoToView.ruta_archivo}
                      className="w-full h-full"
                      title={documentoToView.nombre_archivo}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => documentoToView && handleDownload(documentoToView)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el archivo &quot;{documentoToDelete?.nombre_archivo}&quot;. 
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
