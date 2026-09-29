"use client"

import { ROTULO_AVISO, TONO_AVISO, type Faltante, type TonoAviso } from "@/lib/avisos"
import { cn } from "@/lib/utils"
import { Sello } from "@/components/notificacion/sello"

/**
 * Ficha de aviso en línea. Es el bloque que aparece dentro de un formulario o
 * de un diálogo cuando el aviso tiene que quedar pegado a la acción: un pago
 * rechazado, un stock que no cuadra, una consulta que falló. Mismo sello, mismo
 * rótulo y misma serif que las notificaciones flotantes.
 */
export function Aviso({
  tono = "falla",
  rotulo,
  titulo,
  children,
  vivo = true,
  className,
}: {
  tono?: TonoAviso
  rotulo?: string
  titulo: string
  children?: React.ReactNode
  /** Los errores de una acción en curso se anuncian; el resto, no. */
  vivo?: boolean
  className?: string
}) {
  const paleta = TONO_AVISO[tono]
  return (
    <div
      role={vivo ? "alert" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/70 border-l-[3px] bg-card px-4 py-3",
        paleta.tenue,
        paleta.lomo,
        className,
      )}
    >
      <Sello tono={tono} tamano="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="rotulo">{rotulo ?? ROTULO_AVISO[tono]}</p>
        <p className="mt-1.5 font-serif text-[0.95rem] leading-snug text-foreground">{titulo}</p>
        {children ? (
          <div className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Datos que faltan en un formulario. En vez de dejar el botón muerto y esperar
 * a que el usuario adivine, se listan los campos pendientes con su motivo y
 * cada uno lleva el foco al campo cuando se elige.
 */
export function FaltanDatos({
  titulo,
  datos,
  vivo = true,
  className,
}: {
  titulo: string
  datos: Faltante[]
  /** En un formulario que se valida en vivo, el bloque no debe anunciarse solo. */
  vivo?: boolean
  className?: string
}) {
  if (datos.length === 0) return null
  return (
    <div
      role={vivo ? "alert" : undefined}
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-border/70 border-l-[3px] border-aviso-revisar bg-aviso-revisar-tenue px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Sello tono="revisar" tamano="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="rotulo text-aviso-revisar">Faltan datos</p>
          <p className="mt-1.5 font-serif text-[0.95rem] leading-snug text-foreground">{titulo}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-1 border-t border-aviso-revisar/20 pt-2.5">
        {datos.map((dato, indice) => (
          <li key={dato.campo} className="flex items-baseline gap-2 text-[0.8125rem]">
            <span aria-hidden className="font-mono text-[10px] text-aviso-revisar">
              {String(indice + 1).padStart(2, "0")}
            </span>
            {dato.ancla ? (
              <button
                type="button"
                onClick={() => {
                  const destino = document.getElementById(dato.ancla as string)
                  if (!destino) return
                  destino.scrollIntoView({ block: "center", behavior: "smooth" })
                  destino.focus({ preventScroll: true })
                }}
                className="cursor-pointer text-left font-medium text-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-aviso-revisar"
              >
                {dato.etiqueta}
                {dato.mensaje ? (
                  <span className="font-normal text-muted-foreground"> — {dato.mensaje}</span>
                ) : null}
              </button>
            ) : (
              <span>
                <span className="font-medium text-foreground">{dato.etiqueta}</span>
                {dato.mensaje ? (
                  <span className="text-muted-foreground"> — {dato.mensaje}</span>
                ) : null}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
