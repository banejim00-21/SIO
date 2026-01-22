// src/app/api/admin/obras/[id]/partidas/[partidaId]/actividades/[actividadId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidaId: string; actividadId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, actividadId } = await params
    const obraId = parseInt(id)

    // Usar modelo ActividadPartida
    const actividad = await prisma.actividadPartida.findUnique({
      where: { id_actividad: parseInt(actividadId) },
      include: {
        partida: {
          select: { nombre_partida: true }
        }
      }
    })

    if (!actividad) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
    }

    // Obtener archivos de esta actividad
    const archivos = await prisma.documento.findMany({
      where: {
        id_obra: obraId,
        estado: 'VIGENTE',
        ruta_archivo: { contains: `/actividad_${actividadId}/` }
      },
      include: { carpeta_tipo: true },
      orderBy: { fecha_carga: 'desc' }
    })

    return NextResponse.json({
      actividad: {
        ...actividad,
        archivos
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener actividad' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidaId: string; actividadId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, actividadId } = await params
    const obraId = parseInt(id)
    const body = await request.json()

    const { nombre_actividad, descripcion, fecha_inicio, fecha_fin } = body

    const dataToUpdate: Record<string, unknown> = {}
    if (nombre_actividad) dataToUpdate.nombre_actividad = nombre_actividad
    if (descripcion !== undefined) dataToUpdate.descripcion = descripcion
    if (fecha_inicio) dataToUpdate.fecha_inicio = new Date(fecha_inicio)
    if (fecha_fin) dataToUpdate.fecha_fin = new Date(fecha_fin)

    // Usar modelo ActividadPartida
    const actividad = await prisma.actividadPartida.update({
      where: { id_actividad: parseInt(actividadId) },
      data: dataToUpdate
    })

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Actualizar actividad: ${actividad.nombre_actividad}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ actividad })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar actividad' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidaId: string; actividadId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, actividadId } = await params
    const obraId = parseInt(id)

    // Usar modelo ActividadPartida
    const actividad = await prisma.actividadPartida.findUnique({
      where: { id_actividad: parseInt(actividadId) }
    })

    if (!actividad) {
      return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
    }

    // Marcar documentos asociados como anulados (soft delete)
    await prisma.documento.updateMany({
      where: {
        id_obra: obraId,
        ruta_archivo: { contains: `/actividad_${actividadId}/` }
      },
      data: { estado: 'ANULADO' }
    })

    // Eliminar actividad
    await prisma.actividadPartida.delete({
      where: { id_actividad: parseInt(actividadId) }
    })

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Eliminar actividad: ${actividad.nombre_actividad}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ message: 'Actividad eliminada' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar actividad' }, { status: 500 })
  }
}
