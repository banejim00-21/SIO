// src/app/api/admin/obras/[id]/archivos/[archivoId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener detalles de un documento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; archivoId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { archivoId } = await params

    const documento = await prisma.documento.findUnique({
      where: { id_documento: parseInt(archivoId) },
      include: {
        carpeta_tipo: true,
        obra: { select: { nombre_obra: true } },
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

// DELETE - Eliminar documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; archivoId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, archivoId } = await params
    const obraId = parseInt(id)
    const documentoId = parseInt(archivoId)

    const documento = await prisma.documento.findUnique({
      where: { id_documento: documentoId }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Extraer path del archivo en Storage desde la URL
    const urlParts = documento.ruta_archivo.split('/documentos/')
    if (urlParts.length > 1) {
      const storagePath = urlParts[1]
      
      // Intentar eliminar de Supabase Storage
      const { error: deleteError } = await supabaseAdmin.storage
        .from('documentos')
        .remove([storagePath])
      
      if (deleteError) {
        console.error('Error al eliminar archivo de Storage:', deleteError)
        // Continuamos aunque falle la eliminación del archivo físico
      }
    }

    // Marcar como eliminado en base de datos (soft delete)
    await prisma.documento.update({
      where: { id_documento: documentoId },
      data: { estado: 'ANULADO' }
    })

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: `Eliminar archivo: ${documento.nombre_archivo}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ message: 'Documento eliminado correctamente' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar documento' }, { status: 500 })
  }
}
