// src/app/(dashboard)/admin/alertas/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, Bell, BellRing, CheckCircle2, AlertTriangle, Info, FileUp,
  Layers, Building2, Eye, Check, X, Loader2, RefreshCw, Mail, Settings,
  Send, Clock, CalendarClock, Zap, Power, TestTube, MailCheck
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type NivelAlerta = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
type EstadoAlerta = 'ACTIVA' | 'REVISADA' | 'CERRADA'

interface Alerta {
  id_alerta: number
  tipo: string
  descripcion: string
  fecha_hora: string
  nivel: NivelAlerta
  destinatario: string
  estado: EstadoAlerta
  datos_adicionales?: {
    id_obra?: number
    nombre_obra?: string
    id_partida?: number
    nombre_partida?: string
    usuario?: string
    archivo?: string
    porcentaje?: number
    rol_usuario?: string
  }
}

interface NotifConfig {
  notif_actividad_recordatorio: boolean
  notif_obra_recordatorio: boolean
  notif_cambio_estado: boolean
  notif_automaticas: boolean
}

interface NotifEstadisticas {
  correos_enviados_hoy: number
  correos_enviados_semana: number
  ultimo_envio: string | null
}

const NIVEL_CONFIG: Record<NivelAlerta, { color: string; icon: React.ReactNode; label: string }> = {
  'BAJA': { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Info className="h-4 w-4" />, label: 'Baja' },
  'MEDIA': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Bell className="h-4 w-4" />, label: 'Media' },
  'ALTA': { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: <AlertTriangle className="h-4 w-4" />, label: 'Alta' },
  'CRITICA': { color: 'bg-red-100 text-red-800 border-red-300', icon: <BellRing className="h-4 w-4" />, label: 'Crítica' }
}

const TIPO_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  'ARCHIVO_SUBIDO': { icon: <FileUp className="h-4 w-4" />, label: 'Archivo Subido', color: 'text-blue-600' },
  'PARTIDA_COMPLETA': { icon: <Layers className="h-4 w-4" />, label: 'Partida al 100%', color: 'text-emerald-600' },
  'OBRA_CULMINADA': { icon: <Building2 className="h-4 w-4" />, label: 'Obra Culminada', color: 'text-purple-600' },
  'RECORDATORIO_ACTIVIDAD': { icon: <Clock className="h-4 w-4" />, label: 'Recordatorio', color: 'text-amber-600' },
  'RECORDATORIO_OBRA': { icon: <CalendarClock className="h-4 w-4" />, label: 'Recordatorio Obra', color: 'text-red-600' },
  'SISTEMA': { icon: <Info className="h-4 w-4" />, label: 'Sistema', color: 'text-gray-600' }
}

