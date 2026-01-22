// ==========================================
// src/app/api/infraestructura/cronogramas/route.ts
// ==========================================
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() { // ✓ Removido parámetro request no usado
  try {
    const session = await getSession()
    
    if (!session || session.rol.nombre !== 'INFRAESTRUCTURA') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener obras para el desplegable (solo las que están en ejecución o planeadas)
    const obras = await prisma.obra.findMany({
      where: {
        OR: [
          { id_responsable: session.id_usuario },
          { estado: { in: ['EN_EJECUCION', 'PLANEADA'] } }
        ]
      },
      select: {
        id_obra: true,
        nombre_obra: true,
        estado: true,
        responsable: {
          select: {
            nombre: true
          }
        },
        cronogramas: {
          include: {
            hitos: {
              orderBy: {
                fecha_hito: 'asc'
              }
            }
          },
          orderBy: {
            fecha_creacion: 'desc'
          }
        }
      },
      orderBy: {
        nombre_obra: 'asc'
      }
    })

    return NextResponse.json({ obras })
  } catch (error) {
    console.error('Error al obtener cronogramas:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) { // ✓ Este SÍ usa request
  try {
    const session = await getSession()
    
    if (!session || session.rol.nombre !== 'INFRAESTRUCTURA') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id_obra, estado, hitos } = body

    // Validaciones
    if (!id_obra || !hitos || !Array.isArray(hitos) || hitos.length === 0) {
      return NextResponse.json(
        { error: 'Datos incompletos para crear el cronograma' },
        { status: 400 }
      )
    }

    // Verificar que la obra existe y el usuario tiene acceso
    const obraExistente = await prisma.obra.findUnique({
      where: { 
        id_obra: parseInt(id_obra)
      },
      select: {
        id_obra: true,
        nombre_obra: true,
        id_responsable: true,
        estado: true
      }
    })

    if (!obraExistente) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Verificar acceso
    const tieneAcceso = obraExistente.id_responsable === session.id_usuario || 
                       ['EN_EJECUCION', 'PLANEADA'].includes(obraExistente.estado)

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tiene acceso a esta obra' }, { status: 403 })
    }

    // Crear cronograma con hitos
    const nuevoCronograma = await prisma.cronograma.create({
      data: {
        id_obra: parseInt(id_obra),
        fecha_creacion: new Date(),
        estado: (estado as 'ACTIVO' | 'PAUSADO' | 'FINALIZADO') || 'ACTIVO',
        hitos: {
          create: hitos.map((hito: { descripcion: string; fecha_hito: string; tipo?: string }) => ({
            descripcion: hito.descripcion,
            fecha_hito: new Date(hito.fecha_hito),
            tipo: hito.tipo || 'HITO_PRINCIPAL'
          }))
        }
      },
      include: {
        hitos: true,
        obra: {
          select: {
            nombre_obra: true
          }
        }
      }
    })

    // Registrar en logs
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Crear cronograma para obra: ${obraExistente.nombre_obra}`,
        id_obra: parseInt(id_obra),
        resultado: 'Éxito'
      }
    })

    return NextResponse.json({ cronograma: nuevoCronograma }, { status: 201 })
  } catch (error) {
    console.error('Error al crear cronograma:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}