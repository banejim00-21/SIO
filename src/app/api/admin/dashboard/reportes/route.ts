// src/app/api/admin/dashboard/reportes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Listar reportes generados
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Buscar documentos que sean reportes de dashboard
    const reportes = await prisma.documento.findMany({
      where: {
        estado: 'VIGENTE',
        ruta_archivo: { contains: '/reportes-dashboard/' }
      },
      include: {
        usuario: { select: { nombre: true } },
        obra: { select: { nombre_obra: true } }
      },
      orderBy: { fecha_carga: 'desc' },
      take: 50
    })

    return NextResponse.json({
      reportes: reportes.map(r => ({
        id_documento: r.id_documento,
        nombre_archivo: r.nombre_archivo,
        descripcion: r.descripcion,
        ruta_archivo: r.ruta_archivo,
        formato: r.formato,
        fecha_carga: r.fecha_carga,
        usuario: r.usuario?.nombre || 'Sistema',
        obra: r.obra?.nombre_obra || 'General'
      }))
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 })
  }
}

// POST - Guardar nuevo reporte PDF
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const archivo = formData.get('archivo') as File
    const obraId = formData.get('obra_id') as string
    const descripcion = formData.get('descripcion') as string || 'Reporte Dashboard'
    const tipoReporte = formData.get('tipo_reporte') as string || 'GENERAL'

    if (!archivo || archivo.size === 0) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
    }

    // Generar nombre único
    const timestamp = Date.now()
    const fecha = new Date().toISOString().split('T')[0]
    const nombreArchivo = `reporte-${tipoReporte.toLowerCase()}-${fecha}-${timestamp}.pdf`
    const rutaStorage = `reportes-dashboard/${fecha}/${nombreArchivo}`

    // Subir a Supabase Storage
    const bytes = await archivo.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documentos')
      .upload(rutaStorage, buffer, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) {
      console.error('Error upload:', uploadError)
      return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 })
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('documentos')
      .getPublicUrl(rutaStorage)

    // Buscar carpeta tipo para reportes o usar la primera
    let carpetaId = 1
    const carpeta = await prisma.carpetaTipo.findFirst({
      where: {
        OR: [
          { codigo: { contains: 'REPORTE' } },
          { nombre_carpeta: { contains: 'Reporte' } }
        ]
      }
    })
    if (carpeta) carpetaId = carpeta.id_carpeta_tipo
    else {
      const primera = await prisma.carpetaTipo.findFirst()
      if (primera) carpetaId = primera.id_carpeta_tipo
    }

    // Determinar obra_id
    const idObra = obraId && obraId !== 'todas' ? parseInt(obraId) : null
    
    // Si no hay obra específica, usar la primera disponible
    let obraParaDoc = idObra
    if (!obraParaDoc) {
      const primeraObra = await prisma.obra.findFirst()
      obraParaDoc = primeraObra?.id_obra || 1
    }

    // Guardar en base de datos
    const documento = await prisma.documento.create({
      data: {
        id_obra: obraParaDoc,
        id_carpeta_tipo: carpetaId,
        tipo_documento: 'INFORME',
        nombre_archivo: nombreArchivo,
        descripcion: descripcion,
        ruta_archivo: urlData.publicUrl,
        formato: 'pdf',
        version: 1,
        estado: 'VIGENTE',
        id_usuario: session.id_usuario
      }
    })

    // Log de actividad
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'REPORTES',
          accion: `Generar reporte: ${descripcion}`,
          id_obra: obraParaDoc,
          resultado: 'Exito'
        }
      })
    } catch (e) {}

    return NextResponse.json({
      documento: {
        id_documento: documento.id_documento,
        nombre_archivo: documento.nombre_archivo,
        ruta_archivo: documento.ruta_archivo,
        fecha_carga: documento.fecha_carga
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al guardar reporte' }, { status: 500 })
  }
}
