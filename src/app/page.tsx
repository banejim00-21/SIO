// src/app/page.tsx

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { ROLE_ROUTES, type RolNombre } from '@/types/auth'

export default async function HomePage() {
  const user = await getSession()

  if (user) {
    const rolRoute = ROLE_ROUTES[user.rol.nombre as RolNombre]
    redirect(rolRoute)
  }

  redirect('/login')
}