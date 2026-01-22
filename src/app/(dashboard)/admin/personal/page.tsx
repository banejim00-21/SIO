// src/app/(dashboard)/admin/personal/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Eye, Edit, Trash2, Phone, Mail, Loader2, Calendar as CalendarIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type AreaPersonal = 'INFRAESTRUCTURA' | 'MANTENIMIENTO' | 'LIQUIDACION' | 'ESTUDIO' | 'ADMINISTRACION'

interface Personal {
  id_personal: number
  dni: string
  nombre: string
  fecha_nacimiento: string
  correo: string
  telefono: string | null
  cargo: string
  area: AreaPersonal
  titulo: string | null
  especialidad: string | null
  experiencia: string | null
  fecha_registro: string
  usuario: {
    id_usuario: number
    usuario: string
    rol: { nombre: string }
  } | null
  roles_asignados: Array<{
    id_rol_asignado: number
    proyecto: { nombre_obra: string } | null
  }>
}

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterArea, setFilterArea] = useState<string>('TODAS')
  
  const [openDialog, setOpenDialog] = useState(false)
  const [editingPersonal, setEditingPersonal] = useState<Personal | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [personalToDelete, setPersonalToDelete] = useState<Personal | null>(null)
  
  const [date, setDate] = useState<Date>()
  
  const [formData, setFormData] = useState({
    dni: '',
    nombre: '',
    fecha_nacimiento: '',
    correo: '',
    telefono: '',
    cargo: '',
    area: '',
    titulo: '',
    especialidad: '',
    experiencia: ''
  })

  useEffect(() => {
    fetchPersonal()
  }, [])

  const fetchPersonal = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/personal')
      const data = await response.json()
      setPersonal(data.personal || [])
    } catch (error) {
      console.error('Error al cargar personal:', error)
      toast.error('No se pudo cargar el personal')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (p?: Personal) => {
    if (p) {
      setEditingPersonal(p)
      setFormData({
        dni: p.dni,
        nombre: p.nombre,
        fecha_nacimiento: p.fecha_nacimiento,
        correo: p.correo,
        telefono: p.telefono || '',
        cargo: p.cargo,
        area: p.area,
        titulo: p.titulo || '',
        especialidad: p.especialidad || '',
        experiencia: p.experiencia || ''
      })
      setDate(new Date(p.fecha_nacimiento))
    } else {
      setEditingPersonal(null)
      setFormData({
        dni: '',
        nombre: '',
        fecha_nacimiento: '',
        correo: '',
        telefono: '',
        cargo: '',
        area: '',
        titulo: '',
        especialidad: '',
        experiencia: ''
      })
      setDate(undefined)
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (!date) {
        throw new Error('Debe seleccionar una fecha de nacimiento')
      }

      const url = editingPersonal 
        ? `/api/admin/personal/${editingPersonal.id_personal}`
        : '/api/admin/personal'
      
      const method = editingPersonal ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          fecha_nacimiento: format(date, 'yyyy-MM-dd'),
          telefono: formData.telefono || null,
          titulo: formData.titulo || null,
          especialidad: formData.especialidad || null,
          experiencia: formData.experiencia || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar personal')
      }

      toast.success(`Personal ${editingPersonal ? 'actualizado' : 'registrado'} correctamente`)

      setOpenDialog(false)
      fetchPersonal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar personal')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!personalToDelete) return

    try {
      const response = await fetch(`/api/admin/personal/${personalToDelete.id_personal}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar personal')
      }

      toast.success('Personal eliminado correctamente')

      setDeleteDialogOpen(false)
      setPersonalToDelete(null)
      fetchPersonal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar personal')
    }
  }

  const filteredPersonal = personal.filter(p => {
    const matchesSearch = 
      p.dni.includes(searchTerm) ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.correo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesArea = filterArea === 'TODAS' || p.area === filterArea
    
    return matchesSearch && matchesArea
  })

  const stats = {
    total: personal.length,
    infraestructura: personal.filter(p => p.area === 'INFRAESTRUCTURA').length,
    mantenimiento: personal.filter(p => p.area === 'MANTENIMIENTO').length,
    liquidacion: personal.filter(p => p.area === 'LIQUIDACION').length,
    estudio: personal.filter(p => p.area === 'ESTUDIO').length,
    administracion: personal.filter(p => p.area === 'ADMINISTRACION').length,
    conUsuario: personal.filter(p => p.usuario !== null).length
  }

  const getAreaVariant = (area: AreaPersonal): "default" | "secondary" | "outline" => {
    const variants: Record<AreaPersonal, "default" | "secondary" | "outline"> = {
      'INFRAESTRUCTURA': 'default',
      'MANTENIMIENTO': 'secondary',
      'LIQUIDACION': 'outline',
      'ESTUDIO': 'outline',
      'ADMINISTRACION': 'secondary'
    }
    return variants[area]
  }

  const formatArea = (area: AreaPersonal): string => {
    const areas: Record<AreaPersonal, string> = {
      'INFRAESTRUCTURA': 'Infraestructura',
      'MANTENIMIENTO': 'Mantenimiento',
      'LIQUIDACION': 'Liquidación',
      'ESTUDIO': 'Estudio',
      'ADMINISTRACION': 'Administración'
    }
    return areas[area]
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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-muted-foreground">
            Administra el personal técnico y administrativo
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Personal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingPersonal ? 'Editar Personal' : 'Registrar Nuevo Personal'}
                </DialogTitle>
                <DialogDescription>
                  {editingPersonal 
                    ? 'Modifica los datos del personal' 
                    : 'Completa la información para registrar nuevo personal'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* Datos Generales */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-sm mb-3">Datos Generales</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dni">DNI *</Label>
                      <Input
                        id="dni"
                        value={formData.dni}
                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                        placeholder="12345678"
                        maxLength={20}
                        required
                        disabled={!!editingPersonal}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre Completo *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Juan Pérez García"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fecha de Nacimiento *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal ${!date && 'text-muted-foreground'}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, 'PPP', { locale: es }) : 'Selecciona una fecha'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={es}
                            initialFocus
                            fromYear={1950}
                            toYear={2010}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="correo">Correo Electrónico *</Label>
                      <Input
                        id="correo"
                        type="email"
                        value={formData.correo}
                        onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                        placeholder="correo@undac.edu.pe"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="987654321"
                        maxLength={20}
                      />
                    </div>
                  </div>
                </div>

                {/* Datos Laborales */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-sm mb-3">Datos Laborales</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo *</Label>
                      <Input
                        id="cargo"
                        value={formData.cargo}
                        onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                        placeholder="Ingeniero Civil"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="area">Área *</Label>
                      <Select
                        value={formData.area}
                        onValueChange={(value) => setFormData({ ...formData, area: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un área" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INFRAESTRUCTURA">Infraestructura</SelectItem>
                          <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                          <SelectItem value="LIQUIDACION">Liquidación</SelectItem>
                          <SelectItem value="ESTUDIO">Estudio</SelectItem>
                          <SelectItem value="ADMINISTRACION">Administración</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Información Profesional */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Información Profesional (Opcional)</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="titulo">Título Profesional</Label>
                      <Input
                        id="titulo"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        placeholder="Ingeniero Civil"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="especialidad">Especialidad</Label>
                      <Input
                        id="especialidad"
                        value={formData.especialidad}
                        onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                        placeholder="Estructuras"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experiencia">Experiencia</Label>
                      <Textarea
                        id="experiencia"
                        value={formData.experiencia}
                        onChange={(e) => setFormData({ ...formData, experiencia: e.target.value })}
                        placeholder="Describa la experiencia laboral relevante..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    editingPersonal ? 'Actualizar Personal' : 'Registrar Personal'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Personal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.infraestructura}</div>
            <p className="text-xs text-muted-foreground">Infraestructura</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.mantenimiento}</div>
            <p className="text-xs text-muted-foreground">Mantenimiento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.liquidacion}</div>
            <p className="text-xs text-muted-foreground">Liquidación</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-amber-600">{stats.estudio}</div>
            <p className="text-xs text-muted-foreground">Estudio</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{stats.conUsuario}</div>
            <p className="text-xs text-muted-foreground">Con Usuario</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y Búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista de Personal</CardTitle>
              <CardDescription>
                {filteredPersonal.length} miembros del personal registrados
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas las áreas</SelectItem>
                  <SelectItem value="INFRAESTRUCTURA">Infraestructura</SelectItem>
                  <SelectItem value="MANTENIMIENTO">Mantenimiento</SelectItem>
                  <SelectItem value="LIQUIDACION">Liquidación</SelectItem>
                  <SelectItem value="ESTUDIO">Estudio</SelectItem>
                  <SelectItem value="ADMINISTRACION">Administración</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar personal..."
                  className="pl-8 w-full sm:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Proyectos</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonal.map((p) => (
                <TableRow key={p.id_personal}>
                  <TableCell className="font-medium">{p.dni}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-semibold">{p.nombre}</p>
                      {p.titulo && (
                        <p className="text-xs text-muted-foreground">{p.titulo}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.cargo}</TableCell>
                  <TableCell>
                    <Badge variant={getAreaVariant(p.area)}>
                      {formatArea(p.area)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{p.correo}</span>
                      </div>
                      {p.telefono && (
                        <div className="flex items-center gap-1 text-xs">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{p.telefono}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.usuario ? (
                      <Badge variant="default" className="text-xs">
                        {p.usuario.usuario}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        Sin usuario
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.roles_asignados.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenDialog(p)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-600"
                        onClick={() => {
                          setPersonalToDelete(p)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente a{' '}
              <strong>{personalToDelete?.nombre}</strong> (DNI: {personalToDelete?.dni})
              {personalToDelete?.usuario && ' y su usuario asociado'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar Personal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
