// src/app/api/liquidacion/expedientes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Configuración de carpetas
const CARPETAS = [
  { codigo: '01', nombre: 'Resoluciones' },
  { codigo: '02', nombre: 'Contratos' },
  { codigo: '03', nombre: 'Fianzas y Garantías' },
  { codigo: '04', nombre: 'Presupuestos' },
  { codigo: '05', nombre: 'Cronogramas' },
  { codigo: '06', nombre: 'Planos' },
  { codigo: '07', nombre: 'Especificaciones Técnicas' },
  { codigo: '08', nombre: 'Estudios de Suelos' },
  { codigo: '09', nombre: 'Estudios de Impacto' },
  { codigo: '10', nombre: 'Informes Mensuales' },
  { codigo: '11', nombre: 'Informes de Supervisión' },
  { codigo: '12', nombre: 'Informes de Mantenimiento' },
  { codigo: '13', nombre: 'Actas' },
  { codigo: '14', nombre: 'Valorizaciones' },
  { codigo: '15', nombre: 'Documentos Financieros' },
  { codigo: '16', nombre: 'Cuaderno de Obra' },
  { codigo: '17', nombre: 'Actas de Recepción' },
  { codigo: '18', nombre: 'Garantías' },
  { codigo: '19', nombre: 'Liquidación' },
  { codigo: '20', nombre: 'Anexos' },
]

// GET - Listar expedientes digitales de una obra
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

    console.log('📁 [LIQ-EXP] Obteniendo expedientes para obra:', id_obra)

    // Obtener expedientes digitales usando la tabla existente
    const expedientesDigitales = await prisma.expedienteDigital.findMany({
      where: {
        id_obra: parseInt(id_obra)
      },
      include: {
        obra: { select: { nombre_obra: true } }
      },
      orderBy: { fecha_consolidacion: 'desc' }
    })

    // Transformar al formato esperado por el frontend
    const expedientes = expedientesDigitales.map(exp => ({
      id_expediente: exp.id_expediente,
      id_obra: exp.id_obra,
      codigo: `EXP-${exp.id_obra}-V${exp.version}`,
      descripcion: `Expediente Digital - Versión ${exp.version}`,
      estado: 'COMPLETO',
      fecha_generacion: exp.fecha_consolidacion,
      total_documentos: 0, // Se calculará abajo
      obra: exp.obra
    }))

    // Obtener resumen de documentos por carpeta
    const documentosPorCarpeta = await prisma.documento.groupBy({
      by: ['id_carpeta_tipo'],
      where: {
        id_obra: parseInt(id_obra),
        estado: 'VIGENTE'
      },
      _count: {
        id_documento: true
      }
    })

    // Obtener información de carpetas
    const carpetasTipo = await prisma.carpetaTipo.findMany()

    // Construir resumen
    const resumenCarpetas = CARPETAS.map(c => {
      const carpetaTipo = carpetasTipo.find(ct => ct.codigo === c.codigo)
      const conteo = documentosPorCarpeta.find(
        d => d.id_carpeta_tipo === carpetaTipo?.id_carpeta_tipo
      )
      return {
        codigo: c.codigo,
        nombre: c.nombre,
        cantidad: conteo?._count.id_documento || 0
      }
    })

    // Calcular total de documentos
    const totalDocumentos = resumenCarpetas.reduce((sum, c) => sum + c.cantidad, 0)

    // Actualizar total_documentos en expedientes
    expedientes.forEach(exp => {
      exp.total_documentos = totalDocumentos
    })

    console.log(`✅ [LIQ-EXP] Se encontraron ${expedientes.length} expedientes`)

    return NextResponse.json({ 
      expedientes,
      resumenCarpetas 
    })
  } catch (error) {
    console.error('❌ [LIQ-EXP] Error:', error)
    return NextResponse.json({ error: 'Error al obtener expedientes' }, { status: 500 })
  }
}

// POST - Generar nuevo expediente digital
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
    const { id_obra } = body

    if (!id_obra) {
      return NextResponse.json({ error: 'Se requiere id_obra' }, { status: 400 })
    }

    // Verificar que la obra existe
    const obra = await prisma.obra.findUnique({
      where: { id_obra: parseInt(id_obra) }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Obtener la última versión del expediente
    const ultimoExpediente = await prisma.expedienteDigital.findFirst({
      where: { id_obra: parseInt(id_obra) },
      orderBy: { version: 'desc' }
    })

    const nuevaVersion = ultimoExpediente ? ultimoExpediente.version + 1 : 1

    // Generar ruta del archivo (simplificado)
    const rutaArchivo = `/expedientes/${id_obra}/expediente_v${nuevaVersion}.pdf`

    // Crear expediente digital usando la tabla existente
    const expediente = await prisma.expedienteDigital.create({
      data: {
        id_obra: parseInt(id_obra),
        version: nuevaVersion,
        responsable: session.nombre || 'Usuario del sistema',
        ruta_archivo: rutaArchivo
      },
      include: {
        obra: { select: { nombre_obra: true } }
      }
    })

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'DOCUMENTAL',
          accion: `Generar expediente digital: Versión ${nuevaVersion}`,
          id_obra: parseInt(id_obra),
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    console.log(`✅ [LIQ-EXP] Expediente generado: ${expediente.id_expediente}`)

    return NextResponse.json({
      message: 'Expediente generado correctamente',
      expediente: {
        id_expediente: expediente.id_expediente,
        id_obra: expediente.id_obra,
        codigo: `EXP-${id_obra}-V${nuevaVersion}`,
        descripcion: `Expediente Digital - Versión ${nuevaVersion}`,
        estado: 'COMPLETO',
        fecha_generacion: expediente.fecha_consolidacion,
        obra: expediente.obra
      }
    }, { status: 201 })
  } catch (error) {
    console.error('❌ [LIQ-EXP] Error al generar:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error al generar expediente' 
    }, { status: 500 })
  }
}
