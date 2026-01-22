// src/app/api/liquidacion/reportes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'

// Configuración de Supabase para almacenamiento de reportes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Bucket para reportes (debe crearse en Supabase)
const REPORTS_BUCKET = 'reportes'

// GET - Listar reportes de una obra
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

    console.log('📊 [LIQ-REP] Obteniendo reportes para obra:', id_obra)

    const reportes = await prisma.reporte.findMany({
      where: {
        id_obra: parseInt(id_obra)
      },
      include: {
        obra: { select: { nombre_obra: true } },
        usuario: { select: { nombre: true } }
      },
      orderBy: { fecha_generacion: 'desc' }
    })

    console.log(`✅ [LIQ-REP] Se encontraron ${reportes.length} reportes`)

    return NextResponse.json({ reportes })
  } catch (error) {
    console.error('❌ [LIQ-REP] Error:', error)
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 })
  }
}

// POST - Generar nuevo reporte PDF
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
    const { id_obra, tipo_reporte } = body

    if (!id_obra || !tipo_reporte) {
      return NextResponse.json({ error: 'Se requiere id_obra y tipo_reporte' }, { status: 400 })
    }

    // Validar tipo de reporte
    const tiposValidos = ['TECNICO', 'FINANCIERO', 'COMPARATIVO', 'CONSOLIDADO']
    if (!tiposValidos.includes(tipo_reporte)) {
      return NextResponse.json({ error: 'Tipo de reporte inválido' }, { status: 400 })
    }

    // Obtener datos de la obra
    const obra = await prisma.obra.findUnique({
      where: { id_obra: parseInt(id_obra) },
      include: {
        responsable: { select: { nombre: true } }
      }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Obtener datos según tipo de reporte
    let datosReporte: Record<string, unknown> = {}

    if (tipo_reporte === 'FINANCIERO' || tipo_reporte === 'COMPARATIVO' || tipo_reporte === 'CONSOLIDADO') {
      // Obtener presupuesto y partidas
      const presupuesto = await prisma.presupuesto.findFirst({
        where: { id_obra: parseInt(id_obra), estado: 'VIGENTE' },
        include: {
          partidas: {
            include: {
              gastos: true
            }
          }
        },
        orderBy: { version: 'desc' }
      })

      const totalPresupuesto = presupuesto?.partidas.reduce((sum, p) => sum + Number(p.monto_asignado), 0) || 0
      const totalEjecutado = presupuesto?.partidas.reduce((sum, p) => 
        sum + p.gastos.reduce((gs, g) => gs + Number(g.monto), 0), 0) || 0

      datosReporte = {
        presupuesto: totalPresupuesto,
        ejecutado: totalEjecutado,
        saldo: totalPresupuesto - totalEjecutado,
        porcentajeEjecucion: totalPresupuesto > 0 ? ((totalEjecutado / totalPresupuesto) * 100).toFixed(2) : 0,
        partidas: presupuesto?.partidas.map(p => ({
          nombre: p.nombre_partida,
          asignado: Number(p.monto_asignado),
          ejecutado: Number(p.monto_ejecutado)
        })) || []
      }
    }

    if (tipo_reporte === 'TECNICO' || tipo_reporte === 'CONSOLIDADO') {
      // Obtener documentos
      const documentos = await prisma.documento.count({
        where: { id_obra: parseInt(id_obra), estado: 'VIGENTE' }
      })

      datosReporte = {
        ...datosReporte,
        totalDocumentos: documentos
      }
    }

    // Generar PDF
    const pdfBuffer = await generatePDF(obra, tipo_reporte, datosReporte)

    // Subir a Supabase Storage
    const fileName = `reporte_${tipo_reporte.toLowerCase()}_${id_obra}_${Date.now()}.pdf`
    const filePath = `${id_obra}/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(REPORTS_BUCKET)
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Error al subir PDF:', uploadError)
      // Continuar sin archivo si falla el upload
    }

    // Obtener URL pública
    let rutaArchivo = null
    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from(REPORTS_BUCKET)
        .getPublicUrl(filePath)
      rutaArchivo = urlData.publicUrl
    }

    // Crear registro del reporte
    const reporte = await prisma.reporte.create({
      data: {
        id_obra: parseInt(id_obra),
        tipo_reporte: tipo_reporte as 'TECNICO' | 'FINANCIERO' | 'COMPARATIVO' | 'CONSOLIDADO',
        parametros: JSON.stringify(datosReporte),
        ruta_archivo: rutaArchivo,
        id_usuario: session.id_usuario
      },
      include: {
        obra: { select: { nombre_obra: true } }
      }
    })

    // Crear registros adicionales según tipo
    if (tipo_reporte === 'FINANCIERO') {
      await prisma.reporteFinanciero.create({
        data: {
          id_reporte: reporte.id_reporte,
          presupuesto_planificado: (datosReporte.presupuesto as number) || 0,
          ejecucion_real: (datosReporte.ejecutado as number) || 0,
          saldo_disponible: (datosReporte.saldo as number) || 0,
          desviacion_financiera: 0
        }
      })
    }

    // Registrar en log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'REPORTES',
          accion: `Generar reporte ${tipo_reporte} para obra ${obra.nombre_obra}`,
          id_obra: parseInt(id_obra),
          resultado: 'Exito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    console.log(`✅ [LIQ-REP] Reporte generado: ${reporte.id_reporte}`)

    return NextResponse.json({
      message: 'Reporte generado correctamente',
      reporte
    }, { status: 201 })
  } catch (error) {
    console.error('❌ [LIQ-REP] Error al generar:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error al generar reporte' 
    }, { status: 500 })
  }
}

// Función para generar PDF
async function generatePDF(
  obra: { id_obra: number; nombre_obra: string; presupuesto_inicial: unknown; estado: string; responsable: { nombre: string } },
  tipoReporte: string,
  datos: Record<string, unknown>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Encabezado
      doc.fontSize(20).font('Helvetica-Bold').text('SISTEMA INTEGRAL DE OBRAS', { align: 'center' })
      doc.fontSize(12).font('Helvetica').text('Universidad Nacional Daniel Alcides Carrión', { align: 'center' })
      doc.moveDown()

      // Título del reporte
      const titulosReporte: Record<string, string> = {
        'TECNICO': 'REPORTE TÉCNICO',
        'FINANCIERO': 'REPORTE FINANCIERO',
        'COMPARATIVO': 'REPORTE COMPARATIVO',
        'CONSOLIDADO': 'REPORTE CONSOLIDADO'
      }
      
      doc.fontSize(16).font('Helvetica-Bold')
        .text(titulosReporte[tipoReporte] || 'REPORTE', { align: 'center' })
      doc.moveDown()

      // Información de la obra
      doc.fontSize(12).font('Helvetica-Bold').text('DATOS DE LA OBRA')
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
      doc.moveDown(0.5)

      doc.fontSize(10).font('Helvetica')
      doc.text(`Nombre: ${obra.nombre_obra}`)
      doc.text(`Estado: ${obra.estado}`)
      doc.text(`Responsable: ${obra.responsable?.nombre || 'No asignado'}`)
      doc.text(`Presupuesto Inicial: S/ ${Number(obra.presupuesto_inicial).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`)
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-PE')}`)
      doc.moveDown()

      // Contenido según tipo
      if (tipoReporte === 'FINANCIERO' || tipoReporte === 'COMPARATIVO' || tipoReporte === 'CONSOLIDADO') {
        doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN FINANCIERO')
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown(0.5)

        doc.fontSize(10).font('Helvetica')
        doc.text(`Presupuesto Total: S/ ${Number(datos.presupuesto || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`)
        doc.text(`Monto Ejecutado: S/ ${Number(datos.ejecutado || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`)
        doc.text(`Saldo Disponible: S/ ${Number(datos.saldo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`)
        doc.text(`Porcentaje de Ejecución: ${datos.porcentajeEjecucion}%`)
        doc.moveDown()

        // Tabla de partidas
        if (Array.isArray(datos.partidas) && datos.partidas.length > 0) {
          doc.fontSize(12).font('Helvetica-Bold').text('DETALLE POR PARTIDAS')
          doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
          doc.moveDown(0.5)

          doc.fontSize(9).font('Helvetica')
          const tableTop = doc.y
          const col1 = 50
          const col2 = 300
          const col3 = 420

          // Encabezados de tabla
          doc.font('Helvetica-Bold')
          doc.text('Partida', col1, tableTop)
          doc.text('Asignado', col2, tableTop)
          doc.text('Ejecutado', col3, tableTop)

          let rowY = tableTop + 15
          doc.font('Helvetica')
          
          for (const partida of datos.partidas as Array<{ nombre: string; asignado: number; ejecutado: number }>) {
            if (rowY > 700) {
              doc.addPage()
              rowY = 50
            }
            doc.text(partida.nombre.substring(0, 40), col1, rowY, { width: 240 })
            doc.text(`S/ ${partida.asignado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, col2, rowY)
            doc.text(`S/ ${partida.ejecutado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`, col3, rowY)
            rowY += 20
          }
        }
      }

      if (tipoReporte === 'TECNICO' || tipoReporte === 'CONSOLIDADO') {
        doc.moveDown()
        doc.fontSize(12).font('Helvetica-Bold').text('INFORMACIÓN DOCUMENTAL')
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
        doc.moveDown(0.5)

        doc.fontSize(10).font('Helvetica')
        doc.text(`Total de documentos en expediente: ${datos.totalDocumentos || 0}`)
      }

      // Pie de página
      doc.moveDown(2)
      doc.fontSize(8).font('Helvetica')
        .text('Este documento ha sido generado automáticamente por el Sistema Integral de Obras (SIO)', { align: 'center' })
        .text(`Generado el ${new Date().toLocaleString('es-PE')}`, { align: 'center' })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
