// src/app/(dashboard)/mantenimiento/documentos/page.tsx
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
  FileSpreadsheet,
  Ban,
  CheckCircle2,
  BookOpen
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
// PERMISOS DE MANTENIMIENTO (según src/lib/permissions.ts)
// =====================================================
// carpetas_completas: ['07', '08', '09', '11', '19', '20'] - CRUD completo
// carpetas_lectura: ['01', '02', '05', '06', '10', '13', '14', '16', '17', '18'] - Solo lectura
// sin_acceso: ['03', '04', '12', '15'] - No puede ver
// =====================================================

type TipoPermiso = 'completo' | 'lectura' | 'sin_acceso'

interface CarpetaConfig {
  codigo: string
  nombre: string
  descripcion: string
  permiso: TipoPermiso
}

const CARPETAS_CONFIG: CarpetaConfig[] = [
  // ACCESO COMPLETO (crear, leer, actualizar, eliminar)
  { codigo: '07', nombre: 'Instalaciones Eléctricas y Mecánicas', descripcion: 'Planos y diagramas de instalaciones eléctricas y mecánicas', permiso: 'completo' },
  { codigo: '08', nombre: 'Instalaciones de Telecomunicaciones', descripcion: 'Diseño de redes de telecomunicaciones', permiso: 'completo' },
  { codigo: '09', nombre: 'Instalaciones Sanitarias', descripcion: 'Planos de agua, desagüe y drenaje', permiso: 'completo' },
  { codigo: '11', nombre: 'Estudio de Seguridad y Salud', descripcion: 'Plan de seguridad y salud en obra', permiso: 'completo' },
  { codigo: '19', nombre: 'Anexos', descripcion: 'Documentos adicionales y complementarios', permiso: 'completo' },
  { codigo: '20', nombre: 'Mobiliario y Equipamiento', descripcion: 'Especificaciones de mobiliario y equipos', permiso: 'completo' },
  
  // SOLO LECTURA
  { codigo: '01', nombre: 'Documentación del Proyecto', descripcion: 'Actas de inicio, modelos BIM y documentos varios del proyecto', permiso: 'lectura' },
  { codigo: '02', nombre: 'Memoria Descriptiva', descripcion: 'Memorias técnicas descriptivas de la obra', permiso: 'lectura' },
  { codigo: '05', nombre: 'Arquitectura', descripcion: 'Planos arquitectónicos y diseño', permiso: 'lectura' },
  { codigo: '06', nombre: 'Estructura', descripcion: 'Planos estructurales y cálculos', permiso: 'lectura' },
  { codigo: '10', nombre: 'Estudio de Gestión de Riesgos', descripcion: 'Análisis de riesgos y planes de contingencia', permiso: 'lectura' },
  { codigo: '13', nombre: 'Especificaciones Técnicas', descripcion: 'Especificaciones de materiales y procesos constructivos', permiso: 'lectura' },
  { codigo: '14', nombre: 'Planilla de Metrados', descripcion: 'Metrados y cálculos de cantidades de obra', permiso: 'lectura' },
  { codigo: '16', nombre: 'Programación de Obra', descripcion: 'Cronogramas y programación de actividades', permiso: 'lectura' },
  { codigo: '17', nombre: 'Planos', descripcion: 'Repositorio general de planos (iniciales y actualizados)', permiso: 'lectura' },
  { codigo: '18', nombre: 'Documentación BIM', descripcion: 'Modelos BIM y documentación de modelado 3D', permiso: 'lectura' },
  
  // SIN ACCESO
  { codigo: '03', nombre: 'Estudio de Mecánica de Suelos', descripcion: 'Estudios geotécnicos y análisis de suelos', permiso: 'sin_acceso' },
  { codigo: '04', nombre: 'Estudio de Levantamiento Topográfico', descripcion: 'Levantamientos topográficos y planos de ubicación', permiso: 'sin_acceso' },
  { codigo: '12', nombre: 'Estudio de Impacto Ambiental', descripcion: 'EIA y documentos de gestión ambiental', permiso: 'sin_acceso' },
  { codigo: '15', nombre: 'Presupuesto de Obra', descripcion: 'Presupuestos, análisis de costos y cotizaciones', permiso: 'sin_acceso' },
]

