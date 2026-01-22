// src/app/api/infraestructura/documentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET - Obtener documento por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    const documento = await prisma.documento.findUnique({
      where: { id_documento: parseInt(id) },
      include: {
        obra: true,
        carpeta_tipo: true,
        usuario: {
          select: {
            nombre: true,
            correo: true
          }
        },
        plano: true,
        contrato: {
          include: {
            adendas: true
          }
        },
        informe_tecnico: true
      }
    })

    if (!documento) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ documento })
  } catch (error) {
    console.error('Error al obtener documento:', error)
    return NextResponse.json(
      { error: 'Error al obtener documento' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar documento
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session || !['ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const {
      nombre_archivo,
      estado,
      version,
      // Actualización de datos específicos
      tipo_plano,
      categoria_plano,
      vigencia,
      estado_contrato
    } = body

    const documentoActual = await prisma.documento.findUnique({
      where: { id_documento: parseInt(id) },
      include: {
        plano: true,
        contrato: true,
        informe_tecnico: true
      }
    })

    if (!documentoActual) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    // Actualizar documento base
    const documentoActualizado = await prisma.documento.update({
      where: { id_documento: parseInt(id) },
      data: {
        nombre_archivo: nombre_archivo || documentoActual.nombre_archivo,
        estado: estado || documentoActual.estado,
        version: version || documentoActual.version
      },
      include: {
        obra: true,
        carpeta_tipo: true,
        usuario: {
          select: {
            nombre: true
          }
        }
      }
    })

    // Actualizar información específica según tipo
    if (documentoActual.plano && (tipo_plano || categoria_plano)) {
      await prisma.plano.update({
        where: { id_plano: documentoActual.plano.id_plano },
        data: {
          tipo_plano: tipo_plano || documentoActual.plano.tipo_plano,
          categoria: categoria_plano || documentoActual.plano.categoria
        }
      })
    }

    if (documentoActual.contrato && (vigencia || estado_contrato)) {
      await prisma.contrato.update({
        where: { id_contrato: documentoActual.contrato.id_contrato },
        data: {
          vigencia: vigencia || documentoActual.contrato.vigencia,
          estado: estado_contrato || documentoActual.contrato.estado
        }
      })
    }

    // Registrar en logs
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: `Actualizar documento: ${documentoActualizado.nombre_archivo}`,
        id_obra: documentoActualizado.id_obra,
        resultado: 'Éxito'
      }
    })

    return NextResponse.json({ documento: documentoActualizado })
  } catch (error) {
    console.error('Error al actualizar documento:', error)
    return NextResponse.json(
      { error: 'Error al actualizar documento' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar documento
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session || !['ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params

    const documento = await prisma.documento.findUnique({
      where: { id_documento: parseInt(id) },
      select: {
        nombre_archivo: true,
        id_obra: true
      }
    })

    if (!documento) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    // Cambiar estado a ANULADO en lugar de eliminar
    await prisma.documento.update({
      where: { id_documento: parseInt(id) },
      data: {
        estado: 'ANULADO'
      }
    })

    // Registrar en logs
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: `Anular documento: ${documento.nombre_archivo}`,
        id_obra: documento.id_obra,
        resultado: 'Éxito'
      }
    })

    return NextResponse.json({ message: 'Documento anulado exitosamente' })
  } catch (error) {
    console.error('Error al anular documento:', error)
    return NextResponse.json(
      { error: 'Error al anular documento' },
      { status: 500 }
    )
  }
}