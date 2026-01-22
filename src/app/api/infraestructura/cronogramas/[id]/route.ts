import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    
    if (!session || session.rol.nombre !== 'INFRAESTRUCTURA') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Await params para Next.js 15
    const { id } = await params

    // Verificar que el cronograma existe y pertenece a una obra accesible
    const cronograma = await prisma.cronograma.findUnique({
      where: { id_cronograma: parseInt(id) },
      include: {
        obra: true
      }
    })

    if (!cronograma) {
      return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
    }

    // Verificar acceso a la obra
    const tieneAcceso = cronograma.obra.id_responsable === session.id_usuario || 
                       cronograma.obra.estado === 'EN_EJECUCION'

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No autorizado para eliminar este cronograma' }, { status: 403 })
    }

    await prisma.cronograma.delete({
      where: { id_cronograma: parseInt(id) }
    })

    // Registrar en logs
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Eliminar cronograma: ${cronograma.obra.nombre_obra}`,
        id_obra: cronograma.id_obra,
        resultado: 'Éxito'
      }
    })

    return NextResponse.json({ message: 'Cronograma eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar cronograma:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}