"use client"

import { Check, CircleAlert, Info, X, type LucideIcon } from "lucide-react"
import { type TonoAviso, TONO_AVISO } from "@/lib/avisos"
import { cn } from "@/lib/utils"

const GLIFO: Record<TonoAviso, LucideIcon> = {
  ok: Check,
  falla: X,
  revisar: CircleAlert,
  dato: Info,
}

const TAMANOS = {
  sm: { caja: "size-6", glifo: "size-3" },
  md: { caja: "size-8", glifo: "size-4" },
  lg: { caja: "size-14", glifo: "size-7" },
} as const

/**
 * Sello del aviso: un doble anillo girado como un sello de caucho, con el
 * glifo del tono en el centro. Es el mismo elemento en todos los avisos del
 * proyecto, para que el ojo aprenda a leerlos de un vistazo.
 */
export function Sello({
  tono,
  tamano = "md",
  fijo = false,
  className,
}: {
  tono: TonoAviso
  tamano?: keyof typeof TAMANOS
  /** Sin animación, para sellos que ya están en pantalla y solo se consultan. */
  fijo?: boolean
  className?: string
}) {
  const { caja, glifo } = TAMANOS[tamano]
  const Glifo = GLIFO[tono]
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-current ring-1 ring-current/40",
        "rotate-[-7deg]",
        !fijo && "animate-sello",
        caja,
        TONO_AVISO[tono].sello,
        className,
      )}
    >
      <Glifo className={cn(glifo, "stroke-[2.75]")} />
    </span>
  )
}
