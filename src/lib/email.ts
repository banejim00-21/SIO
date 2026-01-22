// src/lib/email.ts
// ============================================================
// SERVICIO DE CORREO ELECTRÓNICO - BREVO API
// Sistema Integral de Obras (SIO) - UNDAC
// ============================================================

const BREVO_API_KEY = process.env.BREVO_API_KEY
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'notificaciones@undac.edu.pe'
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'SIO-OBRAS'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// ============================================================
// TIPOS
// ============================================================

export interface EmailDestinatario {
  email: string
  nombre: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  destinatarios?: number
}

export interface DatosActividad {
  id: number
  nombre: string
  fecha_fin: Date
}

export interface DatosObra {
  id: number
  nombre: string
  ubicacion: string
  fecha_fin?: Date | null
}

export interface DatosPartida {
  id: number
  nombre: string
}

// ============================================================
// FUNCIÓN PRINCIPAL DE ENVÍO
// ============================================================

export async function enviarCorreo(
  destinatarios: EmailDestinatario[],
  asunto: string,
  contenidoHtml: string
): Promise<EmailResult> {
  if (!BREVO_API_KEY) {
    console.error('[EMAIL] BREVO_API_KEY no está configurada')
    return { success: false, error: 'API Key de Brevo no configurada' }
  }

  if (destinatarios.length === 0) {
    console.error('[EMAIL] No hay destinatarios')
    return { success: false, error: 'No hay destinatarios' }
  }

  try {
    console.log(`[EMAIL] Enviando correo a ${destinatarios.length} destinatario(s)...`)
    console.log(`[EMAIL] Asunto: ${asunto}`)
    console.log(`[EMAIL] Destinatarios: ${destinatarios.map(d => d.email).join(', ')}`)

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: destinatarios.map(d => ({ email: d.email, name: d.nombre })),
        subject: asunto,
        htmlContent: contenidoHtml,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[EMAIL] Error de Brevo:', data)
      return { success: false, error: data.message || 'Error al enviar correo' }
    }

    console.log('[EMAIL] ✅ Correo enviado exitosamente:', data.messageId)
    return { 
      success: true, 
      messageId: data.messageId,
      destinatarios: destinatarios.length
    }
  } catch (error) {
    console.error('[EMAIL] Error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

// ============================================================
// PLANTILLA BASE HTML
// ============================================================

function plantillaBase(contenido: string, titulo: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titulo}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: bold;">
                🏗️ Sistema Integral de Obras
              </h1>
              <p style="margin: 5px 0 0; color: #bfdbfe; font-size: 13px;">
                Universidad Nacional Daniel Alcides Carrión
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 35px 40px;">
              ${contenido}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: #64748b; font-size: 11px; text-align: center;">
                Este es un mensaje automático del Sistema Integral de Obras (SIO)<br>
                Oficina de Infraestructura y Desarrollo - UNDAC, Cerro de Pasco
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ============================================================
// PLANTILLAS DE CORREO ESPECÍFICAS
// ============================================================

/**
 * Correo de prueba
 */
export async function enviarCorreoPrueba(
  destinatario: EmailDestinatario,
  nombreUsuario: string
): Promise<EmailResult> {
  const contenido = `
    <h2 style="color: #059669; margin: 0 0 20px;">✅ Correo de Prueba Exitoso</h2>
    
    <p style="color: #374151; line-height: 1.6;">
      Este es un correo de prueba del Sistema Integral de Obras (SIO) - UNDAC.
    </p>
    
    <p style="color: #374151; line-height: 1.6;">
      Si recibiste este mensaje, la configuración de notificaciones por correo 
      está funcionando correctamente.
    </p>
    
    <div style="background-color: #f0fdf4; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #166534; font-size: 14px;">
        <strong>Enviado por:</strong> ${nombreUsuario}<br>
        <strong>Fecha:</strong> ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}
      </p>
    </div>
  `

  return enviarCorreo(
    [destinatario],
    '✅ Correo de Prueba - SIO UNDAC',
    plantillaBase(contenido, 'Correo de Prueba')
  )
}

/**
 * Notificación de cambio de estado de obra
 */
export async function enviarNotificacionCambioEstado(
  destinatarios: EmailDestinatario[],
  obra: DatosObra,
  estadoAnterior: string,
  estadoNuevo: string,
  usuarioModificador: string
): Promise<EmailResult> {
  const estadoLabels: Record<string, string> = {
    'PLANEADA': '📋 Planeada',
    'EN_EJECUCION': '🚧 En Ejecución',
    'CONCLUIDA': '✅ Concluida',
    'LIQUIDADA': '💰 Liquidada'
  }

  const estadoColors: Record<string, string> = {
    'PLANEADA': '#8b5cf6',
    'EN_EJECUCION': '#22c55e',
    'CONCLUIDA': '#f59e0b',
    'LIQUIDADA': '#06b6d4'
  }

  const contenido = `
    <h2 style="color: #1e40af; margin: 0 0 20px;">📋 Cambio de Estado de Obra</h2>
    
    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #1e40af; font-weight: 600;">
        Se ha actualizado el estado de una obra en la que usted es responsable
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
          <strong style="color: #6b7280;">Obra:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">
          ${obra.nombre}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Ubicación:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
          ${obra.ubicacion}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Estado anterior:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="background-color: ${estadoColors[estadoAnterior] || '#6b7280'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
            ${estadoLabels[estadoAnterior] || estadoAnterior}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Nuevo estado:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="background-color: ${estadoColors[estadoNuevo] || '#6b7280'}; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;">
            ${estadoLabels[estadoNuevo] || estadoNuevo}
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <strong style="color: #6b7280;">Modificado por:</strong>
        </td>
        <td style="padding: 12px 0; color: #111827;">
          ${usuarioModificador}
        </td>
      </tr>
    </table>
    
    <a href="${APP_URL}/admin/obras" 
       style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Ver Obras
    </a>
  `

  return enviarCorreo(
    destinatarios,
    `📋 Obra "${obra.nombre}" - Estado actualizado a: ${estadoLabels[estadoNuevo] || estadoNuevo}`,
    plantillaBase(contenido, 'Cambio de Estado')
  )
}

/**
 * Recordatorio de actividad próxima a vencer
 */
export async function enviarRecordatorioActividad(
  destinatarios: EmailDestinatario[],
  actividad: DatosActividad,
  obra: DatosObra,
  partida: DatosPartida
): Promise<EmailResult> {
  const fechaFormateada = actividad.fecha_fin.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const contenido = `
    <h2 style="color: #d97706; margin: 0 0 20px;">⏰ Recordatorio: Actividad próxima a vencer</h2>
    
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #92400e; font-weight: 600;">
        ⚠️ La siguiente actividad vence <strong>mañana</strong>
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
          <strong style="color: #6b7280;">Actividad:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">
          ${actividad.nombre}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Partida:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
          ${partida.nombre}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Obra:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
          ${obra.nombre}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <strong style="color: #6b7280;">Fecha límite:</strong>
        </td>
        <td style="padding: 12px 0; color: #dc2626; font-weight: 600;">
          📅 ${fechaFormateada}
        </td>
      </tr>
    </table>
    
    <p style="color: #4b5563; margin-bottom: 20px; line-height: 1.5;">
      Por favor, asegúrese de completar esta actividad antes de la fecha límite.
    </p>
    
    <a href="${APP_URL}/admin/obras" 
       style="display: inline-block; background-color: #d97706; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Ver en el Sistema
    </a>
  `

  return enviarCorreo(
    destinatarios,
    `⏰ Recordatorio: "${actividad.nombre}" vence mañana - Obra: ${obra.nombre}`,
    plantillaBase(contenido, 'Recordatorio de Actividad')
  )
}

/**
 * Recordatorio de obra próxima a fecha fin
 */
export async function enviarRecordatorioObra(
  destinatarios: EmailDestinatario[],
  obra: DatosObra
): Promise<EmailResult> {
  if (!obra.fecha_fin) {
    return { success: false, error: 'La obra no tiene fecha de fin' }
  }

  const fechaFormateada = obra.fecha_fin.toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const contenido = `
    <h2 style="color: #dc2626; margin: 0 0 20px;">🏗️ Recordatorio: Obra próxima a fecha de fin</h2>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #991b1b; font-weight: 600;">
        🚨 La fecha de finalización de esta obra es <strong>mañana</strong>
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
          <strong style="color: #6b7280;">Obra:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">
          ${obra.nombre}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Ubicación:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
          ${obra.ubicacion}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <strong style="color: #6b7280;">Fecha límite:</strong>
        </td>
        <td style="padding: 12px 0; color: #dc2626; font-weight: 600;">
          📅 ${fechaFormateada}
        </td>
      </tr>
    </table>
    
    <p style="color: #4b5563; margin-bottom: 20px; line-height: 1.5;">
      Verifique el estado de avance de la obra y tome las acciones necesarias 
      para cumplir con los plazos establecidos.
    </p>
    
    <a href="${APP_URL}/admin/obras" 
       style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Ver Obras
    </a>
  `

  return enviarCorreo(
    destinatarios,
    `🏗️ URGENTE: Obra "${obra.nombre}" - Fecha de fin mañana`,
    plantillaBase(contenido, 'Recordatorio de Obra')
  )
}

/**
 * Notificación de archivo subido
 */
export async function enviarNotificacionArchivoSubido(
  destinatarios: EmailDestinatario[],
  obra: DatosObra,
  nombreArchivo: string,
  carpeta: string,
  usuarioSubio: string
): Promise<EmailResult> {
  const contenido = `
    <h2 style="color: #2563eb; margin: 0 0 20px;">📁 Nuevo Archivo Subido</h2>
    
    <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #1e40af; font-weight: 600;">
        Se ha subido un nuevo archivo a una obra en la que usted es responsable
      </p>
    </div>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; width: 140px;">
          <strong style="color: #6b7280;">Archivo:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 500;">
          📄 ${nombreArchivo}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Carpeta:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
          📂 ${carpeta}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
          <strong style="color: #6b7280;">Obra:</strong>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #111827;">
          ${obra.nombre}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <strong style="color: #6b7280;">Subido por:</strong>
        </td>
        <td style="padding: 12px 0; color: #111827;">
          ${usuarioSubio}
        </td>
      </tr>
    </table>
    
    <a href="${APP_URL}/admin/documentos" 
       style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
      Ver Documentos
    </a>
  `

  return enviarCorreo(
    destinatarios,
    `📁 Nuevo archivo en "${obra.nombre}": ${nombreArchivo}`,
    plantillaBase(contenido, 'Archivo Subido')
  )
}