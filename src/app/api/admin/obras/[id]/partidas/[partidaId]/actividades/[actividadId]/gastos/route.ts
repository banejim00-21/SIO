// src/app/api/admin/obras/[id]/partidas/[partidaId]/actividades/[actividadId]/gastos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RouteParams {
  params: Promise<{ 
    id: string
    partidaId: string
    actividadId: string 
  }>
}

// GET - Listar gastos de una actividad
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, partidaId, actividadId } = await params
    const obraId = parseInt(id)
    const partidaIdNum = parseInt(partidaId)
    const actividadIdNum = parseInt(actividadId)

    console.log('GET gastos - Obra:', obraId, 'Partida:', partidaIdNum, 'Actividad:', actividadIdNum)

    // Obtener todos los gastos de esta actividad
    const gastos = await prisma.gasto.findMany({
      where: { id_actividad: actividadIdNum },
      include: {
        usuario: { select: { nombre: true } }
      },
      orderBy: { fecha_gasto: 'desc' }
    })

    console.log('Gastos encontrados:', gastos.length)

    // Para cada gasto, buscar si tiene documento asociado
    const gastosConArchivos = await Promise.all(
      gastos.map(async (gasto) => {
        let documento = null
        
        // Buscar documento por ruta que contenga gasto_ID
        documento = await prisma.documento.findFirst({
          where: {
            id_obra: obraId,
            estado: 'VIGENTE',
            ruta_archivo: { contains: `/gasto_${gasto.id_gasto}/` }
          },
          select: {
            id_documento: true,
            nombre_archivo: true,
            ruta_archivo: true,
            formato: true
          }
        })

        // Si no encontró y tiene documento_respaldo, crear objeto manual
        if (!documento && gasto.documento_respaldo) {
          documento = {
            id_documento: 0,
            nombre_archivo: 'Comprobante',
            ruta_archivo: gasto.documento_respaldo,
            formato: gasto.documento_respaldo.split('.').pop() || 'pdf'
          }
        }
        
        return {
          id_gasto: gasto.id_gasto,
          monto: Number(gasto.monto),
          descripcion: gasto.descripcion,
          fecha_gasto: gasto.fecha_gasto,
          tipo_comprobante: gasto.tipo_comprobante,
          numero_comprobante: gasto.numero_comprobante,
          usuario: gasto.usuario ? { nombre: gasto.usuario.nombre, apellido: '' } : null,
          archivo: documento
        }
      })
    )

    return NextResponse.json({ 
      gastos: gastosConArchivos,
      total: gastos.reduce((sum, g) => sum + Number(g.monto), 0)
    })
  } catch (error) {
    console.error('Error GET gastos:', error)
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 })
  }
}

