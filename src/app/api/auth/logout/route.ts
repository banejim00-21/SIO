// src/app/api/auth/logout/route.ts

import { NextResponse } from 'next/server'
import { clearSessionCookie, getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const user = await getSession()

    if (user) {
      await prisma.logAcceso.create({
        data: {
          id_usuario: user.id_usuario,
          ip: 'unknown',
          dispositivo: 'unknown',
          accion: 'LOGOUT',
          resultado: 'EXITO'
        }
      })
    }

    await clearSessionCookie()

    return NextResponse.json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    })
  } catch (error) {
    console.error('Error en logout:', error)
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}