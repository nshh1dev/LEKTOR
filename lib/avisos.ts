/**
 * Avisos de LEKTOR. Un aviso no es un recuadro verde o rojo: es una ficha de
 * catálogo con un sello estampado, un rótulo en versalitas y el cuerpo en la
 * serif de la marca. Este módulo concentra el vocabulario para que todos los
 * avisos del proyecto —toasts, bloques en línea, diálogos de confirmación—
 * compartan el mismo lenguaje.
 */

export type TonoAviso = "ok" | "falla" | "revisar" | "dato"

export const TONOS_AVISO: readonly TonoAviso[] = ["ok", "falla", "revisar", "dato"]

/** Rótulo por defecto del sello, al estilo de las Rubber stamps de aduana. */
export const ROTULO_AVISO: Record<TonoAviso, string> = {
  ok: "Confirmado",
  falla: "Fallo",
  revisar: "Revisar",
  dato: "Nota",
}

/**
 * Clases de cada tono. El lomo (lateral) va siempre en el color pleno del
 * tono y el fondo en su versión tenue, para que el bloque se lea como una
 * ficha embolsada y no como una alerta tintada.
 */
export const TONO_AVISO: Record<
  TonoAviso,
  {
    /** Lomo y sello: color pleno. */
    pleno: string
    /** Solo el color del lomo, para aplicarlo sin arrastrar el texto. */
    lomo: string
    /** Fondo del cuerpo. */
    tenue: string
    /** Color del glifo del sello. */
    sello: string
    /** Filete del pie de la ficha. */
    filete: string
    /** Milisegundos que la ficha queda en pantalla. */
    duracion: number
  }
> = {
  ok: {
    pleno: "border-aviso-ok text-aviso-ok",
    lomo: "border-aviso-ok",
    tenue: "bg-aviso-ok-tenue",
    sello: "text-aviso-ok",
    filete: "border-aviso-ok/25",
    duracion: 4400,
  },
  falla: {
    pleno: "border-aviso-falla text-aviso-falla",
    lomo: "border-aviso-falla",
    tenue: "bg-aviso-falla-tenue",
    sello: "text-aviso-falla",
    filete: "border-aviso-falla/25",
    duracion: 6800,
  },
  revisar: {
    pleno: "border-aviso-revisar text-aviso-revisar",
    lomo: "border-aviso-revisar",
    tenue: "bg-aviso-revisar-tenue",
    sello: "text-aviso-revisar",
    filete: "border-aviso-revisar/25",
    duracion: 5600,
  },
  dato: {
    pleno: "border-aviso-dato text-aviso-dato",
    lomo: "border-aviso-dato",
    tenue: "bg-aviso-dato-tenue",
    sello: "text-aviso-dato",
    filete: "border-aviso-dato/25",
    duracion: 4600,
  },
}

/**
 * Motivos de negocio que el servidor devuelve en `reason`. Un fallo de negocio
 * se explica mejor con su propio copy que con el genérico del servidor.
 */
export const MOTIVO_FALLO: Record<string, string> = {
  "stock-insuficiente": "Ya no quedan ejemplares de esta publicación",
  "vendedor-inactivo": "Esta publicación no está disponible por el momento",
  "ultimo-admin": "Debe quedar al menos una administración activa",
  "mismo-usuario": "No puedes modificar tu propia cuenta",
  "orden-activa": "No se puede eliminar con reservas activas",
  "no-session": "Tu sesión venció. Vuelve a entrar para continuar",
  forbidden: "Tu cuenta no tiene permiso para esta acción",
  "not-found": "Ese recurso ya no existe",
  "rate-limit": "Demasiados intentos. Espera un momento e inténtalo de nuevo",
  "email-exists": "Ya existe una cuenta con ese correo",
  "inactive": "Esta cuenta está desactivada. Habla con el equipo de LEKTOR",
  "bad-credentials": "Email o contraseña incorrectos",
  "bad-password": "La contraseña actual no es la que tienes en LEKTOR",
  "no-user": "Esa cuenta ya no existe",
  "sin-compra-verificada": "Solo puedes valorar un ejemplar que hayas recibido",
  "own-publication": "No puedes valorar tu propia publicación",
  "auto-contacto": "No puedes escribirte a ti mismo por esta publicación",
  "publicacion-inactiva": "Este ejemplar no está a la venta ahora mismo",
}

export function mensajeDeFallo(fallo: unknown, respaldo: string): string {
  if (fallo && typeof fallo === "object") {
    const motivo = (fallo as { reason?: unknown }).reason
    if (typeof motivo === "string" && MOTIVO_FALLO[motivo]) return MOTIVO_FALLO[motivo]
    const mensaje = (fallo as { message?: unknown }).message
    if (typeof mensaje === "string" && mensaje.trim()) return mensaje
  }
  return respaldo
}

/** Un dato pendiente de un formulario, con el campo al que llevar el foco. */
export type Faltante = {
  campo: string
  etiqueta: string
  mensaje?: string
  ancla?: string
}

/**
 * Convierte el objeto de errores de react-hook-form en la lista de datos que
 * faltan, usando las etiquetas legibles que cada formulario declara.
 */
export function resumenFaltantes(
  errores: Record<string, { message?: string } | undefined>,
  etiquetas: Record<string, string>,
  anclas: Record<string, string> = {},
): Faltante[] {
  return Object.entries(errores)
    .filter(([, valor]) => Boolean(valor))
    .map(([campo, valor]) => ({
      campo,
      etiqueta: etiquetas[campo] ?? campo,
      mensaje: valor?.message,
      ancla: anclas[campo],
    }))
}
