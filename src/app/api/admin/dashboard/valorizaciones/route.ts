// src/app/api/admin/dashboard/valorizaciones/route.ts
// API para obtener datos de valorizaciones mensuales para la Curva S
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface ValorizacionMensual {
  mes: string
  mesCorto: string
  mesNumero: number
  anio: number
  parcial: number
  acumulado: number
  parcialPorcentaje: number
  acumuladoPorcentaje: number
  programado: number
  programadoAcumulado: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const obrasIds = searchParams.get('obras') // IDs separados por coma: "1,2,3"
    const anio = searchParams.get('anio')
    const mes = searchParams.get('mes')

    // Construir filtro de obras
    let obraFilter: number[] = []
    if (obrasIds && obrasIds !== 'todas') {
      obraFilter = obrasIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
    }

    // Obtener obras con sus presupuestos y gastos
    const obras = await prisma.obra.findMany({
      where: obraFilter.length > 0 ? { id_obra: { in: obraFilter } } : undefined,
      include: {
        presupuestos: {
          where: { estado: 'VIGENTE' },
          include: {
            partidas: {
              include: {
                gastos: {
                  orderBy: { fecha_gasto: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (obras.length === 0) {
      return NextResponse.json({
        valorizaciones: [],
        resumen: {
          presupuestoTotal: 0,
          ejecutadoTotal: 0,
          avanceGeneral: 0,
          obrasCount: 0
        }
      })
    }

    // Calcular presupuesto total
    const presupuestoTotal = obras.reduce((sum, obra) => sum + Number(obra.presupuesto_inicial || 0), 0)

    // Recolectar todos los gastos de todas las obras seleccionadas
    const todosLosGastos: { fecha: Date; monto: number }[] = []
    
    obras.forEach(obra => {
      obra.presupuestos.forEach(presupuesto => {
        presupuesto.partidas.forEach(partida => {
          partida.gastos.forEach(gasto => {
            todosLosGastos.push({
              fecha: new Date(gasto.fecha_gasto),
              monto: Number(gasto.monto)
            })
          })
        })
      })
    })

    // Si no hay gastos, crear valorizaciones basadas en monto_ejecutado de partidas
    if (todosLosGastos.length === 0) {
      // Usar monto_ejecutado de las partidas como datos
      let totalEjecutado = 0
      const partidasConEjecutado: { nombre: string; asignado: number; ejecutado: number }[] = []
      
      obras.forEach(obra => {
        obra.presupuestos.forEach(presupuesto => {
          presupuesto.partidas.forEach(partida => {
            totalEjecutado += Number(partida.monto_ejecutado || 0)
            partidasConEjecutado.push({
              nombre: partida.nombre_partida,
              asignado: Number(partida.monto_asignado || 0),
              ejecutado: Number(partida.monto_ejecutado || 0)
            })
          })
        })
      })

      // Si hay ejecución en partidas, generar un mes con ese dato
      if (totalEjecutado > 0) {
        const mesActual = new Date()
        const nombreMes = mesActual.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' })
        
        return NextResponse.json({
          valorizaciones: [{
            mes: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
            mesCorto: nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1),
            mesNumero: mesActual.getMonth() + 1,
            anio: mesActual.getFullYear(),
            parcial: totalEjecutado,
            acumulado: totalEjecutado,
            parcialPorcentaje: presupuestoTotal > 0 ? (totalEjecutado / presupuestoTotal) * 100 : 0,
            acumuladoPorcentaje: presupuestoTotal > 0 ? (totalEjecutado / presupuestoTotal) * 100 : 0,
            programado: presupuestoTotal,
            programadoAcumulado: presupuestoTotal
          }],
          partidas: partidasConEjecutado,
          resumen: {
            presupuestoTotal,
            ejecutadoTotal: totalEjecutado,
            avanceGeneral: presupuestoTotal > 0 ? (totalEjecutado / presupuestoTotal) * 100 : 0,
            obrasCount: obras.length
          }
        })
      }

      return NextResponse.json({
        valorizaciones: [],
        partidas: [],
        resumen: {
          presupuestoTotal,
          ejecutadoTotal: 0,
          avanceGeneral: 0,
          obrasCount: obras.length
        },
        mensaje: 'No hay gastos ni ejecución registrada. Registre gastos o actualice monto_ejecutado en las partidas.'
      })
    }

    // Agrupar gastos por mes
    const gastosPorMes: Record<string, number> = {}
    
    todosLosGastos.forEach(gasto => {
      const fecha = gasto.fecha
      // Filtrar por año si se especifica
      if (anio && anio !== 'todos' && fecha.getFullYear().toString() !== anio) return
      // Filtrar por mes si se especifica
      if (mes && mes !== 'todos' && (fecha.getMonth() + 1).toString() !== mes) return
      
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      gastosPorMes[key] = (gastosPorMes[key] || 0) + gasto.monto
    })

    // Ordenar meses cronológicamente
    const mesesOrdenados = Object.keys(gastosPorMes).sort()

    if (mesesOrdenados.length === 0) {
      return NextResponse.json({
        valorizaciones: [],
        resumen: {
          presupuestoTotal,
          ejecutadoTotal: 0,
          avanceGeneral: 0,
          obrasCount: obras.length
        },
        mensaje: 'No hay gastos en el período seleccionado'
      })
    }

    // Determinar rango de meses para programado
    const primerMes = new Date(mesesOrdenados[0] + '-01')
    const ultimoMes = new Date(mesesOrdenados[mesesOrdenados.length - 1] + '-01')
    
    // Calcular meses totales del proyecto
    const mesesTotales = Math.max(
      mesesOrdenados.length,
      Math.ceil((ultimoMes.getTime() - primerMes.getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1
    )
    
    const programadoMensual = presupuestoTotal / mesesTotales

    // Generar valorizaciones
    let acumuladoEjecutado = 0
    let acumuladoProgramado = 0
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    const valorizaciones: ValorizacionMensual[] = mesesOrdenados.map((mesKey, index) => {
      const [anioStr, mesStr] = mesKey.split('-')
      const anioNum = parseInt(anioStr)
      const mesNum = parseInt(mesStr)
      
      const parcial = gastosPorMes[mesKey]
      acumuladoEjecutado += parcial
      acumuladoProgramado += programadoMensual

      const mesCorto = `${nombresMeses[mesNum - 1]}-${anioStr.slice(2)}`

      return {
        mes: `${nombresMeses[mesNum - 1]}-${anioStr.slice(2)}`,
        mesCorto,
        mesNumero: mesNum,
        anio: anioNum,
        parcial,
        acumulado: acumuladoEjecutado,
        parcialPorcentaje: presupuestoTotal > 0 ? (parcial / presupuestoTotal) * 100 : 0,
        acumuladoPorcentaje: presupuestoTotal > 0 ? (acumuladoEjecutado / presupuestoTotal) * 100 : 0,
        programado: programadoMensual,
        programadoAcumulado: acumuladoProgramado
      }
    })

    // Obtener partidas para el detalle
    const partidasDetalle: { nombre: string; asignado: number; ejecutado: number }[] = []
    obras.forEach(obra => {
      obra.presupuestos.forEach(presupuesto => {
        presupuesto.partidas.forEach(partida => {
          partidasDetalle.push({
            nombre: partida.nombre_partida,
            asignado: Number(partida.monto_asignado || 0),
            ejecutado: Number(partida.monto_ejecutado || 0)
          })
        })
      })
    })

    return NextResponse.json({
      valorizaciones,
      partidas: partidasDetalle,
      resumen: {
        presupuestoTotal,
        ejecutadoTotal: acumuladoEjecutado,
        avanceGeneral: presupuestoTotal > 0 ? (acumuladoEjecutado / presupuestoTotal) * 100 : 0,
        obrasCount: obras.length
      },
      filtros: {
        obrasSeleccionadas: obraFilter.length > 0 ? obraFilter : 'todas',
        anio: anio || 'todos',
        mes: mes || 'todos'
      }
    })
  } catch (error) {
    console.error('Error en valorizaciones:', error)
    return NextResponse.json({ error: 'Error al obtener valorizaciones' }, { status: 500 })
  }
}
