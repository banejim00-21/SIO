// src/app/api/admin/obras/[id]/valorizaciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface GastoAgrupado {
  mes: string
  total: number
}

// GET - Obtener valorizaciones de una obra (datos REALES de gastos)
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
    const obraId = parseInt(id)

    if (isNaN(obraId)) {
      return NextResponse.json({ error: 'ID de obra inválido' }, { status: 400 })
    }

    // Obtener la obra con su presupuesto
    const obra = await prisma.obra.findUnique({
      where: { id_obra: obraId },
      select: {
        id_obra: true,
        nombre_obra: true,
        presupuesto_inicial: true,
        fecha_inicio_prevista: true,
        fecha_fin_prevista: true,
        estado: true
      }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    const presupuestoTotal = Number(obra.presupuesto_inicial)

    // Obtener todos los gastos de esta obra agrupados por mes
    const gastos = await prisma.gasto.findMany({
      where: {
        partida: {
          presupuesto: {
            id_obra: obraId
          }
        }
      },
      select: {
        monto: true,
        fecha_gasto: true
      },
      orderBy: { fecha_gasto: 'asc' }
    })

    // Si no hay gastos, devolver array vacío con mensaje informativo
    if (gastos.length === 0) {
      return NextResponse.json({
        valorizaciones: [],
        presupuestoTotal,
        totalEjecutado: 0,
        avancePorcentaje: 0,
        obra,
        mensaje: 'No hay gastos registrados para esta obra. Registra gastos en las partidas para ver el avance.'
      })
    }

    // Agrupar gastos por mes (formato: YYYY-MM)
    const gastosPorMes: Record<string, number> = {}
    
    gastos.forEach(gasto => {
      const fecha = new Date(gasto.fecha_gasto)
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      gastosPorMes[mesKey] = (gastosPorMes[mesKey] || 0) + Number(gasto.monto)
    })

    // Ordenar meses cronológicamente
    const mesesOrdenados = Object.keys(gastosPorMes).sort()

    if (mesesOrdenados.length === 0) {
      return NextResponse.json({
        valorizaciones: [],
        presupuestoTotal,
        totalEjecutado: 0,
        avancePorcentaje: 0,
        obra,
        mensaje: 'No hay gastos registrados'
      })
    }

    // Calcular el programado mensual
    // Opción 1: Distribución lineal del presupuesto entre los meses
    const cantidadMeses = mesesOrdenados.length
    const programadoMensual = presupuestoTotal / Math.max(cantidadMeses, 1)

    // Generar valorizaciones con datos acumulados
    let acumuladoEjecutado = 0
    let acumuladoProgramado = 0

    const valorizaciones = mesesOrdenados.map((mes, index) => {
      const parcialEjecutado = gastosPorMes[mes]
      acumuladoEjecutado += parcialEjecutado
      acumuladoProgramado += programadoMensual

      // Formatear nombre del mes en español
      const [year, month] = mes.split('-')
      const fecha = new Date(parseInt(year), parseInt(month) - 1)
      
      const nombreMes = fecha.toLocaleDateString('es-PE', { 
        month: 'short', 
        year: '2-digit' 
      })
      
      // Capitalizar primera letra
      const mesFormateado = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)

      return {
        mes: mesFormateado,
        mesCorto: mesFormateado,
        mesKey: mes, // Para ordenamiento
        parcial: parcialEjecutado,
        acumulado: acumuladoEjecutado,
        parcialPorcentaje: (parcialEjecutado / presupuestoTotal) * 100,
        acumuladoPorcentaje: (acumuladoEjecutado / presupuestoTotal) * 100,
        programado: programadoMensual,
        programadoAcumulado: acumuladoProgramado
      }
    })

    return NextResponse.json({
      valorizaciones,
      presupuestoTotal,
      totalEjecutado: acumuladoEjecutado,
      avancePorcentaje: (acumuladoEjecutado / presupuestoTotal) * 100,
      obra,
      cantidadMeses: mesesOrdenados.length
    })
    
  } catch (error) {
    console.error('Error en valorizaciones:', error)
    return NextResponse.json(
      { error: 'Error al obtener valorizaciones' }, 
      { status: 500 }
    )
  }
}

// POST - Registrar un nuevo gasto/valorización
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Solo administradores pueden registrar gastos
    if (session.rol.nombre !== 'ADMINISTRADOR' && session.rol.nombre !== 'RESIDENTE') {
      return NextResponse.json({ error: 'Sin permisos para esta acción' }, { status: 403 })
    }

    const { id } = await params
    const obraId = parseInt(id)
    const body = await request.json()

    const { id_partida, monto, descripcion, fecha_gasto } = body

    // Validaciones
    if (!id_partida || !monto) {
      return NextResponse.json({ 
        error: 'Se requiere id_partida y monto' 
      }, { status: 400 })
    }

    if (isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      return NextResponse.json({ 
        error: 'El monto debe ser un número positivo' 
      }, { status: 400 })
    }

    // Verificar que la partida pertenece a esta obra
    const partida = await prisma.partida.findFirst({
      where: {
        id_partida: parseInt(id_partida),
        presupuesto: {
          id_obra: obraId
        }
      },
      include: {
        presupuesto: {
          include: {
            obra: true
          }
        }
      }
    })

    if (!partida) {
      return NextResponse.json({ 
        error: 'Partida no encontrada o no pertenece a esta obra' 
      }, { status: 404 })
    }

    // Crear el gasto
    const montoNumerico = parseFloat(monto)
    
    const gasto = await prisma.gasto.create({
      data: {
        id_partida: parseInt(id_partida),
        monto: montoNumerico,
        descripcion: descripcion || `Valorización del ${new Date().toLocaleDateString('es-PE')}`,
        fecha_gasto: fecha_gasto ? new Date(fecha_gasto) : new Date(),
        id_usuario: session.id_usuario
      }
    })

    // Actualizar monto ejecutado de la partida
    const partidaActualizada = await prisma.partida.update({
      where: { id_partida: parseInt(id_partida) },
      data: {
        monto_ejecutado: {
          increment: montoNumerico
        }
      }
    })

    // Verificar si la partida alcanzó el 100%
    const avancePartida = (Number(partidaActualizada.monto_ejecutado) / Number(partidaActualizada.monto_asignado)) * 100
    
    if (avancePartida >= 100) {
      // Crear alerta de partida completa
      await prisma.alerta.create({
        data: {
          tipo: 'PARTIDA_COMPLETA',
          descripcion: `La partida "${partidaActualizada.nombre_partida}" ha alcanzado el 100% de ejecución en la obra "${partida.presupuesto.obra.nombre_obra}"`,
          nivel: 'MEDIA',
          destinatario: 'ADMINISTRADOR',
          estado: 'ACTIVA'
        }
      })
    }

    // Registrar en log de actividad
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PRESUPUESTO',
        accion: `Registrar gasto: S/ ${montoNumerico.toFixed(2)} en partida "${partida.nombre_partida}"`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ 
      message: 'Gasto registrado correctamente',
      gasto,
      partidaActualizada: {
        id_partida: partidaActualizada.id_partida,
        nombre_partida: partidaActualizada.nombre_partida,
        monto_ejecutado: partidaActualizada.monto_ejecutado,
        avance: avancePartida.toFixed(2)
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error al crear gasto:', error)
    return NextResponse.json(
      { error: 'Error al registrar el gasto' }, 
      { status: 500 }
    )
  }
}
