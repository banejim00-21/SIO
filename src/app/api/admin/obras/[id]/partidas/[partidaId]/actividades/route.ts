// src/app/api/admin/obras/[id]/partidas/[partidaId]/actividades/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ id: string; partidaId: string }>
}

// GET - Listar actividades de una partida
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, partidaId } = await params
    const obraId = parseInt(id)
    const partidaIdNum = parseInt(partidaId)

    console.log('GET actividades - Obra:', obraId, 'Partida:', partidaIdNum)

    const actividades = await prisma.actividadPartida.findMany({
      where: { id_partida: partidaIdNum },
      orderBy: { fecha_inicio: 'asc' }
    })

    // Para cada actividad, contar sus archivos
    const actividadesConArchivos = await Promise.all(
      actividades.map(async (actividad) => {
        const archivosCount = await prisma.documento.count({
          where: {
            id_obra: obraId,
            estado: 'VIGENTE',
            ruta_archivo: { contains: `/actividad_${actividad.id_actividad}/` }
          }
        })
        return {
          ...actividad,
          archivos_count: archivosCount
        }
      })
    )

    return NextResponse.json({ actividades: actividadesConArchivos })
  } catch (error) {
    console.error('Error GET actividades:', error)
    return NextResponse.json({ error: 'Error al obtener actividades' }, { status: 500 })
  }
}

