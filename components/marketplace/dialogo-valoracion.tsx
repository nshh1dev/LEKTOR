"use client"

import { useEffect, useState } from "react"
import { LoaderCircle, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { avisar } from "@/components/notificacion/avisar"
import { mensajeDeFallo } from "@/lib/avisos"
import { reviewSchema, type OrdenUI } from "@/lib/catalog"
import { api } from "@/components/marketplace/api"
import { SelectorEstrellas } from "@/components/marketplace/valoraciones"

/**
 * Valorar desde la compra recibida: el comprador abre el selector de estrellas
 * sobre la tarjeta de la orden. El `orderId` viaja en el cuerpo para que el
 * servidor ate la reseña exactamente a esa compra y no a cualquier otra.
 */
export function DialogoValoracion({
  orden,
  abierto,
  onOpenChange,
  onValorada,
}: {
  orden: OrdenUI | null
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  onValorada: (ordenId: string) => void
}) {
  const [puntaje, setPuntaje] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (abierto) {
      setPuntaje(0)
      setError(null)
    }
  }, [abierto, orden?.id])

  const publicar = async () => {
    if (!orden || enviando) return
    const parsed = reviewSchema.safeParse({ puntaje, orderId: orden.id })
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.puntaje?.[0] ?? "Revisa las estrellas")
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await api(`/api/publications/${orden.publicacionId}/reviews`, {
        method: "POST",
        body: JSON.stringify(parsed.data),
      })
      onValorada(orden.id)
      avisar.ok({
        titulo: "Valoración publicada",
        descripcion: "Gracias por contar cómo te fue con tu ejemplar.",
      })
    } catch (fallo) {
      avisar.falla({
        titulo: "No se pudo publicar la valoración",
        descripcion: mensajeDeFallo(fallo, "Elige las estrellas que le das."),
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valora tu compra</DialogTitle>
          <DialogDescription>
            {orden ? `${orden.tituloSnapshot} · ${orden.vendedor.nombre}` : "Una orden recibida."} Tu
            valoración queda en el perfil del vendedor y puede editarse después desde tus reseñas.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <SelectorEstrellas
            valor={puntaje}
            onCambio={setPuntaje}
            error={error ?? undefined}
            name="puntaje-orden"
          />
          <Button
            type="button"
            className="w-fit rounded-lg"
            onClick={() => void publicar()}
            disabled={enviando}
          >
            {enviando ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <Star data-icon="inline-start" />
            )}
            Publicar valoración
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}