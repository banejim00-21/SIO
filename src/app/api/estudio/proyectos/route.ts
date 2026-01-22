// src/app/api/estudio/proyectos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'

// GET: Obtener lista de obras disponibles para ESTUDIO
export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    
    if (!user || user.rol.nombre !== 'ESTUDIO') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // ✅ CORRECCIÓN: Agregado await aquí
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Filtros opcionales
    const estado = searchParams.get('estado')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('obra')
      .select(`
        id_obra,
        nombre_obra,
        ubicacion,
        coordenadas,
        presupuesto_inicial,
        fecha_inicio_prevista,
        estado,
        fecha_creacion,
        responsable_info:id_responsable (
          nombre,
          correo
        )
      `, { count: 'exact' })
      .order('fecha_creacion', { ascending: false })

    // Aplicar filtros
    if (estado) {
      query = query.eq('estado', estado)
    }

    if (search) {
      query = query.or(`nombre_obra.ilike.%${search}%,ubicacion.ilike.%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      obras: data,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error en GET /api/estudio/proyectos:', error)
    const message = error instanceof Error ? error.message : 'Error interno del servidor'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// POST: No disponible para ESTUDIO (solo consulta)
export async function POST() {
  return NextResponse.json(
    { error: 'El rol ESTUDIO no puede crear obras' },
    { status: 403 }
  )
}