// POST - Crear actividad con archivo opcional
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Solo ADMINISTRADOR puede crear actividades
    if (session.rol?.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado - Solo administradores' }, { status: 403 })
    }

    const { id, partidaId } = await params
    const obraId = parseInt(id)
    const partidaIdNum = parseInt(partidaId)

    console.log('POST actividad - Obra:', obraId, 'Partida:', partidaIdNum)

    // Verificar que la partida existe
    const partida = await prisma.partida.findUnique({
      where: { id_partida: partidaIdNum }
    })

    if (!partida) {
      return NextResponse.json({ error: 'Partida no encontrada' }, { status: 404 })
    }

    // Procesar FormData o JSON
    const contentType = request.headers.get('content-type') || ''
    let nombre_actividad: string = ''
    let descripcion: string = ''
    let fecha_inicio: string = ''
    let fecha_fin: string = ''
    let archivoFile: File | null = null
    let carpetaId: number = 1

    console.log('Content-Type:', contentType)

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      nombre_actividad = (formData.get('nombre_actividad') as string) || ''
      descripcion = (formData.get('descripcion') as string) || ''
      fecha_inicio = (formData.get('fecha_inicio') as string) || ''
      fecha_fin = (formData.get('fecha_fin') as string) || ''
      
      const carpetaIdStr = formData.get('carpeta_id') as string
      if (carpetaIdStr) {
        carpetaId = parseInt(carpetaIdStr) || 1
      }
      
      const archivo = formData.get('archivo') as File | null
      if (archivo && archivo.size > 0) {
        archivoFile = archivo
      }

      console.log('FormData recibido:', { nombre_actividad, fecha_inicio, fecha_fin })
    } else {
      // JSON
      try {
        const body = await request.json()
        nombre_actividad = body.nombre_actividad || ''
        descripcion = body.descripcion || ''
        fecha_inicio = body.fecha_inicio || ''
        fecha_fin = body.fecha_fin || ''
        
        console.log('JSON recibido:', body)
      } catch (jsonError) {
        console.error('Error parseando JSON:', jsonError)
        return NextResponse.json({ error: 'Error en formato de datos' }, { status: 400 })
      }
    }

    // Validación de campos requeridos
    if (!nombre_actividad || nombre_actividad.trim() === '') {
      console.log('Error: nombre_actividad vacío')
      return NextResponse.json({ error: 'El nombre de la actividad es requerido' }, { status: 400 })
    }

    if (!fecha_inicio || fecha_inicio.trim() === '') {
      console.log('Error: fecha_inicio vacía')
      return NextResponse.json({ error: 'La fecha de inicio es requerida' }, { status: 400 })
    }

    if (!fecha_fin || fecha_fin.trim() === '') {
      console.log('Error: fecha_fin vacía')
      return NextResponse.json({ error: 'La fecha de fin es requerida' }, { status: 400 })
    }

    // Validar formato de fechas
    const fechaInicioDate = new Date(fecha_inicio)
    const fechaFinDate = new Date(fecha_fin)

    if (isNaN(fechaInicioDate.getTime())) {
      return NextResponse.json({ error: 'Formato de fecha de inicio inválido' }, { status: 400 })
    }

    if (isNaN(fechaFinDate.getTime())) {
      return NextResponse.json({ error: 'Formato de fecha de fin inválido' }, { status: 400 })
    }

    console.log('Creando actividad:', {
      id_partida: partidaIdNum,
      nombre_actividad: nombre_actividad.trim(),
      fecha_inicio: fechaInicioDate,
      fecha_fin: fechaFinDate
    })

    // Crear actividad
    const actividad = await prisma.actividadPartida.create({
      data: {
        id_partida: partidaIdNum,
        nombre_actividad: nombre_actividad.trim(),
        descripcion: descripcion?.trim() || null,
        fecha_inicio: fechaInicioDate,
        fecha_fin: fechaFinDate
      }
    })

    console.log('Actividad creada con ID:', actividad.id_actividad)

    // Si hay archivo, subirlo
    if (archivoFile) {
      try {
        if (archivoFile.size > 10 * 1024 * 1024) {
          console.log('Archivo muy grande, se omite')
        } else {
          // Buscar carpeta tipo o usar la primera
          const carpeta = await prisma.carpetaTipo.findFirst({
            where: { id_carpeta_tipo: carpetaId }
          })
          
          if (!carpeta) {
            const primeraCarpeta = await prisma.carpetaTipo.findFirst()
            if (primeraCarpeta) {
              carpetaId = primeraCarpeta.id_carpeta_tipo
            }
          }

          const timestamp = Date.now()
          const extension = archivoFile.name.split('.').pop()?.toLowerCase() || 'pdf'
          const cleanName = archivoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const rutaArchivo = `obras/${obraId}/partida_${partidaIdNum}/actividad_${actividad.id_actividad}/${timestamp}-${cleanName}`

          console.log('Subiendo archivo a:', rutaArchivo)

          const bytes = await archivoFile.arrayBuffer()
          const buffer = Buffer.from(bytes)

          const { error: uploadError } = await supabaseAdmin.storage
            .from('documentos')
            .upload(rutaArchivo, buffer, { 
              contentType: archivoFile.type || 'application/octet-stream', 
              upsert: false 
            })

          if (uploadError) {
            console.error('Error subiendo archivo:', uploadError.message)
          } else {
            const { data: urlData } = supabaseAdmin.storage
              .from('documentos')
              .getPublicUrl(rutaArchivo)

            await prisma.documento.create({
              data: {
                id_obra: obraId,
                id_carpeta_tipo: carpetaId,
                tipo_documento: 'OTRO',
                nombre_archivo: archivoFile.name,
                ruta_archivo: urlData.publicUrl,
                formato: extension,
                version: 1,
                estado: 'VIGENTE',
                id_usuario: session.id_usuario
              }
            })
            console.log('Documento creado para actividad')
          }
        }
      } catch (uploadErr) {
        console.error('Error en proceso de upload:', uploadErr)
        // No fallamos, la actividad ya se creó
      }
    }

    // Log de actividad
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PROYECTOS',
          accion: `Crear actividad: ${nombre_actividad} en partida ${partida.nombre_partida}`,
          id_obra: obraId,
          resultado: 'Exito'
        }
      })
    } catch (logErr) {
      console.error('Error en log:', logErr)
    }

    return NextResponse.json({ actividad }, { status: 201 })
  } catch (error) {
    console.error('Error POST actividad:', error)
    // Dar más detalle del error
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ 
      error: 'Error al crear actividad',
      detalle: errorMessage 
    }, { status: 500 })
  }
}