// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value

  // Rutas públicas
  if (request.nextUrl.pathname.startsWith('/login')) {
    if (token) {
      // Si ya tiene sesión, redirigir al dashboard
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Rutas protegidas
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyToken(token)
  
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}