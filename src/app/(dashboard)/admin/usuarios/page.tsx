// src/app/(dashboard)/admin/usuarios/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Search, Edit, Trash2, Lock, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Usuario {
  id_usuario: number
  usuario: string
  nombre: string
  correo: string
  ultimo_acceso: string | null
  rol: {
    id_rol: number
    nombre: string
  }
  personal: {
    dni: string
  }
}

interface Rol {
  id_rol: number
  nombre: string
}

interface Personal {
  id_personal: number
  nombre: string
  dni: string
  correo: string
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [personal, setPersonal] = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Estados para crear/editar
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // Estados para eliminar
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Usuario | null>(null)
  
  // Form data
  const [formData, setFormData] = useState({
    id_personal: '',
    usuario: '',
    clave: '',
    nombre: '',
    correo: '',
    id_rol: ''
  })

  // Cargar datos iniciales
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [usuariosRes, rolesRes, personalRes] = await Promise.all([
        fetch('/api/admin/usuarios'),
        fetch('/api/admin/roles'),
        fetch('/api/admin/personal')
      ])

      const usuariosData = await usuariosRes.json()
      const rolesData = await rolesRes.json()
      const personalData = await personalRes.json()

      setUsuarios(usuariosData.usuarios || [])
      setRoles(rolesData.roles || [])
      setPersonal(personalData.personal || [])
    } catch (error) {
      console.error('Error al cargar datos:', error)
      toast.error('No se pudieron cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (user?: Usuario) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        id_personal: user.personal ? String(user.personal.dni) : '',
        usuario: user.usuario,
        clave: '',
        nombre: user.nombre,
        correo: user.correo,
        id_rol: String(user.rol.id_rol)
      })
    } else {
      setEditingUser(null)
      setFormData({
        id_personal: '',
        usuario: '',
        clave: '',
        nombre: '',
        correo: '',
        id_rol: ''
      })
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const personalSeleccionado = personal.find(p => p.id_personal === parseInt(formData.id_personal))
      
      const url = editingUser 
        ? `/api/admin/usuarios/${editingUser.id_usuario}`
        : '/api/admin/usuarios'
      
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id_personal: parseInt(formData.id_personal),
          id_rol: parseInt(formData.id_rol),
          nombre: personalSeleccionado?.nombre || formData.nombre
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar usuario')
      }

      toast.success(`Usuario ${editingUser ? 'actualizado' : 'creado'} correctamente`)

      setOpenDialog(false)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/admin/usuarios/${userToDelete.id_usuario}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar usuario')
      }

      toast.success('Usuario eliminado correctamente')

      setDeleteDialogOpen(false)
      setUserToDelete(null)
      fetchData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar usuario')
    }
  }

  const filteredUsuarios = usuarios.filter(u =>
    u.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.correo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const stats = {
    total: usuarios.length,
    activos24h: usuarios.filter(u => 
      u.ultimo_acceso && new Date(u.ultimo_acceso) > new Date(Date.now() - 24*60*60*1000)
    ).length,
    administradores: usuarios.filter(u => u.rol.nombre === 'ADMINISTRADOR').length,
    regulares: usuarios.filter(u => u.rol.nombre !== 'ADMINISTRADOR').length
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios del sistema y sus accesos
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </DialogTitle>
                <DialogDescription>
                  {editingUser 
                    ? 'Modifica los datos del usuario' 
                    : 'Completa los datos para crear un nuevo usuario'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="id_personal">Personal *</Label>
                  <Select
                    value={formData.id_personal}
                    onValueChange={(value) => {
                      const p = personal.find(per => per.id_personal === parseInt(value))
                      setFormData({ 
                        ...formData, 
                        id_personal: value,
                        nombre: p?.nombre || '',
                        correo: p?.correo || ''
                      })
                    }}
                    disabled={!!editingUser}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona personal" />
                    </SelectTrigger>
                    <SelectContent>
                      {personal.map((p) => (
                        <SelectItem key={p.id_personal} value={String(p.id_personal)}>
                          {p.nombre} - {p.dni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usuario">Usuario *</Label>
                  <Input
                    id="usuario"
                    value={formData.usuario}
                    onChange={(e) => setFormData({ ...formData, usuario: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clave">
                    Contraseña {editingUser && '(dejar vacío para mantener)'}
                  </Label>
                  <Input
                    id="clave"
                    type="password"
                    value={formData.clave}
                    onChange={(e) => setFormData({ ...formData, clave: e.target.value })}
                    required={!editingUser}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="id_rol">Rol *</Label>
                  <Select
                    value={formData.id_rol}
                    onValueChange={(value) => setFormData({ ...formData, id_rol: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id_rol} value={String(r.id_rol)}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    editingUser ? 'Actualizar' : 'Crear Usuario'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Usuarios</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.activos24h}</div>
            <p className="text-xs text-muted-foreground">Activos (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.administradores}</div>
            <p className="text-xs text-muted-foreground">Administradores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{stats.regulares}</div>
            <p className="text-xs text-muted-foreground">Usuarios Regulares</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Usuarios */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>
                {filteredUsuarios.length} usuarios registrados
              </CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                className="pl-8 w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsuarios.map((usuario) => {
                const esActivo = usuario.ultimo_acceso && 
                  new Date(usuario.ultimo_acceso) > new Date(Date.now() - 24*60*60*1000)
                
                return (
                  <TableRow key={usuario.id_usuario}>
                    <TableCell className="font-medium">{usuario.usuario}</TableCell>
                    <TableCell>{usuario.nombre}</TableCell>
                    <TableCell>{usuario.correo}</TableCell>
                    <TableCell>
                      <Badge variant={usuario.rol.nombre === 'ADMINISTRADOR' ? 'default' : 'secondary'}>
                        {usuario.rol.nombre}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {usuario.ultimo_acceso 
                        ? new Date(usuario.ultimo_acceso).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={esActivo ? 'default' : 'outline'}>
                        {esActivo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenDialog(usuario)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Lock className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-600"
                          onClick={() => {
                            setUserToDelete(usuario)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el usuario{' '}
              <strong>{userToDelete?.usuario}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
