"use client"

import { useState } from "react"
import { ArrowLeft, Heart, LoaderCircle, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RESERVA_HORAS, type PublicacionListItem } from "@/lib/catalog"
import { formatCLP } from "@/lib/format"
import { formatIsbn } from "@/lib/isbn"
import { Portada } from "@/components/marketplace/hero"

export function DetalleView({
  publicacion,
  esFavorito,
  onFavorito,
  onVolver,
  onComprar,
}: {
  publicacion: PublicacionListItem | null
  esFavorito: boolean
  onFavorito: (id: string) => void
  onVolver: () => void
  onComprar: () => void
}) {
  const [fotoActiva, setFotoActiva] = useState(0)

  if (!publicacion) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sinStock = publicacion.stock <= 0
  const fotos = publicacion.fotos.length > 0 ? publicacion.fotos : [undefined]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <button
        type="button"
        onClick={onVolver}
        className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al catálogo
      </button>

      <div className="grid gap-10 md:grid-cols-[minmax(280px,420px)_1fr] md:items-start">
        <div className="flex flex-col gap-3">
          <Portada publicacion={publicacion} foto={fotos[fotoActiva]} grande />
          {fotos.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {fotos.map((foto, index) => (
                <button
                  type="button"
                  key={`${foto ?? "portada"}-${index}`}
                  onClick={() => setFotoActiva(index)}
                  className={`cursor-pointer overflow-hidden rounded-xl border-2 p-1 ${fotoActiva === index ? "border-primary" : "border-transparent"}`}
                  aria-label={`Ver foto ${index + 1}`}
                >
                  <Portada publicacion={publicacion} foto={foto} />
                </button>
              ))}
            </div>
          )}
          {publicacion.fotos.length === 0 && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              Este vendedor todavia no subio fotos del ejemplar. La portada muestra la editorial.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6 pt-2">
          <div>
            <div className="flex items-start justify-between gap-3">
              <Badge className="mb-4 rounded-full">{publicacion.categoria}</Badge>
              <Button
                variant="outline"
                size="icon"
                aria-pressed={esFavorito}
                onClick={() => onFavorito(publicacion.id)}
                aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
              >
                <Heart className={esFavorito ? "fill-current text-primary" : ""} />
              </Button>
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">{publicacion.titulo}</h1>
            <p className="mt-3 text-lg text-muted-foreground">
                {publicacion.autor} · {publicacion.editorial}
                {publicacion.volumen ? ` · Vol. ${publicacion.volumen}` : ""}
            </p>
          </div>

          <Separator />

          <div>
            <p className="text-4xl font-bold text-primary">{formatCLP(publicacion.precio)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Ejemplar físico de segunda mano</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={sinStock ? "destructive" : "secondary"}>
                {sinStock ? "Sin stock" : `${publicacion.stock} disponible${publicacion.stock > 1 ? "s" : ""}`}
              </Badge>
              <Badge variant="outline">{publicacion.condicion}</Badge>
              {publicacion.isbn && <Badge variant="outline">ISBN {formatIsbn(publicacion.isbn)}</Badge>}
            </div>
          </div>

          {publicacion.descripcion && (
            <p className="max-w-xl text-pretty leading-7 text-muted-foreground">{publicacion.descripcion}</p>
          )}

          <Card className="rounded-xl bg-muted/50 shadow-none">
            <CardContent className="flex items-center gap-4 p-4">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {publicacion.vendedorNombre.slice(0, 1)}
              </span>
              <div className="flex-1">
                <p className="font-semibold">{publicacion.vendedorNombre}</p>
                <p className="text-sm text-muted-foreground">
                    {[publicacion.vendedorComuna, "Lector verificado"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <ShieldCheck className="size-5 text-primary" />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button size="lg" className="rounded-xl" disabled={sinStock} onClick={onComprar}>
              {sinStock ? "Sin stock por ahora" : "Comprar con reserva inmediata"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
                Pagas directo al vendedor · el ejemplar queda reservado {RESERVA_HORAS} horas
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
