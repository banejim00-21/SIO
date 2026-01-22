// // src/lib/permissions.ts

// // Definición de permisos por carpeta para cada rol
// export const PERMISOS_CARPETAS = {
//   ADMINISTRADOR: {
//     // Todas las carpetas con permisos completos
//     carpetas: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', 
//                '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'],
//     acciones: ['crear', 'leer', 'actualizar', 'eliminar'] as const
//   },
//   INFRAESTRUCTURA: {
//     carpetas_completas: ['01', '02', '05', '06', '07', '08', '09', '11', 
//                          '13', '14', '16', '17', '18', '19'],
//     carpetas_lectura: ['03', '04', '10', '12', '15', '20'],
//     acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
//     acciones_lectura: ['leer'] as const
//   },
//   MANTENIMIENTO: {
//     carpetas_completas: ['07', '08', '09', '11', '19', '20'],
//     carpetas_lectura: ['01', '02', '05', '06', '10', '13', '14', '16', '17', '18'],
//     sin_acceso: ['03', '04', '12', '15'],
//     acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
//     acciones_lectura: ['leer'] as const
//   },
//   LIQUIDACION: {
//     carpetas_completas: ['14', '15', '19'],
//     carpetas_lectura: ['01', '02', '03', '04', '05', '06', '07', '08', '09', 
//                        '10', '11', '12', '13', '16', '17', '18', '20'],
//     acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
//     acciones_lectura: ['leer'] as const
//   },
//   ESTUDIO: {
//     carpetas_completas: ['01', '02', '03', '04', '05', '06', '10', '11', 
//                          '12', '13', '17', '18', '19'],
//     carpetas_lectura: ['07', '08', '09', '14', '15', '16', '20'],
//     acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
//     acciones_lectura: ['leer'] as const
//   }
// } as const

// export type RolNombre = keyof typeof PERMISOS_CARPETAS
// export type Accion = 'crear' | 'leer' | 'actualizar' | 'eliminar'

// /**
//  * Verifica si un rol tiene permiso para realizar una acción en una carpeta específica
//  */
// export function tienePermisoEnCarpeta(
//   rol: string, 
//   codigoCarpeta: string, 
//   accion: Accion
// ): boolean {
//   const permisos = PERMISOS_CARPETAS[rol as RolNombre]
  
//   if (!permisos) return false

//   // Administrador tiene acceso total
//   if (rol === 'ADMINISTRADOR') {
//     //   me aparece en rojo la palabra  : acciones
//     return permisos.acciones.includes(accion)
//   }

//   // Para otros roles, verificar estructura específica
//   const permisosRol = permisos as typeof PERMISOS_CARPETAS.INFRAESTRUCTURA

//   // Verificar sin acceso (solo para MANTENIMIENTO)
//   if ('sin_acceso' in permisosRol && (permisosRol as any).sin_acceso?.includes(codigoCarpeta)) {
//     return false
//   }

//   // Verificar carpetas con permisos completos
// //   me aparece en rojo la palabra  : codigoCarpeta
//   if ('carpetas_completas' in permisosRol && permisosRol.carpetas_completas?.includes(codigoCarpeta)) {
//     return (permisosRol.acciones_completas as readonly string[]).includes(accion)
//   }

//   // Verificar carpetas de solo lectura
//   //   me aparece en rojo la palabra  : codigoCarpeta
//   if ('carpetas_lectura' in permisosRol && permisosRol.carpetas_lectura?.includes(codigoCarpeta)) {
//     return accion === 'leer'
//   }

//   return false
// }

// /**
//  * Obtiene la lista de carpetas a las que un rol tiene acceso (lectura o completo)
//  */
// export function obtenerCarpetasPermitidas(rol: string): string[] {
//   const permisos = PERMISOS_CARPETAS[rol as RolNombre]
  
//   if (!permisos) return []
  
//   if (rol === 'ADMINISTRADOR') {
//     return [...(permisos as typeof PERMISOS_CARPETAS.ADMINISTRADOR).carpetas]
//   }

//   const permisosRol = permisos as typeof PERMISOS_CARPETAS.INFRAESTRUCTURA
//   const carpetasCompletas = 'carpetas_completas' in permisosRol ? [...permisosRol.carpetas_completas] : []
//   const carpetasLectura = 'carpetas_lectura' in permisosRol ? [...permisosRol.carpetas_lectura] : []
  
//   return [...carpetasCompletas, ...carpetasLectura]
// }

// /**
//  * Obtiene la lista de carpetas donde un rol puede crear/modificar documentos
//  */
// export function obtenerCarpetasEscritura(rol: string): string[] {
//   const permisos = PERMISOS_CARPETAS[rol as RolNombre]
  
