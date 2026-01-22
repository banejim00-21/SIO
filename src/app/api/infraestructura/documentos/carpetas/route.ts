// src/app/api/infraestructura/documentos/carpetas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Listar carpetas tipo
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const carpetas = await prisma.carpetaTipo.findMany({
      orderBy: {
        orden: 'asc'
      },
      include: {
        _count: {
          select: {
            documentos: true
          }
        }
      }
    })

    return NextResponse.json({ carpetas })
  } catch (error) {
    console.error('Error al obtener carpetas:', error)
    return NextResponse.json(
      { error: 'Error al obtener carpetas' },
      { status: 500 }
    )
  }
}

// POST - Crear carpeta tipo (solo administrador)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { codigo, nombre_carpeta, descripcion, orden } = body

    if (!codigo || !nombre_carpeta || orden === undefined) {
      return NextResponse.json(
        { error: 'Código, nombre y orden son requeridos' },
        { status: 400 }
      )
    }

    const carpeta = await prisma.carpetaTipo.create({
      data: {
        codigo,
        nombre_carpeta,
        descripcion,
        orden
      }
    })

    return NextResponse.json({ carpeta }, { status: 201 })
  } catch (error) {
    console.error('Error al crear carpeta:', error)
    return NextResponse.json(
      { error: 'Error al crear carpeta' },
      { status: 500 }
    )
  }
}