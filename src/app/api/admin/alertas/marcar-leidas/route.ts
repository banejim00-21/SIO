// src/app/api/admin/alertas/marcar-leidas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    await prisma.alerta.updateMany({
      where: { estado: 'ACTIVA' },
      data: { estado: 'REVISADA' }
    })

    return NextResponse.json({ message: 'Alertas marcadas como revisadas' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar alertas' }, { status: 500 })
  }
}
