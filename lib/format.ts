import type { EstadoOrden, EstadoPublicacion, MetodoEntrega } from "@/lib/catalog"

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
})

const DATE = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" })
const DATE_TIME = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export const ZONA_HORARIA = "America/Santiago"

export function escaparCampoCSV(valor: string | number): string {
  return `"${String(valor).replace(/"/g, '""')}"`
}

export function generarCSV(filas: (string | number)[][]): string {
  return filas.map((fila) => fila.map(escaparCampoCSV).join(",")).join("\r\n")
}

const DIA_SANTIAGO = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA_HORARIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function claveDiaSantiago(fecha: Date): string {
  return DIA_SANTIAGO.format(fecha)
}

export function formatCLP(value: number): string {
  return CLP.format(value)
}

export function formatDate(value: string | Date): string {
  return DATE.format(new Date(value))
}

export function formatDateTime(value: string | Date): string {
  return DATE_TIME.format(new Date(value))
}

export function coverLabel(title: string): string {
  const words = title.replace(/[:—–-]/g, " ").split(/\s+/).filter(Boolean)
  if (words.length === 0) return "LEKTOR"
  const label = words.slice(0, 2).join(" ").toUpperCase()
  return label.length > 14 ? words[0].toUpperCase() : label
}

export const ESTADO_ORDEN_LABEL: Record<EstadoOrden, string> = {
  reservada: "Reservada",
  en_preparacion: "En preparación",
  despachada: "Despachada",
  recibida: "Recibida",
  cancelada: "Cancelada",
}

export const ESTADO_ORDEN_BADGE: Record<EstadoOrden, string> = {
  reservada: "border-aviso-revisar/30 bg-aviso-revisar-tenue text-foreground",
  en_preparacion: "border-acento/25 bg-acento/10 text-foreground",
  despachada: "border-foreground/15 bg-foreground/[0.05] text-foreground",
  recibida: "border-aviso-ok/35 bg-aviso-ok-tenue text-foreground",
  cancelada: "border-border bg-muted text-muted-foreground",
}

export const ESTADO_ORDEN_PASOS: EstadoOrden[] = ["reservada", "en_preparacion", "despachada", "recibida"]

export const ESTADO_PUBLICACION_LABEL: Record<EstadoPublicacion, string> = {
  activa: "Activa",
  pausada: "Pausada",
  agotada: "Agotada",
}

export const METODO_ENTREGA_LABEL: Record<MetodoEntrega, string> = {
  envio_domicilio: "Envío a domicilio",
  retiro_punto: "Retiro en punto",
  coordinar: "Coordinar entrega",
}

export function tiempoRestante(iso: string | Date): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "expirada"
  const horas = Math.floor(diff / 3_600_000)
  if (horas >= 24) return `${Math.floor(horas / 24)} día${horas >= 48 ? "s" : ""}`
  const minutos = Math.floor(diff / 60_000)
  if (horas === 0) return `${Math.max(1, minutos)} min`
  const resto = minutos - horas * 60
  return resto > 0 ? `${horas} h ${resto} min` : `${horas} h`
}

/**
 * Número del comprobante de la orden. Lleva el día en que se creó, en hora de
 * Chile, para que el documento se lea como una fecha y no solo como un
 * identificador. El sufijo sale del UUID, que ya es único.
 */
export function ordenCode(id: string, fecha: string | Date): string {
  const dia = claveDiaSantiago(typeof fecha === "string" ? new Date(fecha) : fecha).replaceAll("-", "")
  return `LK-${dia}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`
}
