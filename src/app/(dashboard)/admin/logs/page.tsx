// src/app/(dashboard)/admin/logs/page.tsx
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Filter, Download, Activity, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type AccionAcceso = 'LOGIN' | 'LOGOUT' | 'INTENTO_FALLIDO' | 'ACCESO_DENEGADO'
type ModuloSistema = 'PROYECTOS' | 'PRESUPUESTO' | 'RRHH' | 'DOCUMENTAL' | 'REPORTES' | 'SEGURIDAD'

export default async function LogsPage() {
  // DATOS REALES de logs de acceso
  const logsAcceso = await prisma.logAcceso.findMany({
    include: {
      usuario: {
        include: {
          rol: true
        }
      }
    },
    orderBy: {
      fecha_hora: 'desc'
    },
    take: 100
  })

  // DATOS REALES de logs de actividad
  const logsActividad = await prisma.logActividad.findMany({
    include: {
      usuario: {
        include: {
          rol: true
        }
      },
      obra: true
    },
    orderBy: {
      fecha_hora: 'desc'
    },
    take: 100
  })

  // Estadísticas REALES
  const stats = {
    totalAccesos: logsAcceso.length,
    loginsExitosos: logsAcceso.filter(l => l.accion === 'LOGIN' && l.resultado === 'EXITO').length,
    intentosFallidos: logsAcceso.filter(l => l.resultado === 'FALLO').length,
    actividadesHoy: logsActividad.filter(l => {
      const hoy = new Date()
      const logDate = new Date(l.fecha_hora)
      return logDate.toDateString() === hoy.toDateString()
    }).length
  }

  function getAccionVariant(accion: AccionAcceso): "default" | "secondary" | "destructive" | "outline" {
    const variants: Record<AccionAcceso, "default" | "secondary" | "destructive" | "outline"> = {
      'LOGIN': 'default',
      'LOGOUT': 'secondary',
      'INTENTO_FALLIDO': 'destructive',
      'ACCESO_DENEGADO': 'destructive'
    }
    return variants[accion]
  }

  function formatAccion(accion: AccionAcceso): string {
    const acciones: Record<AccionAcceso, string> = {
      'LOGIN': 'Login',
      'LOGOUT': 'Logout',
      'INTENTO_FALLIDO': 'Intento Fallido',
      'ACCESO_DENEGADO': 'Acceso Denegado'
    }
    return acciones[accion]
  }

  function formatModulo(modulo: ModuloSistema): string {
    const modulos: Record<ModuloSistema, string> = {
      'PROYECTOS': 'Proyectos',
      'PRESUPUESTO': 'Presupuesto',
      'RRHH': 'RRHH',
      'DOCUMENTAL': 'Documental',
      'REPORTES': 'Reportes',
      'SEGURIDAD': 'Seguridad'
    }
    return modulos[modulo]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Logs del Sistema</h1>
          <p className="text-muted-foreground">
            Monitorea todos los accesos y actividades del sistema
          </p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Logs
        </Button>
      </div>

      {/* Stats REALES */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalAccesos}</div>
            <p className="text-xs text-muted-foreground">Total Accesos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.loginsExitosos}</div>
            <p className="text-xs text-muted-foreground">Logins Exitosos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.intentosFallidos}</div>
            <p className="text-xs text-muted-foreground">Intentos Fallidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.actividadesHoy}</div>
            <p className="text-xs text-muted-foreground">Actividades Hoy</p>
          </CardContent>
        </Card>
      </div>

      {/* Logs de Acceso */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Logs de Acceso
              </CardTitle>
              <CardDescription>
                Últimos {logsAcceso.length} registros de acceso al sistema
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar logs..." className="pl-8 w-[250px]" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsAcceso.map((log) => (
                <TableRow key={log.id_log}>
                  <TableCell className="text-sm">
                    {new Date(log.fecha_hora).toLocaleString('es-PE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{log.usuario.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.usuario.rol.nombre}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getAccionVariant(log.accion as AccionAcceso)}>
                      {formatAccion(log.accion as AccionAcceso)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-mono">{log.ip}</TableCell>
                  <TableCell className="text-xs max-w-[200px] truncate">
                    {log.dispositivo || 'Desconocido'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={log.resultado === 'EXITO' ? 'default' : 'destructive'}>
                      {log.resultado === 'EXITO' ? 'Éxito' : 'Fallo'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Logs de Actividad */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-purple-600" />
                Logs de Actividad
              </CardTitle>
              <CardDescription>
                Últimas {logsActividad.length} actividades en el sistema
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsActividad.map((log) => (
                <TableRow key={log.id_actividad_log}>
                  <TableCell className="text-sm">
                    {new Date(log.fecha_hora).toLocaleString('es-PE', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{log.usuario.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatModulo(log.modulo as ModuloSistema)}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.accion}</TableCell>
                  <TableCell className="text-sm">
                    {log.obra ? (
                      <span className="truncate max-w-[150px] block">{log.obra.nombre_obra}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{log.fase_asociada || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={log.resultado === 'Éxito' ? 'default' : 'destructive'}>
                      {log.resultado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
