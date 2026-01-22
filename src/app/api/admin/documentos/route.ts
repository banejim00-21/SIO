// src/app/api/admin/documentos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id_obra = searchParams.get('id_obra')
    const id_carpeta_tipo = searchParams.get('id_carpeta_tipo')
    const estado = searchParams.get('estado')

    const where: Record<string, unknown> = {}
    if (id_obra) where.id_obra = parseInt(id_obra)
    if (id_carpeta_tipo) where.id_carpeta_tipo = parseInt(id_carpeta_tipo)
    if (estado) where.estado = estado
    else where.estado = { not: 'ANULADO' }

    const documentos = await prisma.documento.findMany({
      where,
      include: {
        obra: { select: { id_obra: true, nombre_obra: true } },
        carpeta_tipo: { select: { id_carpeta_tipo: true, codigo: true, nombre_carpeta: true } },
        usuario: { select: { nombre: true } }
      },
      orderBy: { fecha_carga: 'desc' },
      take: 200
    })

    return NextResponse.json({ documentos })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener documentos' }, { status: 500 })
  }
}
