// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createToken, setSessionCookie } from '@/lib/auth'
import type { LoginCredentials } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json()
    const { usuario, clave } = body

    if (!usuario || !clave) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const user = await prisma.usuario.findUnique({
      where: { usuario },
      include: { rol: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    const passwordMatch = await bcrypt.compare(clave, user.clave)

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    await prisma.usuario.update({
      where: { id_usuario: user.id_usuario },
      data: { ultimo_acceso: new Date() }
    })

    await prisma.logAcceso.create({
      data: {
        id_usuario: user.id_usuario,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        dispositivo: request.headers.get('user-agent') || 'unknown',
        accion: 'LOGIN',
        resultado: 'EXITO'
      }
    })

    const authUser = {
      id_usuario: user.id_usuario,
      usuario: user.usuario,
      nombre: user.nombre,
      correo: user.correo,
      rol: {
        id_rol: user.rol.id_rol,
        nombre: user.rol.nombre,
        descripcion: user.rol.descripcion
      }
    }

    const token = await createToken(authUser)
    await setSessionCookie(token)

    return NextResponse.json({
      success: true,
      user: authUser,
      message: 'Login exitoso'
    })

  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    )
  }
}