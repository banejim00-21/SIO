// src/app/api/admin/obras/[id]/partidas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Listar partidas de una obra
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

    console.log('Buscando partidas para obra:', obraId)

    // Buscar presupuesto - primero VIGENTE, sino el más reciente
    let presupuesto = await prisma.presupuesto.findFirst({
      where: { id_obra: obraId, estado: 'VIGENTE' }
    })

    // Si no hay vigente, buscar cualquier presupuesto de la obra
    if (!presupuesto) {
      presupuesto = await prisma.presupuesto.findFirst({
        where: { id_obra: obraId },
        orderBy: { fecha_creacion: 'desc' }
      })
      console.log('No hay presupuesto VIGENTE, encontrado:', presupuesto?.id_presupuesto)
    }

    if (!presupuesto) {
      console.log('No hay ningún presupuesto para la obra')
      return NextResponse.json({ partidas: [], total_asignado: 0, total_ejecutado: 0 })
    }

    console.log('Presupuesto encontrado:', presupuesto.id_presupuesto, 'Estado:', presupuesto.estado)

    const partidas = await prisma.partida.findMany({
      where: { id_presupuesto: presupuesto.id_presupuesto },
      orderBy: { id_partida: 'asc' }
    })

    console.log('Partidas encontradas:', partidas.length)

    // Si no hay partidas, retornar vacío
    if (partidas.length === 0) {
      return NextResponse.json({ partidas: [], total_asignado: 0, total_ejecutado: 0 })
    }

    // Para cada partida, obtener actividades y contar archivos
    const partidasConArchivos = await Promise.all(
      partidas.map(async (partida) => {
        // Contar documentos de esta partida
        const documentosPartida = await prisma.documento.count({
          where: {
            id_obra: obraId,
            estado: 'VIGENTE',
            ruta_archivo: { contains: `/partida_${partida.id_partida}/` }
          }
        })

        // Obtener actividades de esta partida usando ActividadPartida
        const actividades = await prisma.actividadPartida.findMany({
          where: { id_partida: partida.id_partida },
          orderBy: { fecha_inicio: 'asc' }
        })

        // Para cada actividad, contar sus documentos
        const actividadesConArchivos = await Promise.all(
          actividades.map(async (actividad) => {
            const documentosActividad = await prisma.documento.count({
              where: {
                id_obra: obraId,
                estado: 'VIGENTE',
                ruta_archivo: { contains: `/actividad_${actividad.id_actividad}/` }
              }
            })
            return {
              ...actividad,
              archivos_count: documentosActividad
            }
          })
        )

        return {
          ...partida,
          archivos_count: documentosPartida,
          actividades: actividadesConArchivos,
          avance_porcentaje: Number(partida.monto_asignado) > 0
            ? Math.round((Number(partida.monto_ejecutado) / Number(partida.monto_asignado)) * 1000) / 10
            : 0
        }
      })
    )

    const totalAsignado = partidas.reduce((sum, p) => sum + Number(p.monto_asignado), 0)
    const totalEjecutado = partidas.reduce((sum, p) => sum + Number(p.monto_ejecutado), 0)

    return NextResponse.json({
      partidas: partidasConArchivos,
      total_asignado: totalAsignado,
      total_ejecutado: totalEjecutado,
      avance_general: totalAsignado > 0 ? Math.round((totalEjecutado / totalAsignado) * 1000) / 10 : 0
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener partidas' }, { status: 500 })
  }
}

