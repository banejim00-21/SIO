// src/app/api/admin/carpetas/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

// Las 20 carpetas estándar del expediente técnico
const CARPETAS_ESTANDAR = [
  { codigo: '01_DOCUMENTACION', nombre: 'Documentación Técnica', descripcion: 'Contratos, convenios y documentos legales', orden: 1 },
  { codigo: '02_MEMORIA', nombre: 'Memoria Descriptiva', descripcion: 'Descripción técnica del proyecto', orden: 2 },
  { codigo: '03_ESPECIFICACIONES', nombre: 'Especificaciones Técnicas', descripcion: 'Normas y especificaciones de construcción', orden: 3 },
  { codigo: '04_METRADOS', nombre: 'Metrados', descripcion: 'Cálculo de cantidades de materiales y trabajos', orden: 4 },
  { codigo: '05_PRESUPUESTO', nombre: 'Presupuesto', descripcion: 'Costos detallados del proyecto', orden: 5 },
  { codigo: '06_CRONOGRAMA', nombre: 'Cronograma', descripcion: 'Programación de actividades y tiempos', orden: 6 },
  { codigo: '07_PLANOS', nombre: 'Planos', descripcion: 'Dibujos técnicos y arquitectónicos', orden: 7 },
  { codigo: '08_ESTUDIOS', nombre: 'Estudios Básicos', descripcion: 'Estudios de suelo, topografía, etc.', orden: 8 },
  { codigo: '09_IMPACTO', nombre: 'Estudio de Impacto Ambiental', descripcion: 'Evaluación ambiental', orden: 9 },
  { codigo: '10_SEGURIDAD', nombre: 'Plan de Seguridad', descripcion: 'Normas de seguridad en obra', orden: 10 },
  { codigo: '11_CALIDAD', nombre: 'Plan de Calidad', descripcion: 'Control de calidad de materiales y procesos', orden: 11 },
  { codigo: '12_FINANCIERO', nombre: 'Documentos Financieros', descripcion: 'Valorizaciones, facturas, pagos', orden: 12 },
  { codigo: '13_ACTAS', nombre: 'Actas', descripcion: 'Actas de reuniones, entrega, recepción', orden: 13 },
  { codigo: '14_INFORMES', nombre: 'Informes de Avance', descripcion: 'Reportes periódicos de avance', orden: 14 },
  { codigo: '15_FOTOS', nombre: 'Registro Fotográfico', descripcion: 'Evidencia fotográfica del progreso', orden: 15 },
  { codigo: '16_CUADERNO', nombre: 'Cuaderno de Obra', descripcion: 'Registro diario de actividades', orden: 16 },
  { codigo: '17_ADDENDAS', nombre: 'Adendas y Modificaciones', descripcion: 'Cambios al proyecto original', orden: 17 },
  { codigo: '18_CORRESPONDENCIA', nombre: 'Correspondencia', descripcion: 'Comunicaciones oficiales', orden: 18 },
  { codigo: '19_LIQUIDACION', nombre: 'Liquidación', descripcion: 'Documentos de cierre de obra', orden: 19 },
  { codigo: '20_OTROS', nombre: 'Otros Documentos', descripcion: 'Documentos adicionales', orden: 20 }
]

// GET - Listar carpetas
export async function GET() {
  try {
    const carpetas = await prisma.carpetaTipo.findMany({
      orderBy: { orden: 'asc' }
    })

    // Si no hay carpetas, devolver las estándar como referencia
    if (carpetas.length === 0) {
      return NextResponse.json({
        carpetas: CARPETAS_ESTANDAR.map((c, i) => ({
          id_carpeta_tipo: i + 1,
          codigo: c.codigo,
          nombre_carpeta: c.nombre,
          descripcion: c.descripcion,
          orden: c.orden
        })),
        mensaje: 'Carpetas no inicializadas. Use POST para crear las 20 carpetas estándar.'
      })
    }

    return NextResponse.json({ carpetas })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al obtener carpetas' }, { status: 500 })
  }
}

// POST - Inicializar las 20 carpetas estándar
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.rol.nombre !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Verificar si ya existen carpetas
    const existentes = await prisma.carpetaTipo.count()
    if (existentes > 0) {
      return NextResponse.json({
        message: 'Las carpetas ya están inicializadas',
        total: existentes
      })
    }

    // Crear las 20 carpetas con el campo orden requerido
    const carpetasCreadas = await prisma.carpetaTipo.createMany({
      data: CARPETAS_ESTANDAR.map(c => ({
        codigo: c.codigo,
        nombre_carpeta: c.nombre,
        descripcion: c.descripcion,
        orden: c.orden
      }))
    })

    // Usar enum válido: DOCUMENTAL en lugar de CONFIGURACION
    await prisma.logActividad.create({
      data: {
        id_usuario: session.id_usuario,
        modulo: 'DOCUMENTAL',
        accion: 'Inicializar 20 carpetas estándar',
        resultado: 'Exito'
      }
    })

    return NextResponse.json({
      message: 'Carpetas inicializadas correctamente',
      total: carpetasCreadas.count
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al crear carpetas' }, { status: 500 })
  }
}
