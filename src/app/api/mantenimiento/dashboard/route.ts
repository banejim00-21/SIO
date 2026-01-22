// src/app/api/mantenimiento/dashboard/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session || !['MANTENIMIENTO', 'ADMINISTRADOR'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    console.log('📊 [MANTENIMIENTO] Cargando dashboard...')

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    // Obtener obras activas (EN_EJECUCION)
    const obras = await prisma.obra.findMany({
      where: {
        estado: 'EN_EJECUCION'
      },
      include: {
        reportes: {
          where: { tipo_reporte: 'TECNICO' },
          include: { reporte_tecnico: true },
          orderBy: { fecha_generacion: 'desc' },
          take: 1
        }
      }
    })

    // Calcular avances
    let totalAvance = 0
    let countConAvance = 0

    const obrasConAvance = obras.map(obra => {
      const ultimoReporte = obra.reportes[0]
      const avance = ultimoReporte?.reporte_tecnico?.avance_fisico 
        ? Number(ultimoReporte.reporte_tecnico.avance_fisico) 
        : 0
      
      if (avance > 0) {
        totalAvance += avance
        countConAvance++
      }
      
      return {
        id_obra: obra.id_obra,
        nombre_obra: obra.nombre_obra,
        ubicacion: obra.ubicacion,
        estado: obra.estado,
        avance
      }
    })

    const avancePromedio = countConAvance > 0 ? totalAvance / countConAvance : 0

    // Contar reportes técnicos
    const totalReportes = await prisma.reporte.count({
      where: { tipo_reporte: 'TECNICO' }
    })

    const reportesMes = await prisma.reporte.count({
      where: {
        tipo_reporte: 'TECNICO',
        fecha_generacion: { gte: inicioMes }
      }
    })

    // Reportes recientes
    const reportesRecientes = await prisma.reporte.findMany({
      where: { tipo_reporte: 'TECNICO' },
      include: {
        obra: {
          select: {
            id_obra: true,
            nombre_obra: true
          }
        },
        reporte_tecnico: {
          select: {
            avance_fisico: true,
            observaciones: true
          }
        }
      },
      orderBy: { fecha_generacion: 'desc' },
      take: 5
    })

    console.log('✅ [MANTENIMIENTO] Dashboard cargado correctamente')

    return NextResponse.json({
      stats: {
        totalReportes,
        reportesMes,
        obrasActivas: obras.length,
        avancePromedio
      },
      reportesRecientes: reportesRecientes.map(r => ({
        id_reporte: r.id_reporte,
        fecha_generacion: r.fecha_generacion,
        obra: r.obra,
        reporte_tecnico: r.reporte_tecnico ? {
          avance_fisico: Number(r.reporte_tecnico.avance_fisico),
          observaciones: r.reporte_tecnico.observaciones
        } : null
      })),
      obrasAsignadas: obrasConAvance.slice(0, 5)
    })
  } catch (error) {
    console.error('❌ [MANTENIMIENTO] Error en dashboard:', error)
    return NextResponse.json({ error: 'Error al cargar dashboard' }, { status: 500 })
  }
}
