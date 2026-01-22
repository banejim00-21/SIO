// src/app/api/mantenimiento/documentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { Prisma } from '@prisma/client'

// =====================================================
// PERMISOS DE MANTENIMIENTO (según src/lib/permissions.ts)
// =====================================================
const PERMISOS_MANTENIMIENTO = {
  carpetas_completas: ['07', '08', '09', '11', '19', '20'],
  carpetas_lectura: ['01', '02', '05', '06', '10', '13', '14', '16', '17', '18'],
  sin_acceso: ['03', '04', '12', '15']
}

// Todas las carpetas accesibles (completas + lectura)
const CARPETAS_ACCESIBLES = [
  ...PERMISOS_MANTENIMIENTO.carpetas_completas,
  ...PERMISOS_MANTENIMIENTO.carpetas_lectura
]

// GET - Listar documentos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Permitir MANTENIMIENTO y ADMINISTRADOR
    const esMantenimiento = session.rol.nombre === 'MANTENIMIENTO'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esMantenimiento && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado para este módulo' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id_obra = searchParams.get('id_obra')
    const carpeta = searchParams.get('carpeta')

    // Construir filtro
    const where: Prisma.DocumentoWhereInput = {}

    if (id_obra) {
      where.id_obra = parseInt(id_obra)
    }

    // Filtrar por carpetas accesibles para MANTENIMIENTO
    if (esMantenimiento) {
      if (carpeta) {
        // Verificar que la carpeta solicitada sea accesible
        if (!CARPETAS_ACCESIBLES.includes(carpeta)) {
          return NextResponse.json({ 
            error: 'No tiene acceso a esta carpeta' 
          }, { status: 403 })
        }
        where.carpeta_tipo = { codigo: carpeta }
      } else {
        // Si no especifica carpeta, filtrar solo las accesibles
        where.carpeta_tipo = {
          codigo: { in: CARPETAS_ACCESIBLES }
        }
      }
    } else if (esAdmin && carpeta) {
      // Admin puede ver todas
      where.carpeta_tipo = { codigo: carpeta }
    }

    const documentos = await prisma.documento.findMany({
      where,
      include: {
        obra: {
          select: {
            id_obra: true,
            nombre_obra: true
          }
        },
        carpeta_tipo: {
          select: {
            id_carpeta_tipo: true,
            codigo: true,
            nombre_carpeta: true
          }
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true
          }
        }
      },
      orderBy: { fecha_carga: 'desc' }
    })

    return NextResponse.json({ documentos })
  } catch (error) {
    console.error('Error al obtener documentos:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}

// POST - Subir documento
export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const id_obra = formData.get('id_obra') as string
    const carpeta = formData.get('carpeta') as string

    if (!file || !id_obra || !carpeta) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos (archivo, obra, carpeta)' 
      }, { status: 400 })
    }

    // Verificar permisos de escritura en la carpeta
    if (esMantenimiento && !PERMISOS_MANTENIMIENTO.carpetas_completas.includes(carpeta)) {
      return NextResponse.json({ 
        error: `No tiene permisos para subir archivos a la carpeta ${carpeta}. Solo puede subir a las carpetas: ${PERMISOS_MANTENIMIENTO.carpetas_completas.join(', ')}` 
      }, { status: 403 })
    }

    // Obtener carpeta_tipo
    const carpetaTipo = await prisma.carpetaTipo.findFirst({
      where: { codigo: carpeta }
    })

    if (!carpetaTipo) {
      return NextResponse.json({ error: 'Carpeta no válida' }, { status: 400 })
    }

    // Verificar que la obra existe
    const obra = await prisma.obra.findUnique({
      where: { id_obra: parseInt(id_obra) }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Procesar archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documentos', id_obra, carpeta)
    await mkdir(uploadDir, { recursive: true })

    // Generar nombre único
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || ''
    const nombreBase = file.name.replace(`.${extension}`, '')
    const nombreArchivo = `${nombreBase}_${timestamp}.${extension}`
    const rutaArchivo = `/uploads/documentos/${id_obra}/${carpeta}/${nombreArchivo}`

    // Guardar archivo
    await writeFile(path.join(uploadDir, nombreArchivo), buffer)

    // Verificar si ya existe un documento con el mismo nombre base para versionado
    const documentoExistente = await prisma.documento.findFirst({
      where: {
        id_obra: parseInt(id_obra),
        id_carpeta_tipo: carpetaTipo.id_carpeta_tipo,
        nombre_archivo: { startsWith: nombreBase }
      },
      orderBy: { version: 'desc' }
    })

    const nuevaVersion = documentoExistente ? documentoExistente.version + 1 : 1

    // Crear registro en BD
    const documento = await prisma.documento.create({
      data: {
        id_obra: parseInt(id_obra),
        id_carpeta_tipo: carpetaTipo.id_carpeta_tipo,
        tipo_documento: 'OTRO',
        nombre_archivo: file.name,
        ruta_archivo: rutaArchivo,
        formato: extension.toUpperCase(),
        version: nuevaVersion,
        estado: 'VIGENTE',
        id_usuario: session.id_usuario
      },
      include: {
        obra: { select: { nombre_obra: true } },
        carpeta_tipo: { select: { nombre_carpeta: true } },
        usuario: { select: { nombre: true } }
      }
    })

    // Registrar en log
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: `Subir documento: ${file.name}`,
        id_obra: parseInt(id_obra),
        resultado: 'Éxito'
      }
    })

    return NextResponse.json({
      message: 'Documento subido correctamente',
      documento
    }, { status: 201 })
  } catch (error) {
    console.error('Error al subir documento:', error)
    return NextResponse.json({ 
      error: 'Error al subir documento' 
    }, { status: 500 })
  }
}
