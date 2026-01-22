// src/app/api/mantenimiento/reportes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener detalle de un reporte
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || !['MANTENIMIENTO', 'ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const id_reporte = parseInt(id)

    console.log('📊 [REPORTE] Obteniendo detalle:', id_reporte)

    const reporte = await prisma.reporte.findUnique({
      where: { id_reporte },
      include: {
        obra: {
          select: {
            id_obra: true,
            nombre_obra: true,
            ubicacion: true,
            estado: true,
            presupuesto_inicial: true,
            fecha_inicio_prevista: true
          }
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            correo: true
          }
        },
        reporte_tecnico: true
      }
    })

    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // Obtener reportes anteriores de la misma obra para comparación
    const reportesAnteriores = await prisma.reporte.findMany({
      where: {
        id_obra: reporte.id_obra,
        tipo_reporte: 'TECNICO',
        id_reporte: { not: id_reporte },
        fecha_generacion: { lt: reporte.fecha_generacion }
      },
      include: {
        reporte_tecnico: {
          select: { avance_fisico: true }
        }
      },
      orderBy: { fecha_generacion: 'desc' },
      take: 5
    })

    console.log('✅ [REPORTE] Detalle obtenido')

    return NextResponse.json({
      reporte: {
        ...reporte,
        reporte_tecnico: reporte.reporte_tecnico ? {
          ...reporte.reporte_tecnico,
          avance_fisico: Number(reporte.reporte_tecnico.avance_fisico)
        } : null
      },
      historialAvances: reportesAnteriores.map(r => ({
        id_reporte: r.id_reporte,
        fecha: r.fecha_generacion,
        avance: r.reporte_tecnico ? Number(r.reporte_tecnico.avance_fisico) : 0
      }))
    })
  } catch (error) {
    console.error('❌ [REPORTE] Error:', error)
    return NextResponse.json({ error: 'Error al obtener reporte' }, { status: 500 })
  }
}

// PUT - Actualizar reporte (solo si es el creador y es del mismo día)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || !['MANTENIMIENTO', 'ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const id_reporte = parseInt(id)
    const body = await request.json()

    const { avance_fisico, hitos_cumplidos, observaciones } = body

    // Verificar que existe
    const reporteExistente = await prisma.reporte.findUnique({
      where: { id_reporte },
      include: { reporte_tecnico: true }
    })

    if (!reporteExistente) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const esCreador = reporteExistente.id_usuario === session.id_usuario
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'
    
    // Solo el creador puede editar, y solo el mismo día (o admin siempre)
    const hoy = new Date()
    const fechaReporte = new Date(reporteExistente.fecha_generacion)
    const esHoy = hoy.toDateString() === fechaReporte.toDateString()

    if (!esAdmin && (!esCreador || !esHoy)) {
      return NextResponse.json({ 
        error: 'Solo puede editar reportes creados hoy por usted' 
      }, { status: 403 })
    }

    console.log('📝 [REPORTE] Actualizando:', id_reporte)

    // Preparar datos de actualización
    const dataUpdate: { avance_fisico?: number; hitos_cumplidos?: string | null; observaciones?: string | null } = {}
    
    if (avance_fisico !== undefined) {
      dataUpdate.avance_fisico = parseFloat(avance_fisico)
    }
    if (hitos_cumplidos !== undefined) {
      dataUpdate.hitos_cumplidos = hitos_cumplidos
    }
    if (observaciones !== undefined) {
      dataUpdate.observaciones = observaciones
    }

    // Actualizar reporte_tecnico
    if (reporteExistente.reporte_tecnico && Object.keys(dataUpdate).length > 0) {
      await prisma.reporteTecnico.update({
        where: { id_reporte },
        data: dataUpdate
      })
    }

    // Registrar en log
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'REPORTES',
        accion: 'Actualizar reporte técnico',
        id_obra: reporteExistente.id_obra,
        resultado: 'Éxito'
      }
    }).catch((logError) => {
      console.warn('⚠️ No se pudo registrar log:', logError)
    })

    // Obtener reporte actualizado
    const reporteActualizado = await prisma.reporte.findUnique({
      where: { id_reporte },
      include: {
        obra: { select: { nombre_obra: true } },
        reporte_tecnico: true
      }
    })

    console.log('✅ [REPORTE] Actualizado correctamente')

    return NextResponse.json({
      message: 'Reporte actualizado correctamente',
      reporte: reporteActualizado
    })
  } catch (error) {
    console.error('❌ [REPORTE] Error al actualizar:', error)
    return NextResponse.json({ error: 'Error al actualizar reporte' }, { status: 500 })
  }
}

// DELETE - Eliminar reporte (solo admin o creador el mismo día)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const id_reporte = parseInt(id)

    const reporte = await prisma.reporte.findUnique({
      where: { id_reporte }
    })

    if (!reporte) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const esCreador = reporte.id_usuario === session.id_usuario
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'
    const hoy = new Date()
    const fechaReporte = new Date(reporte.fecha_generacion)
    const esHoy = hoy.toDateString() === fechaReporte.toDateString()

    if (!esAdmin && (!esCreador || !esHoy)) {
      return NextResponse.json({ 
        error: 'Solo puede eliminar reportes creados hoy por usted' 
      }, { status: 403 })
    }

    console.log('🗑️ [REPORTE] Eliminando:', id_reporte)

    // Eliminar (cascade eliminará reporte_tecnico)
    await prisma.reporte.delete({
      where: { id_reporte }
    })

    // Log
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'REPORTES',
        accion: 'Eliminar reporte técnico',
        id_obra: reporte.id_obra,
        resultado: 'Éxito'
      }
    }).catch((logError) => {
      console.warn('⚠️ No se pudo registrar log:', logError)
    })

    console.log('✅ [REPORTE] Eliminado')

    return NextResponse.json({ message: 'Reporte eliminado correctamente' })
  } catch (error) {
    console.error('❌ [REPORTE] Error al eliminar:', error)
    return NextResponse.json({ error: 'Error al eliminar reporte' }, { status: 500 })
  }
}
