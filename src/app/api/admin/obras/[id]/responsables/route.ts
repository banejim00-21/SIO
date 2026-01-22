// src/app/api/admin/obras/[id]/responsables/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// GET - Listar responsables de una obra
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const obraId = parseInt(id)

    // Obtener obra con responsable principal
    const obra = await prisma.obra.findUnique({
      where: { id_obra: obraId },
      include: {
        responsable: {
          select: { id_usuario: true, nombre: true, correo: true, rol: { select: { nombre: true } } }
        }
      }
    })

    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Obtener responsables adicionales (roles asignados activos)
    const rolesAsignados = await prisma.rolAsignado.findMany({
      where: {
        id_proyecto: obraId,
        estado: 'ACTIVO'
      },
      include: {
        personal: {
          include: {
            usuario: {
              select: { id_usuario: true, nombre: true, correo: true, rol: { select: { nombre: true } } }
            }
          }
        }
      }
    })

    const responsablesAdicionales = rolesAsignados
      .filter(ra => ra.personal?.usuario)
      .map(ra => ({
        id_rol_asignado: ra.id_rol_asignado,
        rol_en_proyecto: ra.rol,
        fecha_inicio: ra.fecha_inicio,
        ...ra.personal.usuario
      }))

    return NextResponse.json({
      responsable_principal: obra.responsable,
      responsables_adicionales: responsablesAdicionales
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener responsables' }, { status: 500 })
  }
}

// POST - Asignar responsables a una obra
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id } = await params
    const obraId = parseInt(id)
    const body = await request.json()
    const { id_responsable_principal, responsables_ids } = body

    const obra = await prisma.obra.findUnique({ where: { id_obra: obraId } })
    if (!obra) {
      return NextResponse.json({ error: 'Obra no encontrada' }, { status: 404 })
    }

    // Actualizar responsable principal si se proporciona
    if (id_responsable_principal) {
      await prisma.obra.update({
        where: { id_obra: obraId },
        data: { id_responsable: parseInt(id_responsable_principal) }
      })
    }

    // Desactivar roles anteriores
    await prisma.rolAsignado.updateMany({
      where: { id_proyecto: obraId, estado: 'ACTIVO' },
      data: { estado: 'INACTIVO', fecha_fin: new Date() }
    })

    // Asignar nuevos responsables
    if (responsables_ids && responsables_ids.length > 0) {
      for (const usuarioId of responsables_ids) {
        // Incluir rol para obtener el nombre
        const usuario = await prisma.usuario.findUnique({
          where: { id_usuario: parseInt(usuarioId) },
          include: { 
            personal: true,
            rol: { select: { nombre: true } }
          }
        })

        if (usuario?.personal) {
          // =====================================================
          // CORREGIDO: Mapear el nombre del rol al enum RolPersonal
          // El enum RolPersonal solo tiene estos valores:
          // ADMINISTRADOR, INFRAESTRUCTURA, MANTENIMIENTO, LIQUIDACION, ESTUDIO
          // =====================================================
          const rolNombre = usuario.rol?.nombre?.toUpperCase() || ''
          
          // Determinar el rol válido del enum RolPersonal
          let rolAsignado: 'ADMINISTRADOR' | 'INFRAESTRUCTURA' | 'MANTENIMIENTO' | 'LIQUIDACION' | 'ESTUDIO'
          
          switch (rolNombre) {
            case 'ADMINISTRADOR':
              rolAsignado = 'ADMINISTRADOR'
              break
            case 'INFRAESTRUCTURA':
              rolAsignado = 'INFRAESTRUCTURA'
              break
            case 'MANTENIMIENTO':
              rolAsignado = 'MANTENIMIENTO'
              break
            case 'LIQUIDACION':
              rolAsignado = 'LIQUIDACION'
              break
            case 'ESTUDIO':
              rolAsignado = 'ESTUDIO'
              break
            default:
              // Si no coincide con ninguno, usar INFRAESTRUCTURA como default
              rolAsignado = 'INFRAESTRUCTURA'
          }

          await prisma.rolAsignado.create({
            data: {
              id_personal: usuario.personal.id_personal,
              rol: rolAsignado,
              id_proyecto: obraId,
              fecha_inicio: new Date(),
              estado: 'ACTIVO'
            }
          })
        }
      }
    }

    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'PROYECTOS',
        accion: `Actualizar responsables de obra ${obra.nombre_obra}`,
        id_obra: obraId,
        resultado: 'Exito'
      }
    })

    return NextResponse.json({ message: 'Responsables actualizados' })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al actualizar responsables' }, { status: 500 })
  }
}