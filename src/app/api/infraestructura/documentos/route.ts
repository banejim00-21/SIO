// src/app/api/infraestructura/documentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { TipoDocumento, Prisma } from '@prisma/client'

// GET - Listar documentos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id_obra = searchParams.get('id_obra')
    const tipo_documento = searchParams.get('tipo_documento')
    const search = searchParams.get('search')

    // ✅ CORRECCIÓN: Usar el tipo generado por Prisma
    const where: Prisma.DocumentoWhereInput = {}
    
    if (id_obra) {
      where.id_obra = parseInt(id_obra)
    }
    
    if (tipo_documento) {
      where.tipo_documento = tipo_documento as TipoDocumento
    }
    
    if (search) {
      where.OR = [
        { nombre_archivo: { contains: search, mode: 'insensitive' as const } },
        { obra: { nombre_obra: { contains: search, mode: 'insensitive' as const } } }
      ]
    }

    const documentos = await prisma.documento.findMany({
      where,
      include: {
        obra: {
          select: {
            id_obra: true,
            nombre_obra: true,
            ubicacion: true
          }
        },
        carpeta_tipo: {
          select: {
            id_carpeta_tipo: true,
            nombre_carpeta: true,
            codigo: true
          }
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true
          }
        },
        plano: true,
        contrato: true,
        informe_tecnico: true
      },
      orderBy: {
        fecha_carga: 'desc'
      }
    })

    return NextResponse.json({ documentos })
  } catch (error) {
    console.error('Error al obtener documentos:', error)
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    )
  }
}

// POST - Crear documento
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !['ADMINISTRADOR', 'INFRAESTRUCTURA'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      id_obra,
      id_carpeta_tipo,
      tipo_documento,
      nombre_archivo,
      ruta_archivo,
      formato,
      // Datos específicos según tipo
      tipo_plano,
      categoria_plano,
      numero_contrato,
      fecha_firma,
      vigencia,
      estado_contrato,
      responsable_legal,
      tipo_informe,
      autor,
      rol_responsable,
      fecha_informe
    } = body

    // Validar campos requeridos
    if (!id_obra || !id_carpeta_tipo || !tipo_documento || !nombre_archivo || !ruta_archivo || !formato) {
      return NextResponse.json(
        { error: 'Todos los campos obligatorios deben ser completados' },
        { status: 400 }
      )
    }

    // Crear documento base
    const documento = await prisma.documento.create({
      data: {
        id_obra,
        id_carpeta_tipo,
        tipo_documento,
        nombre_archivo,
        ruta_archivo,
        formato,
        id_usuario: session.id_usuario,
        estado: 'VIGENTE',
        version: 1
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

    // Crear registros específicos según tipo de documento
    if (tipo_documento === 'PLANO' && tipo_plano && categoria_plano) {
      await prisma.plano.create({
        data: {
          id_documento: documento.id_documento,
          tipo_plano,
          categoria: categoria_plano
        }
      })
    }

    if (tipo_documento === 'CONTRATO' && numero_contrato && fecha_firma && estado_contrato) {
      await prisma.contrato.create({
        data: {
          id_documento: documento.id_documento,
          numero_contrato,
          fecha_firma: new Date(fecha_firma),
          vigencia: vigencia || '',
          estado: estado_contrato,
          responsable_legal: responsable_legal || ''
        }
      })
    }

    if (tipo_documento === 'INFORME' && tipo_informe && autor && fecha_informe) {
      await prisma.informeTecnico.create({
        data: {
          id_documento: documento.id_documento,
          tipo_informe,
          autor,
          rol_responsable: rol_responsable || '',
          fecha_informe: new Date(fecha_informe)
        }
      })
    }

    // Registrar en logs
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: `Cargar documento: ${nombre_archivo}`,
        id_obra,
        resultado: 'Éxito'
      }
    })

    return NextResponse.json({ documento }, { status: 201 })
  } catch (error) {
    console.error('Error al crear documento:', error)
    return NextResponse.json(
      { error: 'Error al crear documento' },
      { status: 500 }
    )
  }
}