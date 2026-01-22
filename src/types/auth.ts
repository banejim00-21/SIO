// src/types/auth.ts
export interface LoginCredentials {
  usuario: string
  clave: string
}

export interface AuthUser {
  id_usuario: number
  usuario: string
  nombre: string
  correo: string
  rol: {
    id_rol: number
    nombre: string
    descripcion: string | null
  }
}

export interface SessionData {
  user: AuthUser
  token: string
}

export type RolNombre = 
  | 'ADMINISTRADOR' 
  | 'INFRAESTRUCTURA' 
  | 'MANTENIMIENTO' 
  | 'LIQUIDACION' 
  | 'ESTUDIO'

export const ROLE_ROUTES: Record<RolNombre, string> = {
  ADMINISTRADOR: '/admin',
  INFRAESTRUCTURA: '/infraestructura',
  MANTENIMIENTO: '/mantenimiento',
  LIQUIDACION: '/liquidacion',
  ESTUDIO: '/estudio'
}