// POST - Crear partida con archivo opcional
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const obraId = parseInt(id)

    console.log('Creando partida para obra:', obraId)

    // Verificar que la obra existe
    const obra = await prisma.obra.findUnique({ where: { id_obra: obraId } })
    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Obtener o crear presupuesto vigente
    let presupuesto = await prisma.presupuesto.findFirst({
      where: { id_obra: obraId, estado: 'VIGENTE' }
    })

    if (!presupuesto) {
      // Buscar cualquier presupuesto existente
      presupuesto = await prisma.presupuesto.findFirst({
        where: { id_obra: obraId },
        orderBy: { version: 'desc' }
      })
      
      if (!presupuesto) {
        // Crear nuevo presupuesto
        presupuesto = await prisma.presupuesto.create({
          data: {
            id_obra: obraId,
            version: 1,
            monto_total: Number(obra.presupuesto_inicial),
            estado: 'VIGENTE',
            id_responsable: session.id_usuario
          }
        })
        console.log('Presupuesto creado:', presupuesto.id_presupuesto)
      } else {
        // Actualizar estado a VIGENTE
        presupuesto = await prisma.presupuesto.update({
          where: { id_presupuesto: presupuesto.id_presupuesto },
          data: { estado: 'VIGENTE' }
        })
        console.log('Presupuesto actualizado a VIGENTE:', presupuesto.id_presupuesto)
      }
    }

    // Procesar FormData o JSON
    const contentType = request.headers.get('content-type') || ''
    let nombre_partida: string = ''
    let monto_asignado: number = 0
    let archivoFile: File | null = null
    let carpetaId: number = 1

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      nombre_partida = formData.get('nombre_partida') as string || ''
      monto_asignado = parseFloat(formData.get('monto_asignado') as string) || 0
      carpetaId = parseInt(formData.get('carpeta_id') as string) || 1
      
      const archivo = formData.get('archivo') as File | null
      if (archivo && archivo.size > 0) {
        archivoFile = archivo
      }
    } else {
      const body = await request.json()
      nombre_partida = body.nombre_partida || ''
      monto_asignado = parseFloat(body.monto_asignado) || 0
    }

    if (!nombre_partida.trim()) {
      return NextResponse.json({ error: 'Nombre de partida requerido' }, { status: 400 })
    }

    console.log('Creando partida:', nombre_partida, 'Monto:', monto_asignado)

    // Crear partida PRIMERO (antes del archivo)
    const partida = await prisma.partida.create({
      data: {
        id_presupuesto: presupuesto.id_presupuesto,
        nombre_partida: nombre_partida.trim(),
        monto_asignado,
        monto_ejecutado: 0
      }
    })

    console.log('Partida creada:', partida.id_partida)

    // Si hay archivo, subirlo (NO bloquea la creación de partida)
    if (archivoFile) {
      try {
        if (archivoFile.size > 10 * 1024 * 1024) {
          console.log('Archivo muy grande, pero partida ya creada')
        } else {
          const carpeta = await prisma.carpetaTipo.findUnique({ where: { id_carpeta_tipo: carpetaId } })
          const timestamp = Date.now()
          const extension = archivoFile.name.split('.').pop()?.toLowerCase() || 'pdf'
          const cleanName = archivoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const nombreArchivo = `obras/${obraId}/partida_${partida.id_partida}/${carpeta?.codigo || '01'}/${timestamp}-${cleanName}`

          const bytes = await archivoFile.arrayBuffer()
          const buffer = Buffer.from(bytes)

          const { error: uploadError } = await supabaseAdmin.storage
            .from('documentos')
            .upload(nombreArchivo, buffer, { contentType: archivoFile.type, upsert: false })

          if (uploadError) {
            console.log('Error subiendo archivo (partida ya creada):', uploadError.message)
          } else {
            const { data: urlData } = supabaseAdmin.storage.from('documentos').getPublicUrl(nombreArchivo)

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
            console.log('Archivo subido correctamente')
          }
        }
      } catch (uploadErr) {
        console.log('Error en upload (partida ya creada):', uploadErr)
        // No retornamos error, la partida ya se creó
      }
    }

    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Crear partida: ${nombre_partida}`,
          id_obra: obraId,
          resultado: 'Exito'
        }
      })
    } catch (logErr) {
      console.log('Error en log (no crítico):', logErr)
    }

    return NextResponse.json({ partida }, { status: 201 })
  } catch (error) {
    console.error('Error creando partida:', error)
    return NextResponse.json({ error: 'Error al crear partida' }, { status: 500 })
  }
}
