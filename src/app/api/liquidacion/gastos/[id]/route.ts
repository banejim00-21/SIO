// src/app/api/liquidacion/gastos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Obtener gasto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esLiquidacion = session.rol.nombre === 'LIQUIDACION'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esLiquidacion && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const id_gasto = parseInt(id)

    const gasto = await prisma.gasto.findUnique({
      where: { id_gasto },
      include: {
        partida: {
          select: { 
            id_partida: true, 
            nombre_partida: true,
            presupuesto: {
              select: {
                id_obra: true,
                obra: { select: { nombre_obra: true } }
              }
            }
          }
        },
        usuario: { select: { nombre: true } }
      }
    })

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ 
      gasto: {
        id_gasto: gasto.id_gasto,
        id_partida: gasto.id_partida,
        descripcion: gasto.descripcion,
        monto: Number(gasto.monto),
        fecha_gasto: gasto.fecha_gasto,
        documento_respaldo: gasto.documento_respaldo,
        partida: {
          codigo: `P-${String(gasto.partida.id_partida).padStart(3, '0')}`,
          descripcion: gasto.partida.nombre_partida
        },
        obra: gasto.partida.presupuesto.obra,
        usuario: gasto.usuario
      }
    })
  } catch (error) {
    console.error('❌ [LIQ-GAST] Error:', error)
    return NextResponse.json({ error: 'Error al obtener gasto' }, { status: 500 })
  }
}

// PUT - Actualizar gasto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esLiquidacion = session.rol.nombre === 'LIQUIDACION'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esLiquidacion && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const id_gasto = parseInt(id)
    const body = await request.json()

    const gastoExistente = await prisma.gasto.findUnique({
      where: { id_gasto },
      include: { partida: { include: { presupuesto: true } } }
    })

    if (!gastoExistente) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    const oldPartidaId = gastoExistente.id_partida
    const newPartidaId = body.id_partida ? parseInt(body.id_partida) : oldPartidaId

    // Si cambia la partida, verificar que existe
    if (body.id_partida && newPartidaId !== oldPartidaId) {
      const nuevaPartida = await prisma.partida.findUnique({
        where: { id_partida: newPartidaId }
      })
      if (!nuevaPartida) {
        return NextResponse.json({ error: 'Partida no encontrada' }, { status: 400 })
      }
    }

    const gasto = await prisma.gasto.update({
      where: { id_gasto },
      data: {
        id_partida: newPartidaId,
        descripcion: body.descripcion || gastoExistente.descripcion,
        monto: body.monto !== undefined ? parseFloat(body.monto) : gastoExistente.monto,
        fecha_gasto: body.fecha_documento ? new Date(body.fecha_documento) : gastoExistente.fecha_gasto,
        documento_respaldo: body.numero_documento !== undefined ? body.numero_documento : gastoExistente.documento_respaldo
      }
    })

    // Actualizar monto_ejecutado de la partida anterior
    const totalGastosOld = await prisma.gasto.aggregate({
      where: { id_partida: oldPartidaId },
      _sum: { monto: true }
    })
    await prisma.partida.update({
      where: { id_partida: oldPartidaId },
      data: { monto_ejecutado: totalGastosOld._sum.monto || 0 }
    })

    // Si cambió la partida, actualizar también la nueva
    if (newPartidaId !== oldPartidaId) {
      const totalGastosNew = await prisma.gasto.aggregate({
        where: { id_partida: newPartidaId },
        _sum: { monto: true }
      })
      await prisma.partida.update({
        where: { id_partida: newPartidaId },
        data: { monto_ejecutado: totalGastosNew._sum.monto || 0 }
      })
    }

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Actualizar gasto: ${gasto.descripcion}`,
          id_obra: gastoExistente.partida.presupuesto.id_obra,
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    return NextResponse.json({ message: 'Gasto actualizado correctamente', gasto })
  } catch (error) {
    console.error('❌ [LIQ-GAST] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}

// DELETE - Eliminar gasto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esLiquidacion = session.rol.nombre === 'LIQUIDACION'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esLiquidacion && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const id_gasto = parseInt(id)

    const gastoExistente = await prisma.gasto.findUnique({
      where: { id_gasto },
      include: { partida: { include: { presupuesto: true } } }
    })

    if (!gastoExistente) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    const partidaId = gastoExistente.id_partida

    await prisma.gasto.delete({
      where: { id_gasto }
    })

    // Actualizar monto_ejecutado de la partida
    const totalGastos = await prisma.gasto.aggregate({
      where: { id_partida: partidaId },
      _sum: { monto: true }
    })
    await prisma.partida.update({
      where: { id_partida: partidaId },
      data: { monto_ejecutado: totalGastos._sum.monto || 0 }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Eliminar gasto: ${gastoExistente.descripcion}`,
          id_obra: gastoExistente.partida.presupuesto.id_obra,
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    return NextResponse.json({ message: 'Gasto eliminado correctamente' })
  } catch (error) {
    console.error('❌ [LIQ-GAST] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}
