"use client"

import { CircleAlert } from "lucide-react"
import { type PublicacionListItem } from "@/lib/catalog"
import { type OrdenCatalogo } from "@/components/marketplace/types"
import { cn } from "@/lib/utils"

export const ORDEN_LABELS: Record<OrdenCatalogo, string> = {
  recientes: "Más recientes",
  precio_asc: "Menor precio",
  precio_desc: "Mayor precio",
  titulo: "Título (A-Z)",
}

export function pluralEjemplares(total: number): string {
  return `${total} ${total === 1 ? "ejemplar" : "ejemplares"}`
}

/** Interruptor de la barra del catálogo, con su punto de tinta. */
export function FilaAlternador({
  activo,
  onToggle,
  etiqueta,
  conteo,
  icono,
}: {
  activo: boolean
  onToggle: () => void
  etiqueta: string
  conteo?: number
  icono?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={activo}
      className={cn(
        "group flex cursor-pointer items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs",
        "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro",
        activo ? "text-oro" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          activo ? "border-oro bg-oro" : "border-muted-foreground/40 group-hover:border-foreground/50",
        )}
      >
        {activo && <span className="size-1.5 rounded-full bg-background" />}
      </span>
      <span className="truncate">{etiqueta}</span>
      {icono && (
        <span className={cn("shrink-0", activo ? "text-oro" : "text-muted-foreground/50")}>{icono}</span>
      )}
      {conteo !== undefined && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-55">{conteo}</span>
      )}
    </button>
  )
}

export function normalizarFila(row: Record<string, unknown>): PublicacionListItem {
  return {
    ...row,
    fotos: Array.isArray(row.fotos) ? (row.fotos as unknown[]).map(String) : [],
    fechaPublicacion: new Date(row.fechaPublicacion as string).toISOString(),
  } as PublicacionListItem
}

/**
 * Aviso de un campo. Se enlaza al input con `aria-describedby`, así que el
 * lector de pantalla lo anuncia sin necesidad de un `role` extra: el aviso va
 * con la misma tinta y el mismo sello del resto del sistema.
 */
export function MensajeError({
  campo,
  className,
  mensaje,
}: {
  campo: string
  className?: string
  mensaje?: string
}) {
  if (!mensaje) return null
  return (
    <p
      id={`${campo}-error`}
      className={cn("flex items-start gap-1.5 text-xs leading-snug text-aviso-falla", className)}
    >
      <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>{mensaje}</span>
    </p>
  )
}
