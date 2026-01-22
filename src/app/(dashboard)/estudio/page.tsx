// src/app/(dashboard)/estudio/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  FolderOpen, 
  Building2, 
  CheckCircle,
  BookOpen,
  TrendingUp,
  Plus,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

// Helper para extraer datos de arrays o objetos de Supabase
function extractData<T>(data: T | T[] | null | undefined): T | null {
  if (!data) return null
  return Array.isArray(data) ? data[0] : data
}

// Type guard para verificar si un objeto tiene una propiedad
function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj
}

export default async function EstudioDashboard() {
  const user = await getSession()
  
  if (!user || user.rol.nombre !== 'ESTUDIO') {
    redirect('/login')
  }

  const supabase = await createClient()

  // Obtener estadísticas
  const [
    { data: obrasEnEstudio },
    { data: documentosCargados },
    { data: informesTecnicos },
    { data: planosIniciales }
  ] = await Promise.all([
    // Obras en fase de estudio (PLANEADA)
    supabase
      .from('obra')
      .select(`
        id_obra,
        nombre_obra,
        ubicacion,
        presupuesto_inicial,
        fecha_inicio_prevista,
        estado
      `)
      .eq('estado', 'PLANEADA')
      .order('fecha_creacion', { ascending: false })
      .limit(5),
    
    // Documentos técnicos cargados por el usuario
    supabase
      .from('documento')
      .select(`
        id_documento,
        nombre_archivo,
        fecha_carga,
        formato,
        obra:id_obra (
          nombre_obra,
          estado
        ),
        carpeta_tipo:id_carpeta_tipo (
          nombre_carpeta,
          codigo
        )
      `)
      .eq('id_usuario', user.id_usuario)
      .eq('estado', 'VIGENTE')
      .order('fecha_carga', { ascending: false })
      .limit(10),
    
    // Informes técnicos
    supabase
      .from('informe_tecnico')
      .select(`
        id_informe,
        tipo_informe,
        fecha_informe,
        autor,
        documento:id_documento (
          nombre_archivo,
          obra:id_obra (
            nombre_obra
          )
        )
      `)
      .eq('autor', user.nombre)
      .order('fecha_informe', { ascending: false })
      .limit(10),
    
    // Planos iniciales
    supabase
      .from('plano')
      .select(`
        id_plano,
        tipo_plano,
        categoria,
        documento:id_documento (
          nombre_archivo,
          fecha_carga,
          obra:id_obra (
            nombre_obra,
            estado
          )
        )
      `)
      .eq('categoria', 'INICIAL')
      .limit(8)
  ])

  // Contar documentos por carpeta
  const carpetasConteo = documentosCargados?.reduce((acc, doc) => {
    const carpetaTipo = extractData(doc.carpeta_tipo)
    const carpeta = hasProperty(carpetaTipo, 'nombre_carpeta') 
      ? String(carpetaTipo.nombre_carpeta)
      : 'Sin carpeta'
    acc[carpeta] = (acc[carpeta] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Contar informes por tipo
  const informesMensuales = informesTecnicos?.filter(i => i.tipo_informe === 'MENSUAL').length || 0
  const informesParciales = informesTecnicos?.filter(i => i.tipo_informe === 'PARCIAL').length || 0
  const informesFinales = informesTecnicos?.filter(i => i.tipo_informe === 'FINAL').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard Estudio
          </h1>
          <p className="text-muted-foreground">
            Gestión de Documentación Técnica y Estudios Previos
          </p>
        </div>
        <Link href="/estudio/informes/nuevo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Informe
          </Button>
        </Link>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obras en Estudio</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{obrasEnEstudio?.length || 0}</div>
            <p className="text-xs text-muted-foreground">En fase de planificación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos Cargados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentosCargados?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Por ti en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Informes Técnicos</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{informesTecnicos?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total creados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos Iniciales</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{planosIniciales?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Accede a las funciones principales</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Link href="/estudio/proyectos">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <BookOpen className="h-6 w-6" />
              <span>Ver Proyectos</span>
            </Button>
          </Link>
          <Link href="/estudio/documentos">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <FileText className="h-6 w-6" />
              <span>Gestionar Documentos</span>
            </Button>
          </Link>
          <Link href="/estudio/informes">
            <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
              <TrendingUp className="h-6 w-6" />
              <span>Mis Informes</span>
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Obras en Fase de Estudio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Obras en Fase de Estudio</CardTitle>
              <CardDescription>Proyectos en planificación</CardDescription>
            </div>
            <Link href="/estudio/proyectos">
              <Button variant="ghost" size="sm">
                Ver todas →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {obrasEnEstudio && obrasEnEstudio.length > 0 ? (
            <div className="space-y-3">
             {obrasEnEstudio.map((obra) => (
                <div key={obra.id_obra} className="p-4 border rounded-lg space-y-2 hover:border-blue-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{obra.nombre_obra}</h3>
                      <p className="text-sm text-muted-foreground">{obra.ubicacion}</p>
                    </div>
                    <Badge variant="outline">PLANEADA</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Presupuesto Inicial</p>
                      <p className="font-medium">
                        S/ {Number(obra.presupuesto_inicial).toLocaleString('es-PE', { 
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fecha Prevista</p>
                      <p className="font-medium">
                        {new Date(obra.fecha_inicio_prevista).toLocaleDateString('es-PE')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay obras en fase de estudio</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informes y Documentos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Distribución de Informes */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Informes</CardTitle>
            <CardDescription>Informes técnicos por tipo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Informes Mensuales</p>
                  <p className="text-xs text-muted-foreground">Avance periódico</p>
                </div>
              </div>
              <span className="text-2xl font-bold">{informesMensuales}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Informes Parciales</p>
                  <p className="text-xs text-muted-foreground">Avance por fase</p>
                </div>
              </div>
              <span className="text-2xl font-bold">{informesParciales}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Informes Finales</p>
                  <p className="text-xs text-muted-foreground">Cierre técnico</p>
                </div>
              </div>
              <span className="text-2xl font-bold">{informesFinales}</span>
            </div>
          </CardContent>
        </Card>

        {/* Documentos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos Recientes</CardTitle>
            <CardDescription>Últimos archivos cargados</CardDescription>
          </CardHeader>
          <CardContent>
            {documentosCargados && documentosCargados.length > 0 ? (
              <div className="space-y-3">
                {documentosCargados.slice(0, 5).map((doc) => {
                  const carpetaTipo = extractData(doc.carpeta_tipo)
                  const obra = extractData(doc.obra)
                  
                  return (
                    <div key={doc.id_documento} className="flex items-start gap-3 p-3 border rounded-lg hover:border-blue-300 transition-colors">
                      <FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {hasProperty(obra, 'nombre_obra') ? String(obra.nombre_obra) : 'Sin obra'}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {hasProperty(carpetaTipo, 'codigo') ? String(carpetaTipo.codigo) : 'N/A'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(doc.fecha_carga).toLocaleDateString('es-PE')}
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {doc.formato.toUpperCase()}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No has cargado documentos aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Planos Iniciales */}
      {planosIniciales && planosIniciales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planos Iniciales Registrados</CardTitle>
            <CardDescription>Planos en fase inicial de cada proyecto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
             {planosIniciales.map((plano) => {
                const documento = extractData(plano.documento)
                const obraData = hasProperty(documento, 'obra') ? extractData(documento.obra) : null
                
                return (
                  <div key={plano.id_plano} className="p-3 border rounded-lg space-y-2 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {hasProperty(documento, 'nombre_archivo') ? String(documento.nombre_archivo) : 'Sin nombre'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {hasProperty(obraData, 'nombre_obra') ? String(obraData.nombre_obra) : 'Sin obra'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">INICIAL</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{plano.tipo_plano}</span>
                      <span className="text-muted-foreground shrink-0">
                        {hasProperty(documento, 'fecha_carga') && new Date(String(documento.fecha_carga)).toLocaleDateString('es-PE')}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Carpetas Más Usadas */}
      {Object.keys(carpetasConteo).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Carpetas Más Utilizadas</CardTitle>
            <CardDescription>Distribución de tus documentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(carpetasConteo)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([carpeta, cantidad]) => (
                  <div key={carpeta} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-blue-500" />
                      <p className="text-sm font-medium">{carpeta}</p>
                    </div>
                    <Badge variant="outline">
                      {cantidad} {cantidad === 1 ? 'documento' : 'documentos'}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Carpetas autorizadas para subir documentos
              </p>
              <p className="text-sm text-blue-700">
                <strong>01</strong>-Documentación del Proyecto, <strong>03</strong>-Mecánica de Suelos, 
                <strong> 04</strong>-Levantamiento Topográfico, <strong>10</strong>-Gestión de Riesgos, 
                <strong> 11</strong>-Seguridad y Salud, <strong>12</strong>-Impacto Ambiental, 
                <strong> 13</strong>-Especificaciones Técnicas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}