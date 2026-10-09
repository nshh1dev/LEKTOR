"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Sello } from "@/components/notificacion/sello"
import { TONO_AVISO, type TonoAviso } from "@/lib/avisos"
import { cn } from "@/lib/utils"

export type ConfirmarAccionProps = {
  abierto: boolean
  tono?: TonoAviso
  /** Rótulo sobre el título. Por defecto depende del tono. */
  rotulo?: string
  titulo: string
  descripcion: React.ReactNode
  confirmTexto?: string
  cancelTexto?: string
  peligroso?: boolean
  cargando?: boolean
  onConfirmar: () => void | Promise<void>
  onCerrar: () => void
}

/**
 * Diálogo de confirmación con sello de marca. Reemplaza a todos los AlertDialog
 * destructivos para tener un único patrón (tono falla/revisar, papel tenue,
 * rótulos en versalitas).
 */
export function ConfirmarAccion({
  abierto,
  tono = "revisar",
  rotulo,
  titulo,
  descripcion,
  confirmTexto = "Confirmar",
  cancelTexto = "Cancelar",
  peligroso = true,
  cargando = false,
  onConfirmar,
  onCerrar,
}: ConfirmarAccionProps) {
  const paleta = TONO_AVISO[tono]
  const destructivo = peligroso && tono === "falla"
  return (
    <AlertDialog open={abierto} onOpenChange={(estado) => !estado && onCerrar()}>
      <AlertDialogContent className="papel gap-0 rounded-xl border border-border/70 bg-card p-0">
        <div className={cn("border-b border-border/40 px-6 py-5", paleta.tenue)}>
          <AlertDialogHeader className="flex-row items-start gap-3 text-left">
            <Sello tono={tono} tamano="md" fijo />
            <div className="min-w-0 flex-1">
              <p className={cn("rotulo", paleta.sello)}>
                {rotulo ?? (destructivo ? "Acción irreversible" : "Confirmar acción")}
              </p>
              <AlertDialogTitle className="mt-1.5 font-serif text-[1.25rem] leading-snug tracking-tight">
                {titulo}
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>
          <AlertDialogDescription className="mt-3 pl-11 text-sm leading-relaxed text-muted-foreground">
            {descripcion}
          </AlertDialogDescription>
        </div>
        <AlertDialogFooter className="gap-2 border-t border-border/40 bg-background/40 px-6 py-4">
          <AlertDialogCancel disabled={cargando} className="rounded-lg">
            {cancelTexto}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={cargando}
            onClick={(event) => {
              event.preventDefault()
              void onConfirmar()
            }}
            className={cn(
              "rounded-lg shadow-none",
              destructivo
                ? "bg-aviso-falla text-aviso-falla-foreground hover:bg-aviso-falla/90"
                : "bg-acento text-acento-foreground hover:bg-acento/90",
            )}
          >
            {confirmTexto}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
