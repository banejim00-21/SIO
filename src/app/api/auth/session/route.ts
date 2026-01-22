// src/app/api/auth/session/route.ts

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getSession()

    if (!user) {
      return NextResponse.json(
        { error: 'No hay sesión activa' },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error al obtener sesión:', error)
    return NextResponse.json(
      { error: 'Error al verificar sesión' },
      { status: 500 }
    )
  }
}