// Carpetas accesibles (completo + lectura)
const CARPETAS_ACCESIBLES = CARPETAS_CONFIG.filter(c => c.permiso !== 'sin_acceso')

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

interface CarpetaInfo extends CarpetaConfig {
  cantidadDocumentos: number
}

export default function DocumentosMantenimientoPage() {
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
      // Usar la API específica de MANTENIMIENTO
      const response = await fetch(`/api/mantenimiento/documentos?id_obra=${selectedObra}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar documentos')
      }

      const data = await response.json()
      const documentosData: Documento[] = data.documentos || []
      
      // Contar documentos por carpeta (solo carpetas accesibles)
      const carpetasConConteo: CarpetaInfo[] = CARPETAS_ACCESIBLES.map(carpeta => {
        const count = documentosData.filter(
          d => d.carpeta_tipo?.codigo === carpeta.codigo
        ).length
        return {
          ...carpeta,
          cantidadDocumentos: count
        }
      })
      
      setCarpetas(carpetasConConteo)
    } catch (error) {
      console.error('Error al cargar carpetas:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cargar carpetas')
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
      // Usar la API específica de MANTENIMIENTO
      const response = await fetch(
        `/api/mantenimiento/documentos?id_obra=${selectedObra}&carpeta=${selectedCarpeta.codigo}`
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar documentos')
      }

      const data = await response.json()
      setDocumentos(data.documentos || [])
    } catch (error) {
      console.error('Error al cargar documentos:', error)
      toast.error(error instanceof Error ? error.message : 'Error al cargar documentos')
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

    if (selectedCarpeta.permiso !== 'completo') {
      toast.error('No tiene permisos para subir archivos a esta carpeta')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('id_obra', selectedObra)
      formData.append('carpeta', selectedCarpeta.codigo)

      // Usar la API específica de MANTENIMIENTO
      const response = await fetch('/api/mantenimiento/documentos', {
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
    if (!documentoToDelete || !selectedCarpeta) return

    if (selectedCarpeta.permiso !== 'completo') {
      toast.error('No tiene permisos para eliminar archivos de esta carpeta')
      return
    }

    try {
      // Usar la API específica de MANTENIMIENTO
      const response = await fetch(`/api/mantenimiento/documentos/${documentoToDelete.id_documento}`, {
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
    }
  }

  const handleDownload = (documento: Documento) => {
    // Abrir en nueva pestaña para descargar
    window.open(documento.ruta_archivo, '_blank')
  }

  const handleView = (documento: Documento) => {
    // Abrir en nueva pestaña para ver
    window.open(documento.ruta_archivo, '_blank')
  }

  const getFileIcon = (formato: string) => {
    const formatoLower = formato.toLowerCase()
    if (['pdf'].includes(formatoLower)) return <FileText className="h-5 w-5 text-red-500" />
    if (['jpg', 'jpeg', 'png', 'gif'].includes(formatoLower)) return <Image className="h-5 w-5 text-green-500" />
    if (['xls', 'xlsx'].includes(formatoLower)) return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    if (['doc', 'docx'].includes(formatoLower)) return <FileText className="h-5 w-5 text-blue-500" />
    return <File className="h-5 w-5 text-gray-500" />
  }

  const getPermisoIcon = (permiso: TipoPermiso) => {
    switch (permiso) {
      case 'completo':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'lectura':
        return <BookOpen className="h-4 w-4 text-blue-600" />
      case 'sin_acceso':
        return <Ban className="h-4 w-4 text-red-500" />
    }
  }

  const getPermisoBadge = (permiso: TipoPermiso) => {
    switch (permiso) {
      case 'completo':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Acceso completo</Badge>
      case 'lectura':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Solo lectura</Badge>
      case 'sin_acceso':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Sin acceso</Badge>
    }
  }

  const getCarpetaStyle = (permiso: TipoPermiso) => {
    switch (permiso) {
      case 'completo':
        return {
          card: 'hover:border-green-400 cursor-pointer',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600'
        }
      case 'lectura':
        return {
          card: 'hover:border-blue-400 cursor-pointer',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600'
        }
      case 'sin_acceso':
        return {
          card: 'opacity-50 cursor-not-allowed',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-400'
        }
    }
  }

  const filteredDocumentos = documentos.filter(d =>
    d.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Contadores
  const contadores = {
    completo: CARPETAS_CONFIG.filter(c => c.permiso === 'completo').length,
    lectura: CARPETAS_CONFIG.filter(c => c.permiso === 'lectura').length,
    sinAcceso: CARPETAS_CONFIG.filter(c => c.permiso === 'sin_acceso').length
  }

  if (loading && obras.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión Documental</h1>
        <p className="text-muted-foreground">
          Administra los documentos de las obras según tus permisos
        </p>
      </div>

      {/* Resumen de permisos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{contadores.completo}</div>
                <p className="text-sm text-green-600">Carpetas con acceso completo</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{contadores.lectura}</div>
                <p className="text-sm text-blue-600">Carpetas de solo lectura</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Ban className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">{contadores.sinAcceso}</div>
                <p className="text-sm text-red-500">Carpetas sin acceso</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
          
          {/* Carpetas con acceso completo */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Acceso Completo (Puedes crear, editar y eliminar)
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {carpetas.filter(c => c.permiso === 'completo').map((carpeta) => {
                const style = getCarpetaStyle(carpeta.permiso)
                return (
                  <Card 
                    key={carpeta.codigo}
                    className={`transition-all hover:shadow-md ${style.card}`}
                    onClick={() => setSelectedCarpeta(carpeta)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${style.iconBg}`}>
                          <FolderOpen className={`h-6 w-6 ${style.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {carpeta.codigo}
                            </Badge>
                            {getPermisoIcon(carpeta.permiso)}
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
                )
              })}
            </div>
          </div>

          {/* Carpetas de solo lectura */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Solo Lectura (Solo puedes ver y descargar)
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {carpetas.filter(c => c.permiso === 'lectura').map((carpeta) => {
                const style = getCarpetaStyle(carpeta.permiso)
                return (
                  <Card 
                    key={carpeta.codigo}
                    className={`transition-all hover:shadow-md ${style.card}`}
                    onClick={() => setSelectedCarpeta(carpeta)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${style.iconBg}`}>
                          <FolderOpen className={`h-6 w-6 ${style.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {carpeta.codigo}
                            </Badge>
                            {getPermisoIcon(carpeta.permiso)}
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
                )
              })}
            </div>
          </div>

          {/* Carpetas sin acceso (solo informativo) */}
          <div>
            <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Sin Acceso
            </h3>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {CARPETAS_CONFIG.filter(c => c.permiso === 'sin_acceso').map((carpeta) => (
                <Card 
                  key={carpeta.codigo}
                  className="opacity-50 cursor-not-allowed bg-gray-50"
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <FolderOpen className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {carpeta.codigo}
                          </Badge>
                          <Lock className="h-3 w-3 text-gray-400" />
                        </div>
                        <h4 className="font-medium text-sm mt-1 truncate text-gray-500">
                          {carpeta.nombre}
                        </h4>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
              {getPermisoBadge(selectedCarpeta.permiso)}
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
                  {selectedCarpeta.permiso === 'completo' && (
                    <Button 
                      className="bg-amber-600 hover:bg-amber-700"
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
                  <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                </div>
              ) : filteredDocumentos.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay documentos en esta carpeta</p>
                  {selectedCarpeta.permiso === 'completo' && (
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
                        <TableCell>{doc.usuario.nombre}</TableCell>
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
                            {selectedCarpeta.permiso === 'completo' && (
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
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: PDF, Word, Excel, Imágenes, DWG
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
              className="bg-amber-600 hover:bg-amber-700"
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Subir
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