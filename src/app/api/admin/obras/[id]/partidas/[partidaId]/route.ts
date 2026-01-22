// src/app/api/admin/obras/[id]/partidas/[partidaId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidaId: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { partidaId } = await params

    const partida = await prisma.partida.findUnique({
      where: { id_partida: parseInt(partidaId) },
      include: {
        actividades: {
          orderBy: { fecha_inicio: 'asc' }
        },
        gastos: {
          orderBy: { fecha_gasto: 'desc' }
        }
      }
    })

    if (!partida) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ partida })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener partida' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidaId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, partidaId } = await params
    const obraId = parseInt(id)
    const body = await request.json()
    const { nombre_partida, monto_asignado, monto_ejecutado } = body

    const dataToUpdate: Record<string, unknown> = {}
    if (nombre_partida) dataToUpdate.nombre_partida = nombre_partida
    if (monto_asignado !== undefined) dataToUpdate.monto_asignado = parseFloat(monto_asignado)
    if (monto_ejecutado !== undefined) dataToUpdate.monto_ejecutado = parseFloat(monto_ejecutado)

    const partida = await prisma.partida.update({
      where: { id_partida: parseInt(partidaId) },
      data: dataToUpdate
    })

    // Verificar si la partida llegó al 100%
    if (monto_ejecutado !== undefined) {
      const porcentaje = Number(partida.monto_asignado) > 0 
        ? (Number(partida.monto_ejecutado) / Number(partida.monto_asignado)) * 100 
        : 0

      if (porcentaje >= 100) {
        // Verificar si ya existe alerta para esta partida
        const alertaExistente = await prisma.alerta.findFirst({
          where: {
            tipo: 'PARTIDA_COMPLETA',
            descripcion: { contains: `partida_${partida.id_partida}` }
          }
        })

        if (!alertaExistente) {
          // Obtener nombre de la obra
          const presupuesto = await prisma.presupuesto.findUnique({
            where: { id_presupuesto: partida.id_presupuesto },
            include: { obra: { select: { nombre_obra: true } } }
          })

          // Crear alerta de partida completa
          await prisma.alerta.create({
            data: {
              tipo: 'PARTIDA_COMPLETA',
              descripcion: `[partida_${partida.id_partida}] La partida "${partida.nombre_partida}" de la obra "${presupuesto?.obra.nombre_obra}" ha alcanzado el 100% de avance`,
              nivel: 'ALTA',
              destinatario: 'ADMINISTRADOR',
              estado: 'ACTIVA'
            }
          })

          // Verificar si TODAS las partidas de la obra están al 100%
          const todasPartidas = await prisma.partida.findMany({
            where: { id_presupuesto: partida.id_presupuesto }
          })

          const todasCompletas = todasPartidas.every(p => 
            Number(p.monto_asignado) > 0 && (Number(p.monto_ejecutado) / Number(p.monto_asignado)) >= 1
          )

          if (todasCompletas && todasPartidas.length > 0) {
            // Verificar si ya existe alerta de obra culminada
            const alertaObraExistente = await prisma.alerta.findFirst({
              where: {
                tipo: 'OBRA_CULMINADA',
                descripcion: { contains: `obra_${obraId}` }
              }
            })

            if (!alertaObraExistente) {
              await prisma.alerta.create({
                data: {
                  tipo: 'OBRA_CULMINADA',
                  descripcion: `[obra_${obraId}] Todas las partidas de la obra "${presupuesto?.obra.nombre_obra}" están al 100%. La obra puede pasar a estado CONCLUIDA.`,
                  nivel: 'CRITICA',
                  destinatario: 'ADMINISTRADOR',
                  estado: 'ACTIVA'
                }
              })
            }
          }
        }
      }
    }

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PRESUPUESTO',
        accion: `Actualizar partida: ${partida.nombre_partida}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ partida })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar partida' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; partidaId: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, partidaId } = await params
    const obraId = parseInt(id)

    const partida = await prisma.partida.findUnique({
      where: { id_partida: parseInt(partidaId) }
    })

    if (!partida) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    // =====================================================
    // CORREGIDO: Usar ActividadPartida en lugar de Actividad
    // El modelo Actividad pertenece a Fase (id_fase)
    // El modelo ActividadPartida pertenece a Partida (id_partida)
    // =====================================================
    await prisma.actividadPartida.deleteMany({
      where: { id_partida: parseInt(partidaId) }
    })

    // Eliminar gastos asociados
    await prisma.gasto.deleteMany({
      where: { id_partida: parseInt(partidaId) }
    })

    // Eliminar partida
    await prisma.partida.delete({
      where: { id_partida: parseInt(partidaId) }
    })

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PRESUPUESTO',
        accion: `Eliminar partida: ${partida.nombre_partida}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ message: 'Partida eliminada' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar partida' }, { status: 500 })
  }
}