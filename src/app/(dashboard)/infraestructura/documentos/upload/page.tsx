// src/app/(dashboard)/infraestructura/documentos/upload/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  Info
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface Obra {
  id_obra: number
  nombre_obra: string
  estado: string
}

interface CarpetaTipo {
  id_carpeta_tipo: number
  codigo: string
  nombre_carpeta: string
}

// Carpetas donde INFRAESTRUCTURA puede subir documentos
const CARPETAS_PERMITIDAS = ['01', '02', '05', '06', '07', '08', '09', '11', '13', '14', '16', '17', '18', '19']

export default function UploadDocumentoInfraPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [obras, setObras] = useState<Obra[]>([])
  const [carpetas, setCarpetas] = useState<CarpetaTipo[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Obtener parámetros de URL si vienen preseleccionados
  const obraPreseleccionada = searchParams.get('obra') || ''
  const carpetaPreseleccionada = searchParams.get('carpeta') || ''

  const [formData, setFormData] = useState({
    id_obra: obraPreseleccionada,
    id_carpeta_tipo: carpetaPreseleccionada,
    tipo_documento: 'OTRO',
    nombre_archivo: '',
    descripcion: '',
    file: null as File | null
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Usar los endpoints del admin que ya funcionan
      const [obrasRes, carpetasRes] = await Promise.all([
        fetch('/api/admin/obras'),
        fetch('/api/admin/carpetas')
      ])

      if (!obrasRes.ok) {
        const errorData = await obrasRes.json().catch(() => ({}))
        throw new Error(errorData.error || `Error al cargar obras: ${obrasRes.status}`)
      }
      
      if (!carpetasRes.ok) {
        const errorData = await carpetasRes.json().catch(() => ({}))
        throw new Error(errorData.error || `Error al cargar carpetas: ${carpetasRes.status}`)
      }

      const obrasData = await obrasRes.json()
      const carpetasData = await carpetasRes.json()

      console.log('Obras cargadas:', obrasData)
      console.log('Carpetas cargadas:', carpetasData)

      setObras(obrasData.obras || [])
      
      // Filtrar solo carpetas donde INFRAESTRUCTURA puede subir
      const todasCarpetas = carpetasData.carpetas || []
      const carpetasPermitidas = todasCarpetas.filter(
        (c: CarpetaTipo) => CARPETAS_PERMITIDAS.includes(c.codigo)
      )
      setCarpetas(carpetasPermitidas)
      
    } catch (error) {
      console.error('Error al cargar datos:', error)
      setError(error instanceof Error ? error.message : 'Error desconocido')
      toast.error('No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (file) {
      setFormData({
        ...formData,
        file,
        nombre_archivo: formData.nombre_archivo || file.name
      })
    }
  }

  const handleRemoveFile = () => {
    setFormData({
      ...formData,
      file: null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!formData.file || !formData.id_obra || !formData.id_carpeta_tipo) {
        toast.error('Todos los campos obligatorios deben ser completados')
        setSubmitting(false)
        return
      }

      // Validar tamaño del archivo (máx 100MB)
      if (formData.file.size > 100 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande. Máximo 100MB permitido.')
        setSubmitting(false)
        return
      }

      // Verificar que la carpeta esté permitida
      const carpetaSeleccionada = carpetas.find(c => c.id_carpeta_tipo === parseInt(formData.id_carpeta_tipo))
      if (!carpetaSeleccionada || !CARPETAS_PERMITIDAS.includes(carpetaSeleccionada.codigo)) {
        toast.error('No tienes permisos para subir documentos a esta carpeta')
        setSubmitting(false)
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append('id_obra', formData.id_obra)
      formDataToSend.append('id_carpeta_tipo', formData.id_carpeta_tipo)
      formDataToSend.append('tipo_documento', formData.tipo_documento)
      formDataToSend.append('nombre_archivo', formData.nombre_archivo || formData.file.name)
      formDataToSend.append('descripcion', formData.descripcion)
      formDataToSend.append('file', formData.file)

      // Usar el endpoint del admin para subir (funciona igual)
      const response = await fetch('/api/admin/documentos', {
        method: 'POST',
        body: formDataToSend
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir documento')
      }

      toast.success('Documento subido correctamente')
      router.push('/infraestructura/documentos')
      router.refresh()
    } catch (error) {
      console.error('Error al subir documento:', error)
      toast.error(error instanceof Error ? error.message : 'Error al subir documento')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/infraestructura/documentos')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Error al cargar datos:</strong> {error}
            <br />
            <Button onClick={fetchData} variant="outline" size="sm" className="mt-2">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/infraestructura/documentos')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Subir Documento
          </h1>
          <p className="text-muted-foreground">
            Carga un nuevo documento a tus obras asignadas
          </p>
        </div>
      </div>

      {/* Info de permisos */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Tus permisos:</strong> Puedes subir documentos a {CARPETAS_PERMITIDAS.length} de las 20 carpetas disponibles. 
          Las carpetas de estudios técnicos (03, 04, 10, 12) y presupuesto (15) son de solo lectura para tu rol.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Formulario Principal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Formulario de Carga
            </CardTitle>
            <CardDescription>
              Completa la información para subir un nuevo documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Obra */}
                <div className="space-y-2">
                  <Label htmlFor="id_obra">Obra *</Label>
                  <Select
                    value={formData.id_obra}
                    onValueChange={(value) => setFormData({ ...formData, id_obra: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una obra" />
                    </SelectTrigger>
                    <SelectContent>
                      {obras.length === 0 ? (
                        <SelectItem value="none" disabled>No hay obras disponibles</SelectItem>
                      ) : (
                        obras.map((obra) => (
                          <SelectItem key={obra.id_obra} value={String(obra.id_obra)}>
                            {obra.nombre_obra} ({obra.estado})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {obras.length === 0 && (
                    <p className="text-xs text-amber-600">
                      No hay obras registradas en el sistema.
                    </p>
                  )}
                </div>

                {/* Carpeta */}
                <div className="space-y-2">
                  <Label htmlFor="id_carpeta_tipo">Carpeta *</Label>
                  <Select
                    value={formData.id_carpeta_tipo}
                    onValueChange={(value) => setFormData({ ...formData, id_carpeta_tipo: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una carpeta" />
                    </SelectTrigger>
                    <SelectContent>
                      {carpetas.length === 0 ? (
                        <SelectItem value="none" disabled>No hay carpetas disponibles</SelectItem>
                      ) : (
                        carpetas.map((carpeta) => (
                          <SelectItem key={carpeta.id_carpeta_tipo} value={String(carpeta.id_carpeta_tipo)}>
                            <div className="flex items-center gap-2">
                              <Unlock className="h-3 w-3 text-green-600" />
                              {carpeta.codigo} - {carpeta.nombre_carpeta}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Tipo de Documento */}
                <div className="space-y-2">
                  <Label htmlFor="tipo_documento">Tipo de Documento *</Label>
                  <Select
                    value={formData.tipo_documento}
                    onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PLANO">📐 Plano</SelectItem>
                      <SelectItem value="CONTRATO">📋 Contrato</SelectItem>
                      <SelectItem value="INFORME">📊 Informe Técnico</SelectItem>
                      <SelectItem value="OTRO">📎 Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Nombre del Archivo */}
                <div className="space-y-2">
                  <Label htmlFor="nombre_archivo">Nombre del Archivo</Label>
                  <Input
                    id="nombre_archivo"
                    value={formData.nombre_archivo}
                    onChange={(e) => setFormData({ ...formData, nombre_archivo: e.target.value })}
                    placeholder="Nombre descriptivo del archivo"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (Opcional)</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe el contenido del documento..."
                  rows={3}
                />
              </div>

              {/* Archivo */}
              <div className="space-y-2">
                <Label htmlFor="file">Archivo *</Label>
                
                <Input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.zip"
                  className="hidden"
                />
                
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
                    ${formData.file 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  onClick={handleSelectFile}
                >
                  <div className="space-y-3">
                    <Upload className={`h-8 w-8 mx-auto ${
                      formData.file ? 'text-green-500' : 'text-gray-400'
                    }`} />
                    
                    <div>
                      {formData.file ? (
                        <div className="space-y-2">
                          <p className="font-medium text-green-900 flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Archivo seleccionado
                          </p>
                          <p className="text-sm text-green-700">
                            {formData.file.name} ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveFile()
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900">
                            Haz clic para seleccionar un archivo
                          </p>
                          <p className="text-sm text-gray-500">
                            PDF, Word, Excel, Imágenes, CAD (Máx. 100MB)
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Información de la estructura */}
              {formData.id_obra && formData.id_carpeta_tipo && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    El documento se almacenará en: <code className="bg-green-100 px-1 rounded">
                      documentos/obra_{formData.id_obra}/carpeta_{carpetas.find(c => c.id_carpeta_tipo === parseInt(formData.id_carpeta_tipo))?.codigo}/
                    </code>
                  </AlertDescription>
                </Alert>
              )}

              {/* Botones */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/infraestructura/documentos')}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !formData.file || !formData.id_obra || !formData.id_carpeta_tipo}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Documento
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Panel lateral de información */}
        <div className="space-y-6">
          {/* Carpetas permitidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Unlock className="h-4 w-4 text-green-600" />
                Carpetas Disponibles ({carpetas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {carpetas.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay carpetas disponibles</p>
              ) : (
                carpetas.slice(0, 8).map((carpeta) => (
                  <div key={carpeta.id_carpeta_tipo} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-green-50 text-green-700 w-8 justify-center">
                      {carpeta.codigo}
                    </Badge>
                    <span className="text-muted-foreground truncate">{carpeta.nombre_carpeta}</span>
                  </div>
                ))
              )}
              {carpetas.length > 8 && (
                <p className="text-xs text-muted-foreground">
                  +{carpetas.length - 8} carpetas más...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Carpetas restringidas */}
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50/50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" />
                Solo Lectura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {['03', '04', '10', '12', '15', '20'].map((codigo) => (
                <div key={codigo} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 w-8 justify-center">
                    {codigo}
                  </Badge>
                  <span className="text-muted-foreground">Solo lectura</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Formatos aceptados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Formatos Aceptados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {['PDF', 'DOC', 'DOCX', 'XLS', 'XLSX', 'JPG', 'PNG', 'DWG', 'ZIP'].map((formato) => (
                  <Badge key={formato} variant="secondary" className="text-xs">
                    {formato}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Tamaño máximo: 100 MB
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