// POST - Crear nuevo gasto con archivo opcional
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, partidaId, actividadId } = await params
    const obraId = parseInt(id)
    const partidaIdNum = parseInt(partidaId)
    const actividadIdNum = parseInt(actividadId)

    console.log('POST gasto - Obra:', obraId, 'Partida:', partidaIdNum, 'Actividad:', actividadIdNum)

    // Procesar FormData
    const formData = await request.formData()
    const monto = parseFloat(formData.get('monto') as string) || 0
    const descripcion = (formData.get('descripcion') as string) || ''
    const fecha_gasto = formData.get('fecha_gasto') as string || ''
    const tipo_comprobante = (formData.get('tipo_comprobante') as string) || ''
    const numero_comprobante = (formData.get('numero_comprobante') as string) || ''
    const archivo = formData.get('archivo') as File | null

    console.log('Datos:', { monto, fecha_gasto, tipo_comprobante, archivo: archivo?.name })

    if (!monto || monto <= 0) {
      return NextResponse.json({ error: 'El monto debe ser mayor a 0' }, { status: 400 })
    }

    if (!fecha_gasto) {
      return NextResponse.json({ error: 'La fecha es requerida' }, { status: 400 })
    }

    // PASO 1: Crear el gasto SIN archivo
    const gasto = await prisma.gasto.create({
      data: {
        id_partida: partidaIdNum,
        id_actividad: actividadIdNum,
        monto,
        descripcion: descripcion || null,
        fecha_gasto: new Date(fecha_gasto),
        tipo_comprobante: tipo_comprobante || null,
        numero_comprobante: numero_comprobante || null,
        id_usuario: session.id_usuario,
        documento_respaldo: null
      }
    })

    console.log('Gasto creado ID:', gasto.id_gasto)

    let archivoSubido = null

    // PASO 2: Si hay archivo, subirlo
    if (archivo && archivo.size > 0) {
      console.log('Procesando archivo:', archivo.name, 'Size:', archivo.size, 'Type:', archivo.type)

      if (archivo.size > 10 * 1024 * 1024) {
        console.log('Archivo muy grande')
      } else {
        try {
          const timestamp = Date.now()
          const extension = archivo.name.split('.').pop()?.toLowerCase() || 'pdf'
          const cleanName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const rutaArchivo = `obras/${obraId}/partida_${partidaIdNum}/actividad_${actividadIdNum}/gasto_${gasto.id_gasto}/${timestamp}-${cleanName}`

          console.log('Subiendo a:', rutaArchivo)

          const bytes = await archivo.arrayBuffer()
          const buffer = Buffer.from(bytes)

          // Subir a Supabase Storage
          const { error: uploadError } = await supabaseAdmin.storage
            .from('documentos')
            .upload(rutaArchivo, buffer, { 
              contentType: archivo.type || 'application/pdf', 
              upsert: true 
            })

          if (uploadError) {
            console.error('Error Supabase:', uploadError.message)
          } else {
            // Obtener URL pública
            const { data: urlData } = supabaseAdmin.storage
              .from('documentos')
              .getPublicUrl(rutaArchivo)

            const urlPublica = urlData.publicUrl
            console.log('URL:', urlPublica)

            // Buscar carpeta tipo
            let carpetaId = 1
            const carpeta = await prisma.carpetaTipo.findFirst({
              orderBy: { id_carpeta_tipo: 'asc' }
            })
            if (carpeta) carpetaId = carpeta.id_carpeta_tipo

            // Crear documento en BD
            const documento = await prisma.documento.create({
              data: {
                id_obra: obraId,
                id_carpeta_tipo: carpetaId,
                tipo_documento: 'OTRO',
                nombre_archivo: archivo.name,
                ruta_archivo: urlPublica,
                formato: extension,
                version: 1,
                estado: 'VIGENTE',
                id_usuario: session.id_usuario
              }
            })

            console.log('Documento creado ID:', documento.id_documento)

            // Actualizar gasto con referencia
            await prisma.gasto.update({
              where: { id_gasto: gasto.id_gasto },
              data: { documento_respaldo: urlPublica }
            })

            archivoSubido = {
              id_documento: documento.id_documento,
              nombre_archivo: documento.nombre_archivo,
              ruta_archivo: documento.ruta_archivo,
              formato: documento.formato
            }
          }
        } catch (err) {
          console.error('Error upload:', err)
        }
      }
    }

    // PASO 3: Actualizar monto_ejecutado de la partida
    try {
      const totalGastos = await prisma.gasto.aggregate({
        where: { id_partida: partidaIdNum },
        _sum: { monto: true }
      })

      await prisma.partida.update({
        where: { id_partida: partidaIdNum },
        data: { monto_ejecutado: totalGastos._sum.monto || 0 }
      })
    } catch (e) {
      console.error('Error actualizar partida:', e)
    }

    // Log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Gasto S/ ${monto.toFixed(2)}`,
          id_obra: obraId,
          resultado: 'Exito'
        }
      })
    } catch (e) {}

    return NextResponse.json({ 
      gasto: {
        ...gasto,
        monto: Number(gasto.monto),
        archivo: archivoSubido
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error POST gasto:', error)
    return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 })
  }
}