// src/app/api/admin/dashboard/reportes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener un reporte específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const docId = parseInt(id)

    const documento = await prisma.documento.findUnique({
      where: { id_documento: docId },
      include: {
        usuario: { select: { nombre: true } },
        obra: { select: { nombre_obra: true } }
      }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ documento })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener reporte' }, { status: 500 })
  }
}

// DELETE - Eliminar reporte
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const docId = parseInt(id)

    const documento = await prisma.documento.findUnique({
      where: { id_documento: docId }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // Eliminar de Supabase Storage
    try {
      const urlParts = documento.ruta_archivo.split('/documentos/')
      if (urlParts[1]) {
        const pathToDelete = decodeURIComponent(urlParts[1])
        await supabaseAdmin.storage.from('documentos').remove([pathToDelete])
      }
    } catch (e) {
      console.error('Error eliminando de storage:', e)
    }

    // Marcar como anulado en BD
    await prisma.documento.update({
      where: { id_documento: docId },
      data: { estado: 'ANULADO' }
    })

    // Log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'REPORTES',
          accion: `Eliminar reporte: ${documento.nombre_archivo}`,
          id_obra: documento.id_obra,
          resultado: 'Exito'
        }
      })
    } catch (e) {}

    return NextResponse.json({ message: 'Reporte eliminado correctamente' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar reporte' }, { status: 500 })
  }
}
