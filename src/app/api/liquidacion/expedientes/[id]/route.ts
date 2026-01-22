// src/app/api/liquidacion/expedientes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Obtener expediente digital por ID con detalle completo
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
    const id_expediente = parseInt(id)

    const expedienteDigital = await prisma.expedienteDigital.findUnique({
      where: { id_expediente },
      include: {
        obra: { 
          select: { 
            id_obra: true, 
            nombre_obra: true,
            presupuesto_inicial: true,
            estado: true
          } 
        }
      }
    })

    if (!expedienteDigital) {
      return NextResponse.json({ error: 'Expediente no encontrado' }, { status: 404 })
    }

    // Obtener documentos incluidos en el expediente
    const documentos = await prisma.documento.findMany({
      where: {
        id_obra: expedienteDigital.id_obra,
        estado: 'VIGENTE',
        fecha_carga: {
          lte: expedienteDigital.fecha_consolidacion
        }
      },
      include: {
        carpeta_tipo: {
          select: {
            codigo: true,
            nombre_carpeta: true
          }
        }
      },
      orderBy: [
        { carpeta_tipo: { codigo: 'asc' } },
        { fecha_carga: 'asc' }
      ]
    })

    // Agrupar documentos por carpeta
    const documentosPorCarpeta = documentos.reduce((acc, doc) => {
      const codigo = doc.carpeta_tipo.codigo
      if (!acc[codigo]) {
        acc[codigo] = {
          codigo,
          nombre: doc.carpeta_tipo.nombre_carpeta,
          documentos: []
        }
      }
      acc[codigo].documentos.push({
        id_documento: doc.id_documento,
        nombre_archivo: doc.nombre_archivo,
        formato: doc.formato,
        version: doc.version,
        fecha_carga: doc.fecha_carga
      })
      return acc
    }, {} as Record<string, { codigo: string; nombre: string; documentos: Array<{ id_documento: number; nombre_archivo: string; formato: string; version: number; fecha_carga: Date }> }>)

    // Transformar al formato esperado
    const expediente = {
      id_expediente: expedienteDigital.id_expediente,
      id_obra: expedienteDigital.id_obra,
      codigo: `EXP-${expedienteDigital.id_obra}-V${expedienteDigital.version}`,
      descripcion: `Expediente Digital - Versión ${expedienteDigital.version}`,
      version: expedienteDigital.version,
      estado: 'COMPLETO',
      fecha_generacion: expedienteDigital.fecha_consolidacion,
      responsable: expedienteDigital.responsable,
      ruta_archivo: expedienteDigital.ruta_archivo,
      total_documentos: documentos.length,
      obra: expedienteDigital.obra
    }

    return NextResponse.json({ 
      expediente,
      carpetas: Object.values(documentosPorCarpeta)
    })
  } catch (error) {
    console.error('❌ [LIQ-EXP] Error:', error)
    return NextResponse.json({ error: 'Error al obtener expediente' }, { status: 500 })
  }
}
