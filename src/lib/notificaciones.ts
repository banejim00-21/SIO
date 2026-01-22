// src/lib/notificaciones.ts
// ============================================================
// SERVICIO DE NOTIFICACIONES
// Sistema Integral de Obras (SIO) - UNDAC
// ============================================================

import { prisma } from '@/lib/prisma'
import {
  enviarNotificacionCambioEstado,
  enviarRecordatorioActividad,
  enviarRecordatorioObra,
  enviarNotificacionArchivoSubido,
  type EmailDestinatario,
  type EmailResult,
  type DatosObra,
  type DatosActividad,
  type DatosPartida
} from '@/lib/email'

// ============================================================
// OBTENER DESTINATARIOS DE UNA OBRA
// ============================================================

export async function obtenerDestinatariosObra(obraId: number): Promise<EmailDestinatario[]> {
  const destinatarios: EmailDestinatario[] = []

  try {
    // Obtener obra con responsable principal y roles asignados
    const obra = await prisma.obra.findUnique({
      where: { id_obra: obraId },
      include: {
        responsable: {
          select: { correo: true, nombre: true }
        },
        roles_asignados: {
          where: { estado: 'ACTIVO' },
          include: {
            personal: {
              select: { correo: true, nombre: true }
            }
          }
        }
      }
    })

    if (!obra) return destinatarios

    // Agregar responsable principal
    if (obra.responsable?.correo) {
      destinatarios.push({
        email: obra.responsable.correo,
        nombre: obra.responsable.nombre
      })
    }

    // Agregar personal con roles asignados activos
    for (const rol of obra.roles_asignados) {
      if (rol.personal?.correo) {
        // Evitar duplicados
        if (!destinatarios.some(d => d.email === rol.personal.correo)) {
          destinatarios.push({
            email: rol.personal.correo,
            nombre: rol.personal.nombre
          })
        }
      }
    }

    console.log(`[NOTIF] Destinatarios para obra ${obraId}:`, destinatarios.map(d => d.email))
    return destinatarios
  } catch (error) {
    console.error('[NOTIF] Error obteniendo destinatarios:', error)
    return destinatarios
  }
}

// ============================================================
// VERIFICAR SI LAS NOTIFICACIONES ESTÁN HABILITADAS
// ============================================================

export async function obtenerConfiguracionNotificaciones(): Promise<Record<string, boolean>> {
  const defaultConfig: Record<string, boolean> = {
    notif_automaticas: true,
    notif_cambio_estado: true,
    notif_actividad_recordatorio: true,
    notif_obra_recordatorio: true,
    notif_archivo_subido: false // Desactivado por defecto (puede generar muchos correos)
  }

  try {
    const configs = await prisma.configuracionSistema.findMany({
      where: { clave: { startsWith: 'notif_' } }
    })

    for (const config of configs) {
      if (config.clave in defaultConfig) {
        defaultConfig[config.clave] = config.valor === 'true'
      }
    }
  } catch {
    console.log('[NOTIF] Usando configuración por defecto')
  }

  return defaultConfig
}

// ============================================================
// NOTIFICACIÓN: CAMBIO DE ESTADO DE OBRA
// ============================================================

