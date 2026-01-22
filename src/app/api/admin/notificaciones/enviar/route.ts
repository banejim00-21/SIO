// src/app/api/admin/notificaciones/enviar/route.ts
// ============================================================
// API PARA ENVIAR NOTIFICACIONES MANUALMENTE
// POST: Enviar correo de prueba o notificación específica
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { enviarCorreoPrueba } from '@/lib/email'
import { 
  notificarCambioEstadoObra, 
  obtenerDestinatariosObra 
} from '@/lib/notificaciones'
import { 
  enviarRecordatorioActividad, 
  enviarRecordatorioObra 
} from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { tipo, datos } = body

    console.log(`[API] Enviando notificación tipo: ${tipo}`)

    switch (tipo) {
      // ========================================
      // CORREO DE PRUEBA
      // ========================================
      case 'TEST': {
        const { email, nombre } = datos

        if (!email) {
          return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
        }

        const resultado = await enviarCorreoPrueba(
          { email, nombre: nombre || 'Usuario' },
          session.nombre
        )

        if (resultado.success) {
          await prisma.logActividad.create({
            data: {
              id_usuario: session.id_usuario,
              modulo: 'SEGURIDAD',
              accion: `Correo enviado: Prueba a ${email}`,
              resultado: 'Exito'
            }
          })
        }

        return NextResponse.json(resultado)
      }

      // ========================================
      // NOTIFICACIÓN CAMBIO DE ESTADO (manual)
      // ========================================
      case 'CAMBIO_ESTADO': {
        const { id_obra, estado_anterior, estado_nuevo } = datos

        if (!id_obra || !estado_anterior || !estado_nuevo) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
        }

        const resultado = await notificarCambioEstadoObra(
          parseInt(id_obra),
          estado_anterior,
          estado_nuevo,
          session.id_usuario
        )

        return NextResponse.json(resultado)
      }

      // ========================================
      // RECORDATORIO DE ACTIVIDAD (manual)
      // ========================================
      case 'ACTIVIDAD_RECORDATORIO': {
        const { id_actividad } = datos

        if (!id_actividad) {
          return NextResponse.json({ error: 'ID de actividad requerido' }, { status: 400 })
        }

        const actividad = await prisma.actividadPartida.findUnique({
          where: { id_actividad: parseInt(id_actividad) },
          include: {
            partida: {
              include: {
                presupuesto: {
                  include: {
                    obra: { select: { id_obra: true, nombre_obra: true, ubicacion: true } }
                  }
                }
              }
            }
          }
        })

        if (!actividad) {
          return NextResponse.json({ error: 'Actividad no encontrada' }, { status: 404 })
        }

        const obra = actividad.partida.presupuesto.obra
        const destinatarios = await obtenerDestinatariosObra(obra.id_obra)

        if (destinatarios.length === 0) {
          return NextResponse.json({ error: 'No hay destinatarios' }, { status: 400 })
        }

        const resultado = await enviarRecordatorioActividad(
          destinatarios,
          { id: actividad.id_actividad, nombre: actividad.nombre_actividad, fecha_fin: actividad.fecha_fin },
          { id: obra.id_obra, nombre: obra.nombre_obra, ubicacion: obra.ubicacion },
          { id: actividad.partida.id_partida, nombre: actividad.partida.nombre_partida }
        )

        if (resultado.success) {
          await prisma.logActividad.create({
            data: {
              id_usuario: session.id_usuario,
              modulo: 'SEGURIDAD',
              accion: `Correo enviado: Recordatorio actividad ${id_actividad}`,
              id_obra: obra.id_obra,
              resultado: 'Exito'
            }
          })
        }

        return NextResponse.json(resultado)
      }

      // ========================================
      // RECORDATORIO DE OBRA (manual)
      // ========================================
      case 'OBRA_RECORDATORIO': {
        const { id_obra } = datos

        if (!id_obra) {
          return NextResponse.json({ error: 'ID de obra requerido' }, { status: 400 })
        }

        const obra = await prisma.obra.findUnique({
          where: { id_obra: parseInt(id_obra) },
          select: { id_obra: true, nombre_obra: true, ubicacion: true, fecha_fin_prevista: true }
        })

        if (!obra) {
          return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
        }

        if (!obra.fecha_fin_prevista) {
          return NextResponse.json({ error: 'La obra no tiene fecha fin' }, { status: 400 })
        }

        const destinatarios = await obtenerDestinatariosObra(obra.id_obra)

        if (destinatarios.length === 0) {
          return NextResponse.json({ error: 'No hay destinatarios' }, { status: 400 })
        }

        const resultado = await enviarRecordatorioObra(destinatarios, {
          id: obra.id_obra,
          nombre: obra.nombre_obra,
          ubicacion: obra.ubicacion,
          fecha_fin: obra.fecha_fin_prevista
        })

        if (resultado.success) {
          await prisma.logActividad.create({
            data: {
              id_usuario: session.id_usuario,
              modulo: 'SEGURIDAD',
              accion: `Correo enviado: Recordatorio obra ${id_obra}`,
              id_obra: obra.id_obra,
              resultado: 'Exito'
            }
          })
        }

        return NextResponse.json(resultado)
      }

      default:
        return NextResponse.json({ error: 'Tipo de notificación no válido' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar'
    }, { status: 500 })
  }
}