const ESTADO_CONFIG: Record<EstadoAlerta, { color: string; label: string }> = {
  'ACTIVA': { color: 'bg-red-100 text-red-800', label: 'Activa' },
  'REVISADA': { color: 'bg-yellow-100 text-yellow-800', label: 'Revisada' },
  'CERRADA': { color: 'bg-green-100 text-green-800', label: 'Cerrada' }
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterNivel, setFilterNivel] = useState<string>('TODOS')
  const [filterEstado, setFilterEstado] = useState<string>('ACTIVA')
  const [filterTipo, setFilterTipo] = useState<string>('TODOS')
  
  const [viewDialog, setViewDialog] = useState(false)
  const [selectedAlerta, setSelectedAlerta] = useState<Alerta | null>(null)
  const [updating, setUpdating] = useState(false)

  // Estados para configuración de notificaciones
  const [configDialog, setConfigDialog] = useState(false)
  const [notifConfig, setNotifConfig] = useState<NotifConfig>({
    notif_actividad_recordatorio: true,
    notif_obra_recordatorio: true,
    notif_cambio_estado: true,
    notif_automaticas: true
  })
  const [notifEstadisticas, setNotifEstadisticas] = useState<NotifEstadisticas>({
    correos_enviados_hoy: 0,
    correos_enviados_semana: 0,
    ultimo_envio: null
  })
  const [brevoConfigurado, setBrevoConfigurado] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  
  // Estados para envío de prueba
  const [testDialog, setTestDialog] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  
  // Estado para ejecutar CRON manualmente
  const [runningCron, setRunningCron] = useState(false)

  const fetchAlertas = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterEstado !== 'TODOS') params.append('estado', filterEstado)
      if (filterNivel !== 'TODOS') params.append('nivel', filterNivel)
      if (filterTipo !== 'TODOS') params.append('tipo', filterTipo)
      
      const response = await fetch(`/api/admin/alertas?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setAlertas(data.alertas || [])
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar alertas')
    } finally {
      setLoading(false)
    }
  }, [filterEstado, filterNivel, filterTipo])

  const fetchNotifConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notificaciones/config')
      if (response.ok) {
        const data = await response.json()
        setNotifConfig(data.config)
        setNotifEstadisticas(data.estadisticas)
        setBrevoConfigurado(data.brevo_configurado)
      }
    } catch (error) {
      console.error('Error cargando config:', error)
    }
  }, [])

  useEffect(() => { 
    fetchAlertas()
    fetchNotifConfig()
  }, [fetchAlertas, fetchNotifConfig])

  const handleMarcarRevisada = async (alerta: Alerta) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/alertas/${alerta.id_alerta}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'REVISADA' })
      })
      if (!response.ok) throw new Error('Error al actualizar')
      toast.success('Alerta marcada como revisada')
      fetchAlertas()
    } catch { toast.error('Error al actualizar alerta') }
    finally { setUpdating(false) }
  }

  const handleCerrar = async (alerta: Alerta) => {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/alertas/${alerta.id_alerta}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'CERRADA' })
      })
      if (!response.ok) throw new Error('Error al actualizar')
      toast.success('Alerta cerrada')
      fetchAlertas()
      setViewDialog(false)
    } catch { toast.error('Error al cerrar alerta') }
    finally { setUpdating(false) }
  }

  const handleMarcarTodasLeidas = async () => {
    setUpdating(true)
    try {
      const response = await fetch('/api/admin/alertas/marcar-leidas', { method: 'POST' })
      if (!response.ok) throw new Error('Error')
      toast.success('Todas las alertas marcadas como revisadas')
      fetchAlertas()
    } catch { toast.error('Error al actualizar alertas') }
    finally { setUpdating(false) }
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      const response = await fetch('/api/admin/notificaciones/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: notifConfig })
      })
      if (!response.ok) throw new Error('Error')
      toast.success('Configuración guardada')
      setConfigDialog(false)
    } catch { toast.error('Error al guardar configuración') }
    finally { setSavingConfig(false) }
  }

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Ingrese un correo electrónico')
      return
    }
    
    setSendingTest(true)
    try {
      const response = await fetch('/api/admin/notificaciones/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tipo: 'TEST', 
          datos: { email: testEmail } 
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success('Correo de prueba enviado')
        setTestDialog(false)
        setTestEmail('')
        fetchNotifConfig()
      } else {
        toast.error(data.error || 'Error al enviar correo')
      }
    } catch { toast.error('Error al enviar correo de prueba') }
    finally { setSendingTest(false) }
  }

  const handleRunCron = async () => {
    setRunningCron(true)
    try {
      const response = await fetch('/api/admin/notificaciones/cron?secret=sio-undac-cron-2024', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Proceso completado: ${data.resultados.actividades_recordadas} actividades, ${data.resultados.obras_recordadas} obras notificadas`)
        fetchAlertas()
        fetchNotifConfig()
      } else {
        toast.error(data.error || 'Error en el proceso')
      }
    } catch { toast.error('Error al ejecutar recordatorios') }
    finally { setRunningCron(false) }
  }

  const getNivelBadge = (nivel: NivelAlerta) => {
    const config = NIVEL_CONFIG[nivel]
    return <Badge className={`${config.color} border flex items-center gap-1`}>{config.icon}{config.label}</Badge>
  }

  const getEstadoBadge = (estado: EstadoAlerta) => {
    const config = ESTADO_CONFIG[estado]
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getTipoIcon = (tipo: string) => {
    const config = TIPO_CONFIG[tipo] || TIPO_CONFIG['SISTEMA']
    return <span className={`${config.color} flex items-center gap-1`}>{config.icon}<span className="text-sm">{config.label}</span></span>
  }

  const filteredAlertas = alertas.filter(a => a.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))

  const contadores = {
    total: alertas.length,
    activas: alertas.filter(a => a.estado === 'ACTIVA').length,
    revisadas: alertas.filter(a => a.estado === 'REVISADA').length,
    cerradas: alertas.filter(a => a.estado === 'CERRADA').length,
    criticas: alertas.filter(a => a.nivel === 'CRITICA' && a.estado === 'ACTIVA').length
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Alertas</h1>
          <p className="text-muted-foreground">
            Notificaciones del sistema y configuración de correos automáticos
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchAlertas}>
            <RefreshCw className="mr-2 h-4 w-4" />Actualizar
          </Button>
          <Button variant="outline" onClick={() => setConfigDialog(true)}>
            <Settings className="mr-2 h-4 w-4" />Configurar Notificaciones
          </Button>
          <Button onClick={handleMarcarTodasLeidas} disabled={updating || contadores.activas === 0}>
            <Check className="mr-2 h-4 w-4" />Marcar todas como leídas
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="alertas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alertas" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas
            {contadores.activas > 0 && (
              <Badge className="ml-1 bg-red-500 text-white">{contadores.activas}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notificaciones" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Notificaciones por Correo
          </TabsTrigger>
        </TabsList>

        {/* Tab: Alertas */}
        <TabsContent value="alertas" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${filterEstado === 'ACTIVA' ? 'ring-2 ring-red-400' : ''}`} onClick={() => setFilterEstado('ACTIVA')}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{contadores.activas}</div>
                  <p className="text-xs text-muted-foreground">Activas</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${filterEstado === 'REVISADA' ? 'ring-2 ring-yellow-400' : ''}`} onClick={() => setFilterEstado('REVISADA')}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{contadores.revisadas}</div>
                  <p className="text-xs text-muted-foreground">Revisadas</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${filterEstado === 'CERRADA' ? 'ring-2 ring-green-400' : ''}`} onClick={() => setFilterEstado('CERRADA')}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{contadores.cerradas}</div>
                  <p className="text-xs text-muted-foreground">Cerradas</p>
                </div>
              </CardContent>
            </Card>
            <Card className={`cursor-pointer hover:shadow-md transition-shadow ${filterNivel === 'CRITICA' ? 'ring-2 ring-red-600' : ''}`} onClick={() => setFilterNivel(filterNivel === 'CRITICA' ? 'TODOS' : 'CRITICA')}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-700">{contadores.criticas}</div>
                  <p className="text-xs text-muted-foreground">Críticas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setFilterEstado('TODOS'); setFilterNivel('TODOS'); setFilterTipo('TODOS') }}>
              <CardContent className="pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{contadores.total}</div>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Alertas */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Notificaciones</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      <SelectItem value="ACTIVA">Activa</SelectItem>
                      <SelectItem value="REVISADA">Revisada</SelectItem>
                      <SelectItem value="CERRADA">Cerrada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterNivel} onValueChange={setFilterNivel}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Nivel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      <SelectItem value="BAJA">Baja</SelectItem>
                      <SelectItem value="MEDIA">Media</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="CRITICA">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-8 w-[200px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAlertas.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay alertas que mostrar</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Nivel</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlertas.map((alerta) => (
                      <TableRow key={alerta.id_alerta} className={alerta.estado === 'ACTIVA' ? 'bg-red-50' : ''}>
                        <TableCell>{getTipoIcon(alerta.tipo)}</TableCell>
                        <TableCell>
                          <p className="font-medium line-clamp-2">{alerta.descripcion}</p>
                        </TableCell>
                        <TableCell>{getNivelBadge(alerta.nivel)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(alerta.fecha_hora), 'dd/MM/yyyy', { locale: es })}
                            <br />
                            <span className="text-muted-foreground">{format(new Date(alerta.fecha_hora), 'HH:mm', { locale: es })}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getEstadoBadge(alerta.estado)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setSelectedAlerta(alerta); setViewDialog(true) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {alerta.estado === 'ACTIVA' && (
                              <Button variant="ghost" size="icon" onClick={() => handleMarcarRevisada(alerta)} disabled={updating}>
                                <Check className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            {alerta.estado !== 'CERRADA' && (
                              <Button variant="ghost" size="icon" onClick={() => handleCerrar(alerta)} disabled={updating}>
                                <X className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Notificaciones por Correo */}
        <TabsContent value="notificaciones" className="space-y-4">
          {/* Estado de Brevo */}
          <Card className={brevoConfigurado ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${brevoConfigurado ? 'bg-green-100' : 'bg-red-100'}`}>
                    <Mail className={`h-5 w-5 ${brevoConfigurado ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                  <div>
                    <p className="font-semibold">{brevoConfigurado ? 'Brevo Configurado' : 'Brevo No Configurado'}</p>
                    <p className="text-sm text-muted-foreground">
                      {brevoConfigurado ? 'El servicio de correo está listo para usar' : 'Configure BREVO_API_KEY en las variables de entorno'}
                    </p>
                  </div>
                </div>
                {brevoConfigurado && (
                  <Button variant="outline" onClick={() => setTestDialog(true)}>
                    <TestTube className="mr-2 h-4 w-4" />
                    Enviar Correo de Prueba
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas de correos */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Correos Enviados Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notifEstadisticas.correos_enviados_hoy}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Correos Esta Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notifEstadisticas.correos_enviados_semana}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Último Envío</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg">
                  {notifEstadisticas.ultimo_envio 
                    ? format(new Date(notifEstadisticas.ultimo_envio), "dd/MM/yyyy HH:mm", { locale: es })
                    : 'Nunca'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuración de Notificaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de Notificaciones Automáticas
              </CardTitle>
              <CardDescription>
                Configure qué notificaciones se envían automáticamente por correo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Switch Master */}
              <div className="flex items-center justify-between p-4 bg-slate-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <Power className={`h-5 w-5 ${notifConfig.notif_automaticas ? 'text-green-600' : 'text-gray-400'}`} />
                  <div>
                    <p className="font-semibold">Notificaciones Automáticas</p>
                    <p className="text-sm text-muted-foreground">Activa o desactiva todas las notificaciones automáticas</p>
                  </div>
                </div>
                <Switch 
                  checked={notifConfig.notif_automaticas} 
                  onCheckedChange={(checked) => setNotifConfig({...notifConfig, notif_automaticas: checked})}
                />
              </div>

              {/* Tipos de notificación */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className={!notifConfig.notif_automaticas ? 'opacity-50' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">Recordatorio de Actividades</p>
                          <p className="text-sm text-muted-foreground">1 día antes de la fecha fin</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifConfig.notif_actividad_recordatorio} 
                        onCheckedChange={(checked) => setNotifConfig({...notifConfig, notif_actividad_recordatorio: checked})}
                        disabled={!notifConfig.notif_automaticas}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className={!notifConfig.notif_automaticas ? 'opacity-50' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">Recordatorio de Obras</p>
                          <p className="text-sm text-muted-foreground">1 día antes de fecha fin</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifConfig.notif_obra_recordatorio} 
                        onCheckedChange={(checked) => setNotifConfig({...notifConfig, notif_obra_recordatorio: checked})}
                        disabled={!notifConfig.notif_automaticas}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className={!notifConfig.notif_automaticas ? 'opacity-50' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">Cambio de Estado</p>
                          <p className="text-sm text-muted-foreground">Al cambiar estado de obra</p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifConfig.notif_cambio_estado} 
                        onCheckedChange={(checked) => setNotifConfig({...notifConfig, notif_cambio_estado: checked})}
                        disabled={!notifConfig.notif_automaticas}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={handleRunCron} disabled={runningCron || !brevoConfigurado}>
                  {runningCron ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Ejecutar Recordatorios Ahora
                </Button>
                <Button onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Guardar Configuración
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Información adicional */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <h4 className="font-semibold text-blue-800 mb-2">ℹ️ ¿Cómo funcionan los recordatorios automáticos?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Los recordatorios se envían 1 día antes de la fecha de vencimiento</li>
                <li>• Se envían al correo del responsable de la obra</li>
                <li>• Para automatizar completamente, configure un CRON job que llame a <code className="bg-blue-100 px-1 rounded">/api/admin/notificaciones/cron</code> diariamente</li>
                <li>• También puede ejecutar los recordatorios manualmente con el botón Ejecutar Recordatorios Ahora</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Ver Alerta */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAlerta && getTipoIcon(selectedAlerta.tipo)}
            </DialogTitle>
          </DialogHeader>
          {selectedAlerta && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedAlerta.descripcion}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nivel</p>
                  {getNivelBadge(selectedAlerta.nivel)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getEstadoBadge(selectedAlerta.estado)}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha y hora</p>
                <p className="font-medium">
                  {format(new Date(selectedAlerta.fecha_hora), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialog(false)}>Cerrar</Button>
            {selectedAlerta && selectedAlerta.estado !== 'CERRADA' && (
              <Button onClick={() => handleCerrar(selectedAlerta)} disabled={updating} className="bg-red-600 hover:bg-red-700">
                {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cerrar Alerta
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Enviar Correo de Prueba */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-blue-600" />
              Enviar Correo de Prueba
            </DialogTitle>
            <DialogDescription>
              Envíe un correo de prueba para verificar la configuración de Brevo
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="test-email">Correo electrónico</Label>
            <Input 
              id="test-email"
              type="email" 
              placeholder="ejemplo@correo.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(false)}>Cancelar</Button>
            <Button onClick={handleSendTestEmail} disabled={sendingTest || !testEmail}>
              {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar Prueba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Configuración (por si se necesita más adelante) */}
      <Dialog open={configDialog} onOpenChange={setConfigDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración de Notificaciones
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Use la pestaña Notificaciones por Correo para configurar las opciones de envío automático.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setConfigDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}