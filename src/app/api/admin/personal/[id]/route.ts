// src/app/api/admin/personal/[id]/route.ts
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

    const personal = await prisma.personal.findUnique({
      where: { id_personal: parseInt(id) },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            usuario: true,
            rol: { select: { nombre: true } }
          }
        },
        roles_asignados: {
          include: {
            proyecto: { select: { nombre_obra: true } }
          }
        }
      }
    })

    if (!personal) {
      return NextResponse.json({ error: 'Personal no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ personal })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 })
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
    const { nombre, fecha_nacimiento, correo, telefono, cargo, area, titulo, especialidad, experiencia } = body

    const dataToUpdate: Record<string, unknown> = {}
    if (nombre) dataToUpdate.nombre = nombre
    if (fecha_nacimiento) dataToUpdate.fecha_nacimiento = new Date(fecha_nacimiento)
    if (correo) dataToUpdate.correo = correo
    if (telefono !== undefined) dataToUpdate.telefono = telefono || null
    if (cargo) dataToUpdate.cargo = cargo
    if (area) dataToUpdate.area = area
    if (titulo !== undefined) dataToUpdate.titulo = titulo || null
    if (especialidad !== undefined) dataToUpdate.especialidad = especialidad || null
    if (experiencia !== undefined) dataToUpdate.experiencia = experiencia || null

    const personal = await prisma.personal.update({
      where: { id_personal: parseInt(id) },
      data: dataToUpdate
    })

    return NextResponse.json({ personal })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar personal' }, { status: 500 })
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

    // Verificar si tiene usuario asociado
    const personal = await prisma.personal.findUnique({
      where: { id_personal: parseInt(id) },
      include: { usuario: true }
    })

    if (personal?.usuario) {
      // Eliminar usuario asociado primero
      await prisma.usuario.delete({
        where: { id_usuario: personal.usuario.id_usuario }
      })
    }

    await prisma.personal.delete({
      where: { id_personal: parseInt(id) }
    })

    return NextResponse.json({ message: 'Personal eliminado' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar personal' }, { status: 500 })
  }
}
