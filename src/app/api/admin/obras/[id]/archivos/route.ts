// src/app/api/admin/obras/[id]/archivos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Listar documentos de una obra (con filtros opcionales)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const obraId = parseInt(id)
    const { searchParams } = new URL(request.url)
    const partidaId = searchParams.get('partida_id')
    const actividadId = searchParams.get('actividad_id')
    const carpetaId = searchParams.get('carpeta_id')

    // Construir filtro base
    const whereClause: Record<string, unknown> = {
      id_obra: obraId,
      estado: 'VIGENTE'
    }

    // Filtrar por carpeta si se especifica
    if (carpetaId) {
      whereClause.id_carpeta_tipo = parseInt(carpetaId)
    }

    // Obtener todos los documentos de la obra
    const documentos = await prisma.documento.findMany({
      where: whereClause,
      include: {
        carpeta_tipo: true,
        usuario: { select: { nombre: true } }
      },
      orderBy: { fecha_carga: 'desc' }
    })

    // Filtrar por contexto (partida/actividad) basándose en la ruta del archivo
    let filteredDocs = documentos

    if (actividadId) {
      // Archivos de actividad específica
      filteredDocs = documentos.filter(doc => 
        doc.ruta_archivo.includes(`/actividad_${actividadId}/`)
      )
    } else if (partidaId) {
      // Archivos de partida específica (excluyendo los de actividades)
      filteredDocs = documentos.filter(doc => 
        doc.ruta_archivo.includes(`/partida_${partidaId}/`) &&
        !doc.ruta_archivo.includes('/actividad_')
      )
    } else if (partidaId === 'general' || (!partidaId && !actividadId)) {
      // Solo archivos generales de la obra (sin partida ni actividad)
      if (searchParams.get('only_general') === 'true') {
        filteredDocs = documentos.filter(doc => 
          !doc.ruta_archivo.includes('/partida_') &&
          !doc.ruta_archivo.includes('/actividad_')
        )
      }
    }

    // Agrupar por carpeta para mejor organización
    const porCarpeta = filteredDocs.reduce((acc, doc) => {
      const carpeta = doc.carpeta_tipo?.nombre_carpeta || 'Sin Clasificar'
      if (!acc[carpeta]) acc[carpeta] = []
      acc[carpeta].push(doc)
      return acc
    }, {} as Record<string, typeof filteredDocs>)

    return NextResponse.json({
      documentos: filteredDocs,
      por_carpeta: porCarpeta,
      total: filteredDocs.length
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}

// POST - Subir nuevo documento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const obraId = parseInt(id)

    console.log('=== INICIO SUBIDA DE ARCHIVO ===')
    console.log('Obra ID:', obraId)
    console.log('Usuario:', session.id_usuario)

    // Verificar que la obra existe
    const obra = await prisma.obra.findUnique({ where: { id_obra: obraId } })
    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    const formData = await request.formData()
    
    // ============================================
    // LEER CAMPOS - Compatible con el frontend
    // ============================================
    const archivo = formData.get('archivo') as File
    
    // El frontend envía 'id_carpeta_tipo', pero también soportamos 'carpeta_id' por compatibilidad
    const carpetaIdRaw = formData.get('id_carpeta_tipo') || formData.get('carpeta_id')
    const carpetaId = carpetaIdRaw ? parseInt(carpetaIdRaw as string) : 1
    
    // El frontend envía 'target_type' y 'target_id'
    const targetType = formData.get('target_type') as string || 'obra'
    const targetId = formData.get('target_id') as string | null
    
    // También soportamos los nombres antiguos por compatibilidad
    const partidaIdDirect = formData.get('partida_id') as string | null
    const actividadIdDirect = formData.get('actividad_id') as string | null
    
    // Determinar IDs según target_type o campos directos
    let partidaId: string | null = partidaIdDirect
    let actividadId: string | null = actividadIdDirect
    
    if (targetType === 'partida' && targetId) {
      partidaId = targetId
    } else if (targetType === 'actividad' && targetId) {
      actividadId = targetId
    }
    
    const descripcion = formData.get('descripcion') as string || ''

    console.log('Datos recibidos:', {
      archivo: archivo?.name,
      carpetaId,
      targetType,
      targetId,
      partidaId,
      actividadId,
      descripcion
    })

    // Validaciones
    if (!archivo || archivo.size === 0) {
      return NextResponse.json({ 
        error: 'No se proporcionó archivo',
        detalle: 'El campo "archivo" es requerido'
      }, { status: 400 })
    }

    // Validar tamaño (10MB máximo)
    if (archivo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ 
        error: 'El archivo excede 10MB',
        detalle: `Tamaño actual: ${(archivo.size / 1024 / 1024).toFixed(2)}MB`
      }, { status: 400 })
    }

    // Obtener carpeta
    const carpeta = await prisma.carpetaTipo.findUnique({
      where: { id_carpeta_tipo: carpetaId }
    })

    if (!carpeta) {
      console.log('Carpeta no encontrada, usando default')
    }

    // Construir ruta según contexto
    const timestamp = Date.now()
    const extension = archivo.name.split('.').pop()?.toLowerCase() || 'pdf'
    const cleanName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    
    let rutaBase = `obras/${obraId}`
    
    // Variables para guardar en BD
    let partidaIdForDb: number | null = null
    let actividadIdForDb: number | null = null
    
    if (actividadId) {
      // =====================================================
      // CORREGIDO: Usar ActividadPartida en lugar de Actividad
      // ActividadPartida tiene id_partida directamente
      // =====================================================
      const actividad = await prisma.actividadPartida.findUnique({
        where: { id_actividad: parseInt(actividadId) },
        select: { id_actividad: true, id_partida: true }
      })
      
      if (actividad && actividad.id_partida) {
        rutaBase = `obras/${obraId}/partida_${actividad.id_partida}/actividad_${actividadId}`
        partidaIdForDb = actividad.id_partida
        actividadIdForDb = actividad.id_actividad
        console.log('Ruta con actividad:', rutaBase)
      } else {
        console.log('ActividadPartida no encontrada, usando ruta base')
      }
    } else if (partidaId) {
      rutaBase = `obras/${obraId}/partida_${partidaId}`
      partidaIdForDb = parseInt(partidaId)
      console.log('Ruta con partida:', rutaBase)
    }

    const carpetaCodigo = carpeta?.codigo || '01_DOCUMENTACION'
    const nombreArchivo = `${rutaBase}/${carpetaCodigo}/${timestamp}-${cleanName}`

    console.log('Nombre archivo final:', nombreArchivo)

    // Subir a Supabase Storage
    const bytes = await archivo.arrayBuffer()
    const buffer = Buffer.from(bytes)

    console.log('Subiendo a Supabase Storage...')

    const { error: uploadError } = await supabaseAdmin.storage
      .from('documentos')
      .upload(nombreArchivo, buffer, {
        contentType: archivo.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Error de Supabase:', uploadError)
      return NextResponse.json({ 
        error: 'Error al subir archivo a storage', 
        detalle: uploadError.message 
      }, { status: 500 })
    }

    console.log('Archivo subido exitosamente a Storage')

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('documentos')
      .getPublicUrl(nombreArchivo)

    console.log('URL pública:', urlData.publicUrl)

    // Crear registro en base de datos
    // El modelo Documento tiene id_partida e id_actividad opcionales
    const documento = await prisma.documento.create({
      data: {
        id_obra: obraId,
        id_carpeta_tipo: carpetaId,
        tipo_documento: 'OTRO',
        nombre_archivo: archivo.name,
        descripcion: descripcion || null,
        ruta_archivo: urlData.publicUrl,
        formato: extension,
        version: 1,
        estado: 'VIGENTE',
        id_usuario: session.id_usuario,
        id_partida: partidaIdForDb,
        id_actividad: actividadIdForDb
      },
      include: {
        carpeta_tipo: true,
        usuario: { select: { nombre: true } },
        obra: { select: { id_obra: true, nombre_obra: true } }
      }
    })

    console.log('Documento creado en BD con ID:', documento.id_documento)

    // Log de actividad
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: `Subir archivo: ${archivo.name}${partidaId ? ` (Partida ${partidaId})` : ''}${actividadId ? ` (Actividad ${actividadId})` : ''}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    console.log('=== FIN SUBIDA DE ARCHIVO ===')

    return NextResponse.json({ 
      documento,
      message: 'Documento subido correctamente'
    }, { status: 201 })

  } catch (error) {
    console.error('Error completo:', error)
    return NextResponse.json({ 
      error: 'Error al subir documento',
      detalle: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}