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

/** Marca de campo cuya ficha llegó con escritura no latina y no se pudo
 *  traer en versión latina. Aparece pegada al input, con entrada animada. */
export function MensajeNoLatino({ campo, mostrar }: { campo: string; mostrar: boolean }) {
  if (!mostrar) return null
  return (
    <p
      id={`${campo}-nolatino`}
      className="flex items-start gap-1.5 text-xs leading-snug text-aviso-revisar animate-in fade-in slide-in-from-top-1 duration-300"
    >
      <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
      <span>No pudimos pasarlo al alfabeto latino: escríbelo a mano.</span>
    </p>
  )
}
