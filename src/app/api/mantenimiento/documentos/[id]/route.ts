// src/app/api/mantenimiento/documentos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// =====================================================
// PERMISOS DE MANTENIMIENTO
// =====================================================
const PERMISOS_MANTENIMIENTO = {
  carpetas_completas: ['07', '08', '09', '11', '19', '20'],
  carpetas_lectura: ['01', '02', '05', '06', '10', '13', '14', '16', '17', '18'],
  sin_acceso: ['03', '04', '12', '15']
}

const CARPETAS_ACCESIBLES = [
  ...PERMISOS_MANTENIMIENTO.carpetas_completas,
  ...PERMISOS_MANTENIMIENTO.carpetas_lectura
]

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener documento por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esMantenimiento = session.rol.nombre === 'MANTENIMIENTO'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esMantenimiento && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado para este módulo' }, { status: 403 })
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

    // Verificar acceso a la carpeta
    if (esMantenimiento && !CARPETAS_ACCESIBLES.includes(documento.carpeta_tipo.codigo)) {
      return NextResponse.json({ 
        error: 'No tiene acceso a documentos de esta carpeta' 
      }, { status: 403 })
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
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esMantenimiento = session.rol.nombre === 'MANTENIMIENTO'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esMantenimiento && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado para este módulo' }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const { nombre_archivo, estado, version } = body

    const documentoActual = await prisma.documento.findUnique({
      where: { id_documento: parseInt(id) },
      include: {
        carpeta_tipo: true,
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

    // Verificar permisos de actualización
    if (esMantenimiento) {
      if (!PERMISOS_MANTENIMIENTO.carpetas_completas.includes(documentoActual.carpeta_tipo.codigo)) {
        return NextResponse.json({ 
          error: `No tiene permisos para actualizar documentos de la carpeta ${documentoActual.carpeta_tipo.nombre_carpeta}` 
        }, { status: 403 })
      }
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

// DELETE - Anular documento
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esMantenimiento = session.rol.nombre === 'MANTENIMIENTO'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esMantenimiento && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado para este módulo' }, { status: 403 })
    }

    const { id } = await params

    const documento = await prisma.documento.findUnique({
      where: { id_documento: parseInt(id) },
      include: {
        carpeta_tipo: true
      }
    })

    if (!documento) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      )
    }

    // Verificar permisos de eliminación
    if (esMantenimiento) {
      if (!PERMISOS_MANTENIMIENTO.carpetas_completas.includes(documento.carpeta_tipo.codigo)) {
        return NextResponse.json({ 
          error: `No tiene permisos para eliminar documentos de la carpeta ${documento.carpeta_tipo.nombre_carpeta}` 
        }, { status: 403 })
      }
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
