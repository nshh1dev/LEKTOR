"use client"

import { useState } from "react"
import { ArrowLeft, ChevronRight, LoaderCircle, MessageCircle } from "lucide-react"
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
            <Badge className="mb-4 rounded-full">{publicacion.categoria}</Badge>
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
            </div>
          </div>

          {publicacion.descripcion && (
            <p className="max-w-xl text-pretty leading-7 text-muted-foreground">{publicacion.descripcion}</p>
          )}

          <Separator />

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

          <Card className="rounded-xl bg-muted/50 shadow-none">
            <button
              type="button"
              onClick={() => onVendedor(publicacion.vendedorId)}
              className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted focus-visible:outline-none"
              aria-label={`Ver perfil de ${publicacion.vendedorNombre}`}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {publicacion.vendedorNombre.slice(0, 1)}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{publicacion.vendedorNombre}</span>
                <span className="block text-sm text-muted-foreground">
                  {[publicacion.vendedorComuna].filter(Boolean).join(" · ") || "Lector de LEKTOR"}
                </span>
              </span>
              {reputacion.total > 0 ? (
                <ResumenEstrellas reputacion={reputacion} className="shrink-0" />
              ) : (
                <span className="text-[11px] text-muted-foreground">Sin valoraciones aún</span>
              )}
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </Card>

          <div className="flex flex-col gap-2">
            <Button size="lg" className="rounded-xl" disabled={sinStock} onClick={onComprar}>
              {sinStock ? "Sin stock por ahora" : "Comprar con reserva inmediata"}
            </Button>
            {publicacion.vendedorId !== yoId && (
              <Button
                size="lg"
                variant="outline"
                className="rounded-xl"
                onClick={yoId ? () => setContactoAbierto(true) : onNecesitaSesion}
              >
                <MessageCircle data-icon="inline-start" /> Preguntar al vendedor
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
                Pagas directo al vendedor · el ejemplar queda reservado {RESERVA_HORAS} horas
            </p>
          </div>

          {yoId && publicacion.vendedorId !== yoId && (
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
    </div>
  )
}
