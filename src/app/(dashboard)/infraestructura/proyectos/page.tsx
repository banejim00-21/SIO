// src/app/(dashboard)/infraestructura/proyectos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Search, 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  FileText,
  TrendingUp,
  Loader2,
  Eye,
  ListTree,
  BarChart3
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Estadisticas {
  totalFases: number
  totalActividades: number
  actividadesCompletadas: number
  actividadesEnCurso: number
  actividadesPendientes: number
  avanceFisico: number
  totalDocumentos: number
  totalReportes: number
}

interface Obra {
  id_obra: number
  nombre_obra: string
  ubicacion: string
  estado: string
  presupuesto_inicial: number
  fecha_inicio_prevista: string
  fecha_creacion: string
  responsable: {
    id_usuario: number
    nombre: string
    rol: { nombre: string }
  }
  estadisticas: Estadisticas
}

export default function ProyectosPage() {
  const router = useRouter()
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/infraestructura/proyectos')
      
      if (!response.ok) throw new Error('Error al cargar proyectos')
      
      const data = await response.json()
      setObras(data.obras || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('No se pudieron cargar los proyectos')
    } finally {
      setLoading(false)
    }
  }

  const filteredObras = obras.filter(obra => {
    const matchesSearch = 
      obra.nombre_obra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.ubicacion.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesEstado = filterEstado === 'TODOS' || obra.estado === filterEstado
    
    return matchesSearch && matchesEstado
  })

  const stats = {
    total: obras.length,
    planeadas: obras.filter(o => o.estado === 'PLANEADA').length,
    enEjecucion: obras.filter(o => o.estado === 'EN_EJECUCION').length,
    concluidas: obras.filter(o => o.estado === 'CONCLUIDA').length
  }

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'PLANEADA': return 'secondary'
      case 'EN_EJECUCION': return 'default'
      case 'CONCLUIDA': return 'outline'
      case 'LIQUIDADA': return 'outline'
      default: return 'secondary'
    }
  }

  const formatEstado = (estado: string) => {
    return estado.replace('_', ' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Proyectos</h1>
        <p className="text-muted-foreground">
          Gestiona y monitorea los proyectos de infraestructura
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Proyectos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-2xl font-bold text-gray-600">{stats.planeadas}</div>
                <p className="text-xs text-muted-foreground">Planeadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.enEjecucion}</div>
                <p className="text-xs text-muted-foreground">En Ejecución</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.concluidas}</div>
                <p className="text-xs text-muted-foreground">Concluidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista de Proyectos</CardTitle>
              <CardDescription>
                {filteredObras.length} proyectos encontrados
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los estados</SelectItem>
                  <SelectItem value="PLANEADA">Planeadas</SelectItem>
                  <SelectItem value="EN_EJECUCION">En Ejecución</SelectItem>
                  <SelectItem value="CONCLUIDA">Concluidas</SelectItem>
                  <SelectItem value="LIQUIDADA">Liquidadas</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar proyectos..."
                  className="pl-8 w-full sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredObras.map((obra) => (
              <Card key={obra.id_obra} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{obra.nombre_obra}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{obra.ubicacion}</span>
                      </CardDescription>
                    </div>
               <Badge variant={getEstadoBadgeVariant(obra.estado) as "default" | "secondary" | "outline" | "destructive"}>
                      {formatEstado(obra.estado)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Avance físico */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avance Físico</span>
                      <span className="font-medium">{obra.estadisticas.avanceFisico}%</span>
                    </div>
                    <Progress value={obra.estadisticas.avanceFisico} className="h-2" />
                  </div>

                  {/* Estadísticas */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-lg font-semibold">{obra.estadisticas.totalFases}</div>
                      <div className="text-xs text-muted-foreground">Fases</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-lg font-semibold">{obra.estadisticas.totalActividades}</div>
                      <div className="text-xs text-muted-foreground">Actividades</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <div className="text-lg font-semibold text-green-600">
                        {obra.estadisticas.actividadesCompletadas}
                      </div>
                      <div className="text-xs text-muted-foreground">Completadas</div>
                    </div>
                  </div>

                  {/* Info adicional */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span className="line-clamp-1">{obra.responsable?.nombre || 'Sin asignar'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(obra.fecha_inicio_prevista).toLocaleDateString('es-PE')}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => router.push(`/infraestructura/proyectos/${obra.id_obra}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalle
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/infraestructura/proyectos/${obra.id_obra}/cronograma`)}
                      title="Ver Cronograma"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/infraestructura/proyectos/${obra.id_obra}/fases`)}
                      title="Gestionar Fases"
                    >
                      <ListTree className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredObras.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron proyectos</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Intenta ajustar los términos de búsqueda' : 'No hay proyectos disponibles'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
