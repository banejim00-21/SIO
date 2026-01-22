// src/app/(dashboard)/admin/auditoria/page.tsx
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Shield, Download, Calendar, FileText, TrendingUp, Users, Activity } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default async function AuditoriaPage() {
  const auditorias = await prisma.auditoria.findMany({ orderBy: { fecha_generacion: 'desc' } })
  const logAccesoCount = await prisma.logAcceso.count()
  const logActividadCount = await prisma.logActividad.count()
  const usuariosActivos = await prisma.usuario.count({
    where: { ultimo_acceso: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
  })
  const actividadPorModulo = await prisma.logActividad.groupBy({
    by: ['modulo'], _count: { modulo: true }
  })
  const intentosFallidos = await prisma.logAcceso.count({
    where: { resultado: 'FALLO', fecha_hora: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
  })

  const formatModulo = (modulo: string): string => {
    const modulos: Record<string, string> = {
      'PROYECTOS': 'Proyectos', 'PRESUPUESTO': 'Presupuesto', 'RRHH': 'Recursos Humanos',
      'DOCUMENTAL': 'Documental', 'REPORTES': 'Reportes', 'SEGURIDAD': 'Seguridad'
    }
    return modulos[modulo] || modulo
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Auditoría del Sistema</h1>
          <p className="text-muted-foreground">Reportes de seguridad y actividad del sistema</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <FileText className="mr-2 h-4 w-4" />Generar Reporte
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold">{logAccesoCount}</div><p className="text-xs text-muted-foreground">Logs de Acceso</p></div>
              <Activity className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold">{logActividadCount}</div><p className="text-xs text-muted-foreground">Actividades</p></div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold">{usuariosActivos}</div><p className="text-xs text-muted-foreground">Usuarios Activos (30d)</p></div>
              <Users className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><div className="text-2xl font-bold text-red-600">{intentosFallidos}</div><p className="text-xs text-muted-foreground">Intentos Fallidos (7d)</p></div>
              <Shield className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-blue-600" />Actividad por Módulo</CardTitle>
          <CardDescription>Distribución de actividades en los diferentes módulos del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {actividadPorModulo.map((modulo) => (
              <Card key={modulo.modulo} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{formatModulo(modulo.modulo)}</p>
                      <p className="text-2xl font-bold mt-1">{modulo._count.modulo}</p>
                    </div>
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      {((modulo._count.modulo / logActividadCount) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-purple-600" />Reportes de Auditoría Generados</CardTitle>
              <CardDescription>{auditorias.length} reportes de auditoría disponibles</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {auditorias.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead><TableHead>Periodo</TableHead><TableHead>Fecha de Generación</TableHead>
                  <TableHead>Resumen</TableHead><TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditorias.map((auditoria) => (
                  <TableRow key={auditoria.id_auditoria}>
                    <TableCell className="font-medium">#{auditoria.id_auditoria}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono">{auditoria.periodo}</Badge></TableCell>
                    <TableCell>
                      {new Date(auditoria.fecha_generacion).toLocaleDateString('es-PE', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="max-w-md"><p className="truncate text-sm">{auditoria.resumen || 'Sin resumen disponible'}</p></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm"><Download className="h-4 w-4 mr-2" />Descargar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay reportes de auditoría</h3>
              <p className="text-muted-foreground mb-4">Genera tu primer reporte de auditoría para comenzar</p>
              <Button className="bg-blue-600 hover:bg-blue-700"><FileText className="mr-2 h-4 w-4" />Generar Primer Reporte</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acciones de Auditoría</CardTitle>
          <CardDescription>Genera reportes específicos según el periodo o módulo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Calendar className="h-6 w-6" /><span className="font-semibold">Reporte Mensual</span><span className="text-xs text-muted-foreground">Último mes</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Calendar className="h-6 w-6" /><span className="font-semibold">Reporte Trimestral</span><span className="text-xs text-muted-foreground">Últimos 3 meses</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Calendar className="h-6 w-6" /><span className="font-semibold">Reporte Anual</span><span className="text-xs text-muted-foreground">Último año</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