export async function notificarCambioEstadoObra(
  obraId: number,
  estadoAnterior: string,
  estadoNuevo: string,
  usuarioId: number
): Promise<EmailResult> {
  console.log(`[NOTIF] Procesando cambio de estado: Obra ${obraId}, ${estadoAnterior} → ${estadoNuevo}`)

  try {
    // Verificar si la notificación está habilitada
    const config = await obtenerConfiguracionNotificaciones()
    if (!config.notif_automaticas || !config.notif_cambio_estado) {
      console.log('[NOTIF] Notificación de cambio de estado deshabilitada')
      return { success: false, error: 'Notificación deshabilitada' }
    }

    // Obtener datos de la obra
    const obra = await prisma.obra.findUnique({
      where: { id_obra: obraId },
      select: { id_obra: true, nombre_obra: true, ubicacion: true }
    })

    if (!obra) {
      return { success: false, error: 'Obra no encontrada' }
    }

    // Obtener nombre del usuario que modificó
    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      select: { nombre: true }
    })

    // Obtener destinatarios
    const destinatarios = await obtenerDestinatariosObra(obraId)

    if (destinatarios.length === 0) {
      console.log('[NOTIF] No hay destinatarios para la notificación')
      return { success: false, error: 'No hay destinatarios' }
    }

    // Preparar datos de la obra
    const datosObra: DatosObra = {
      id: obra.id_obra,
      nombre: obra.nombre_obra,
      ubicacion: obra.ubicacion
    }

    // Enviar correo
    const resultado = await enviarNotificacionCambioEstado(
      destinatarios,
      datosObra,
      estadoAnterior,
      estadoNuevo,
      usuario?.nombre || 'Sistema'
    )

    // Registrar en log si fue exitoso
    if (resultado.success) {
      await prisma.logActividad.create({
        data: {
          id_usuario: usuarioId,
          modulo: 'SEGURIDAD',
          accion: `Correo enviado: Cambio estado obra ${obraId} a ${destinatarios.length} destinatario(s)`,
          id_obra: obraId,
          resultado: 'Exito'
        }
      })

      // Crear alerta
      await prisma.alerta.create({
        data: {
          tipo: 'CAMBIO_ESTADO',
          descripcion: `Notificación enviada: Obra "${obra.nombre_obra}" cambió de ${estadoAnterior} a ${estadoNuevo}`,
          nivel: 'MEDIA',
          destinatario: destinatarios.map(d => d.nombre).join(', '),
          estado: 'ACTIVA'
        }
      })
    }

    return resultado
  } catch (error) {
    console.error('[NOTIF] Error en notificarCambioEstadoObra:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

// ============================================================
// NOTIFICACIÓN: ARCHIVO SUBIDO
// ============================================================

export async function notificarArchivoSubido(
  obraId: number,
  nombreArchivo: string,
  carpeta: string,
  usuarioId: number
): Promise<EmailResult> {
  console.log(`[NOTIF] Procesando archivo subido: ${nombreArchivo} en obra ${obraId}`)

  try {
    // Verificar si la notificación está habilitada
    const config = await obtenerConfiguracionNotificaciones()
    if (!config.notif_automaticas || !config.notif_archivo_subido) {
      console.log('[NOTIF] Notificación de archivo subido deshabilitada')
      return { success: false, error: 'Notificación deshabilitada' }
    }

    // Obtener datos
    const obra = await prisma.obra.findUnique({
      where: { id_obra: obraId },
      select: { id_obra: true, nombre_obra: true, ubicacion: true }
    })

    if (!obra) {
      return { success: false, error: 'Obra no encontrada' }
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id_usuario: usuarioId },
      select: { nombre: true }
    })

    const destinatarios = await obtenerDestinatariosObra(obraId)

    if (destinatarios.length === 0) {
      return { success: false, error: 'No hay destinatarios' }
    }

    const datosObra: DatosObra = {
      id: obra.id_obra,
      nombre: obra.nombre_obra,
      ubicacion: obra.ubicacion
    }

    const resultado = await enviarNotificacionArchivoSubido(
      destinatarios,
      datosObra,
      nombreArchivo,
      carpeta,
      usuario?.nombre || 'Usuario'
    )

    if (resultado.success) {
      await prisma.logActividad.create({
        data: {
          id_usuario: usuarioId,
          modulo: 'SEGURIDAD',
          accion: `Correo enviado: Archivo subido "${nombreArchivo}"`,
          id_obra: obraId,
          resultado: 'Exito'
        }
      })
    }

    return resultado
  } catch (error) {
    console.error('[NOTIF] Error en notificarArchivoSubido:', error)
    return { success: false, error: 'Error al enviar notificación' }
  }
}

// ============================================================
// PROCESAR RECORDATORIOS (CRON)
// ============================================================

export interface ResultadosCron {
  actividades_notificadas: number
  obras_notificadas: number
  errores: string[]
  detalles: string[]
}

