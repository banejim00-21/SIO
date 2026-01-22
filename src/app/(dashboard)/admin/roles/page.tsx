// src/app/(dashboard)/admin/roles/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Shield, Users, Loader2 } from 'lucide-react'
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

interface Rol {
  id_rol: number
  nombre: string
  descripcion: string | null
  usuarios: Array<{ id_usuario: number }>
  permisos: Array<{
    id_permiso: number
    permiso: {
      id_permiso: number
      nombre: string
      modulo: string
    }
  }>
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<Rol | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Rol | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: ''
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/roles')
      const data = await response.json()
      setRoles(data.roles || [])
    } catch (error) {
      console.error('Error al cargar roles:', error)
      toast.error('No se pudieron cargar los roles')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (role?: Rol) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        nombre: role.nombre,
        descripcion: role.descripcion || ''
      })
    } else {
      setEditingRole(null)
      setFormData({
        nombre: '',
        descripcion: ''
      })
    }
    setOpenDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const url = editingRole 
        ? `/api/admin/roles/${editingRole.id_rol}`
        : '/api/admin/roles'
      
      const method = editingRole ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar rol')
      }

      toast.success(`Rol ${editingRole ? 'actualizado' : 'creado'} correctamente`)

      setOpenDialog(false)
      fetchRoles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar rol')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!roleToDelete) return

    try {
      const response = await fetch(`/api/admin/roles/${roleToDelete.id_rol}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al eliminar rol')
      }

      toast.success('Rol eliminado correctamente')

      setDeleteDialogOpen(false)
      setRoleToDelete(null)
      fetchRoles()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar rol')
    }
  }

  const totalUsuarios = roles.reduce((acc, rol) => acc + rol.usuarios.length, 0)
  const totalPermisos = roles.reduce((acc, rol) => acc + rol.permisos.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Roles</h1>
          <p className="text-muted-foreground">
            Administra los roles y permisos del sistema
          </p>
        </div>
        
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
                </DialogTitle>
                <DialogDescription>
                  {editingRole 
                    ? 'Modifica los datos del rol' 
                    : 'Define un nuevo rol para el sistema'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Rol *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: SUPERVISOR, COORDINADOR"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Describe las responsabilidades del rol"
                    rows={3}
                  />
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
                    editingRole ? 'Actualizar' : 'Crear Rol'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">Total Roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">Usuarios Asignados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{totalPermisos}</div>
            <p className="text-xs text-muted-foreground">Total Permisos</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Roles */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((rol) => (
          <Card key={rol.id_rol} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{rol.nombre}</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {rol.descripcion || 'Sin descripción'}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Users className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600">Usuarios</p>
                    <p className="text-lg font-bold">{rol.usuarios.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <Shield className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600">Permisos</p>
                    <p className="text-lg font-bold">{rol.permisos.length}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Permisos asignados:</p>
                <div className="flex flex-wrap gap-1">
                  {rol.permisos.slice(0, 3).map((rp) => (
                    <Badge key={rp.id_permiso} variant="outline" className="text-xs">
                      {rp.permiso.nombre}
                    </Badge>
                  ))}
                  {rol.permisos.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{rol.permisos.length - 3} más
                    </Badge>
                  )}
                  {rol.permisos.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sin permisos asignados</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleOpenDialog(rol)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setRoleToDelete(rol)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el rol{' '}
              <strong>{roleToDelete?.nombre}</strong> y se removerá de todos los usuarios asignados.
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
