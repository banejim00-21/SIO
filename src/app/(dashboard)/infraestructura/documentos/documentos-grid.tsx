// src/app/(dashboard)/infraestructura/documentos/documentos-grid.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Folder, Building2, FilterX, Lock, Unlock, Eye } from 'lucide-react'
import Link from 'next/link'

interface CarpetaTipo {
  id_carpeta_tipo: number
  codigo: string
  nombre_carpeta: string
  descripcion: string | null
}

interface Obra {
  id_obra: number
  nombre_obra: string
  estado: string
}

interface Documento {
  id_documento: number
  id_carpeta_tipo: number
  id_obra: number
  tipo_documento: string
}

interface DocumentosGridInfraProps {
  carpetas: CarpetaTipo[]
  documentos: Documento[]
  obras: Obra[]
  obraSeleccionada?: string
  carpetasCompletas: string[]
  carpetasLectura: string[]
}

export function DocumentosGridInfra({ 
  carpetas, 
  documentos, 
  obras, 
  obraSeleccionada,
  carpetasCompletas,
  carpetasLectura 
}: DocumentosGridInfraProps) {
  // Filtrar solo carpetas que infraestructura puede ver
  const carpetasPermitidas = carpetas.filter(c => 
    carpetasCompletas.includes(c.codigo) || carpetasLectura.includes(c.codigo)
  )

  // Contar documentos por carpeta
  const documentosPorCarpeta = carpetasPermitidas.map(carpeta => {
    const docsEnCarpeta = documentos.filter(d => d.id_carpeta_tipo === carpeta.id_carpeta_tipo);
    const tieneAccesoCompleto = carpetasCompletas.includes(carpeta.codigo)
    const soloLectura = carpetasLectura.includes(carpeta.codigo)
    
    return {
      ...carpeta,
      total: docsEnCarpeta.length,
      planos: docsEnCarpeta.filter(d => d.tipo_documento === 'PLANO').length,
      contratos: docsEnCarpeta.filter(d => d.tipo_documento === 'CONTRATO').length,
      informes: docsEnCarpeta.filter(d => d.tipo_documento === 'INFORME').length,
      tieneAccesoCompleto,
      soloLectura
    }
  })

  // Separar carpetas por tipo de acceso
  const carpetasConAccesoCompleto = documentosPorCarpeta.filter(c => c.tieneAccesoCompleto)
  const carpetasSoloLectura = documentosPorCarpeta.filter(c => c.soloLectura)

  return (
    <div className="space-y-6">
      {/* Filtros por Obra */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Obras Disponibles
          </CardTitle>
          <CardDescription>
            {obraSeleccionada 
              ? `Mostrando documentos de la obra seleccionada` 
              : `Hay ${obras.length} obra(s) disponible(s). Selecciona una para filtrar.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {obraSeleccionada && (
              <Link href="/infraestructura/documentos">
                <Badge variant="outline" className="cursor-pointer hover:bg-white border-red-200 text-red-600">
                  <FilterX className="h-3 w-3 mr-1" />
                  Limpiar filtro
                </Badge>
              </Link>
            )}
            {obras.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay obras disponibles.</p>
            ) : (
              obras.map(obra => (
                <Link 
                  key={obra.id_obra} 
                  href={`/infraestructura/documentos?obra=${obra.id_obra}`}
                >
                  <Badge 
                    variant={obraSeleccionada === obra.id_obra.toString() ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      obraSeleccionada === obra.id_obra.toString() 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <Building2 className="h-3 w-3 mr-1" />
                    {obra.nombre_obra}
                    <span className="ml-1 opacity-70">({obra.estado})</span>
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Carpetas con Acceso Completo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-green-600" />
            Carpetas con Acceso Completo
            <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
              {carpetasConAccesoCompleto.length} carpetas
            </Badge>
          </CardTitle>
          <CardDescription>
            Puedes subir, editar y eliminar documentos en estas carpetas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {carpetasConAccesoCompleto.map((carpeta) => (
              <Link 
                key={carpeta.id_carpeta_tipo} 
                href={`/infraestructura/documentos?carpeta=${carpeta.id_carpeta_tipo}${obraSeleccionada ? `&obra=${obraSeleccionada}` : ''}`}
              >
                <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-green-300 group h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                        <Folder className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                          {carpeta.codigo}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-green-700 line-clamp-2">
                      {carpeta.nombre_carpeta}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {carpeta.descripcion}
                    </p>
                    
                    {/* Contadores de documentos */}
                    <div className="space-y-1.5 text-xs border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold text-green-700">{carpeta.total}</span>
                      </div>
                      {carpeta.planos > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sky-600">Planos:</span>
                          <span className="font-medium">{carpeta.planos}</span>
                        </div>
                      )}
                      {carpeta.contratos > 0 && (
                        <div className="flex justify-between">
                          <span className="text-purple-600">Contratos:</span>
                          <span className="font-medium">{carpeta.contratos}</span>
                        </div>
                      )}
                      {carpeta.informes > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-600">Informes:</span>
                          <span className="font-medium">{carpeta.informes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Carpetas de Solo Lectura */}
      <Card className="border-amber-200">
        <CardHeader className="bg-amber-50/50">
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-amber-600" />
            Carpetas de Solo Lectura
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
              {carpetasSoloLectura.length} carpetas
            </Badge>
          </CardTitle>
          <CardDescription>
            Solo puedes visualizar y descargar documentos de estas carpetas
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {carpetasSoloLectura.map((carpeta) => (
              <Link 
                key={carpeta.id_carpeta_tipo} 
                href={`/infraestructura/documentos?carpeta=${carpeta.id_carpeta_tipo}${obraSeleccionada ? `&obra=${obraSeleccionada}` : ''}`}
              >
                <Card className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-amber-300 group h-full bg-amber-50/30">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                        <Folder className="h-6 w-6 text-amber-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-amber-500" />
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                          {carpeta.codigo}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1 group-hover:text-amber-700 line-clamp-2">
                      {carpeta.nombre_carpeta}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {carpeta.descripcion}
                    </p>
                    
                    {/* Contadores de documentos */}
                    <div className="space-y-1.5 text-xs border-t pt-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold text-amber-700">{carpeta.total}</span>
                      </div>
                      {carpeta.planos > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sky-600">Planos:</span>
                          <span className="font-medium">{carpeta.planos}</span>
                        </div>
                      )}
                      {carpeta.informes > 0 && (
                        <div className="flex justify-between">
                          <span className="text-amber-600">Informes:</span>
                          <span className="font-medium">{carpeta.informes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
