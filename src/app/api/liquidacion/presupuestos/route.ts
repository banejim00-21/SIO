// src/app/api/liquidacion/presupuestos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Listar presupuestos y partidas de una obra
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

    console.log('📊 [LIQ-PRES] Obteniendo presupuestos para obra:', id_obra)

    // Obtener presupuesto vigente de la obra
    const presupuesto = await prisma.presupuesto.findFirst({
      where: {
        id_obra: parseInt(id_obra),
        estado: 'VIGENTE'
      },
      include: {
        partidas: {
          orderBy: { nombre_partida: 'asc' }
        },
        responsable: {
          select: { nombre: true }
        }
      },
      orderBy: { version: 'desc' }
    })

    // Transformar partidas al formato esperado por el frontend
    const partidas = presupuesto?.partidas.map(p => ({
      id_partida: p.id_partida,
      id_presupuesto: p.id_presupuesto,
      codigo: `P-${String(p.id_partida).padStart(3, '0')}`,
      descripcion: p.nombre_partida,
      unidad: 'GLB',
      cantidad: 1,
      precio_unitario: Number(p.monto_asignado),
      monto_total: Number(p.monto_asignado),
      monto_ejecutado: Number(p.monto_ejecutado)
    })) || []

    console.log(`✅ [LIQ-PRES] Se encontraron ${partidas.length} partidas`)

    return NextResponse.json({ 
      presupuesto,
      partidas 
    })
  } catch (error) {
    console.error('❌ [LIQ-PRES] Error:', error)
    return NextResponse.json({ error: 'Error al obtener presupuestos' }, { status: 500 })
  }
}

// POST - Crear nueva partida en el presupuesto vigente
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
    const { id_obra, descripcion, monto_asignado } = body

    if (!id_obra || !descripcion || !monto_asignado) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos (id_obra, descripcion, monto_asignado)' 
      }, { status: 400 })
    }

    // Buscar presupuesto vigente de la obra
    let presupuesto = await prisma.presupuesto.findFirst({
      where: {
        id_obra: parseInt(id_obra),
        estado: 'VIGENTE'
      },
      orderBy: { version: 'desc' }
    })

    // Si no existe presupuesto, crear uno nuevo
    if (!presupuesto) {
      presupuesto = await prisma.presupuesto.create({
        data: {
          id_obra: parseInt(id_obra),
          version: 1,
          monto_total: parseFloat(monto_asignado),
          estado: 'VIGENTE',
          id_responsable: session.id_usuario
        }
      })
    }

    // Crear partida
    const partida = await prisma.partida.create({
      data: {
        id_presupuesto: presupuesto.id_presupuesto,
        nombre_partida: descripcion,
        monto_asignado: parseFloat(monto_asignado),
        monto_ejecutado: 0
      }
    })

    // Actualizar monto total del presupuesto
    const totalPartidas = await prisma.partida.aggregate({
      where: { id_presupuesto: presupuesto.id_presupuesto },
      _sum: { monto_asignado: true }
    })

    await prisma.presupuesto.update({
      where: { id_presupuesto: presupuesto.id_presupuesto },
      data: { monto_total: totalPartidas._sum.monto_asignado || 0 }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Crear partida: ${descripcion}`,
          id_obra: parseInt(id_obra),
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    console.log(`✅ [LIQ-PRES] Partida creada: ${partida.id_partida}`)

    return NextResponse.json({
      message: 'Partida creada correctamente',
      partida: {
        id_partida: partida.id_partida,
        codigo: `P-${String(partida.id_partida).padStart(3, '0')}`,
        descripcion: partida.nombre_partida,
        monto_total: Number(partida.monto_asignado)
      }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ [LIQ-PRES] Error al crear:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error al crear partida' 
    }, { status: 500 })
  }
}
