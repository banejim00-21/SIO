// src/app/api/admin/personal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const personal = await prisma.personal.findMany({
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
      },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ personal })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener personal' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { dni, nombre, fecha_nacimiento, correo, telefono, cargo, area, titulo, especialidad, experiencia } = body

    if (!dni || !nombre || !fecha_nacimiento || !correo || !cargo || !area) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Verificar si el DNI ya existe
    const existente = await prisma.personal.findUnique({
      where: { dni }
    })

    if (existente) {
      return NextResponse.json({ error: 'Ya existe personal con ese DNI' }, { status: 400 })
    }

    const nuevoPersonal = await prisma.personal.create({
      data: {
        dni,
        nombre,
        fecha_nacimiento: new Date(fecha_nacimiento),
        correo,
        telefono: telefono || null,
        cargo,
        area,
        titulo: titulo || null,
        especialidad: especialidad || null,
        experiencia: experiencia || null
      }
    })

    return NextResponse.json({ personal: nuevoPersonal }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al crear personal' }, { status: 500 })
  }
}
