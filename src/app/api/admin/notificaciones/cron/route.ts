// src/app/api/admin/notificaciones/cron/route.ts
// ============================================================
// API CRON PARA RECORDATORIOS AUTOMÁTICOS
// GET/POST: Ejecutar proceso de recordatorios
// Puede ser llamado por un servicio CRON externo o manualmente
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { procesarRecordatorios } from '@/lib/notificaciones'

const CRON_SECRET = process.env.CRON_SECRET || 'sio-undac-cron-2024'

export async function GET(request: NextRequest) {
  // Verificar autenticación (CRON secret o sesión admin)
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  let autorizado = false

  // Verificar por secret (para llamadas CRON externas)
  if (authHeader === `Bearer ${CRON_SECRET}` || secret === CRON_SECRET) {
    autorizado = true
  }

  // Verificar por sesión (para llamadas desde el panel admin)
  if (!autorizado) {
    const session = await getSession()
    if (session && session.rol.nombre === 'ADMINISTRADOR') {
      autorizado = true
    }
  }

  if (!autorizado) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  console.log('[CRON] Iniciando proceso de recordatorios...')

  try {
    const resultados = await procesarRecordatorios()

    console.log('[CRON] Proceso completado:', resultados)

    return NextResponse.json({
      success: true,
      message: 'Proceso de recordatorios completado',
      resultados,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CRON] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error en proceso CRON'
    }, { status: 500 })
  }
}

// También permitir POST
export async function POST(request: NextRequest) {
  return GET(request)
}