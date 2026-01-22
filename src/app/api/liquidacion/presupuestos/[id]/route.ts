// src/app/api/liquidacion/presupuestos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Obtener partida por ID
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
    const id_partida = parseInt(id)

    const partida = await prisma.partida.findUnique({
      where: { id_partida },
      include: {
        presupuesto: {
          include: {
            obra: { select: { id_obra: true, nombre_obra: true } }
          }
        }
      }
    })

    if (!partida) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ 
      partida: {
        id_partida: partida.id_partida,
        codigo: `P-${String(partida.id_partida).padStart(3, '0')}`,
        descripcion: partida.nombre_partida,
        monto_asignado: Number(partida.monto_asignado),
        monto_ejecutado: Number(partida.monto_ejecutado),
        obra: partida.presupuesto.obra
      }
    })
  } catch (error) {
    console.error('❌ [LIQ-PRES] Error:', error)
    return NextResponse.json({ error: 'Error al obtener partida' }, { status: 500 })
  }
}

// PUT - Actualizar partida
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
    const id_partida = parseInt(id)
    const body = await request.json()

    // Verificar que existe
    const partidaExistente = await prisma.partida.findUnique({
      where: { id_partida },
      include: { presupuesto: true }
    })

    if (!partidaExistente) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    const partida = await prisma.partida.update({
      where: { id_partida },
      data: {
        nombre_partida: body.descripcion || partidaExistente.nombre_partida,
        monto_asignado: body.monto_asignado !== undefined 
          ? parseFloat(body.monto_asignado) 
          : partidaExistente.monto_asignado
      }
    })

    // Actualizar monto total del presupuesto
    const totalPartidas = await prisma.partida.aggregate({
      where: { id_presupuesto: partidaExistente.id_presupuesto },
      _sum: { monto_asignado: true }
    })

    await prisma.presupuesto.update({
      where: { id_presupuesto: partidaExistente.id_presupuesto },
      data: { monto_total: totalPartidas._sum.monto_asignado || 0 }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Actualizar partida: ${partida.nombre_partida}`,
          id_obra: partidaExistente.presupuesto.id_obra,
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    return NextResponse.json({ 
      message: 'Partida actualizada correctamente',
      partida: {
        id_partida: partida.id_partida,
        codigo: `P-${String(partida.id_partida).padStart(3, '0')}`,
        descripcion: partida.nombre_partida,
        monto_asignado: Number(partida.monto_asignado)
      }
    })
  } catch (error) {
    console.error('❌ [LIQ-PRES] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar partida' }, { status: 500 })
  }
}

// DELETE - Eliminar partida
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
    const id_partida = parseInt(id)

    // Verificar que existe
    const partidaExistente = await prisma.partida.findUnique({
      where: { id_partida },
      include: { 
        presupuesto: true,
        gastos: true 
      }
    })

    if (!partidaExistente) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    // Verificar si hay gastos asociados
    if (partidaExistente.gastos.length > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar. Hay ${partidaExistente.gastos.length} gasto(s) asociado(s) a esta partida.` 
      }, { status: 400 })
    }

    await prisma.partida.delete({
      where: { id_partida }
    })

    // Actualizar monto total del presupuesto
    const totalPartidas = await prisma.partida.aggregate({
      where: { id_presupuesto: partidaExistente.id_presupuesto },
      _sum: { monto_asignado: true }
    })

    await prisma.presupuesto.update({
      where: { id_presupuesto: partidaExistente.id_presupuesto },
      data: { monto_total: totalPartidas._sum.monto_asignado || 0 }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Eliminar partida: ${partidaExistente.nombre_partida}`,
          id_obra: partidaExistente.presupuesto.id_obra,
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    return NextResponse.json({ 
      message: 'Partida eliminada correctamente' 
    })
  } catch (error) {
    console.error('❌ [LIQ-PRES] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar partida' }, { status: 500 })
  }
}
