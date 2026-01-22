// src/app/api/admin/alertas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const nivel = searchParams.get('nivel')
    const tipo = searchParams.get('tipo')

    const where: Record<string, unknown> = {}
    if (estado && estado !== 'TODOS') where.estado = estado
    if (nivel && nivel !== 'TODOS') where.nivel = nivel
    if (tipo && tipo !== 'TODOS') where.tipo = tipo

    const alertas = await prisma.alerta.findMany({
      where,
      orderBy: { fecha_hora: 'desc' },
      take: 200
    })

    return NextResponse.json({ alertas })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener alertas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, descripcion, nivel, destinatario } = body

    const alerta = await prisma.alerta.create({
      data: {
        tipo: tipo || 'SISTEMA',
        descripcion,
        nivel: nivel || 'MEDIA',
        destinatario: destinatario || 'ADMINISTRADOR',
        estado: 'ACTIVA'
      }
    })

    return NextResponse.json({ alerta }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al crear alerta' }, { status: 500 })
  }
}
