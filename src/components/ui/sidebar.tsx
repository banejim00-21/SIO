// src/components/ui/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AuthUser } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Building2, 
  Users, 
  Shield, 
  FileText, 
  TrendingUp,
  Settings,
  LogOut,
  Home,
  Wrench,
  DollarSign,
  BookOpen,
  Activity,
  Bell,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: AuthUser
}

interface MenuItem {
  href: string
  label: string
  icon: React.ReactNode
}

// =====================================================
// CORREGIDO: Mapeo de nombres de rol a rutas base
// =====================================================
const ROLE_ROUTES: Record<string, string> = {
  ADMINISTRADOR: '/admin',
  INFRAESTRUCTURA: '/infraestructura',
  MANTENIMIENTO: '/mantenimiento',
  LIQUIDACION: '/liquidacion',
  ESTUDIO: '/estudio'
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        router.push('/login')
        router.refresh()
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const menuItems = getMenuItemsByRole(user.rol.nombre)
  const initials = user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <>
      {/* Botón Hamburguesa (Solo móvil) */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-gray-700" />
        ) : (
          <Menu className="w-6 h-6 text-gray-700" />
        )}
      </button>

      {/* Overlay móvil */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300",
          // Móvil: fixed con animación
          "fixed lg:sticky top-0 z-40",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          // Desktop: ancho variable
          isCollapsed ? "lg:w-20" : "lg:w-64",
          "w-64" // Ancho fijo en móvil
        )}
      >
        {/* Header */}
        <div className="p-6 border-b relative">
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed && "lg:justify-center"
          )}>
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900">SIO</h1>
                <p className="text-xs text-gray-500">UNDAC</p>
              </div>
            )}
          </div>

          {/* Botón colapsar (Solo desktop) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-8 p-1.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 shadow-sm"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className={cn(
              "w-4 h-4 text-gray-600 transition-transform",
              isCollapsed && "rotate-180"
            )} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b">
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed && "lg:flex-col"
          )}>
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.nombre}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.rol.nombre}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100',
                    isCollapsed && "lg:justify-center lg:px-2"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  
                  {/* Tooltip en modo colapsado */}
                  {isCollapsed && (
                    <span className="hidden lg:block absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t space-y-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full text-gray-700 hover:bg-gray-100",
              isCollapsed ? "lg:justify-center lg:px-2" : "justify-start"
            )}
            size="sm"
            title={isCollapsed ? "Configuración" : undefined}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="ml-3">Configuración</span>}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              "w-full text-red-600 hover:bg-red-50 hover:text-red-700",
              isCollapsed ? "lg:justify-center lg:px-2" : "justify-start"
            )}
            onClick={handleLogout}
            disabled={isLoggingOut}
            size="sm"
            title={isCollapsed ? "Cerrar Sesión" : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && (
              <span className="ml-3">
                {isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}
              </span>
            )}
          </Button>
        </div>
      </aside>
    </>
  )
}

function getMenuItemsByRole(rolName: string): MenuItem[] {
  // =====================================================
  // CORREGIDO: Usar el mapeo de rutas en lugar de toLowerCase()
  // Esto convierte ADMINISTRADOR -> /admin (no /administrador)
  // =====================================================
  const baseRoute = ROLE_ROUTES[rolName] || `/${rolName.toLowerCase()}`
  
  const commonItems: MenuItem[] = [
    { 
      href: baseRoute, 
      label: 'Inicio', 
      icon: <Home className="w-4 h-4" /> 
    }
  ]

  const roleSpecificItems: Record<string, MenuItem[]> = {
    ADMINISTRADOR: [
      { href: '/admin/usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
      { href: '/admin/roles', label: 'Roles', icon: <Shield className="w-4 h-4" /> },
      { href: '/admin/obras', label: 'Obras', icon: <Building2 className="w-4 h-4" /> }, 
      { href: '/admin/personal', label: 'Personal', icon: <Users className="w-4 h-4" /> },
      { href: '/admin/documentos', label: 'Documentos', icon: <FileText className="w-4 h-4" /> },
      { href: '/admin/logs', label: 'Logs', icon: <Activity className="w-4 h-4" /> },
      { href: '/admin/alertas', label: 'Alertas', icon: <Bell className="w-4 h-4" /> },
      { href: '/admin/auditoria', label: 'Auditoría', icon: <Shield className="w-4 h-4" /> },
      { href: '/admin/configuracion', label: 'Configuración', icon: <Settings className="w-4 h-4" /> }
    ],
    INFRAESTRUCTURA: [
      { href: '/infraestructura/proyectos', label: 'Proyectos', icon: <Building2 className="w-4 h-4" /> },
      { href: '/infraestructura/cronogramas', label: 'Cronogramas', icon: <FileText className="w-4 h-4" /> },
      { href: '/infraestructura/avances', label: 'Avances', icon: <TrendingUp className="w-4 h-4" /> },
      { href: '/infraestructura/documentos', label: 'Documentos', icon: <FileText className="w-4 h-4" /> }
    ],
    MANTENIMIENTO: [
      { href: '/mantenimiento/reportes', label: 'Reportes', icon: <Wrench className="w-4 h-4" /> },
      { href: '/mantenimiento/calendario', label: 'Calendario', icon: <Settings className="w-4 h-4" /> },
      { href: '/mantenimiento/documentos', label: 'Documentos', icon: <FileText className="w-4 h-4" /> }
    ],
    LIQUIDACION: [
      { href: '/liquidacion/presupuestos', label: 'Presupuestos', icon: <DollarSign className="w-4 h-4" /> },
      { href: '/liquidacion/gastos', label: 'Gastos', icon: <DollarSign className="w-4 h-4" /> },
      { href: '/liquidacion/expedientes', label: 'Expedientes', icon: <FileText className="w-4 h-4" /> },
      { href: '/liquidacion/documentos', label: 'Documentos', icon: <FileText className="w-4 h-4" /> },
      { href: '/liquidacion/reportes', label: 'Reportes', icon: <TrendingUp className="w-4 h-4" /> }
    ],
    ESTUDIO: [
      { href: '/estudio/proyectos', label: 'Estudios', icon: <BookOpen className="w-4 h-4" /> },
      { href: '/estudio/documentos', label: 'Documentos', icon: <FileText className="w-4 h-4" /> },
      { href: '/estudio/informes', label: 'Informes', icon: <FileText className="w-4 h-4" /> }
    ]
  }

  return [...commonItems, ...(roleSpecificItems[rolName] || [])]
}