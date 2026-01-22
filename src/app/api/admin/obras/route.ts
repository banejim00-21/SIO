// src/app/api/admin/obras/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Listar todas las obras con sus detalles
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const obras = await prisma.obra.findMany({
      include: {
        responsable: {
          select: { id_usuario: true, nombre: true, rol: { select: { nombre: true } } }
        },
        presupuestos: {
          where: { estado: 'VIGENTE' },
          include: {
            partidas: {
              select: { id_partida: true, monto_asignado: true, monto_ejecutado: true }
            }
          }
        },
        historial_estados: {
          orderBy: { fecha_cambio: 'desc' },
          take: 5,
          include: { usuario: { select: { nombre: true } } }
        },
        roles_asignados: {
          where: { estado: 'ACTIVO' },
          include: {
            personal: {
              include: {
                usuario: { select: { id_usuario: true, nombre: true } }
              }
            }
          }
        },
        documentos: {
          where: { estado: 'VIGENTE' },
          select: { id_documento: true }
        }
      },
      orderBy: { fecha_creacion: 'desc' }
    })

    const obrasConAvance = obras.map(obra => {
      const presupuestoVigente = obra.presupuestos[0]
      const partidas = presupuestoVigente?.partidas || []
      const totalAsignado = partidas.reduce((sum, p) => sum + Number(p.monto_asignado), 0)
      const totalEjecutado = partidas.reduce((sum, p) => sum + Number(p.monto_ejecutado), 0)
      const avance = totalAsignado > 0 ? (totalEjecutado / totalAsignado) * 100 : 0

      const responsablesAdicionales = obra.roles_asignados
        .filter(ra => ra.personal?.usuario)
        .map(ra => ({
          id_usuario: ra.personal.usuario!.id_usuario,
          nombre: ra.personal.usuario!.nombre
        }))

      return {
        ...obra,
        total_partidas: partidas.length,
        total_documentos: obra.documentos.length,
        avance_porcentaje: Math.round(avance * 10) / 10,
        responsables_adicionales: responsablesAdicionales,
        presupuestos: undefined,
        roles_asignados: undefined,
        documentos: undefined
      }
    })

    return NextResponse.json({ obras: obrasConAvance })
  } catch (error) {
    console.error('Error al obtener obras:', error)
    return NextResponse.json({ error: 'Error al obtener obras' }, { status: 500 })
  }
}

