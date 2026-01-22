// src/app/(dashboard)/layout.tsx
// src/app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/ui/sidebar'

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getSession()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Espaciador para el botón hamburguesa en móvil */}
        <div className="lg:hidden h-16" />
        
        {/* Content Container */}
        <div className="container mx-auto p-6 lg:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}