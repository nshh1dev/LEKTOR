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
  reservada: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200",
  en_preparacion: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200",
  despachada: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
  recibida: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
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

export function ordenCode(id: string): string {
  return `LK-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`
}