// POST - Crear nueva obra con archivo adjunto opcional
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    
    let nombre_obra: string
    let ubicacion: string
    let coordenadas: string | null = null
    let presupuesto_inicial: number
    let fecha_inicio_prevista: string
    let fecha_fin_prevista: string | null = null
    let id_responsable: number | null = null
    let total_partidas: number | null = null
    let responsables_ids: number[] = []
    let archivoFile: File | null = null
    let archivoCarpetaId: number | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      
      nombre_obra = formData.get('nombre_obra') as string
      ubicacion = formData.get('ubicacion') as string
      coordenadas = (formData.get('coordenadas') as string) || null
      presupuesto_inicial = parseFloat(formData.get('presupuesto_inicial') as string)
      fecha_inicio_prevista = formData.get('fecha_inicio_prevista') as string
      fecha_fin_prevista = (formData.get('fecha_fin_prevista') as string) || null
      id_responsable = formData.get('id_responsable') ? parseInt(formData.get('id_responsable') as string) : null
      total_partidas = formData.get('total_partidas') ? parseInt(formData.get('total_partidas') as string) : null
      archivoCarpetaId = formData.get('archivo_carpeta_id') ? parseInt(formData.get('archivo_carpeta_id') as string) : null
      
      const responsablesStr = formData.get('responsables_ids') as string
      if (responsablesStr) {
        try { responsables_ids = JSON.parse(responsablesStr) } catch { responsables_ids = [] }
      }

      const archivo = formData.get('archivo') as File | null
      if (archivo && archivo.size > 0) {
        archivoFile = archivo
      }
    } else {
      const body = await request.json()
      nombre_obra = body.nombre_obra
      ubicacion = body.ubicacion
      coordenadas = body.coordenadas || null
      presupuesto_inicial = parseFloat(body.presupuesto_inicial)
      fecha_inicio_prevista = body.fecha_inicio_prevista
      fecha_fin_prevista = body.fecha_fin_prevista || null
      id_responsable = body.id_responsable ? parseInt(body.id_responsable) : null
      total_partidas = body.total_partidas ? parseInt(body.total_partidas) : null
      responsables_ids = body.responsables_ids || []
    }

    if (!nombre_obra || !ubicacion || !presupuesto_inicial || !fecha_inicio_prevista) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Preparar datos base para crear la obra
    const obraData: Record<string, unknown> = {
      nombre_obra,
      ubicacion,
      coordenadas,
      presupuesto_inicial,
      fecha_inicio_prevista: new Date(fecha_inicio_prevista),
      estado: 'PLANEADA',
      id_responsable: id_responsable || session.id_usuario
    }

    // Agregar campos opcionales si existen en el schema
    // Estos campos se agregan solo si la migración SQL fue ejecutada
    if (fecha_fin_prevista) {
      obraData.fecha_fin_prevista = new Date(fecha_fin_prevista)
    }
    if (total_partidas) {
      obraData.total_partidas_inicial = total_partidas
    }

    // Crear la obra
    const obra = await prisma.obra.create({
      data: obraData as Parameters<typeof prisma.obra.create>[0]['data'],
      include: {
        responsable: { select: { id_usuario: true, nombre: true } }
      }
    })

    // Crear presupuesto inicial
    await prisma.presupuesto.create({
      data: {
        id_obra: obra.id_obra,
        version: 1,
        monto_total: presupuesto_inicial,
        estado: 'VIGENTE',
        id_responsable: session.id_usuario
      }
    })

    // Registrar historial de estado inicial
    await prisma.historialEstado.create({
      data: {
        id_obra: obra.id_obra,
        estado: 'PLANEADA',
        id_usuario: session.id_usuario,
        justificacion: 'Creación de la obra'
      }
    })

    // Si hay archivo adjunto, subirlo a Supabase y guardarlo como Documento
    let archivoAdjuntoUrl: string | null = null
    if (archivoFile) {
      if (archivoFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'El archivo excede 10MB' }, { status: 400 })
      }

      // Usar carpeta 01 (Documentación Técnica) por defecto si no se especifica
      const carpetaId = archivoCarpetaId || 1
      const carpeta = await prisma.carpetaTipo.findUnique({ where: { id_carpeta_tipo: carpetaId } })

      const timestamp = Date.now()
      const extension = archivoFile.name.split('.').pop()?.toLowerCase() || 'pdf'
      const cleanName = archivoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const nombreArchivo = `obras/${obra.id_obra}/${carpeta?.codigo || '01_DOCUMENTACION'}/${timestamp}-${cleanName}`

      const bytes = await archivoFile.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const { error: uploadError } = await supabaseAdmin.storage
        .from('documentos')
        .upload(nombreArchivo, buffer, { contentType: archivoFile.type, upsert: false })

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from('documentos').getPublicUrl(nombreArchivo)
        archivoAdjuntoUrl = urlData.publicUrl

        // Guardar referencia en tabla Documento
        await prisma.documento.create({
          data: {
            id_obra: obra.id_obra,
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

        // Actualizar URL en la obra si el campo existe
        try {
          await prisma.obra.update({
            where: { id_obra: obra.id_obra },
            data: { archivo_adjunto_url: archivoAdjuntoUrl } as Parameters<typeof prisma.obra.update>[0]['data']
          })
        } catch {
          // Campo no existe en el schema, ignorar
        }
      }
    }

    // Asignar responsables adicionales
    if (responsables_ids && responsables_ids.length > 0) {
      for (const usuarioId of responsables_ids) {
        const usuario = await prisma.usuario.findUnique({
          where: { id_usuario: usuarioId },
          include: { personal: true }
        })
        if (usuario?.personal) {
          await prisma.rolAsignado.create({
            data: {
              id_personal: usuario.personal.id_personal,
              rol: 'ADMINISTRADOR',
              id_proyecto: obra.id_obra,
              fecha_inicio: new Date(),
              estado: 'ACTIVO'
            }
          })
        }
      }
    }

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Crear obra: ${nombre_obra}`,
        id_obra: obra.id_obra,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ obra, archivo_adjunto_url: archivoAdjuntoUrl }, { status: 201 })
  } catch (error) {
    console.error('Error al crear obra:', error)
    return NextResponse.json({ error: 'Error al crear obra', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}
