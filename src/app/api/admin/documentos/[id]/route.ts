// src/app/api/admin/documentos/[id]/route.ts
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

    const documento = await prisma.documento.findUnique({
      where: { id_documento: parseInt(id) },
      include: {
        obra: { select: { id_obra: true, nombre_obra: true } },
        carpeta_tipo: { select: { id_carpeta_tipo: true, codigo: true, nombre_carpeta: true } },
        usuario: { select: { nombre: true } }
      }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ documento })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener documento' }, { status: 500 })
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

    const documento = await prisma.documento.findUnique({
      where: { id_documento: parseInt(id) }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Cambiar estado a ANULADO
    await prisma.documento.update({
      where: { id_documento: parseInt(id) },
      data: { estado: 'ANULADO' }
    })

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: `Eliminar documento: ${documento.nombre_archivo}`,
        id_obra: documento.id_obra,
        resultado: 'Éxito'
      }
    })

    return NextResponse.json({ message: 'Documento eliminado' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar documento' }, { status: 500 })
  }
}
