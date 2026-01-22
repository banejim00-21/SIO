// src/app/api/admin/obras/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { notificarCambioEstadoObra } from '@/lib/notificaciones'

// Transiciones válidas de estado
const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  'PLANEADA': ['EN_EJECUCION'],
  'EN_EJECUCION': ['CONCLUIDA', 'PLANEADA'],
  'CONCLUIDA': ['LIQUIDADA', 'EN_EJECUCION'],
  'LIQUIDADA': []
}

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

    const obra = await prisma.obra.findUnique({
      where: { id_obra: parseInt(id) },
      include: {
        responsable: {
          select: { id_usuario: true, nombre: true, rol: { select: { nombre: true } } }
        },
        presupuestos: {
          where: { estado: 'VIGENTE' },
          include: {
            partidas: {
              include: {
                actividades: true,
                gastos: true
              }
            }
          }
        },
        historial_estados: {
          orderBy: { fecha_cambio: 'desc' },
          include: { usuario: { select: { nombre: true } } }
        },
        documentos: {
          where: { estado: 'VIGENTE' },
          include: { carpeta_tipo: true },
          orderBy: { fecha_carga: 'desc' }
        },
        roles_asignados: {
          where: { estado: 'ACTIVO' },
          include: {
            personal: {
              include: { usuario: { select: { id_usuario: true, nombre: true } } }
            }
          }
        }
      }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ obra })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener obra' }, { status: 500 })
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
    const obraId = parseInt(id)
    const body = await request.json()

    const {
      nombre_obra,
      ubicacion,
      coordenadas,
      presupuesto_inicial,
      fecha_inicio_prevista,
      fecha_fin_prevista,
      total_partidas,
      id_responsable,
      estado,
      justificacion_estado
    } = body

    const obraActual = await prisma.obra.findUnique({
      where: { id_obra: obraId }
    })

    if (!obraActual) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Guardar estado anterior para la notificación
    const estadoAnterior = obraActual.estado

    // Si hay cambio de estado, validar transición
    if (estado && estado !== obraActual.estado) {
      const transicionesPermitidas = TRANSICIONES_VALIDAS[obraActual.estado] || []
      if (!transicionesPermitidas.includes(estado)) {
        return NextResponse.json({
          error: `No se puede cambiar de ${obraActual.estado} a ${estado}. Transiciones permitidas: ${transicionesPermitidas.join(', ') || 'ninguna'}`
        }, { status: 400 })
      }

      // Registrar cambio en historial
      await prisma.historialEstado.create({
        data: {
          id_obra: obraId,
          estado,
          id_usuario: session.id_usuario,
          justificacion: justificacion_estado || `Cambio de ${obraActual.estado} a ${estado}`
        }
      })
    }

    // Preparar datos para actualizar
    const dataToUpdate: Record<string, unknown> = {}
    if (nombre_obra) dataToUpdate.nombre_obra = nombre_obra
    if (ubicacion) dataToUpdate.ubicacion = ubicacion
    if (coordenadas !== undefined) dataToUpdate.coordenadas = coordenadas
    if (presupuesto_inicial) dataToUpdate.presupuesto_inicial = parseFloat(presupuesto_inicial)
    if (fecha_inicio_prevista) dataToUpdate.fecha_inicio_prevista = new Date(fecha_inicio_prevista)
    if (fecha_fin_prevista !== undefined) {
      dataToUpdate.fecha_fin_prevista = fecha_fin_prevista ? new Date(fecha_fin_prevista) : null
    }
    if (total_partidas !== undefined) {
      dataToUpdate.total_partidas_inicial = total_partidas ? parseInt(total_partidas) : null
    }
    if (id_responsable) dataToUpdate.id_responsable = parseInt(id_responsable)
    if (estado) dataToUpdate.estado = estado

    const obra = await prisma.obra.update({
      where: { id_obra: obraId },
      data: dataToUpdate as Parameters<typeof prisma.obra.update>[0]['data'],
      include: {
        responsable: { select: { id_usuario: true, nombre: true } }
      }
    })

    // Actualizar presupuesto si cambió
    if (presupuesto_inicial) {
      await prisma.presupuesto.updateMany({
        where: { id_obra: obraId, estado: 'VIGENTE' },
        data: { monto_total: parseFloat(presupuesto_inicial) }
      })
    }

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Actualizar obra: ${obra.nombre_obra}${estado ? ` - Estado: ${estado}` : ''}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    // ============================================================
    // NUEVO: Enviar notificación por correo si cambió el estado
    // ============================================================
    if (estado && estado !== estadoAnterior) {
      // Ejecutar en segundo plano (no bloquea la respuesta)
      notificarCambioEstadoObra(obraId, estadoAnterior, estado, session.id_usuario)
        .then(resultado => {
          if (resultado.success) {
            console.log(`[NOTIF] ✅ Correo enviado a ${resultado.destinatarios} destinatario(s)`)
          } else {
            console.log(`[NOTIF] ⚠️ No se envió correo: ${resultado.error}`)
          }
        })
        .catch(err => {
          console.error('[NOTIF] Error:', err)
        })
    }

    return NextResponse.json({ obra })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar obra' }, { status: 500 })
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
    const obraId = parseInt(id)

    const obra = await prisma.obra.findUnique({
      where: { id_obra: obraId }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Solo permitir eliminar obras en estado PLANEADA
    if (obra.estado !== 'PLANEADA') {
      return NextResponse.json({
        error: 'Solo se pueden eliminar obras en estado PLANEADA'
      }, { status: 400 })
    }

    // Eliminar en cascada (Prisma maneja las relaciones)
    await prisma.obra.delete({ where: { id_obra: obraId } })

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Eliminar obra: ${obra.nombre_obra}`,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ message: 'Obra eliminada correctamente' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al eliminar obra' }, { status: 500 })
  }
}