// src/app/api/admin/notificaciones/route.ts
// ============================================================
// API DE CONFIGURACIÓN DE NOTIFICACIONES
// GET: Obtener configuración y estadísticas
// PUT: Actualizar configuración
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const DEFAULT_CONFIG: Record<string, boolean> = {
  notif_automaticas: true,
  notif_cambio_estado: true,
  notif_actividad_recordatorio: true,
  notif_obra_recordatorio: true,
  notif_archivo_subido: false
}

// GET - Obtener configuración y estadísticas
export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener configuración
    const config = { ...DEFAULT_CONFIG }

    try {
      const configs = await prisma.configuracionSistema.findMany({
        where: { clave: { startsWith: 'notif_' } }
      })

      for (const c of configs) {
        if (c.clave in config) {
          config[c.clave] = c.valor === 'true'
        }
      }
    } catch {
      console.log('[API] Tabla configuracion_sistema no existe, usando defaults')
    }

    // Obtener estadísticas
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const inicioSemana = new Date()
    inicioSemana.setDate(inicioSemana.getDate() - 7)

    let estadisticas = {
      correos_enviados_hoy: 0,
      correos_enviados_semana: 0,
      ultimo_envio: null as string | null
    }

    try {
      const [hoyCount, semanaCount, ultimoLog] = await Promise.all([
        prisma.logActividad.count({
          where: {
            accion: { contains: 'Correo enviado' },
            fecha_hora: { gte: hoy }
          }
        }),
        prisma.logActividad.count({
          where: {
            accion: { contains: 'Correo enviado' },
            fecha_hora: { gte: inicioSemana }
          }
        }),
        prisma.logActividad.findFirst({
          where: { accion: { contains: 'Correo enviado' } },
          orderBy: { fecha_hora: 'desc' }
        })
      ])

      estadisticas = {
        correos_enviados_hoy: hoyCount,
        correos_enviados_semana: semanaCount,
        ultimo_envio: ultimoLog?.fecha_hora.toISOString() || null
      }
    } catch {
      console.log('[API] Error obteniendo estadísticas')
    }

    return NextResponse.json({
      config,
      estadisticas,
      brevo_configurado: !!process.env.BREVO_API_KEY
    })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// PUT - Actualizar configuración
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { config } = body

    // Actualizar cada configuración
    for (const [clave, valor] of Object.entries(config)) {
      if (clave.startsWith('notif_')) {
        try {
          await prisma.configuracionSistema.upsert({
            where: { clave },
            update: { valor: String(valor) },
            create: { clave, valor: String(valor), descripcion: `Notificación: ${clave}` }
          })
        } catch {
          console.log(`[API] Error actualizando ${clave}`)
        }
      }
    }

    // Log
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'SEGURIDAD',
        accion: 'Actualizar configuración de notificaciones',
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ message: 'Configuración actualizada' })
  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}