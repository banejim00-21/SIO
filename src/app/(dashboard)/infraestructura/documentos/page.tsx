// src/app/(dashboard)/infraestructura/documentos/page.tsx
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus,
  Home,
  FileText,
  FolderOpen,
  Clock,
  Lock
} from 'lucide-react'
import Link from 'next/link'
import { DocumentosGridInfra } from './documentos-grid'
import { DocumentosListInfra } from './documentos-list'

interface SearchParams {
  carpeta?: string
  obra?: string
}

interface PageProps {
  searchParams: SearchParams
}

// Carpetas con acceso completo para INFRAESTRUCTURA
const CARPETAS_COMPLETAS = ['01', '02', '05', '06', '07', '08', '09', '11', '13', '14', '16', '17', '18', '19']
const CARPETAS_LECTURA = ['03', '04', '10', '12', '15', '20']

async function getData() {
  try {
    const [obras, carpetas, documentos] = await Promise.all([
      // Todas las obras (infraestructura puede ver todas las obras que le asignen)
      prisma.obra.findMany({
        include: {
          responsable: {
            include: {
              rol: true
            }
          }
        },
        orderBy: { fecha_creacion: 'desc' }
      }),
      // Todas las carpetas
      prisma.carpetaTipo.findMany({
        orderBy: { orden: 'asc' }
      }),
      // Todos los documentos
      prisma.documento.findMany({
        include: {
          obra: true,
          carpeta_tipo: true,
          usuario: {
            include: {
              rol: true
            }
          }
        },
        orderBy: { fecha_carga: 'desc' }
      })
    ])

    return { 
      obras, 
      carpetas, 
      documentos
    }
  } catch (error) {
    console.error('Error al cargar datos:', error)
    return { 
      obras: [], 
      carpetas: [], 
      documentos: []
    }
  }
}

export default async function DocumentosInfraPage({ searchParams }: PageProps) {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  // Verificar que el usuario sea de INFRAESTRUCTURA
  if (session.rol.nombre !== 'INFRAESTRUCTURA') {
    redirect('/login')
  }

  const carpetaSeleccionada = searchParams.carpeta
  const obraSeleccionada = searchParams.obra

  const { obras, carpetas, documentos } = await getData()

  // Filtrar documentos según parámetros
  const documentosFiltrados = documentos.filter(doc => {
    const cumpleCarpeta = !carpetaSeleccionada || doc.id_carpeta_tipo === parseInt(carpetaSeleccionada)
    const cumpleObra = !obraSeleccionada || doc.id_obra === parseInt(obraSeleccionada)
    // Verificar que la carpeta esté permitida para infraestructura
    const carpetaPermitida = CARPETAS_COMPLETAS.includes(doc.carpeta_tipo.codigo) || 
                            CARPETAS_LECTURA.includes(doc.carpeta_tipo.codigo)
    return cumpleCarpeta && cumpleObra && carpetaPermitida
  })

  // Estadísticas
  const stats = {
    totalDocumentos: documentosFiltrados.length,
    documentosHoy: documentosFiltrados.filter(d => {
      const hoy = new Date()
      const fechaDoc = new Date(d.fecha_carga)
      return fechaDoc.toDateString() === hoy.toDateString()
    }).length,
    planos: documentosFiltrados.filter(d => d.tipo_documento === 'PLANO').length,
    contratos: documentosFiltrados.filter(d => d.tipo_documento === 'CONTRATO').length,
    informes: documentosFiltrados.filter(d => d.tipo_documento === 'INFORME').length,
    obrasDisponibles: obras.length
  }

  const carpetaActual = carpetaSeleccionada 
    ? carpetas.find(c => c.id_carpeta_tipo === parseInt(carpetaSeleccionada))
    : null

  const obraActual = obraSeleccionada
    ? obras.find(o => o.id_obra === parseInt(obraSeleccionada))
    : null

  // Verificar si la carpeta actual permite subir documentos
  const puedeSubirEnCarpetaActual = carpetaActual 
    ? CARPETAS_COMPLETAS.includes(carpetaActual.codigo)
    : true

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Home className="h-4 w-4" />
            <span>Infraestructura</span>
            <span>/</span>
            <span>Documentos</span>
            {carpetaActual && (
              <>
                <span>/</span>
                <span className="flex items-center gap-1">
                  {carpetaActual.nombre_carpeta}
                  {CARPETAS_LECTURA.includes(carpetaActual.codigo) && (
                    <Lock className="h-3 w-3 text-amber-500" />
                  )}
                </span>
              </>
            )}
            {obraActual && (
              <>
                <span>•</span>
                <span className="text-blue-600">{obraActual.nombre_obra}</span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            {carpetaActual ? carpetaActual.nombre_carpeta : 'Gestión Documental'}
          </h1>
          <p className="text-muted-foreground">
            {carpetaActual 
              ? `${documentosFiltrados.length} documento(s) en esta carpeta` 
              : `Administra documentos de ${obras.length} obra(s) disponible(s)`}
          </p>
        </div>
        
        <div className="flex gap-2">
          {(carpetaSeleccionada || obraSeleccionada) && (
            <Link href="/infraestructura/documentos">
              <Button variant="outline">
                <Home className="mr-2 h-4 w-4" />
                Ver Todos
              </Button>
            </Link>
          )}
          {puedeSubirEnCarpetaActual && (
            <Link href={`/infraestructura/documentos/upload${obraSeleccionada ? `?obra=${obraSeleccionada}` : ''}${carpetaSeleccionada ? `${obraSeleccionada ? '&' : '?'}carpeta=${carpetaSeleccionada}` : ''}`}>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/25">
                <Plus className="mr-2 h-4 w-4" />
                Subir Documento
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.obrasDisponibles}</div>
                <p className="text-xs text-muted-foreground">Obras Disponibles</p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.totalDocumentos}</div>
                <p className="text-xs text-muted-foreground">Total Documentos</p>
              </div>
              <FileText className="h-8 w-8 text-indigo-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.documentosHoy}</div>
                <p className="text-xs text-muted-foreground">Subidos Hoy</p>
              </div>
              <Clock className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-sky-600">{stats.planos}</div>
            <p className="text-xs text-muted-foreground">Planos</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.contratos}</div>
            <p className="text-xs text-muted-foreground">Contratos</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.informes}</div>
            <p className="text-xs text-muted-foreground">Informes</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de permisos si está en carpeta de solo lectura */}
      {carpetaActual && CARPETAS_LECTURA.includes(carpetaActual.codigo) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">Carpeta de solo lectura</p>
            <p className="text-sm text-amber-600">
              No tienes permisos para subir, editar o eliminar documentos en esta carpeta.
            </p>
          </div>
        </div>
      )}

      {/* Grid de Carpetas (solo mostrar si no hay carpeta seleccionada) */}
      {!carpetaSeleccionada && (
        <DocumentosGridInfra 
          carpetas={carpetas} 
          documentos={documentosFiltrados}
          obras={obras}
          obraSeleccionada={obraSeleccionada}
          carpetasCompletas={CARPETAS_COMPLETAS}
          carpetasLectura={CARPETAS_LECTURA}
        />
      )}

      {/* Lista de Documentos */}
      <DocumentosListInfra 
        documentos={documentosFiltrados}
        carpetaActual={carpetaActual}
        obraActual={obraActual}
        carpetasCompletas={CARPETAS_COMPLETAS}
        carpetasLectura={CARPETAS_LECTURA}
      />
    </div>
  )
}
