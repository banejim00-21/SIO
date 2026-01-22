// src/app/api/admin/roles/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    const rol = await prisma.rol.findUnique({
      where: { id_rol: parseInt(id) },
      include: {
        usuarios: { select: { id_usuario: true, nombre: true } },
        permisos: {
          include: {
            permiso: { select: { id_permiso: true, nombre: true, modulo: true, descripcion: true } }
          }
        }
      }
    })

    if (!rol) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ rol })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener rol' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { nombre, descripcion } = body

    const dataToUpdate: Record<string, unknown> = {}
    if (nombre) dataToUpdate.nombre = nombre.toUpperCase()
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion || null

    const rol = await prisma.rol.update({
      where: { id_rol: parseInt(id) },
      data: dataToUpdate
    })

    return NextResponse.json({ rol })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar rol' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    // Verificar si hay usuarios asignados
    const usuariosConRol = await prisma.usuario.count({
      where: { id_rol: parseInt(id) }
    })

    if (usuariosConRol > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el rol porque tiene usuarios asignados' 
      }, { status: 400 })
    }

    await prisma.rol.delete({
      where: { id_rol: parseInt(id) }
    })

    return NextResponse.json({ message: 'Rol eliminado' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar rol' }, { status: 500 })
  }
}