export async function procesarRecordatorios(): Promise<ResultadosCron> {
  const resultados: ResultadosCron = {
    actividades_notificadas: 0,
    obras_notificadas: 0,
    errores: [],
    detalles: []
  }

  try {
    const config = await obtenerConfiguracionNotificaciones()

    if (!config.notif_automaticas) {
      resultados.detalles.push('Notificaciones automáticas deshabilitadas')
      return resultados
    }

    // Calcular fecha de mañana
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const manana = new Date(hoy)
    manana.setDate(manana.getDate() + 1)

    const mananaFin = new Date(manana)
    mananaFin.setHours(23, 59, 59, 999)

    // ========================================
    // RECORDATORIOS DE ACTIVIDADES
    // ========================================
    if (config.notif_actividad_recordatorio) {
      const actividades = await prisma.actividadPartida.findMany({
        where: {
          fecha_fin: { gte: manana, lte: mananaFin }
        },
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

      for (const actividad of actividades) {
        try {
          const obra = actividad.partida.presupuesto.obra

          // Verificar si ya se envió hoy
          const yaEnviado = await prisma.logActividad.findFirst({
            where: {
              accion: { contains: `Recordatorio actividad ${actividad.id_actividad}` },
              fecha_hora: { gte: hoy }
            }
          })

          if (yaEnviado) {
            resultados.detalles.push(`⏭️ Actividad ${actividad.id_actividad} ya notificada hoy`)
            continue
          }

          const destinatarios = await obtenerDestinatariosObra(obra.id_obra)

          if (destinatarios.length === 0) {
            resultados.detalles.push(`⚠️ Sin destinatarios para actividad ${actividad.id_actividad}`)
            continue
          }

          const datosActividad: DatosActividad = {
            id: actividad.id_actividad,
            nombre: actividad.nombre_actividad,
            fecha_fin: actividad.fecha_fin
          }

          const datosObra: DatosObra = {
            id: obra.id_obra,
            nombre: obra.nombre_obra,
            ubicacion: obra.ubicacion
          }

          const datosPartida: DatosPartida = {
            id: actividad.partida.id_partida,
            nombre: actividad.partida.nombre_partida
          }

          const resultado = await enviarRecordatorioActividad(
            destinatarios,
            datosActividad,
            datosObra,
            datosPartida
          )

          if (resultado.success) {
            resultados.actividades_notificadas++
            resultados.detalles.push(`✅ Actividad: ${actividad.nombre_actividad}`)

            await prisma.logActividad.create({
              data: {
                id_usuario: 1,
                modulo: 'SEGURIDAD',
                accion: `Recordatorio actividad ${actividad.id_actividad} enviado`,
                id_obra: obra.id_obra,
                resultado: 'Exito'
              }
            })

            await prisma.alerta.create({
              data: {
                tipo: 'RECORDATORIO_ACTIVIDAD',
                descripcion: `Recordatorio: "${actividad.nombre_actividad}" vence mañana`,
                nivel: 'MEDIA',
                destinatario: destinatarios.map(d => d.nombre).join(', '),
                estado: 'ACTIVA'
              }
            })
          } else {
            resultados.errores.push(`Actividad ${actividad.id_actividad}: ${resultado.error}`)
          }
        } catch (error) {
          resultados.errores.push(`Error actividad ${actividad.id_actividad}`)
        }
      }
    }

    // ========================================
    // RECORDATORIOS DE OBRAS
    // ========================================
    if (config.notif_obra_recordatorio) {
      const obras = await prisma.obra.findMany({
        where: {
          fecha_fin_prevista: { gte: manana, lte: mananaFin },
          estado: { in: ['PLANEADA', 'EN_EJECUCION'] }
        },
        select: { id_obra: true, nombre_obra: true, ubicacion: true, fecha_fin_prevista: true }
      })

      for (const obra of obras) {
        try {
          // Verificar si ya se envió hoy
          const yaEnviado = await prisma.logActividad.findFirst({
            where: {
              accion: { contains: `Recordatorio obra ${obra.id_obra}` },
              fecha_hora: { gte: hoy }
            }
          })

          if (yaEnviado) {
            resultados.detalles.push(`⏭️ Obra ${obra.id_obra} ya notificada hoy`)
            continue
          }

          const destinatarios = await obtenerDestinatariosObra(obra.id_obra)

          if (destinatarios.length === 0) {
            resultados.detalles.push(`⚠️ Sin destinatarios para obra ${obra.id_obra}`)
            continue
          }

          const datosObra: DatosObra = {
            id: obra.id_obra,
            nombre: obra.nombre_obra,
            ubicacion: obra.ubicacion,
            fecha_fin: obra.fecha_fin_prevista
          }

          const resultado = await enviarRecordatorioObra(destinatarios, datosObra)

          if (resultado.success) {
            resultados.obras_notificadas++
            resultados.detalles.push(`✅ Obra: ${obra.nombre_obra}`)

            await prisma.logActividad.create({
              data: {
                id_usuario: 1,
                modulo: 'SEGURIDAD',
                accion: `Recordatorio obra ${obra.id_obra} enviado`,
                id_obra: obra.id_obra,
                resultado: 'Exito'
              }
            })

            await prisma.alerta.create({
              data: {
                tipo: 'RECORDATORIO_OBRA',
                descripcion: `Recordatorio: Obra "${obra.nombre_obra}" - Fecha fin mañana`,
                nivel: 'ALTA',
                destinatario: destinatarios.map(d => d.nombre).join(', '),
                estado: 'ACTIVA'
              }
            })
          } else {
            resultados.errores.push(`Obra ${obra.id_obra}: ${resultado.error}`)
          }
        } catch (error) {
          resultados.errores.push(`Error obra ${obra.id_obra}`)
        }
      }
    }

    return resultados
  } catch (error) {
    console.error('[NOTIF] Error en procesarRecordatorios:', error)
    resultados.errores.push('Error general en procesamiento')
    return resultados
  }
}