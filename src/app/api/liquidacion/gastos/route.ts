// src/app/api/liquidacion/gastos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Listar gastos de una obra
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const id_obra = searchParams.get('id_obra')

    if (!id_obra) {
      return NextResponse.json({ error: 'Se requiere id_obra' }, { status: 400 })
    }

    console.log('💰 [LIQ-GAST] Obteniendo gastos para obra:', id_obra)

    // Obtener gastos a través de las partidas del presupuesto de la obra
    const gastos = await prisma.gasto.findMany({
      where: {
        partida: {
          presupuesto: {
            id_obra: parseInt(id_obra)
          }
        }
      },
      include: {
        partida: {
          select: {
            id_partida: true,
            nombre_partida: true,
            presupuesto: {
              select: {
                id_obra: true
              }
            }
          }
        },
        usuario: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: { fecha_gasto: 'desc' }
    })

    // Transformar al formato esperado por el frontend
    const gastosFormateados = gastos.map(g => ({
      id_gasto: g.id_gasto,
      id_partida: g.id_partida,
      id_obra: g.partida.presupuesto.id_obra,
      descripcion: g.descripcion,
      monto: Number(g.monto),
      tipo_documento: 'FACTURA',
      numero_documento: g.documento_respaldo || '-',
      fecha_documento: g.fecha_gasto,
      fecha_registro: g.fecha_gasto,
      observaciones: null,
      partida: {
        id_partida: g.partida.id_partida,
        codigo: `P-${String(g.partida.id_partida).padStart(3, '0')}`,
        descripcion: g.partida.nombre_partida
      }
    }))

    console.log(`✅ [LIQ-GAST] Se encontraron ${gastosFormateados.length} gastos`)

    return NextResponse.json({ gastos: gastosFormateados })
  } catch (error) {
    console.error('❌ [LIQ-GAST] Error:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

// POST - Registrar nuevo gasto
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { 
      id_obra,
      id_partida, 
      descripcion, 
      monto, 
      numero_documento, 
      fecha_documento
    } = body

    if (!id_partida || !descripcion || !monto) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos (id_partida, descripcion, monto)' 
      }, { status: 400 })
    }

    // Verificar que la partida existe
    const partida = await prisma.partida.findUnique({
      where: { id_partida: parseInt(id_partida) },
      include: { presupuesto: true }
    })

    if (!partida) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    // Crear gasto según el schema existente
    const gasto = await prisma.gasto.create({
      data: {
        id_partida: parseInt(id_partida),
        monto: parseFloat(monto),
        descripcion,
        fecha_gasto: fecha_documento ? new Date(fecha_documento) : new Date(),
        documento_respaldo: numero_documento || null,
        id_usuario: session.id_usuario
      },
      include: {
        partida: {
          select: {
            nombre_partida: true
          }
        }
      }
    })

    // Actualizar monto_ejecutado de la partida
    const totalGastos = await prisma.gasto.aggregate({
      where: { id_partida: parseInt(id_partida) },
      _sum: { monto: true }
    })

    await prisma.partida.update({
      where: { id_partida: parseInt(id_partida) },
      data: { monto_ejecutado: totalGastos._sum.monto || 0 }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Registrar gasto: ${descripcion} - S/ ${parseFloat(monto).toFixed(2)}`,
          id_obra: id_obra ? parseInt(id_obra) : partida.presupuesto.id_obra,
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    console.log(`✅ [LIQ-GAST] Gasto registrado: ${gasto.id_gasto}`)

    return NextResponse.json({
      message: 'Gasto registrado correctamente',
      gasto: {
        id_gasto: gasto.id_gasto,
        descripcion: gasto.descripcion,
        monto: Number(gasto.monto),
        fecha_documento: gasto.fecha_gasto
      }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ [LIQ-GAST] Error al crear:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error al registrar gasto' 
    }, { status: 500 })
  }
}
