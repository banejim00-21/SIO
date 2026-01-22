// src/app/api/admin/obras/[id]/partidas/[partidaId]/actividades/[actividadId]/gastos/[gastoId]/route.ts
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
    gastoId: string
  }>
}

// GET - Obtener un gasto específico
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, gastoId } = await params
    const obraId = parseInt(id)
    const gastoIdNum = parseInt(gastoId)

    const gasto = await prisma.gasto.findUnique({
      where: { id_gasto: gastoIdNum },
      include: {
        usuario: { select: { nombre: true } }
      }
    })

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    // Buscar archivo asociado
    let documento = await prisma.documento.findFirst({
      where: {
        id_obra: obraId,
        estado: 'VIGENTE',
        ruta_archivo: { contains: `/gasto_${gasto.id_gasto}/` }
      }
    })

    // Si no hay documento pero tiene documento_respaldo
    if (!documento && gasto.documento_respaldo) {
      documento = {
        id_documento: 0,
        nombre_archivo: 'Comprobante',
        ruta_archivo: gasto.documento_respaldo,
        formato: gasto.documento_respaldo.split('.').pop() || 'pdf'
      } as any
    }

    return NextResponse.json({ 
      gasto: {
        ...gasto,
        monto: Number(gasto.monto),
        archivo: documento
      }
    })
  } catch (error) {
    console.error('Error GET gasto:', error)
    return NextResponse.json({ error: 'Error al obtener gasto' }, { status: 500 })
  }
}

