"use client"

import { useState } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight, LoaderCircle, MessageCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RESERVA_HORAS, type PublicacionListItem, type ReputacionUI, type ReviewUI } from "@/lib/catalog"
import { formatCLP } from "@/lib/format"
import { Portada } from "@/components/marketplace/hero"
import {
  BarrasEstrellas,
  Estrellas,
  FormValoracion,
  ListaValoraciones,
  ResumenEstrellas,
} from "@/components/marketplace/valoraciones"
import { DialogoContacto } from "@/components/marketplace/dialogo-contacto"

export function DetalleView({
  publicacion,
  reviews,
  reputacion,
  puedeValorar,
  yoId,
  onVolver,
  onComprar,
  onValoraciones,
  onVendedor,
  onNecesitaSesion,
}: {
  publicacion: PublicacionListItem | null
  reviews: ReviewUI[]
  reputacion: ReputacionUI
  puedeValorar: boolean
  yoId: string | null
  onVolver: () => void
  onComprar: () => void
  onValoraciones: (datos: { reviews: ReviewUI[]; reputacion: ReputacionUI }) => void
  onVendedor: (vendedorId: string) => void
  onNecesitaSesion: () => void
}) {
  const [fotoActiva, setFotoActiva] = useState(0)
  const [contactoAbierto, setContactoAbierto] = useState(false)

  if (!publicacion) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const sinStock = publicacion.stock <= 0
  const esPropia = publicacion.vendedorId === yoId
  const fotos = publicacion.fotos.length > 0 ? publicacion.fotos : [undefined]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <button
        type="button"
        onClick={onVolver}
        className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al catálogo
      </button>

      <header>
        <Badge className="mb-2 rounded-full">{publicacion.categoria}</Badge>
        <h1 className="text-balance font-serif text-3xl font-semibold tracking-tight md:text-4xl">{publicacion.titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          {publicacion.autor} · {publicacion.editorial}
          {publicacion.volumen ? ` · Vol. ${publicacion.volumen}` : ""}
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-[minmax(240px,340px)_minmax(0,1fr)] md:items-start md:gap-8">
        <div className="mx-auto flex w-full max-w-60 flex-col gap-2 md:max-w-none">
          <div className="relative">
            <Portada publicacion={publicacion} foto={fotos[fotoActiva]} grande presentacion="foto" className="aspect-auto h-[clamp(200px,32dvh,280px)] md:h-[clamp(240px,42dvh,400px)]" />
            {fotos.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 size-11 -translate-y-1/2 rounded-full shadow-md"
                  aria-label="Foto anterior"
                  disabled={fotoActiva === 0}
                  onClick={() => setFotoActiva((actual) => Math.max(0, actual - 1))}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 size-11 -translate-y-1/2 rounded-full shadow-md"
                  aria-label="Foto siguiente"
                  disabled={fotoActiva === fotos.length - 1}
                  onClick={() => setFotoActiva((actual) => Math.min(fotos.length - 1, actual + 1))}
                >
                  <ChevronRight />
                </Button>
              </>
            )}
          </div>
          {fotos.length > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {fotos.map((foto, index) => (
                <button
                  type="button"
                  key={`${foto ?? "portada"}-${index}`}
                  onClick={() => setFotoActiva(index)}
                  className={`w-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 p-0.5 ${fotoActiva === index ? "border-primary" : "border-transparent"}`}
                  aria-label={`Ver foto ${index + 1}`}
                  aria-pressed={fotoActiva === index}
                >
                  <Portada publicacion={publicacion} foto={foto} presentacion="foto" />
                </button>
              ))}
              <span role="status" className="px-2 text-xs tabular-nums text-muted-foreground">
                Foto {fotoActiva + 1} de {fotos.length}
              </span>
            </div>
          )}
          {publicacion.fotos.length === 0 && (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              Este vendedor todavia no subio fotos del ejemplar. La portada muestra la editorial.
            </p>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="text-3xl font-bold text-primary">{formatCLP(publicacion.precio)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Ejemplar físico de segunda mano</p>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">Condición física</dt>
              <dd className="text-base font-semibold leading-snug">{publicacion.condicion}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">Disponibilidad</dt>
              <dd className={`text-base font-semibold leading-snug ${sinStock ? "text-destructive" : "text-foreground"}`}>
                {sinStock ? "Agotado" : `${publicacion.stock} ejemplar${publicacion.stock > 1 ? "es" : ""}`}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
            <Button className="h-auto min-h-10 whitespace-normal rounded-lg px-5 py-2" disabled={sinStock || esPropia} onClick={onComprar}>
              {esPropia ? "Esta es tu publicación" : sinStock ? "Sin stock por ahora" : "Comprar ejemplar"}
            </Button>
            {!esPropia && (
              <Button
                variant="ghost"
                className="min-h-10 rounded-lg"
                onClick={yoId ? () => setContactoAbierto(true) : onNecesitaSesion}
              >
                <MessageCircle data-icon="inline-start" /> Preguntar
              </Button>
            )}
            </div>
            {!esPropia && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pagas directo al vendedor · el ejemplar queda reservado {RESERVA_HORAS} horas
              </p>
            )}
          </div>

          <Card className="gap-0 rounded-xl bg-muted/50 py-0 shadow-none">
            <button
              type="button"
              onClick={() => onVendedor(publicacion.vendedorId)}
               className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={`Ver perfil de ${publicacion.vendedorNombre}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {publicacion.vendedorNombre.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">Vendido por</span>
                <span className="block break-words font-semibold">{publicacion.vendedorNombre}</span>
                <span className="block text-sm text-muted-foreground">
                  {publicacion.vendedorComuna || "Lector de LEKTOR"}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Card>
          {publicacion.descripcion && (
            <section aria-labelledby="titulo-descripcion" className="flex flex-col gap-2">
              <h2 id="titulo-descripcion" className="font-serif text-lg tracking-tight">Sobre este ejemplar</h2>
              <p className="text-pretty text-sm leading-6 text-muted-foreground">{publicacion.descripcion}</p>
            </section>
          )}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-6">
          <section aria-labelledby="titulo-valoraciones" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="titulo-valoraciones" className="font-serif text-xl tracking-tight">
                Valoraciones de quien lo recibió
              </h2>
              <ResumenEstrellas reputacion={reputacion} />
            </div>

            {reputacion.total > 0 && (
              <div className="flex flex-col gap-4 rounded-xl bg-muted/40 p-4 sm:flex-row sm:items-center sm:gap-8">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-4xl font-semibold leading-none tabular-nums text-oro">
                    {reputacion.promedio?.toFixed(1)}
                  </span>
                  <div className="flex flex-col gap-1">
                    <Estrellas nota={reputacion.promedio ?? 0} tamano="md" />
                    <span className="text-[11px] text-muted-foreground">
                      {reputacion.total} {reputacion.total === 1 ? "valoración" : "valoraciones"}
                    </span>
                  </div>
                </div>
                <BarrasEstrellas reputacion={reputacion} className="sm:flex-1" />
              </div>
            )}

            {reputacion.total === 0 && (
              <p className="text-sm text-muted-foreground">
                Todavía no hay valoraciones. Solo puede valorar quien recibió el ejemplar, así que
                cada nota viene de una compra terminada.
              </p>
            )}

            {puedeValorar && (
              <div className="flex flex-col gap-3 rounded-xl border border-oro/25 bg-oro/[0.04] p-4">
                <div>
                  <h3 className="font-medium">¿Ya recibiste este ejemplar?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tu valoración ayuda a que el siguiente lector sepa qué esperar.
                  </p>
                </div>
                <FormValoracion
                  publicacionId={publicacion.id}
                  onCreada={(datos) => onValoraciones(datos)}
                />
              </div>
            )}

            {reviews.length > 0 && (
              <ListaValoraciones
                reviews={reviews}
                yoId={yoId}
                onActualizado={onValoraciones}
              />
            )}
          </section>

          {yoId && !esPropia && (
            <DialogoContacto
              abierto={contactoAbierto}
              onOpenChange={setContactoAbierto}
              yoId={yoId}
              nueva={{
                publicacionId: publicacion.id,
                publicacionTitulo: publicacion.titulo,
                vendedorNombre: publicacion.vendedorNombre,
              }}
            />
          )}
      </div>
    </div>
  )
}