//   if (!permisos) return []
  
//   if (rol === 'ADMINISTRADOR') {
//     return [...(permisos as typeof PERMISOS_CARPETAS.ADMINISTRADOR).carpetas]
//   }

//   const permisosRol = permisos as typeof PERMISOS_CARPETAS.INFRAESTRUCTURA
//   return 'carpetas_completas' in permisosRol ? [...permisosRol.carpetas_completas] : []
// }

// /**
//  * Obtiene la lista de carpetas de solo lectura para un rol
//  */
// export function obtenerCarpetasSoloLectura(rol: string): string[] {
//   const permisos = PERMISOS_CARPETAS[rol as RolNombre]
  
//   if (!permisos) return []
  
//   if (rol === 'ADMINISTRADOR') {
//     return [] // Admin tiene acceso completo a todo
//   }

//   const permisosRol = permisos as typeof PERMISOS_CARPETAS.INFRAESTRUCTURA
//   return 'carpetas_lectura' in permisosRol ? [...permisosRol.carpetas_lectura] : []
// }

// /**
//  * Verifica si una carpeta es de solo lectura para un rol específico
//  */
// export function esCarpetaSoloLectura(rol: string, codigoCarpeta: string): boolean {
//   if (rol === 'ADMINISTRADOR') return false
  
//   const carpetasLectura = obtenerCarpetasSoloLectura(rol)
//   return carpetasLectura.includes(codigoCarpeta)
// }

// /**
//  * Obtiene información detallada de permisos para un rol
//  */
// export function obtenerInfoPermisos(rol: string) {
//   const permisos = PERMISOS_CARPETAS[rol as RolNombre]
  
//   if (!permisos) {
//     return {
//       rol,
//       tieneAcceso: false,
//       carpetasCompletas: [] as string[],
//       carpetasLectura: [] as string[],
//       carpetasSinAcceso: [] as string[],
//       totalCarpetas: 0
//     }
//   }

//   if (rol === 'ADMINISTRADOR') {
//     const adminPermisos = permisos as typeof PERMISOS_CARPETAS.ADMINISTRADOR
//     return {
//       rol,
//       tieneAcceso: true,
//       carpetasCompletas: [...adminPermisos.carpetas],
//       carpetasLectura: [] as string[],
//       carpetasSinAcceso: [] as string[],
//       totalCarpetas: adminPermisos.carpetas.length
//     }
//   }

//   const permisosRol = permisos as typeof PERMISOS_CARPETAS.MANTENIMIENTO
//   return {
//     rol,
//     tieneAcceso: true,
//     carpetasCompletas: 'carpetas_completas' in permisosRol ? [...permisosRol.carpetas_completas] : [],
//     carpetasLectura: 'carpetas_lectura' in permisosRol ? [...permisosRol.carpetas_lectura] : [],
//     carpetasSinAcceso: 'sin_acceso' in permisosRol ? [...(permisosRol as any).sin_acceso] : [],
//     totalCarpetas: obtenerCarpetasPermitidas(rol).length
//   }
// }


// src/lib/permissions.ts

export const PERMISOS_CARPETAS = {
  ADMINISTRADOR: {
    carpetas: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
               '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'] as const,
    acciones: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
  } as const,

  INFRAESTRUCTURA: {
    carpetas_completas: ['01', '02', '05', '06', '07', '08', '09', '11', '13', '14', '16', '17', '18', '19'] as const,
    carpetas_lectura: ['03', '04', '10', '12', '15', '20'] as const,
    acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
    acciones_lectura: ['leer'] as const,
  } as const,

  MANTENIMIENTO: {
    carpetas_completas: ['07', '08', '09', '11', '19', '20'] as const,
    carpetas_lectura: ['01', '02', '05', '06', '10', '13', '14', '16', '17', '18'] as const,
    sin_acceso: ['03', '04', '12', '15'] as const,
    acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
    acciones_lectura: ['leer'] as const,
  } as const,

  LIQUIDACION: {
    carpetas_completas: ['14', '15', '19'] as const,
    carpetas_lectura: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '16', '17', '18', '20'] as const,
    acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
    acciones_lectura: ['leer'] as const,
  } as const,

  ESTUDIO: {
    carpetas_completas: ['01', '02', '03', '04', '05', '06', '10', '11', '12', '13', '17', '18', '19'] as const,
    carpetas_lectura: ['07', '08', '09', '14', '15', '16', '20'] as const,
    acciones_completas: ['crear', 'leer', 'actualizar', 'eliminar'] as const,
    acciones_lectura: ['leer'] as const,
  } as const,
} as const; // este último también es importante