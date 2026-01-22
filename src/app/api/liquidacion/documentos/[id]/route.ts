// src/app/api/liquidacion/documentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Permisos de LIQUIDACIÓN
const PERMISOS_LIQUIDACION = {
  carpetas_completas: ['14', '15', '19'],
  carpetas_lectura: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '16', '17', '18', '20']
}

// GET - Obtener documento por ID
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
    const id_documento = parseInt(id)

    const documento = await prisma.documento.findUnique({
      where: { id_documento },
      include: {
        obra: { select: { id_obra: true, nombre_obra: true } },
        carpeta_tipo: { select: { id_carpeta_tipo: true, codigo: true, nombre_carpeta: true } },
        usuario: { select: { id_usuario: true, nombre: true } }
      }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Verificar acceso a la carpeta
    const codigoCarpeta = documento.carpeta_tipo.codigo
    const CARPETAS_ACCESIBLES = [...PERMISOS_LIQUIDACION.carpetas_completas, ...PERMISOS_LIQUIDACION.carpetas_lectura]
    
    if (esLiquidacion && !CARPETAS_ACCESIBLES.includes(codigoCarpeta)) {
      return NextResponse.json({ error: 'No tiene acceso a este documento' }, { status: 403 })
    }

    return NextResponse.json({ documento })
  } catch (error) {
    console.error('❌ [LIQ-DOCS] Error:', error)
    return NextResponse.json({ error: 'Error al obtener documento' }, { status: 500 })
  }
}

// PUT - Actualizar documento
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
    const id_documento = parseInt(id)
    const body = await request.json()

    // Obtener documento existente
    const documentoExistente = await prisma.documento.findUnique({
      where: { id_documento },
      include: { carpeta_tipo: true }
    })

    if (!documentoExistente) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Verificar permisos de escritura
    const codigoCarpeta = documentoExistente.carpeta_tipo.codigo
    if (esLiquidacion && !PERMISOS_LIQUIDACION.carpetas_completas.includes(codigoCarpeta)) {
      return NextResponse.json({ 
        error: 'No tiene permisos para modificar documentos en esta carpeta' 
      }, { status: 403 })
    }

    const documento = await prisma.documento.update({
      where: { id_documento },
      data: {
        nombre_archivo: body.nombre_archivo
      },
      include: {
        obra: { select: { nombre_obra: true } },
        carpeta_tipo: { select: { nombre_carpeta: true } },
        usuario: { select: { nombre: true } }
      }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'DOCUMENTAL',
          accion: `Actualizar documento: ${documento.nombre_archivo}`,
          id_obra: documento.id_obra,
          resultado: 'Éxito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    return NextResponse.json({ documento })
  } catch (error) {
    console.error('❌ [LIQ-DOCS] Error:', error)
    return NextResponse.json({ error: 'Error al actualizar documento' }, { status: 500 })
  }
}

// DELETE - Anular documento (cambio de estado, no eliminación física)
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
    const id_documento = parseInt(id)

    // Obtener documento existente
    const documentoExistente = await prisma.documento.findUnique({
      where: { id_documento },
      include: { carpeta_tipo: true }
    })

    if (!documentoExistente) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 })
    }

    // Verificar permisos de escritura
    const codigoCarpeta = documentoExistente.carpeta_tipo.codigo
    if (esLiquidacion && !PERMISOS_LIQUIDACION.carpetas_completas.includes(codigoCarpeta)) {
      return NextResponse.json({ 
        error: 'No tiene permisos para eliminar documentos en esta carpeta' 
      }, { status: 403 })
    }

    // Cambiar estado a ANULADO (no eliminar físicamente)
    const documento = await prisma.documento.update({
      where: { id_documento },
      data: {
        estado: 'ANULADO'
      }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'DOCUMENTAL',
          accion: `Anular documento: ${documentoExistente.nombre_archivo}`,
          id_obra: documento.id_obra,
          resultado: 'Éxito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    return NextResponse.json({ 
      message: 'Documento eliminado correctamente',
      documento 
    })
  } catch (error) {
    console.error('❌ [LIQ-DOCS] Error:', error)
    return NextResponse.json({ error: 'Error al eliminar documento' }, { status: 500 })
  }
}