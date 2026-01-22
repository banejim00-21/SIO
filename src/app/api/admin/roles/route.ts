// src/app/api/admin/roles/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const roles = await prisma.rol.findMany({
      include: {
        usuarios: { select: { id_usuario: true } },
        permisos: {
          include: {
            permiso: { select: { id_permiso: true, nombre: true, modulo: true } }
          }
        }
      },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener roles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { nombre, descripcion } = body

    if (!nombre) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const rol = await prisma.rol.create({
      data: {
        nombre: nombre.toUpperCase(),
        descripcion: descripcion || null
      }
    })

    return NextResponse.json({ rol }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al crear rol' }, { status: 500 })
  }
}
