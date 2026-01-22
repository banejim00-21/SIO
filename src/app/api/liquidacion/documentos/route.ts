// src/app/api/liquidacion/documentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { Prisma } from '@prisma/client'

// =====================================================
// PERMISOS DE LIQUIDACIÓN (según src/lib/permissions.ts)
// =====================================================
const PERMISOS_LIQUIDACION = {
  carpetas_completas: ['14', '15', '19'],
  carpetas_lectura: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '16', '17', '18', '20']
}

// Todas las carpetas accesibles (completas + lectura)
const CARPETAS_ACCESIBLES = [
  ...PERMISOS_LIQUIDACION.carpetas_completas,
  ...PERMISOS_LIQUIDACION.carpetas_lectura
]

// GET - Listar documentos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esLiquidacion = session.rol.nombre === 'LIQUIDACION'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esLiquidacion && !esAdmin) {
      return NextResponse.json({ error: 'No autorizado para este módulo' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id_obra = searchParams.get('id_obra')
    const carpeta = searchParams.get('carpeta')

    console.log('📂 [LIQ-DOCS] Obteniendo documentos...')

    const where: Prisma.DocumentoWhereInput = {
      estado: 'VIGENTE'
    }

    if (id_obra) {
      where.id_obra = parseInt(id_obra)
    }

    // Filtrar por carpetas accesibles para LIQUIDACIÓN
    if (esLiquidacion) {
      if (carpeta) {
        if (!CARPETAS_ACCESIBLES.includes(carpeta)) {
          return NextResponse.json({ 
            error: 'No tiene acceso a esta carpeta' 
          }, { status: 403 })
        }
        where.carpeta_tipo = { codigo: carpeta }
      } else {
        where.carpeta_tipo = {
          codigo: { in: CARPETAS_ACCESIBLES }
        }
      }
    } else if (esAdmin && carpeta) {
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

    console.log(`✅ [LIQ-DOCS] Se encontraron ${documentos.length} documentos`)

    return NextResponse.json({ documentos })
  } catch (error) {
    console.error('❌ [LIQ-DOCS] Error:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}

// POST - Subir documento usando filesystem local
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const esLiquidacion = session.rol.nombre === 'LIQUIDACION'
    const esAdmin = session.rol.nombre === 'ADMINISTRADOR'

    if (!esLiquidacion && !esAdmin) {
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
    if (esLiquidacion && !PERMISOS_LIQUIDACION.carpetas_completas.includes(carpeta)) {
      return NextResponse.json({ 
        error: `No tiene permisos para subir archivos a la carpeta ${carpeta}. Solo puede subir a las carpetas: ${PERMISOS_LIQUIDACION.carpetas_completas.join(', ')}` 
      }, { status: 403 })
    }

    console.log('📤 [LIQ-DOCS] Subiendo documento...', { id_obra, carpeta, fileName: file.name })

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

    // Generar nombre único
    const timestamp = Date.now()
    const extension = file.name.split('.').pop() || ''
    const nombreBase = file.name.replace(`.${extension}`, '').replace(/[^a-zA-Z0-9_-]/g, '_')
    const nombreArchivo = `${nombreBase}_${timestamp}.${extension}`
    
    // Crear directorio si no existe
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documentos', id_obra, carpeta)
    await mkdir(uploadDir, { recursive: true })

    // Guardar archivo en filesystem
    const filePath = path.join(uploadDir, nombreArchivo)
    await writeFile(filePath, buffer)

    // Ruta pública del archivo
    const rutaArchivo = `/uploads/documentos/${id_obra}/${carpeta}/${nombreArchivo}`

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
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'DOCUMENTAL',
          accion: `Subir documento: ${file.name} a carpeta ${carpetaTipo.nombre_carpeta}`,
          id_obra: parseInt(id_obra),
          resultado: 'Éxito'
        }
      })
    } catch (logError) {
      console.warn('⚠️ No se pudo registrar log:', logError)
    }

    console.log(`✅ [LIQ-DOCS] Documento subido: ${documento.id_documento}`)

    return NextResponse.json({
      message: 'Documento subido correctamente',
      documento
    }, { status: 201 })
  } catch (error) {
    console.error('❌ [LIQ-DOCS] Error al subir:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error al subir documento' 
    }, { status: 500 })
  }
}