// PUT - Actualizar un gasto
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, partidaId, actividadId, gastoId } = await params
    const obraId = parseInt(id)
    const partidaIdNum = parseInt(partidaId)
    const actividadIdNum = parseInt(actividadId)
    const gastoIdNum = parseInt(gastoId)

    console.log('PUT gasto:', gastoIdNum)

    const gastoExistente = await prisma.gasto.findUnique({
      where: { id_gasto: gastoIdNum }
    })

    if (!gastoExistente) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    // Procesar FormData
    const formData = await request.formData()
    const monto = parseFloat(formData.get('monto') as string) || undefined
    const descripcion = formData.get('descripcion') as string
    const fecha_gasto = formData.get('fecha_gasto') as string
    const tipo_comprobante = formData.get('tipo_comprobante') as string
    const numero_comprobante = formData.get('numero_comprobante') as string
    const archivo = formData.get('archivo') as File | null

    // Preparar datos de actualización
    const updateData: Record<string, unknown> = {}
    if (monto !== undefined && monto > 0) updateData.monto = monto
    if (descripcion !== undefined) updateData.descripcion = descripcion || null
    if (fecha_gasto) updateData.fecha_gasto = new Date(fecha_gasto)
    if (tipo_comprobante !== undefined) updateData.tipo_comprobante = tipo_comprobante || null
    if (numero_comprobante !== undefined) updateData.numero_comprobante = numero_comprobante || null

    // Actualizar gasto
    const gasto = await prisma.gasto.update({
      where: { id_gasto: gastoIdNum },
      data: updateData
    })

    let archivoSubido = null

    // Si hay nuevo archivo, subirlo
    if (archivo && archivo.size > 0 && archivo.size <= 10 * 1024 * 1024) {
      try {
        // Eliminar archivo anterior si existe
        const docAnterior = await prisma.documento.findFirst({
          where: {
            id_obra: obraId,
            estado: 'VIGENTE',
            ruta_archivo: { contains: `/gasto_${gastoIdNum}/` }
          }
        })

        if (docAnterior) {
          const urlParts = docAnterior.ruta_archivo.split('/documentos/')
          if (urlParts[1]) {
            await supabaseAdmin.storage.from('documentos').remove([decodeURIComponent(urlParts[1])])
          }
          await prisma.documento.update({
            where: { id_documento: docAnterior.id_documento },
            data: { estado: 'ANULADO' }
          })
        }

        // Subir nuevo archivo
        const timestamp = Date.now()
        const extension = archivo.name.split('.').pop()?.toLowerCase() || 'pdf'
        const cleanName = archivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const rutaArchivo = `obras/${obraId}/partida_${partidaIdNum}/actividad_${actividadIdNum}/gasto_${gastoIdNum}/${timestamp}-${cleanName}`

        const bytes = await archivo.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const { error: uploadError } = await supabaseAdmin.storage
          .from('documentos')
          .upload(rutaArchivo, buffer, { 
            contentType: archivo.type || 'application/pdf', 
            upsert: true 
          })

        if (!uploadError) {
          const { data: urlData } = supabaseAdmin.storage
            .from('documentos')
            .getPublicUrl(rutaArchivo)

          // Buscar carpeta tipo
          let carpetaId = 1
          const carpeta = await prisma.carpetaTipo.findFirst()
          if (carpeta) carpetaId = carpeta.id_carpeta_tipo

          const documento = await prisma.documento.create({
            data: {
              id_obra: obraId,
              id_carpeta_tipo: carpetaId,
              tipo_documento: 'OTRO',
              nombre_archivo: archivo.name,
              ruta_archivo: urlData.publicUrl,
              formato: extension,
              version: 1,
              estado: 'VIGENTE',
              id_usuario: session.id_usuario
            }
          })

          // Actualizar gasto con referencia
          await prisma.gasto.update({
            where: { id_gasto: gastoIdNum },
            data: { documento_respaldo: urlData.publicUrl }
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

    // Recalcular monto_ejecutado de la partida
    try {
      const totalGastos = await prisma.gasto.aggregate({
        where: { id_partida: partidaIdNum },
        _sum: { monto: true }
      })

      await prisma.partida.update({
        where: { id_partida: partidaIdNum },
        data: { monto_ejecutado: totalGastos._sum.monto || 0 }
      })
    } catch (e) {}

    // Si no se subió nuevo archivo, buscar el existente
    if (!archivoSubido) {
      const docExistente = await prisma.documento.findFirst({
        where: {
          id_obra: obraId,
          estado: 'VIGENTE',
          ruta_archivo: { contains: `/gasto_${gastoIdNum}/` }
        }
      })
      if (docExistente) {
        archivoSubido = {
          id_documento: docExistente.id_documento,
          nombre_archivo: docExistente.nombre_archivo,
          ruta_archivo: docExistente.ruta_archivo,
          formato: docExistente.formato
        }
      }
    }

    return NextResponse.json({ 
      gasto: {
        ...gasto,
        monto: Number(gasto.monto),
        archivo: archivoSubido
      }
    })
  } catch (error) {
    console.error('Error PUT gasto:', error)
    return NextResponse.json({ error: 'Error al actualizar gasto' }, { status: 500 })
  }
}

// DELETE - Eliminar un gasto y su archivo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, partidaId, gastoId } = await params
    const obraId = parseInt(id)
    const partidaIdNum = parseInt(partidaId)
    const gastoIdNum = parseInt(gastoId)

    console.log('DELETE gasto:', gastoIdNum)

    const gasto = await prisma.gasto.findUnique({
      where: { id_gasto: gastoIdNum }
    })

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
    }

    // Buscar y eliminar archivo asociado
    const documento = await prisma.documento.findFirst({
      where: {
        id_obra: obraId,
        estado: 'VIGENTE',
        ruta_archivo: { contains: `/gasto_${gastoIdNum}/` }
      }
    })

    if (documento) {
      try {
        // Eliminar de Supabase Storage
        const urlParts = documento.ruta_archivo.split('/documentos/')
        if (urlParts[1]) {
          const pathToDelete = decodeURIComponent(urlParts[1])
          console.log('Eliminando archivo:', pathToDelete)
          await supabaseAdmin.storage.from('documentos').remove([pathToDelete])
        }
        // Marcar documento como anulado
        await prisma.documento.update({
          where: { id_documento: documento.id_documento },
          data: { estado: 'ANULADO' }
        })
      } catch (err) {
        console.error('Error eliminando archivo:', err)
      }
    }

    // Eliminar el gasto
    await prisma.gasto.delete({
      where: { id_gasto: gastoIdNum }
    })

    // Recalcular monto_ejecutado de la partida
    try {
      const totalGastos = await prisma.gasto.aggregate({
        where: { id_partida: partidaIdNum },
        _sum: { monto: true }
      })

      await prisma.partida.update({
        where: { id_partida: partidaIdNum },
        data: { monto_ejecutado: totalGastos._sum.monto || 0 }
      })
    } catch (e) {}

    // Log
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PRESUPUESTO',
          accion: `Eliminar gasto S/ ${Number(gasto.monto).toFixed(2)}`,
          id_obra: obraId,
          resultado: 'Exito'
        }
      })
    } catch (e) {}

    return NextResponse.json({ message: 'Gasto eliminado correctamente' })
  } catch (error) {
    console.error('Error DELETE gasto:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto' }, { status: 500 })
  }
}