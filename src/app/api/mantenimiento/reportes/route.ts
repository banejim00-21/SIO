// src/app/api/mantenimiento/reportes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// GET - Listar reportes técnicos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || !['MANTENIMIENTO', 'ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id_obra = searchParams.get('id_obra')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')

    console.log('📊 [REPORTES-MANT] Obteniendo reportes técnicos...')

    const where: Prisma.ReporteWhereInput = {
      tipo_reporte: 'TECNICO'
    }

    if (id_obra) {
      where.id_obra = parseInt(id_obra)
    }

    if (fecha_desde || fecha_hasta) {
      where.fecha_generacion = {}
      if (fecha_desde) {
        where.fecha_generacion.gte = new Date(fecha_desde)
      }
      if (fecha_hasta) {
        where.fecha_generacion.lte = new Date(fecha_hasta)
      }
    }

    const reportes = await prisma.reporte.findMany({
      where,
      include: {
        obra: {
          select: {
            id_obra: true,
            nombre_obra: true,
            ubicacion: true,
            estado: true
          }
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true
          }
        },
        reporte_tecnico: true
      },
      orderBy: { fecha_generacion: 'desc' }
    })

    // Estadísticas
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const stats = {
      total: reportes.length,
      esteMes: reportes.filter(r => new Date(r.fecha_generacion) >= inicioMes).length
    }

    console.log(`✅ [REPORTES-MANT] Se encontraron ${reportes.length} reportes`)

    return NextResponse.json({
      reportes: reportes.map(r => ({
        ...r,
        reporte_tecnico: r.reporte_tecnico ? {
          ...r.reporte_tecnico,
          avance_fisico: Number(r.reporte_tecnico.avance_fisico)
        } : null
      })),
      stats
    })
  } catch (error) {
    console.error('❌ [REPORTES-MANT] Error:', error)
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 })
  }
}

// POST - Crear reporte técnico
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || !['MANTENIMIENTO', 'ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id_obra,
      avance_fisico,
      hitos_cumplidos,
      observaciones
    } = body

    if (!id_obra) {
      return NextResponse.json({ error: 'Debe seleccionar una obra' }, { status: 400 })
    }

    if (avance_fisico === undefined || avance_fisico === null) {
      return NextResponse.json({ error: 'El avance físico es obligatorio' }, { status: 400 })
    }

    const avanceNumero = parseFloat(avance_fisico)
    if (isNaN(avanceNumero) || avanceNumero < 0 || avanceNumero > 100) {
      return NextResponse.json({ error: 'El avance debe ser entre 0 y 100' }, { status: 400 })
    }

    console.log('📝 [REPORTES-MANT] Creando reporte técnico...')

    // Crear reporte con reporte_tecnico en una transacción
    const reporte = await prisma.reporte.create({
      data: {
        id_obra: parseInt(id_obra),
        tipo_reporte: 'TECNICO',
        id_usuario: session.id_usuario,
        fecha_generacion: new Date(),
        parametros: JSON.stringify({ tipo: 'mantenimiento' }),
        reporte_tecnico: {
          create: {
            avance_fisico: avanceNumero,
            hitos_cumplidos: hitos_cumplidos || null,
            observaciones: observaciones || null
          }
        }
      },
      include: {
        obra: { select: { nombre_obra: true } },
        usuario: { select: { nombre: true } },
        reporte_tecnico: true
      }
    })

    // Registrar en log de actividad
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'REPORTES',
        accion: 'Crear reporte técnico',
        id_obra: parseInt(id_obra),
        resultado: 'Éxito'
      }
    }).catch((logError) => {
      console.warn('⚠️ No se pudo registrar log:', logError)
    })

    console.log(`✅ [REPORTES-MANT] Reporte creado con ID: ${reporte.id_reporte}`)

    return NextResponse.json({
      message: 'Reporte creado correctamente',
      reporte: {
        ...reporte,
        reporte_tecnico: reporte.reporte_tecnico ? {
          ...reporte.reporte_tecnico,
          avance_fisico: Number(reporte.reporte_tecnico.avance_fisico)
        } : null
      }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ [REPORTES-MANT] Error al crear:', error)
    return NextResponse.json({ error: 'Error al crear reporte' }, { status: 500 })
  }
}
