// src/app/api/admin/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const aniosParam = searchParams.get('anios')
    const estadosParam = searchParams.get('estados')
    const ubicacionesParam = searchParams.get('ubicaciones')
    const obrasParam = searchParams.get('obras')
    const obraIdParam = searchParams.get('obraId')

    const anios = aniosParam ? aniosParam.split(',').filter(Boolean).map(Number) : []
    const estados = estadosParam ? estadosParam.split(',').filter(Boolean) : []
    const ubicaciones = ubicacionesParam ? ubicacionesParam.split(',').filter(Boolean) : []
    const obrasIds = obrasParam ? obrasParam.split(',').filter(Boolean).map(Number) : []
    const obraId = obraIdParam ? parseInt(obraIdParam) : null

    // Construir filtro
    const whereObra: Record<string, unknown> = {}
    
    if (anios.length > 0) {
      whereObra.OR = anios.map(anio => ({
        fecha_inicio_prevista: { 
          gte: new Date(anio, 0, 1), 
          lt: new Date(anio + 1, 0, 1) 
        }
      }))
    }
    if (estados.length > 0) {
      whereObra.estado = { in: estados }
    }
    if (ubicaciones.length > 0) {
      whereObra.ubicacion = { in: ubicaciones }
    }
    if (obrasIds.length > 0) {
      whereObra.id_obra = { in: obrasIds }
    }
    if (obraId) {
      whereObra.id_obra = obraId
    }

    // Obtener todas las obras con relaciones según el schema
    const obras = await prisma.obra.findMany({
      where: Object.keys(whereObra).length > 0 ? whereObra : undefined,
      include: {
        responsable: {
          select: { id_usuario: true, nombre: true, correo: true }
        },
        presupuestos: {
          include: {
            partidas: {
              include: {
                gastos: {
                  orderBy: { fecha_gasto: 'asc' }
                },
                actividades: {
                  include: {
                    gastos: true
                  }
                }
              }
            }
          }
        },
        documentos: true
      },
      orderBy: { fecha_creacion: 'desc' }
    })

    // Calcular estadísticas
    const totalObras = obras.length
    const obrasPlaneadas = obras.filter(o => o.estado === 'PLANEADA').length
    const obrasEnEjecucion = obras.filter(o => o.estado === 'EN_EJECUCION').length
    const obrasConcluidas = obras.filter(o => o.estado === 'CONCLUIDA').length
    const obrasLiquidadas = obras.filter(o => o.estado === 'LIQUIDADA').length

    let presupuestoTotal = 0
    let ejecutadoTotal = 0
    let totalPartidas = 0
    let totalActividades = 0
    let totalGastos = 0
    let totalDocumentos = 0

    const datosPorMes: Record<string, { parcial: number; gastos: number }> = {}
    const gastosPorTipo: Record<string, number> = {}
    const gastosPorPartida: Record<string, { nombre: string; monto: number; presupuesto: number }> = {}

    // Procesar cada obra
    const obrasDetalle = obras.map(obra => {
      const presupuestoObra = Number(obra.presupuesto_inicial) || 0
      presupuestoTotal += presupuestoObra
      totalDocumentos += obra.documentos?.length || 0

      let ejecutadoObra = 0
      let partidasObra = 0
      let actividadesObra = 0
      let gastosObra = 0
      let presupuestoPartidas = 0

      const gastosMensualesObra: Record<string, { ejecutado: number }> = {}
      const partidasObrasDetalle: Array<{
        id: number
        codigo: string
        nombre: string
        presupuesto: number
        ejecutado: number
        avance: number
      }> = []

      // Procesar presupuestos y partidas
      if (obra.presupuestos) {
        obra.presupuestos.forEach(pres => {
          if (pres.partidas) {
            pres.partidas.forEach(partida => {
              partidasObra++
              totalPartidas++
              
              const montoPartida = Number(partida.monto_asignado) || 0
              const ejecutadoPartida = Number(partida.monto_ejecutado) || 0
              presupuestoPartidas += montoPartida
              ejecutadoObra += ejecutadoPartida

              partidasObrasDetalle.push({
                id: partida.id_partida,
                codigo: `P-${partida.id_partida.toString().padStart(3, '0')}`,
                nombre: partida.nombre_partida,
                presupuesto: montoPartida,
                ejecutado: ejecutadoPartida,
                avance: montoPartida > 0 ? (ejecutadoPartida / montoPartida) * 100 : 0
              })

              // Agrupar por partida global
              const keyPartida = partida.nombre_partida
              if (!gastosPorPartida[keyPartida]) {
                gastosPorPartida[keyPartida] = { nombre: partida.nombre_partida, monto: 0, presupuesto: montoPartida }
              }
              gastosPorPartida[keyPartida].monto += ejecutadoPartida

              // Procesar gastos de la partida
              if (partida.gastos) {
                partida.gastos.forEach(gasto => {
                  gastosObra++
                  totalGastos++
                  const montoGasto = Number(gasto.monto) || 0
                  const tipo = gasto.tipo_comprobante || 'SIN_TIPO'
                  gastosPorTipo[tipo] = (gastosPorTipo[tipo] || 0) + montoGasto

                  const fecha = new Date(gasto.fecha_gasto)
                  const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
                  
                  if (!datosPorMes[mesKey]) {
                    datosPorMes[mesKey] = { parcial: 0, gastos: 0 }
                  }
                  datosPorMes[mesKey].parcial += montoGasto
                  datosPorMes[mesKey].gastos++

                  if (!gastosMensualesObra[mesKey]) {
                    gastosMensualesObra[mesKey] = { ejecutado: 0 }
                  }
                  gastosMensualesObra[mesKey].ejecutado += montoGasto
                })
              }

              // Procesar actividades
              if (partida.actividades) {
                partida.actividades.forEach(() => {
                  actividadesObra++
                  totalActividades++
                })
              }
            })
          }
        })
      }

      ejecutadoTotal += ejecutadoObra

      // Calcular avances
      const basePresupuesto = presupuestoObra > 0 ? presupuestoObra : presupuestoPartidas
      const avanceFisico = basePresupuesto > 0 ? (ejecutadoObra / basePresupuesto) * 100 : 0
      const avanceFinanciero = presupuestoPartidas > 0 ? (ejecutadoObra / presupuestoPartidas) * 100 : avanceFisico
      const saldo = presupuestoObra - ejecutadoObra

      // Calcular días y estado
      const hoy = new Date()
      let diasRetraso = 0
      let diasTranscurridos = 0
      let diasTotales = 0
      let avanceProgramado = 0
      let estadoSemaforo = 'VERDE'

      if (obra.fecha_inicio_prevista) {
        diasTranscurridos = Math.max(0, Math.ceil((hoy.getTime() - new Date(obra.fecha_inicio_prevista).getTime()) / (1000 * 60 * 60 * 24)))
      }

      if (obra.fecha_inicio_prevista && obra.fecha_fin_prevista) {
        diasTotales = Math.ceil((new Date(obra.fecha_fin_prevista).getTime() - new Date(obra.fecha_inicio_prevista).getTime()) / (1000 * 60 * 60 * 24))
        avanceProgramado = diasTotales > 0 ? Math.min(100, (diasTranscurridos / diasTotales) * 100) : 0
      }

      if (obra.fecha_fin_prevista && hoy > new Date(obra.fecha_fin_prevista) && !['CONCLUIDA', 'LIQUIDADA'].includes(obra.estado)) {
        diasRetraso = Math.ceil((hoy.getTime() - new Date(obra.fecha_fin_prevista).getTime()) / (1000 * 60 * 60 * 24))
      }

      // Determinar semáforo
      const diferencia = avanceFisico - avanceProgramado
      if (diferencia >= 0) {
        estadoSemaforo = 'VERDE'
      } else if (diferencia >= -10) {
        estadoSemaforo = 'AMARILLO'
      } else {
        estadoSemaforo = 'ROJO'
      }
      
      if (diasRetraso > 30) {
        estadoSemaforo = 'ROJO'
      } else if (diasRetraso > 0) {
        estadoSemaforo = 'AMARILLO'
      }

      // Generar Curva S para esta obra
      const mesesOrdenados = Object.keys(gastosMensualesObra).sort()
      let acumuladoObra = 0
      const curvaSObra = mesesOrdenados.map((mesKey, idx) => {
        const data = gastosMensualesObra[mesKey]
        acumuladoObra += data.ejecutado
        const [year, month] = mesKey.split('-')
        const nombreMes = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-PE', { month: 'short', year: '2-digit' })
        const totalMeses = Math.max(mesesOrdenados.length, 6)
        const programadoAcumulado = basePresupuesto * ((idx + 1) / totalMeses)
        
        return {
          mes: nombreMes,
          mesKey,
          parcial: data.ejecutado,
          acumulado: acumuladoObra,
          parcialPorcentaje: basePresupuesto > 0 ? (data.ejecutado / basePresupuesto) * 100 : 0,
          acumuladoPorcentaje: basePresupuesto > 0 ? (acumuladoObra / basePresupuesto) * 100 : 0,
          programadoAcumulado,
          programadoPorcentaje: basePresupuesto > 0 ? (programadoAcumulado / basePresupuesto) * 100 : 0
        }
      })

      // Última actualización
      let ultimaActualizacion = obra.fecha_actualizacion || obra.fecha_creacion
      if (obra.presupuestos) {
        obra.presupuestos.forEach(p => {
          if (p.partidas) {
            p.partidas.forEach(par => {
              if (par.gastos) {
                par.gastos.forEach(g => {
                  if (new Date(g.fecha_gasto) > new Date(ultimaActualizacion)) {
                    ultimaActualizacion = g.fecha_gasto
                  }
                })
              }
            })
          }
        })
      }

      return {
        id_obra: obra.id_obra,
        nombre_obra: obra.nombre_obra,
        descripcion: obra.ubicacion || '',
        ubicacion: obra.ubicacion || 'Sin ubicación',
        presupuesto_inicial: presupuestoObra,
        presupuesto_partidas: presupuestoPartidas,
        ejecutado: ejecutadoObra,
        saldo,
        estado: obra.estado,
        avanceFisico: Math.round(avanceFisico * 100) / 100,
        avanceFinanciero: Math.round(avanceFinanciero * 100) / 100,
        avanceProgramado: Math.round(avanceProgramado * 100) / 100,
        diferenciaAvance: Math.round((avanceFisico - avanceProgramado) * 100) / 100,
        partidas: partidasObra,
        actividades: actividadesObra,
        gastos: gastosObra,
        documentos: obra.documentos?.length || 0,
        alertas: 0,
        fecha_inicio: obra.fecha_inicio_prevista?.toISOString() || null,
        fecha_fin: obra.fecha_fin_prevista?.toISOString() || null,
        fecha_creacion: obra.fecha_creacion?.toISOString() || null,
        ultima_actualizacion: ultimaActualizacion?.toISOString() || null,
        responsable: obra.responsable?.nombre || 'Sin asignar',
        responsable_email: obra.responsable?.correo || '',
        diasTranscurridos,
        diasTotales,
        diasRetraso,
        estadoSemaforo,
        curvaS: curvaSObra,
        partidasDetalle: partidasObrasDetalle
      }
    })

    // Curva S global
    const mesesGlobal = Object.keys(datosPorMes).sort()
    let acumuladoGlobal = 0
    const curvaSGlobal = mesesGlobal.map((mesKey, idx) => {
      const data = datosPorMes[mesKey]
      acumuladoGlobal += data.parcial
      const [year, month] = mesKey.split('-')
      const nombreMes = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-PE', { month: 'short', year: '2-digit' })
      const totalMeses = Math.max(mesesGlobal.length, 6)
      const programadoAcumulado = presupuestoTotal * ((idx + 1) / totalMeses)
      
      return {
        mes: nombreMes,
        mesKey,
        parcial: data.parcial,
        acumulado: acumuladoGlobal,
        cantidadGastos: data.gastos,
        parcialPorcentaje: presupuestoTotal > 0 ? (data.parcial / presupuestoTotal) * 100 : 0,
        acumuladoPorcentaje: presupuestoTotal > 0 ? (acumuladoGlobal / presupuestoTotal) * 100 : 0,
        programadoAcumulado,
        programadoPorcentaje: presupuestoTotal > 0 ? (programadoAcumulado / presupuestoTotal) * 100 : 0
      }
    })

    // Estadísticas derivadas
    const obrasConRetraso = obrasDetalle.filter(o => o.diasRetraso > 0).length
    const obrasCriticas = obrasDetalle.filter(o => o.estadoSemaforo === 'ROJO').length
    const obrasEnRiesgo = obrasDetalle.filter(o => o.estadoSemaforo === 'AMARILLO').length
    const obrasEnPlazo = obrasDetalle.filter(o => o.estadoSemaforo === 'VERDE').length

    // Distribuciones
    const distribucionComprobantes = Object.entries(gastosPorTipo).map(([tipo, monto]) => ({
      tipo: tipo === 'SIN_TIPO' ? 'Sin Tipo' : tipo,
      monto,
      porcentaje: ejecutadoTotal > 0 ? (monto / ejecutadoTotal) * 100 : 0
    })).sort((a, b) => b.monto - a.monto)

    const distribucionPartidas = Object.entries(gastosPorPartida).map(([nombre, data]) => ({
      codigo: nombre.substring(0, 10),
      nombre: data.nombre,
      ejecutado: data.monto,
      presupuesto: data.presupuesto,
      avance: data.presupuesto > 0 ? (data.monto / data.presupuesto) * 100 : 0
    })).sort((a, b) => b.ejecutado - a.ejecutado).slice(0, 15)

    // Por ubicación
    const porUbicacion: Record<string, { presupuesto: number; ejecutado: number; obras: number }> = {}
    obrasDetalle.forEach(o => {
      const ubi = o.ubicacion || 'Sin ubicación'
      if (!porUbicacion[ubi]) {
        porUbicacion[ubi] = { presupuesto: 0, ejecutado: 0, obras: 0 }
      }
      porUbicacion[ubi].presupuesto += o.presupuesto_inicial
      porUbicacion[ubi].ejecutado += o.ejecutado
      porUbicacion[ubi].obras++
    })

    const distribucionUbicacion = Object.entries(porUbicacion).map(([ubicacion, data]) => ({
      ubicacion,
      presupuesto: data.presupuesto,
      ejecutado: data.ejecutado,
      obras: data.obras,
      avance: data.presupuesto > 0 ? (data.ejecutado / data.presupuesto) * 100 : 0
    })).sort((a, b) => b.presupuesto - a.presupuesto)

    // Por responsable
    const porResponsable: Record<string, { nombre: string; presupuesto: number; ejecutado: number; obras: number }> = {}
    obrasDetalle.forEach(o => {
      const key = o.responsable
      if (!porResponsable[key]) {
        porResponsable[key] = { nombre: key, presupuesto: 0, ejecutado: 0, obras: 0 }
      }
      porResponsable[key].presupuesto += o.presupuesto_inicial
      porResponsable[key].ejecutado += o.ejecutado
      porResponsable[key].obras++
    })

    const distribucionResponsable = Object.values(porResponsable).map(data => ({
      nombre: data.nombre,
      presupuesto: data.presupuesto,
      ejecutado: data.ejecutado,
      obras: data.obras,
      avance: data.presupuesto > 0 ? (data.ejecutado / data.presupuesto) * 100 : 0
    })).sort((a, b) => b.obras - a.obras)

    // Por año
    const porAnio: Record<number, { presupuesto: number; ejecutado: number; obras: number }> = {}
    obrasDetalle.forEach(o => {
      const anio = o.fecha_inicio ? new Date(o.fecha_inicio).getFullYear() : new Date().getFullYear()
      if (!porAnio[anio]) {
        porAnio[anio] = { presupuesto: 0, ejecutado: 0, obras: 0 }
      }
      porAnio[anio].presupuesto += o.presupuesto_inicial
      porAnio[anio].ejecutado += o.ejecutado
      porAnio[anio].obras++
    })

    const distribucionAnual = Object.entries(porAnio).map(([anio, data]) => ({
      anio: parseInt(anio),
      presupuesto: data.presupuesto,
      ejecutado: data.ejecutado,
      obras: data.obras,
      avance: data.presupuesto > 0 ? (data.ejecutado / data.presupuesto) * 100 : 0
    })).sort((a, b) => a.anio - b.anio)

    // Comparativo avances
    const comparativoAvances = obrasDetalle.map(o => ({
      id: o.id_obra,
      nombre: o.nombre_obra.length > 30 ? o.nombre_obra.substring(0, 30) + '...' : o.nombre_obra,
      avanceFisico: o.avanceFisico,
      avanceFinanciero: o.avanceFinanciero,
      avanceProgramado: o.avanceProgramado,
      diferencia: o.diferenciaAvance
    }))

    // Retrasos
    const retrasosPorObra = obrasDetalle
      .filter(o => o.diasRetraso > 0)
      .sort((a, b) => b.diasRetraso - a.diasRetraso)
      .slice(0, 10)
      .map(o => ({
        id: o.id_obra,
        nombre: o.nombre_obra.length > 35 ? o.nombre_obra.substring(0, 35) + '...' : o.nombre_obra,
        diasRetraso: o.diasRetraso,
        avance: o.avanceFisico,
        estado: o.estado
      }))

    // Obtener filtros disponibles (de todas las obras, no filtradas)
    const todasObras = await prisma.obra.findMany({
      select: {
        id_obra: true,
        nombre_obra: true,
        ubicacion: true,
        fecha_inicio_prevista: true,
        responsable: {
          select: { id_usuario: true, nombre: true }
        }
      }
    })

    const ubicacionesDisponibles = [...new Set(
      todasObras.map(o => o.ubicacion).filter((u): u is string => Boolean(u))
    )].sort()

    const aniosDisponibles = [...new Set(
      todasObras
        .map(o => o.fecha_inicio_prevista ? new Date(o.fecha_inicio_prevista).getFullYear() : null)
        .filter((a): a is number => a !== null)
    )].sort((a, b) => b - a)

    const responsablesMap = new Map<number, { id_usuario: number; nombre: string }>()
    todasObras.forEach(o => {
      if (o.responsable) {
        responsablesMap.set(o.responsable.id_usuario, o.responsable)
      }
    })
    const responsablesDisponibles = Array.from(responsablesMap.values())

    return NextResponse.json({
      resumen: {
        totalObras,
        obrasPlaneadas,
        obrasEnEjecucion,
        obrasConcluidas,
        obrasLiquidadas,
        obrasConRetraso,
        obrasCriticas,
        obrasEnRiesgo,
        obrasEnPlazo,
        presupuestoTotal,
        ejecutadoTotal,
        saldoPendiente: presupuestoTotal - ejecutadoTotal,
        avancePromedio: presupuestoTotal > 0 ? Math.round((ejecutadoTotal / presupuestoTotal) * 10000) / 100 : 0,
        totalPartidas,
        totalActividades,
        totalGastos,
        totalDocumentos,
        totalAlertas: 0
      },
      graficos: {
        estadisticasPorEstado: [
          { estado: 'PLANEADA', label: 'Planeada', cantidad: obrasPlaneadas, color: '#8b5cf6' },
          { estado: 'EN_EJECUCION', label: 'En Ejecución', cantidad: obrasEnEjecucion, color: '#22c55e' },
          { estado: 'CONCLUIDA', label: 'Concluida', cantidad: obrasConcluidas, color: '#f59e0b' },
          { estado: 'LIQUIDADA', label: 'Liquidada', cantidad: obrasLiquidadas, color: '#06b6d4' }
        ],
        semaforoGeneral: { verde: obrasEnPlazo, amarillo: obrasEnRiesgo, rojo: obrasCriticas },
        curvaSGlobal,
        distribucionComprobantes,
        distribucionPartidas,
        distribucionUbicacion,
        distribucionResponsable,
        distribucionAnual,
        comparativoAvances,
        retrasosPorObra,
        topObrasPorPresupuesto: [...obrasDetalle].sort((a, b) => b.presupuesto_inicial - a.presupuesto_inicial).slice(0, 10),
        topObrasPorAvance: [...obrasDetalle].sort((a, b) => b.avanceFisico - a.avanceFisico).slice(0, 10),
        topObrasPorEjecucion: [...obrasDetalle].sort((a, b) => b.ejecutado - a.ejecutado).slice(0, 10)
      },
      obras: obrasDetalle,
      filtros: {
        ubicaciones: ubicacionesDisponibles,
        anios: aniosDisponibles,
        responsables: responsablesDisponibles,
        estados: ['PLANEADA', 'EN_EJECUCION', 'CONCLUIDA', 'LIQUIDADA'],
        obrasDisponibles: todasObras.map(o => ({ id: o.id_obra, nombre: o.nombre_obra }))
      },
      fechaActualizacion: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error dashboard stats:', error)
    return NextResponse.json({ 
      error: 'Error al obtener estadísticas', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
