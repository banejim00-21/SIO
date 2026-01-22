// src/app/api/admin/usuarios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

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

    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: parseInt(id) },
      include: {
        rol: { select: { id_rol: true, nombre: true } },
        personal: { select: { dni: true, nombre: true, correo: true } }
      }
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ usuario })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener usuario' }, { status: 500 })
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
    const { usuario, clave, id_rol, nombre, correo } = body

    const dataToUpdate: Record<string, unknown> = {}
    if (usuario) dataToUpdate.usuario = usuario
    if (nombre) dataToUpdate.nombre = nombre
    if (correo) dataToUpdate.correo = correo
    if (id_rol) dataToUpdate.id_rol = parseInt(id_rol)
    if (clave) dataToUpdate.clave = await bcrypt.hash(clave, 10)

    const usuarioActualizado = await prisma.usuario.update({
      where: { id_usuario: parseInt(id) },
      data: dataToUpdate,
      include: {
        rol: { select: { id_rol: true, nombre: true } },
        personal: { select: { dni: true } }
      }
    })

    return NextResponse.json({ usuario: usuarioActualizado })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
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

    await prisma.usuario.delete({
      where: { id_usuario: parseInt(id) }
    })

    return NextResponse.json({ message: 'Usuario eliminado' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}
