// src/app/(dashboard)/estudio/proyectos/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Building2,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  Eye,
  FileText
} from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function ProyectosPage({ searchParams }: PageProps) {
  const user = await getSession()
  
  if (!user || user.rol.nombre !== 'ESTUDIO') {
    redirect('/login')
  }

  const supabase = await createClient()

  // Obtener parámetros de búsqueda
  const search = (searchParams.search as string) || ''
  const estado = (searchParams.estado as string) || 'all'
  const page = parseInt((searchParams.page as string) || '1')
  const limit = 12
  const offset = (page - 1) * limit

  // Construir query - CORRECCIÓN AQUÍ
  let query = supabase
    .from('obra')
    .select(`
      id_obra,
      nombre_obra,
      ubicacion,
      coordenadas,
      presupuesto_inicial,
      fecha_inicio_prevista,
      estado,
      fecha_creacion,
      responsable_info:id_responsable (
        nombre,
        correo
      )
    `, { count: 'exact' })
    .order('fecha_creacion', { ascending: false })

  // Aplicar filtros
  if (estado !== 'all') {
    query = query.eq('estado', estado)
  }

  if (search) {
    query = query.or(`nombre_obra.ilike.%${search}%,ubicacion.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data: obras, error, count } = await query

  if (error) {
    console.error('Error al cargar obras:', error)
  }

  const totalPages = Math.ceil((count || 0) / limit)

  // Colores por estado
  const estadoColors: Record<string, string> = {
    PLANEADA: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    EN_EJECUCION: 'bg-blue-100 text-blue-800 border-blue-200',
    CONCLUIDA: 'bg-green-100 text-green-800 border-green-200',
    LIQUIDADA: 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Proyectos</h1>
        <p className="text-muted-foreground">
          Obras disponibles para gestión de estudios técnicos
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <form action="/estudio/proyectos" method="GET" className="grid gap-4 md:grid-cols-3">
            {/* Búsqueda por texto */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Buscar por nombre o ubicación..."
                className="pl-8"
                defaultValue={search}
              />
            </div>

            {/* Filtro por estado */}
            <Select name="estado" defaultValue={estado}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PLANEADA">Planeada</SelectItem>
                <SelectItem value="EN_EJECUCION">En Ejecución</SelectItem>
                <SelectItem value="CONCLUIDA">Concluida</SelectItem>
                <SelectItem value="LIQUIDADA">Liquidada</SelectItem>
              </SelectContent>
            </Select>

            {/* Botón buscar */}
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {obras?.length || 0} de {count || 0} proyectos
        </p>
        {search && (
          <Link href="/estudio/proyectos">
            <Button variant="ghost" size="sm">
              Limpiar filtros
            </Button>
          </Link>
        )}
      </div>

      {/* Grid de obras */}
      {obras && obras.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {obras.map((obra) => (
            <Card key={obra.id_obra} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {obra.nombre_obra}
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={estadoColors[obra.estado] || ''}
                  >
                    {obra.estado}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ubicación */}
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground line-clamp-2">
                    {obra.ubicacion}
                  </span>
                </div>

                {/* Fecha prevista */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">
                    Inicio: {new Date(obra.fecha_inicio_prevista).toLocaleDateString('es-PE')}
                  </span>
                </div>

                {/* Presupuesto */}
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">
                    S/ {Number(obra.presupuesto_inicial).toLocaleString('es-PE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>

                {/* Responsable - CORRECCIÓN AQUÍ */}
                {obra.responsable_info && Array.isArray(obra.responsable_info) && obra.responsable_info.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Responsable</p>
                    <p className="text-sm font-medium">{obra.responsable_info[0].nombre}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/estudio/proyectos/${obra.id_obra}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      Ver Detalles
                    </Button>
                  </Link>
                  <Link href={`/estudio/documentos?obra=${obra.id_obra}`}>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron proyectos</h3>
              <p className="text-muted-foreground mb-4">
                {search 
                  ? 'Intenta ajustar los filtros de búsqueda' 
                  : 'No hay proyectos disponibles en este momento'}
              </p>
              {search && (
                <Link href="/estudio/proyectos">
                  <Button variant="outline">
                    Ver todos los proyectos
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link 
            href={`/estudio/proyectos?page=${page - 1}&search=${search}&estado=${estado}`}
            className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="sm" disabled={page <= 1}>
              Anterior
            </Button>
          </Link>
          
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          
          <Link 
            href={`/estudio/proyectos?page=${page + 1}&search=${search}&estado=${estado}`}
            className={page >= totalPages ? 'pointer-events-none opacity-50' : ''}
          >
            <Button variant="outline" size="sm" disabled={page >= totalPages}>
              Siguiente
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}