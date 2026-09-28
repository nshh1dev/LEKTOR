"use client"

import { toast } from "sonner"
import { ArrowRight } from "lucide-react"
import { ROTULO_AVISO, TONO_AVISO, type TonoAviso } from "@/lib/avisos"
import { Sello } from "@/components/notificacion/sello"
import type { ExternalToast, ToastClassnames } from "sonner"

type DatosAviso = {
  titulo: string
  descripcion?: string
  /** Dato de referencia en mono, al pie de la ficha (código de orden, stock…). */
  referencia?: string
  accion?: { etiqueta: string; alPulsar: () => void }
  tono?: TonoAviso
  /** Milisegundos en pantalla. Por defecto, los del tono. */
  duracion?: number
  /** Sin animación de estampado, para avisos repetidos. */
  fijo?: boolean
}

/**
 * Ficha de aviso flotante. Va como nodo propio y no como título de texto para
 * controlar el lomo, el sello, la serif de la marca y el pie con la referencia.
 */
function Ficha({ aviso, id }: { aviso: DatosAviso; id: string | number }) {
  const tono = aviso.tono ?? "dato"
  const paleta = TONO_AVISO[tono]
  return (
    <div
      className={[
        "relative flex w-[min(90vw,21rem)] items-start gap-3 rounded-lg border border-border/70",
        "border-l-[3px] bg-card p-4 papel",
        paleta.tenue,
        paleta.pleno.split(" ")[0],
      ].join(" ")}
    >
      <Sello tono={tono} fijo={aviso.fijo} className="-mt-0.5" />
      <div className="min-w-0 flex-1 pr-3">
        <p className="rotulo">{ROTULO_AVISO[tono]}</p>
        <p className="mt-1.5 font-serif text-[0.975rem] leading-snug text-foreground">
          {aviso.titulo}
        </p>
        {aviso.descripcion ? (
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
            {aviso.descripcion}
          </p>
        ) : null}
        {aviso.referencia || aviso.accion ? (
          <div className={`mt-3 flex items-center justify-between gap-3 border-t pt-2 ${paleta.filete}`}>
            {aviso.referencia ? (
              <span className="truncate font-mono text-[0.6875rem] tracking-tight text-muted-foreground">
                {aviso.referencia}
              </span>
            ) : null}
            {aviso.accion ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  aviso.accion?.alPulsar()
                  toast.dismiss(id)
                }}
                className="rotulo ml-auto flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-foreground transition-colors hover:text-oro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro"
              >
                {aviso.accion.etiqueta}
                <ArrowRight className="size-3" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** El <li> de Sonner queda como simple contenedor: la ficha lleva el papel y el lomo. */
const CLASES_FICHA: ToastClassnames = {
  toast: [
    "m-0 p-0 items-start justify-end",
    "[&_[data-close-button]]:absolute [&_[data-close-button]]:-top-1.5 [&_[data-close-button]]:-right-1.5",
    "[&_[data-close-button]]:flex [&_[data-close-button]]:size-6 [&_[data-close-button]]:items-center",
    "[&_[data-close-button]]:justify-center [&_[data-close-button]]:rounded-full",
    "[&_[data-close-button]]:border [&_[data-close-button]]:border-border/70",
    "[&_[data-close-button]]:bg-card [&_[data-close-button]]:shadow-md",
    "[&_[data-close-button]]:opacity-0 [&_[data-close-button]]:transition-opacity",
    "hover:[&_[data-close-button]]:opacity-100 focus:[&_[data-close-button]]:opacity-100",
  ].join(" "),
  closeButton: "text-muted-foreground hover:text-foreground",
}

function emitir(tono: TonoAviso, aviso: DatosAviso, opciones?: ExternalToast) {
  const completo: DatosAviso = { ...aviso, tono }
  return toast.custom((id) => <Ficha aviso={completo} id={id} />, {
    duration: aviso.duracion ?? TONO_AVISO[tono].duracion,
    classNames: CLASES_FICHA,
    ...opciones,
  })
}

/**
 * Único punto de entrada de las notificaciones flotantes. Todos los avisos del
 * proyecto salen de acá para compartir sello, serif, duración y pie.
 */
export const avisar = {
  /** Algo quedó confirmado: la compra, la publicación, el movimiento de stock. */
  ok: (aviso: DatosAviso, opciones?: ExternalToast) => emitir("ok", aviso, opciones),
  /** Algo no se pudo hacer. El copy del dominio vive en el servidor. */
  falla: (aviso: DatosAviso, opciones?: ExternalToast) => emitir("falla", aviso, opciones),
  /** No bloquea, pero hay que revisarlo: ISBN sin ficha, stock bajo. */
  revisar: (aviso: DatosAviso, opciones?: ExternalToast) => emitir("revisar", aviso, opciones),
  /** Aviso neutro, sin juicio sobre el resultado. */
  dato: (aviso: DatosAviso, opciones?: ExternalToast) => emitir("dato", aviso, opciones),
}

export function cerrarAvisos() {
  toast.dismiss()
}
