// src/app/api/infraestructura/proyectos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Obtener detalle completo de un proyecto
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || !['INFRAESTRUCTURA', 'ADMINISTRADOR'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const id_obra = parseInt(id)

    console.log('📊 [PROYECTO] Obteniendo detalle del proyecto:', id_obra)

    const obra = await prisma.obra.findUnique({
      where: { id_obra },
      include: {
        responsable: {
          select: {
            id_usuario: true,
            nombre: true,
            correo: true,
            rol: { select: { nombre: true } }
          }
        },
        fases: {
          include: {
            actividades: {
              include: {
                responsable: {
                  select: {
                    id_usuario: true,
                    nombre: true
                  }
                }
              },
              orderBy: { fecha_inicio: 'asc' }
            }
          },
          orderBy: { fecha_inicio: 'asc' }
        },
        presupuestos: {
          where: { estado: 'VIGENTE' },
          include: {
            partidas: true
          },
          take: 1
        },
        reportes: {
          include: {
            reporte_tecnico: true,
            usuario: {
              select: { nombre: true }
            }
          },
          orderBy: { fecha_generacion: 'desc' },
          take: 10
        },
        historial_estados: {
          include: {
            usuario: {
              select: { nombre: true }
            }
          },
          orderBy: { fecha_cambio: 'desc' },
          take: 5
        },
        _count: {
          select: {
            documentos: true,
            reportes: true
          }
        }
      }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Calcular estadísticas
    const hoy = new Date()
    const totalActividades = obra.fases.reduce((acc, fase) => acc + fase.actividades.length, 0)
    
    const actividadesCompletadas = obra.fases.reduce((acc, fase) => {
      return acc + fase.actividades.filter(a => new Date(a.fecha_fin) < hoy).length
    }, 0)
    
    const actividadesEnCurso = obra.fases.reduce((acc, fase) => {
      return acc + fase.actividades.filter(a => {
        const inicio = new Date(a.fecha_inicio)
        const fin = new Date(a.fecha_fin)
        return hoy >= inicio && hoy <= fin
      }).length
    }, 0)

    // Último avance registrado
    const ultimoReporteTecnico = obra.reportes.find(r => r.reporte_tecnico)
    const avanceFisico = ultimoReporteTecnico?.reporte_tecnico?.avance_fisico || 0

    // Presupuesto
    const presupuestoVigente = obra.presupuestos[0]
    const montoEjecutado = presupuestoVigente?.partidas.reduce(
      (acc, p) => acc + Number(p.monto_ejecutado), 0
    ) || 0
    const montoTotal = presupuestoVigente?.partidas.reduce(
      (acc, p) => acc + Number(p.monto_asignado), 0
    ) || Number(obra.presupuesto_inicial)

    const estadisticas = {
      totalFases: obra.fases.length,
      totalActividades,
      actividadesCompletadas,
      actividadesEnCurso,
      actividadesPendientes: totalActividades - actividadesCompletadas - actividadesEnCurso,
      avanceFisico,
      presupuestoInicial: Number(obra.presupuesto_inicial),
      presupuestoEjecutado: montoEjecutado,
      porcentajeEjecucion: montoTotal > 0 ? (montoEjecutado / montoTotal) * 100 : 0,
      totalDocumentos: obra._count.documentos,
      totalReportes: obra._count.reportes
    }

    console.log('✅ [PROYECTO] Detalle obtenido correctamente')

    return NextResponse.json({ 
      obra,
      estadisticas
    })
  } catch (error) {
    console.error('❌ [PROYECTO] Error:', error)
    return NextResponse.json({ error: 'Error al obtener proyecto' }, { status: 500 })
  }
}
