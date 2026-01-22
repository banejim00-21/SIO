// src/app/api/admin/usuarios/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const usuarios = await prisma.usuario.findMany({
      include: {
        rol: { select: { id_rol: true, nombre: true } },
        personal: { select: { dni: true } }
      },
      orderBy: { nombre: 'asc' }
    })

    return NextResponse.json({ usuarios })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id_personal, usuario, clave, id_rol } = body

    if (!id_personal || !usuario || !clave || !id_rol) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Verificar si el usuario ya existe
    const existente = await prisma.usuario.findFirst({
      where: { OR: [{ usuario }, { id_personal: parseInt(id_personal) }] }
    })

    if (existente) {
      return NextResponse.json({ error: 'El usuario o personal ya existe' }, { status: 400 })
    }

    // Obtener datos del personal
    const personal = await prisma.personal.findUnique({
      where: { id_personal: parseInt(id_personal) }
    })

    if (!personal) {
      return NextResponse.json({ error: 'Personal no encontrado' }, { status: 404 })
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(clave, 10)

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        id_personal: parseInt(id_personal),
        usuario,
        clave: hashedPassword,
        nombre: personal.nombre,
        correo: personal.correo,
        id_rol: parseInt(id_rol)
      },
      include: {
        rol: { select: { id_rol: true, nombre: true } },
        personal: { select: { dni: true } }
      }
    })

    return NextResponse.json({ usuario: nuevoUsuario }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
