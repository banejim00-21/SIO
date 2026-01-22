// src/app/(dashboard)/infraestructura/page.tsx
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'
import { 
  Building2, 
  Calendar, 
  TrendingUp, 
  FileText,
  Clock,
  ArrowUpRight,
  Plus
} from 'lucide-react'

export default async function InfraestructuraDashboard() {
  const user = await getSession()

  // Obtener obras donde el usuario es responsable
  const obrasResponsable = await prisma.obra.findMany({
    where: {
      id_responsable: user?.id_usuario
    },
    include: {
      fases: true,
      cronogramas: {
        include: {
          hitos: true
        }
      },
      historial_estados: {
        orderBy: {
          fecha_cambio: 'desc'
        },
        take: 1
      }
    },
    orderBy: {
      fecha_actualizacion: 'desc'
    }
  })

  // Estadísticas
  const stats = {
    totalProyectos: obrasResponsable.length,
    enEjecucion: obrasResponsable.filter(o => o.estado === 'EN_EJECUCION').length,
    planeadas: obrasResponsable.filter(o => o.estado === 'PLANEADA').length,
    concluidas: obrasResponsable.filter(o => o.estado === 'CONCLUIDA').length,
  }

  // Calcular hitos pendientes
  const hitosPendientes = obrasResponsable.reduce((acc, obra) => {
    const hitos = obra.cronogramas.flatMap(c => c.hitos)
    const pendientes = hitos.filter(h => new Date(h.fecha_hito) < new Date())
    return acc + pendientes.length
  }, 0)

  // Calcular avance promedio (simulado - deberías tener una tabla de avances)
  const avancePromedio = obrasResponsable.length > 0 
    ? Math.round(obrasResponsable.reduce((acc, o) => {
        if (o.estado === 'PLANEADA') return acc + 0
        if (o.estado === 'EN_EJECUCION') return acc + 50
        if (o.estado === 'CONCLUIDA') return acc + 100
        if (o.estado === 'LIQUIDADA') return acc + 100
        return acc
      }, 0) / obrasResponsable.length)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Gestión de Infraestructura
          </h1>
          <p className="text-muted-foreground mt-2">
            Bienvenido, <span className="font-semibold text-gray-900">{user?.nombre}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm px-4 py-2 bg-green-50 text-green-700 border-green-200">
            {user?.rol.nombre}
          </Badge>
          <Link href="/infraestructura/proyectos">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Obra
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Proyectos Activos"
          value={stats.totalProyectos.toString()}
          description={`${stats.enEjecucion} en ejecución`}
          icon={<Building2 className="h-5 w-5" />}
          color="blue"
          link="/infraestructura/proyectos"
        />
        <StatsCard
          title="Avance Promedio"
          value={`${avancePromedio}%`}
          description="De todos los proyectos"
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
          link="/infraestructura/avances"
        />
        <StatsCard
          title="Hitos Pendientes"
          value={hitosPendientes.toString()}
          description="Requieren atención"
          icon={<Calendar className="h-5 w-5" />}
          color="amber"
          link="/infraestructura/cronogramas"
        />
        <StatsCard
          title="Planeadas"
          value={stats.planeadas.toString()}
          description="Por iniciar"
          icon={<Clock className="h-5 w-5" />}
          color="purple"
          link="/infraestructura/proyectos?estado=PLANEADA"
        />
      </div>

      {/* Proyectos Recientes */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Proyectos en Ejecución
              </CardTitle>
              <CardDescription>
                Obras actualmente bajo tu supervisión
              </CardDescription>
            </div>
            <Link href="/infraestructura/proyectos">
              <Button variant="outline" size="sm">
                Ver todos
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {obrasResponsable.filter(o => o.estado === 'EN_EJECUCION').slice(0, 5).map((obra) => {
            const diasTranscurridos = Math.floor(
              (new Date().getTime() - new Date(obra.fecha_inicio_prevista).getTime()) / (1000 * 60 * 60 * 24)
            )
            
            // Calcular progreso estimado (esto debería venir de una tabla de avances real)
            const progress = Math.min(Math.round((diasTranscurridos / 180) * 100), 95)

            return (
              <ProjectCard
                key={obra.id_obra}
                id={obra.id_obra}
                name={obra.nombre_obra}
                location={obra.ubicacion}
                progress={progress}
                status={obra.estado}
                budget={Number(obra.presupuesto_inicial)}
                startDate={obra.fecha_inicio_prevista}
                phases={obra.fases.length}
              />
            )
          })}

          {obrasResponsable.filter(o => o.estado === 'EN_EJECUCION').length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No hay proyectos en ejecución
              </h3>
              <p className="text-muted-foreground mb-4">
                Comienza registrando tu primera obra
              </p>
              <Link href="/infraestructura/proyectos">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Obra
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de Acciones Rápidas y Cronograma */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximos Hitos */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Próximos Hitos
            </CardTitle>
            <CardDescription>
              Hitos programados para los próximos 15 días
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {obrasResponsable.flatMap(obra => 
              obra.cronogramas.flatMap(c => 
                c.hitos.filter(h => {
                  const fechaHito = new Date(h.fecha_hito)
                  const hoy = new Date()
                  const dias15 = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000)
                  return fechaHito >= hoy && fechaHito <= dias15
                }).map(h => ({
                  ...h,
                  obra: obra.nombre_obra
                }))
              )
            ).slice(0, 4).map((hito) => (
              <HitoItem
                key={hito.id_hito}
                description={hito.descripcion}
                date={new Date(hito.fecha_hito)}
                project={hito.obra}
                type={hito.tipo}
              />
            ))}

            {obrasResponsable.flatMap(o => o.cronogramas).flatMap(c => c.hitos).length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">
                No hay hitos programados
              </p>
            )}
          </CardContent>
        </Card>

        {/* Documentos Pendientes */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Operaciones frecuentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/infraestructura/proyectos">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Gestionar Proyectos
              </Button>
            </Link>
            <Link href="/infraestructura/cronogramas">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Ver Cronogramas
              </Button>
            </Link>
            <Link href="/infraestructura/avances">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Registrar Avances
              </Button>
            </Link>
            <Link href="/infraestructura/documentos">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Subir Documentos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'amber'
  link?: string
}

function StatsCard({ title, value, description, icon, color, link }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500'
  }

  const content = (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${colorClasses[color]} text-white`}>
            {icon}
          </div>
        </div>
        <h3 className="text-3xl font-bold text-gray-900 mb-1">{value}</h3>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )

  return link ? <Link href={link}>{content}</Link> : content
}

interface ProjectCardProps {
  id: number
  name: string
  location: string
  progress: number
  status: string
  budget: number
  startDate: Date
  phases: number
}

function ProjectCard({ id, name, location, progress, status, budget, startDate, phases }: ProjectCardProps) {
  const statusColors = {
    'PLANEADA': 'bg-gray-100 text-gray-700',
    'EN_EJECUCION': 'bg-blue-100 text-blue-700',
    'CONCLUIDA': 'bg-green-100 text-green-700',
    'LIQUIDADA': 'bg-purple-100 text-purple-700'
  }

  const statusLabels = {
    'PLANEADA': 'Planeada',
    'EN_EJECUCION': 'En Ejecución',
    'CONCLUIDA': 'Concluida',
    'LIQUIDADA': 'Liquidada'
  }

  return (
    <Link href={`/infraestructura/proyectos/${id}`}>
      <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold text-gray-900">{name}</h4>
              <Badge className={statusColors[status as keyof typeof statusColors]}>
                {statusLabels[status as keyof typeof statusLabels]}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(startDate).toLocaleDateString('es-PE')}
              </span>
              <span>{phases} fases</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{progress}%</p>
            <p className="text-xs text-muted-foreground">
              S/ {budget.toLocaleString('es-PE')}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </Link>
  )
}

interface HitoItemProps {
  description: string
  date: Date
  project: string
  type: string
}

function HitoItem({ description, date, project, type }: HitoItemProps) {
  const diasRestantes = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  const esUrgente = diasRestantes <= 3

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      esUrgente ? 'border-red-200 bg-red-50' : 'bg-card hover:bg-accent/50'
    }`}>
      <div className={`p-2 rounded-md ${esUrgente ? 'bg-red-100' : 'bg-blue-100'}`}>
        <Calendar className={`h-4 w-4 ${esUrgente ? 'text-red-600' : 'text-blue-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{description}</p>
        <p className="text-xs text-muted-foreground truncate">{project}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-medium ${esUrgente ? 'text-red-600' : 'text-gray-600'}`}>
          {diasRestantes === 0 ? 'Hoy' : `${diasRestantes}d`}
        </p>
        <p className="text-xs text-muted-foreground">{type}</p>
      </div>
    </div>
  )
}