// src/app/(dashboard)/infraestructura/documentos/documentos-list.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  MapPin,
  User,
  Calendar,
  Folder,
  Lock,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface CarpetaTipo {
  id_carpeta_tipo: number
  codigo: string
  nombre_carpeta: string
}

interface Obra {
  id_obra: number
  nombre_obra: string
  estado: string
}

interface Usuario {
  nombre: string
  rol: {
    nombre: string
  }
}

interface Documento {
  id_documento: number
  nombre_archivo: string
  tipo_documento: string
  ruta_archivo: string
  formato: string
  fecha_carga: Date
  obra: Obra
  carpeta_tipo: CarpetaTipo
  usuario: Usuario
}

interface DocumentosListInfraProps {
  documentos: Documento[]
  carpetaActual?: CarpetaTipo | null
  obraActual?: Obra | null
  carpetasCompletas: string[]
  carpetasLectura: string[]
}

export function DocumentosListInfra({ 
  documentos, 
  carpetaActual, 
  obraActual,
  carpetasCompletas,
  carpetasLectura 
}: DocumentosListInfraProps) {
  const [loading, setLoading] = useState<number | null>(null)

  // Verificar si tiene acceso completo a la carpeta del documento
  const tieneAccesoCompleto = (documento: Documento) => {
    return carpetasCompletas.includes(documento.carpeta_tipo.codigo)
  }

  // Función para descargar documento - USAR ENDPOINT DEL ADMIN
  const handleDownload = async (documento: Documento) => {
    setLoading(documento.id_documento)
    try {
      const response = await fetch('/api/admin/documentos/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: documento.ruta_archivo,
          fileName: documento.nombre_archivo
        })
      })

      if (!response.ok) {
        let errorMessage = 'Error al generar enlace de descarga'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Si no puede parsear JSON, usar mensaje por defecto
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      const link = document.createElement('a')
      link.href = data.url
      link.download = documento.nombre_archivo
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('Descarga iniciada')
    } catch (error) {
      console.error('Error al descargar:', error)
      toast.error(error instanceof Error ? error.message : 'Error al descargar el documento')
    } finally {
      setLoading(null)
    }
  }

  // Función para ver documento - USAR ENDPOINT DEL ADMIN
  const handleView = async (documento: Documento) => {
    setLoading(documento.id_documento)
    try {
      const response = await fetch('/api/admin/documentos/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: documento.ruta_archivo,
          fileName: documento.nombre_archivo,
          viewOnly: true,
          expiresIn: 3600
        })
      })

      if (!response.ok) {
        let errorMessage = 'Error al generar enlace de vista'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Si no puede parsear JSON, usar mensaje por defecto
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      const newWindow = window.open(data.url, '_blank', 'noopener,noreferrer')
      
      if (!newWindow) {
        throw new Error('El navegador bloqueó la nueva ventana. Permite ventanas emergentes para este sitio.')
      }

      toast.success('Documento abierto en nueva pestaña')
    } catch (error) {
      console.error('Error al visualizar:', error)
      toast.error(error instanceof Error ? error.message : 'Error al visualizar el documento')
    } finally {
      setLoading(null)
    }
  }

  // Función para eliminar documento (solo si tiene acceso completo) - USAR ENDPOINT DEL ADMIN
  const handleDelete = async (documento: Documento) => {
    if (!tieneAccesoCompleto(documento)) {
      toast.error('No tienes permisos para eliminar documentos en esta carpeta')
      return
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar "${documento.nombre_archivo}"?`)) {
      return
    }

    setLoading(documento.id_documento)
    try {
      const response = await fetch(`/api/admin/documentos/${documento.id_documento}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        let errorMessage = 'Error al eliminar documento'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Si no puede parsear JSON, usar mensaje por defecto
        }
        throw new Error(errorMessage)
      }

      toast.success('Documento eliminado correctamente')
      
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
    } catch (error) {
      console.error('Error al eliminar:', error)
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el documento')
    } finally {
      setLoading(null)
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'PLANO': return 'bg-sky-100 text-sky-800 border-sky-200'
      case 'CONTRATO': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'INFORME': return 'bg-amber-100 text-amber-800 border-amber-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getIconByType = (formato: string) => {
    if (formato.toLowerCase() === 'pdf') return '📄'
    if (['doc', 'docx'].includes(formato.toLowerCase())) return '📝'
    if (['xls', 'xlsx'].includes(formato.toLowerCase())) return '📊'
    if (['jpg', 'jpeg', 'png', 'gif'].includes(formato.toLowerCase())) return '🖼️'
    if (['dwg', 'dxf'].includes(formato.toLowerCase())) return '📐'
    return '📎'
  }

  const soloLecturaCarpetaActual = carpetaActual && carpetasLectura.includes(carpetaActual.codigo)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {carpetaActual ? (
                <span className="flex items-center gap-2">
                  {carpetaActual.nombre_carpeta}
                  {soloLecturaCarpetaActual && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Lock className="h-3 w-3 mr-1" />
                      Solo lectura
                    </Badge>
                  )}
                </span>
              ) : (
                'Documentos Recientes'
              )}
            </CardTitle>
            <CardDescription>
              {documentos.length} documento(s) encontrado(s)
              {obraActual && ` en la obra: ${obraActual.nombre_obra}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {documentos.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
            <p className="text-muted-foreground mb-4">
              {carpetaActual 
                ? `No hay documentos en la carpeta "${carpetaActual.nombre_carpeta}"`
                : 'No se encontraron documentos.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {documentos.map((documento) => {
              const accesoCompleto = tieneAccesoCompleto(documento)
              const isLoading = loading === documento.id_documento

              return (
                <div 
                  key={documento.id_documento}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors group ${
                    accesoCompleto 
                      ? 'hover:bg-accent/50 border-gray-200' 
                      : 'hover:bg-amber-50/50 border-amber-100 bg-amber-50/20'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-2xl">
                      {getIconByType(documento.formato)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium truncate">{documento.nombre_archivo}</p>
                        <Badge variant="outline" className={getTipoColor(documento.tipo_documento)}>
                          {documento.tipo_documento}
                        </Badge>
                        {!accesoCompleto && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                            <Eye className="h-3 w-3 mr-1" />
                            Solo lectura
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {!carpetaActual && (
                          <>
                            <div className="flex items-center gap-1">
                              <Folder className="h-3 w-3" />
                              <span>{documento.carpeta_tipo.nombre_carpeta}</span>
                            </div>
                            <span>•</span>
                          </>
                        )}
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{documento.obra.nombre_obra}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{documento.usuario.nombre}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(documento.fecha_carga).toLocaleDateString('es-PE')}</span>
                        </div>
                        <span>•</span>
                        <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                          {documento.formato.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4 opacity-70 group-hover:opacity-100 transition-opacity">
                    {/* Ver - Siempre disponible */}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleView(documento)}
                      disabled={isLoading}
                      title="Ver documento"
                      className="hover:bg-blue-50 hover:text-blue-600"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Descargar - Siempre disponible */}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDownload(documento)}
                      disabled={isLoading}
                      title="Descargar documento"
                      className="hover:bg-green-50 hover:text-green-600"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    {/* Eliminar - Solo si tiene acceso completo */}
                    {accesoCompleto ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(documento)}
                        disabled={isLoading}
                        title="Eliminar documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-gray-300 cursor-not-allowed"
                        disabled
                        title="No tienes permisos para eliminar"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
