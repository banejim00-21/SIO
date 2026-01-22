// src/app/api/infraestructura/proyectos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Listar proyectos para el rol INFRAESTRUCTURA
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session || !['INFRAESTRUCTURA', 'ADMINISTRADOR'].includes(session.rol.nombre)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const estado = searchParams.get('estado')

    console.log('📊 [PROYECTOS] Obteniendo proyectos para INFRAESTRUCTURA...')

    const obras = await prisma.obra.findMany({
      where: {
        AND: [
          // Filtro por búsqueda
          search ? {
            OR: [
              { nombre_obra: { contains: search, mode: 'insensitive' } },
              { ubicacion: { contains: search, mode: 'insensitive' } }
            ]
          } : {},
          // Filtro por estado
         estado && estado !== 'TODOS' ? { estado: estado as 'PLANEADA' | 'EN_EJECUCION' | 'CONCLUIDA' | 'LIQUIDADA' } : {}
        ]
      },
      include: {
        responsable: {
          select: {
            id_usuario: true,
            nombre: true,
            rol: { select: { nombre: true } }
          }
        },
        fases: {
          include: {
            actividades: {
              select: {
                id_actividad: true,
                nombre_actividad: true,
                fecha_inicio: true,
                fecha_fin: true,
                duracion: true
              }
            }
          },
          orderBy: { fecha_inicio: 'asc' }
        },
        reportes: {
          where: { tipo_reporte: 'TECNICO' },
          include: { reporte_tecnico: true },
          orderBy: { fecha_generacion: 'desc' },
          take: 1
        },
        _count: {
          select: {
            documentos: true,
            reportes: true
          }
        }
      },
      orderBy: { fecha_creacion: 'desc' }
    })

    // Calcular estadísticas por obra
    const obrasConEstadisticas = obras.map(obra => {
      const totalActividades = obra.fases.reduce((acc, fase) => acc + fase.actividades.length, 0)
      const hoy = new Date()
      
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

      const ultimoAvance = obra.reportes[0]?.reporte_tecnico?.avance_fisico || 0

      return {
        ...obra,
        estadisticas: {
          totalFases: obra.fases.length,
          totalActividades,
          actividadesCompletadas,
          actividadesEnCurso,
          actividadesPendientes: totalActividades - actividadesCompletadas - actividadesEnCurso,
          avanceFisico: ultimoAvance,
          totalDocumentos: obra._count.documentos,
          totalReportes: obra._count.reportes
        }
      }
    })

    console.log(`✅ [PROYECTOS] Se encontraron ${obras.length} proyectos`)

    return NextResponse.json({ 
      obras: obrasConEstadisticas,
      total: obras.length
    })
  } catch (error) {
    console.error('❌ [PROYECTOS] Error:', error)
    return NextResponse.json({ error: 'Error al obtener proyectos' }, { status: 500 })
  }
}
