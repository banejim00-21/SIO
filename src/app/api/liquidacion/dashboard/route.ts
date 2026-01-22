// src/app/api/liquidacion/dashboard/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esLiquidacion = session.rol.nombre === 'LIQUIDACION'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esLiquidacion && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado para este módulo' }, { status: 403 })
    }

    // Contar obras activas (EN_EJECUCION o CONCLUIDA)
    const obrasActivas = await prisma.obra.count({
      where: {
        estado: {
          in: ['EN_EJECUCION', 'CONCLUIDA']
        }
      }
    })

    // Sumar presupuesto total de todas las obras
    const presupuestoResult = await prisma.obra.aggregate({
      _sum: {
        presupuesto_inicial: true
      }
    })
    const presupuestoTotal = presupuestoResult._sum.presupuesto_inicial || 0

    // Sumar gastos totales (usando la tabla Gasto si existe, o calcular de otra forma)
    // Por ahora asumimos que hay una tabla de gastos o lo dejamos en 0
    let gastoTotal = 0
    try {
      const gastosResult = await prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COALESCE(SUM(monto), 0) as total FROM "Gasto"
      `
      gastoTotal = Number(gastosResult[0]?.total) || 0
    } catch {
      // Si no existe la tabla Gasto, usamos 0
      gastoTotal = 0
    }

    // Contar documentos del mes actual
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)

    const documentosMes = await prisma.documento.count({
      where: {
        fecha_carga: {
          gte: inicioMes
        },
        carpeta_tipo: {
          codigo: {
            in: ['14', '15', '19'] // Carpetas de liquidación
          }
        }
      }
    })

    // Contar expedientes generados (simplificado)
    const expedientesGenerados = 0 // Implementar si existe tabla de expedientes

    // Obtener obras recientes
    const obrasRecientes = await prisma.obra.findMany({
      select: {
        id_obra: true,
        nombre_obra: true,
        estado: true,
        presupuesto_inicial: true
      },
      orderBy: {
        fecha_creacion: 'desc'
      },
      take: 5
    })

    return NextResponse.json({
      obrasActivas,
      presupuestoTotal: Number(presupuestoTotal),
      gastoTotal,
      documentosMes,
      expedientesGenerados,
      obrasRecientes
    })
  } catch (error) {
    console.error('❌ [LIQ-DASH] Error:', error)
    return NextResponse.json({ error: 'Error al obtener dashboard' }, { status: 500 })
  }
}
