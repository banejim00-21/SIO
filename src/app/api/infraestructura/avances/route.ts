// ==========================================
// src/app/api/infraestructura/avances/route.ts
// ==========================================
import { NextResponse } from 'next/server' // ✓ Removido NextRequest no usado
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Obtener obras con fases, actividades y reportes
export async function GET() { // ✓ Removido parámetro request no usado
  try {
    const session = await getSession()
    
    if (!session || (session.rol.nombre !== 'INFRAESTRUCTURA' && session.rol.nombre !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    console.log('📊 [AVANCES] Obteniendo obras con fases y actividades...')

    // Obtener todas las obras con sus fases, actividades y reportes
    const obras = await prisma.obra.findMany({
      where: {
        OR: [
          { id_responsable: session.id_usuario },
          { estado: 'EN_EJECUCION' }
        ]
      },
      include: {
        responsable: {
          select: {
            nombre: true
          }
        },
        fases: {
          include: {
            actividades: {
              include: {
                responsable: {
                  select: {
                    nombre: true
                  }
                }
              },
              orderBy: {
                fecha_inicio: 'asc'
              }
            }
          },
          orderBy: {
            fecha_inicio: 'asc'
          }
        },
        reportes: {
          where: {
            tipo_reporte: 'TECNICO'
          },
          include: {
            reporte_tecnico: true
          },
          orderBy: {
            fecha_generacion: 'desc'
          },
          take: 10
        }
      },
      orderBy: {
        nombre_obra: 'asc'
      }
    })

    console.log(`✅ [AVANCES] Se encontraron ${obras.length} obras`)
    
    // Debug: mostrar cuántas fases tiene cada obra
    obras.forEach(obra => {
      console.log(`   - ${obra.nombre_obra}: ${obra.fases.length} fases, ${obra.fases.reduce((acc, f) => acc + f.actividades.length, 0)} actividades`)
    })

    return NextResponse.json({ 
      obras,
      total: obras.length 
    })

  } catch (error) {
    console.error('❌ [AVANCES] Error al obtener avances:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Registrar nuevo avance
export async function POST(request: Request) { // ✓ Cambiado a Request genérico
  try {
    const session = await getSession()
    
    if (!session || (session.rol.nombre !== 'INFRAESTRUCTURA' && session.rol.nombre !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const { id_obra, id_actividad, avance_fisico, observaciones, fecha_avance } = body

    console.log('📝 [AVANCES] Registrando nuevo avance:', { id_obra, id_actividad, avance_fisico })

    // Validaciones
    if (!id_obra || !id_actividad || avance_fisico === undefined) {
      return NextResponse.json(
        { error: 'Datos incompletos para registrar el avance' },
        { status: 400 }
      )
    }

    const avanceNumero = parseFloat(avance_fisico)
    if (isNaN(avanceNumero) || avanceNumero < 0 || avanceNumero > 100) {
      return NextResponse.json(
        { error: 'El avance físico debe ser un número entre 0 y 100' },
        { status: 400 }
      )
    }

    // Verificar que la actividad existe y pertenece a la obra
    const actividad = await prisma.actividad.findFirst({
      where: { 
        id_actividad: parseInt(id_actividad),
        fase: {
          obra: {
            id_obra: parseInt(id_obra),
            OR: [
              { id_responsable: session.id_usuario },
              { estado: 'EN_EJECUCION' }
            ]
          }
        }
      },
      include: {
        fase: {
          include: {
            obra: true
          }
        }
      }
    })

    if (!actividad) {
      return NextResponse.json({ 
        error: 'Actividad no encontrada o no tienes acceso a esta obra' 
      }, { status: 404 })
    }

    // Crear reporte técnico
    const reporte = await prisma.reporte.create({
      data: {
        id_obra: parseInt(id_obra),
        tipo_reporte: 'TECNICO',
        fecha_generacion: new Date(fecha_avance || new Date()),
        id_usuario: session.id_usuario,
        reporte_tecnico: {
          create: {
            avance_fisico: avanceNumero,
            observaciones: observaciones || `Avance registrado para actividad: ${actividad.nombre_actividad}`,
            hitos_cumplidos: `Actividad: ${actividad.nombre_actividad} - ${avanceNumero}% completado`
          }
        }
      },
      include: {
        reporte_tecnico: true
      }
    })

    console.log('✅ [AVANCES] Reporte creado con ID:', reporte.id_reporte)

    // Registrar en logs
    try {
      await prisma.logActividad.create({
        data: {
          id_usuario: session.id_usuario,
          modulo: 'PROYECTOS',
          accion: `Registrar avance: ${actividad.nombre_actividad} - ${avanceNumero}%`,
          id_obra: parseInt(id_obra),
          resultado: 'Éxito'
        }
      })
    } catch (logError) {
      // Si falla el log, no es crítico
      console.warn('⚠️ [AVANCES] No se pudo registrar log de actividad:', logError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Avance registrado correctamente',
      reporte 
    }, { status: 201 })

  } catch (error) {
    console.error('❌ [AVANCES] Error al registrar avance:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
