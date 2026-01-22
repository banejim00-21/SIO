// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { AuthUser } from '@/types/auth'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion'
)

export async function createToken(user: AuthUser): Promise<string> {
  return await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as { user: AuthUser }
  } catch {
    return null
  }
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return null

  const payload = await verifyToken(token)
  return payload?.user || null
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/'
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}