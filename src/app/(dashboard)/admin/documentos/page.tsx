// src/app/(dashboard)/admin/documentos/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Search, Loader2, FileText, Image as ImageIcon, Eye, Download,
  Trash2, Upload, FolderOpen, Building2, Layers, AlertCircle
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CarpetaTipo { 
  id_carpeta_tipo: number
  codigo: string
  nombre_carpeta: string 
}

interface Obra { 
  id_obra: number
  nombre_obra: string 
}

interface Partida { 
  id_partida: number
  nombre_partida: string 
}

interface Actividad { 
  id_actividad: number
  nombre_actividad: string 
}

interface Documento {
  id_documento: number
  nombre_archivo: string
  descripcion?: string
  ruta_archivo: string
  formato: string
  version: number
  estado: 'VIGENTE' | 'ACTUALIZADO' | 'ANULADO'
  fecha_carga: string
  obra: Obra
  carpeta_tipo: CarpetaTipo
  usuario: { nombre: string }
  target_type?: 'obra' | 'partida' | 'actividad'
  partida?: Partida
  actividad?: Actividad
}

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [actividades, setActividades] = useState<Actividad[]>([])
  const [carpetas, setCarpetas] = useState<CarpetaTipo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterObra, setFilterObra] = useState<string>('TODAS')
  const [filterCarpeta, setFilterCarpeta] = useState<string>('TODAS')
  
  // Estados para diálogos
  const [uploadDialog, setUploadDialog] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    id_obra: '',
    id_partida: '',
    id_actividad: '',
    id_carpeta_tipo: '',
    descripcion: '',
    target_type: 'obra' as 'obra' | 'partida' | 'actividad'
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [viewDialog, setViewDialog] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<Documento | null>(null)
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [docToDelete, setDocToDelete] = useState<Documento | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // Estado para loading de partidas y actividades
  const [loadingPartidas, setLoadingPartidas] = useState(false)
  const [loadingActividades, setLoadingActividades] = useState(false)

  // Cargar datos iniciales
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      const [docsRes, obrasRes, carpetasRes] = await Promise.all([
        fetch('/api/admin/documentos'),
        fetch('/api/admin/obras'),
        fetch('/api/admin/carpetas')
      ])

      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocumentos(data.documentos || [])
      } else {
        console.error('Error al cargar documentos:', await docsRes.text())
      }

      if (obrasRes.ok) {
        const data = await obrasRes.json()
        setObras(data.obras || [])
      }

      if (carpetasRes.ok) {
        const data = await carpetasRes.json()
        setCarpetas(data.carpetas || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Cargar partidas cuando se selecciona una obra
  const fetchPartidas = async (obraId: string) => {
    if (!obraId || obraId === 'TODAS') {
      setPartidas([])
      setActividades([])
      return
    }
    
    setLoadingPartidas(true)
    try {
      const response = await fetch(`/api/admin/obras/${obraId}/partidas`)
      if (response.ok) {
        const data = await response.json()
        setPartidas(data.partidas || [])
      } else {
        setPartidas([])
      }
    } catch (error) {
      console.error('Error al cargar partidas:', error)
      setPartidas([])
    } finally {
      setLoadingPartidas(false)
    }
  }

  // Cargar actividades cuando se selecciona una partida
  const fetchActividades = async (obraId: string, partidaId: string) => {
    if (!partidaId || !obraId) {
      setActividades([])
      return
    }
    
    setLoadingActividades(true)
    try {
      const response = await fetch(`/api/admin/obras/${obraId}/partidas/${partidaId}/actividades`)
      if (response.ok) {
        const data = await response.json()
        setActividades(data.actividades || [])
      } else {
        setActividades([])
      }
    } catch (error) {
      console.error('Error al cargar actividades:', error)
      setActividades([])
    } finally {
      setLoadingActividades(false)
    }
  }

  // Manejadores de cambio de formulario
  const handleObraChange = (obraId: string) => {
    setUploadForm(prev => ({
      ...prev,
      id_obra: obraId,
      id_partida: '',
      id_actividad: ''
    }))
    fetchPartidas(obraId)
    setActividades([])
  }

  const handlePartidaChange = (partidaId: string) => {
    setUploadForm(prev => ({
      ...prev,
      id_partida: partidaId,
      id_actividad: ''
    }))
    if (uploadForm.id_obra && partidaId) {
      fetchActividades(uploadForm.id_obra, partidaId)
    }
  }

  const handleTargetTypeChange = (value: 'obra' | 'partida' | 'actividad') => {
    setUploadForm(prev => ({
      ...prev,
      target_type: value,
      id_partida: '',
      id_actividad: ''
    }))
    setActividades([])
  }

  // Abrir diálogo de subida
  const openUploadDialog = () => {
    setUploadForm({
      id_obra: '',
      id_partida: '',
      id_actividad: '',
      id_carpeta_tipo: '',
      descripcion: '',
      target_type: 'obra'
    })
    setUploadFile(null)
    setPartidas([])
    setActividades([])
    setUploadDialog(true)
  }

  // Subir archivo
  const handleUpload = async () => {
    // Validaciones
    if (!uploadForm.id_obra) {
      toast.error('Seleccione una obra')
      return
    }
    
    if (!uploadForm.id_carpeta_tipo) {
      toast.error('Seleccione una carpeta')
      return
    }
    
    if (!uploadFile) {
      toast.error('Seleccione un archivo')
      return
    }

    if (uploadForm.target_type === 'partida' && !uploadForm.id_partida) {
      toast.error('Seleccione una partida')
      return
    }

    if (uploadForm.target_type === 'actividad' && !uploadForm.id_actividad) {
      toast.error('Seleccione una actividad')
      return
    }

    setUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('archivo', uploadFile)
      formData.append('id_carpeta_tipo', uploadForm.id_carpeta_tipo)
      formData.append('target_type', uploadForm.target_type)
      
      if (uploadForm.descripcion) {
        formData.append('descripcion', uploadForm.descripcion)
      }
      
      // Agregar target_id según el tipo
      if (uploadForm.target_type === 'partida' && uploadForm.id_partida) {
        formData.append('target_id', uploadForm.id_partida)
      } else if (uploadForm.target_type === 'actividad' && uploadForm.id_actividad) {
        formData.append('target_id', uploadForm.id_actividad)
      }

      console.log('Enviando archivo a:', `/api/admin/obras/${uploadForm.id_obra}/archivos`)

      const response = await fetch(`/api/admin/obras/${uploadForm.id_obra}/archivos`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.detalle || 'Error al subir archivo')
      }

      toast.success('Documento subido correctamente')
      setUploadDialog(false)
      fetchData()
    } catch (error) {
      console.error('Error al subir:', error)
      toast.error(error instanceof Error ? error.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  // Eliminar documento
  const handleDelete = async () => {
    if (!docToDelete) return
    
    setDeleting(true)
    
    try {
      const response = await fetch(`/api/admin/documentos/${docToDelete.id_documento}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar')
      }

      toast.success('Documento eliminado')
      setDeleteDialog(false)
      setDocToDelete(null)
      fetchData()
    } catch (error) {
      console.error('Error al eliminar:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  // Filtrar documentos
  const filteredDocumentos = documentos.filter(doc => {
    const matchSearch = doc.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchObra = filterObra === 'TODAS' || doc.obra.id_obra.toString() === filterObra
    const matchCarpeta = filterCarpeta === 'TODAS' || doc.carpeta_tipo.id_carpeta_tipo.toString() === filterCarpeta
    return matchSearch && matchObra && matchCarpeta
  })

  // Obtener icono según formato
  const getFileIcon = (formato: string) => {
    if (formato === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
    if (['jpg', 'jpeg', 'png', 'gif'].includes(formato)) return <ImageIcon className="h-5 w-5 text-blue-500" />
    return <FileText className="h-5 w-5 text-gray-500" />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-muted-foreground">Cargando documentos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión Documental</h1>
          <p className="text-muted-foreground">
            Administra los documentos del expediente técnico por obra, partida y actividad
          </p>
        </div>
        <Button onClick={openUploadDialog} className="bg-blue-600 hover:bg-blue-700">
          <Upload className="mr-2 h-4 w-4" />
          Subir Documento
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{documentos.length}</div>
            <p className="text-xs text-muted-foreground">Total Documentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {documentos.filter(d => d.estado === 'VIGENTE').length}
            </div>
            <p className="text-xs text-muted-foreground">Documentos Vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{obras.length}</div>
            <p className="text-xs text-muted-foreground">Obras</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{carpetas.length}</div>
            <p className="text-xs text-muted-foreground">Carpetas del Expediente</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de documentos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Documentos del Expediente Técnico
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterObra} onValueChange={setFilterObra}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por obra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas las obras</SelectItem>
                  {obras.map((obra) => (
                    <SelectItem key={obra.id_obra} value={obra.id_obra.toString()}>
                      {obra.nombre_obra.substring(0, 30)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterCarpeta} onValueChange={setFilterCarpeta}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por carpeta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas las carpetas</SelectItem>
                  {carpetas.map((carpeta) => (
                    <SelectItem key={carpeta.id_carpeta_tipo} value={carpeta.id_carpeta_tipo.toString()}>
                      {carpeta.codigo} - {carpeta.nombre_carpeta.substring(0, 20)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documento..."
                  className="pl-8 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocumentos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterObra !== 'TODAS' || filterCarpeta !== 'TODAS'
                  ? 'No se encontraron documentos con los filtros aplicados'
                  : 'Comienza subiendo tu primer documento'}
              </p>
              <Button onClick={openUploadDialog}>
                <Upload className="mr-2 h-4 w-4" />
                Subir Documento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Carpeta</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
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
                          <p className="font-medium truncate max-w-[200px]" title={doc.nombre_archivo}>
                            {doc.nombre_archivo}
                          </p>
                          <p className="text-xs text-muted-foreground">v{doc.version}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {doc.carpeta_tipo.codigo}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[150px]" title={doc.obra.nombre_obra}>
                          {doc.obra.nombre_obra}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.target_type === 'partida' && doc.partida && (
                        <Badge variant="secondary" className="text-xs">
                          <Layers className="h-3 w-3 mr-1" />
                          {doc.partida.nombre_partida.substring(0, 15)}...
                        </Badge>
                      )}
                      {doc.target_type === 'actividad' && doc.actividad && (
                        <Badge variant="secondary" className="text-xs">
                          {doc.actividad.nombre_actividad.substring(0, 15)}...
                        </Badge>
                      )}
                      {(!doc.target_type || doc.target_type === 'obra') && (
                        <span className="text-xs text-muted-foreground">Obra general</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(doc.fecha_carga), 'dd/MM/yyyy', { locale: es })}
                        <br />
                        <span className="text-xs text-muted-foreground">{doc.usuario.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          doc.estado === 'VIGENTE' ? 'default' :
                          doc.estado === 'ANULADO' ? 'destructive' : 'secondary'
                        }
                      >
                        {doc.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setViewingDoc(doc)
                            setViewDialog(true)
                          }}
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(doc.ruta_archivo, '_blank')}
                          title="Descargar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setDocToDelete(doc)
                            setDeleteDialog(true)
                          }}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Dialog Subir Documento */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Subir Documento al Expediente Técnico
            </DialogTitle>
            <DialogDescription>
              Seleccione la obra, ubicación y carpeta donde se guardará el documento
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Seleccionar Obra */}
            <div className="space-y-2">
              <Label>Obra *</Label>
              <Select value={uploadForm.id_obra} onValueChange={handleObraChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una obra" />
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

            {/* Tipo de destino */}
            <div className="space-y-2">
              <Label>¿Dónde subir el archivo?</Label>
              <Select value={uploadForm.target_type} onValueChange={handleTargetTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="obra">A la obra (general)</SelectItem>
                  <SelectItem value="partida">A una partida específica</SelectItem>
                  <SelectItem value="actividad">A una actividad específica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seleccionar Partida (si aplica) */}
            {(uploadForm.target_type === 'partida' || uploadForm.target_type === 'actividad') && uploadForm.id_obra && (
              <div className="space-y-2">
                <Label>Partida *</Label>
                <Select 
                  value={uploadForm.id_partida} 
                  onValueChange={handlePartidaChange}
                  disabled={loadingPartidas}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPartidas ? "Cargando partidas..." : "Seleccione una partida"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPartidas ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Cargando...</span>
                      </div>
                    ) : partidas.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No hay partidas disponibles para esta obra
                      </div>
                    ) : (
                      partidas.map((partida) => (
                        <SelectItem key={partida.id_partida} value={partida.id_partida.toString()}>
                          {partida.nombre_partida}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!loadingPartidas && partidas.length === 0 && uploadForm.id_obra && (
                  <p className="text-xs text-amber-600">
                    Esta obra no tiene partidas registradas. Primero agregue partidas en el módulo de Presupuesto.
                  </p>
                )}
              </div>
            )}

            {/* Seleccionar Actividad (si aplica) */}
            {uploadForm.target_type === 'actividad' && uploadForm.id_partida && (
              <div className="space-y-2">
                <Label>Actividad *</Label>
                <Select 
                  value={uploadForm.id_actividad} 
                  onValueChange={(value) => setUploadForm(prev => ({ ...prev, id_actividad: value }))}
                  disabled={loadingActividades}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingActividades ? "Cargando actividades..." : "Seleccione una actividad"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingActividades ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Cargando...</span>
                      </div>
                    ) : actividades.length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        No hay actividades disponibles para esta partida
                      </div>
                    ) : (
                      actividades.map((act) => (
                        <SelectItem key={act.id_actividad} value={act.id_actividad.toString()}>
                          {act.nombre_actividad}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!loadingActividades && actividades.length === 0 && uploadForm.id_partida && (
                  <p className="text-xs text-amber-600">
                    Esta partida no tiene actividades registradas. Primero agregue actividades en el módulo de Obras.
                  </p>
                )}
              </div>
            )}

            {/* Seleccionar Carpeta */}
            <div className="space-y-2">
              <Label>Carpeta del Expediente Técnico *</Label>
              <Select 
                value={uploadForm.id_carpeta_tipo} 
                onValueChange={(value) => setUploadForm(prev => ({ ...prev, id_carpeta_tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una carpeta" />
                </SelectTrigger>
                <SelectContent>
                  {carpetas.map((carpeta) => (
                    <SelectItem key={carpeta.id_carpeta_tipo} value={carpeta.id_carpeta_tipo.toString()}>
                      {carpeta.codigo} - {carpeta.nombre_carpeta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descripción opcional */}
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="Descripción del documento..."
                value={uploadForm.descripcion}
                onChange={(e) => setUploadForm(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>

            {/* Seleccionar Archivo */}
            <div className="space-y-2">
              <Label>Archivo *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (máx. 10MB)
              </p>
              {uploadFile && (
                <p className="text-xs text-green-600">
                  Archivo seleccionado: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialog(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !uploadForm.id_obra || !uploadForm.id_carpeta_tipo || !uploadFile}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Subiendo...' : 'Subir Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Vista Previa */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.nombre_archivo}</DialogTitle>
            <DialogDescription>
              Carpeta: {viewingDoc?.carpeta_tipo.codigo} - {viewingDoc?.carpeta_tipo.nombre_carpeta}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {viewingDoc?.formato === 'pdf' ? (
              <iframe
                src={viewingDoc.ruta_archivo}
                className="w-full h-[500px] border rounded-lg"
                title="Vista previa"
              />
            ) : ['jpg', 'jpeg', 'png', 'gif'].includes(viewingDoc?.formato || '') ? (
              <img
                src={viewingDoc?.ruta_archivo}
                alt={viewingDoc?.nombre_archivo}
                className="max-w-full max-h-[500px] mx-auto rounded-lg"
              />
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p>Vista previa no disponible para este tipo de archivo</p>
                <p className="text-sm text-muted-foreground">Descargue el archivo para verlo</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={() => window.open(viewingDoc?.ruta_archivo, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminación */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el documento &quot;{docToDelete?.nombre_archivo}&quot;. 
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
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}