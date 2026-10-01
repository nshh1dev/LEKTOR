"use client"

import { MapPin } from "lucide-react"
import { type PublicacionListItem } from "@/lib/catalog"
import { formatCLP } from "@/lib/format"
import { Portada } from "@/components/marketplace/hero"
import { Estrellas } from "@/components/marketplace/valoraciones"

export function ProductCard({
  publicacion,
  onDetalle,
  onVendedor,
}: {
  publicacion: PublicacionListItem
  onDetalle: () => void
  onVendedor?: (vendedorId: string) => void
}) {
  const sinStock = publicacion.stock <= 0
  const nota = Number.parseFloat(publicacion.rating ?? "")
  const hayNota = Number.isFinite(nota) && publicacion.ratingCount > 0

  return (
    <article className="group relative flex h-full flex-col">
      <div className="pointer-events-none relative overflow-hidden rounded-2xl bg-foreground/[0.045] transition-shadow duration-500 group-hover:sombra-tomo">
        <Portada publicacion={publicacion} foto={publicacion.fotos[0]} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/45 to-transparent" />
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <span className="rounded-full bg-neutral-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white/85 ring-1 ring-white/15 backdrop-blur-md">
            {publicacion.condicion}
          </span>
          {sinStock && (
            <span className="rounded-full bg-destructive px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white">
              Sin stock
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDetalle}
        className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none"
        aria-label={`Ver ${publicacion.titulo}, de ${publicacion.autor}, por ${formatCLP(publicacion.precio)}`}
      />

      <div className="pointer-events-none mt-4 flex flex-1 flex-col">
        <p className="rotulo text-[9px] text-oro/80">{publicacion.categoria}</p>
        <h3 className="mt-1.5 line-clamp-2 text-[0.9375rem] font-medium leading-snug tracking-tight transition-colors group-hover:text-oro">
          {publicacion.titulo}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {publicacion.autor}
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          {publicacion.editorial}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3.5">
          <p className="font-serif text-2xl font-semibold leading-none tracking-tight text-oro tabular-nums">
            {formatCLP(publicacion.precio)}
          </p>
          {hayNota && (
            <span
              className="flex shrink-0 items-center gap-1"
              title={`${nota.toFixed(1)} de 5 en ${publicacion.ratingCount} ${
                publicacion.ratingCount === 1 ? "valoración" : "valoraciones"
              }`}
            >
              <Estrellas nota={nota} />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {nota.toFixed(1)}
                <span className="text-muted-foreground/60"> ({publicacion.ratingCount})</span>
              </span>
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5 border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
          {onVendedor ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onVendedor(publicacion.vendedorId)
              }}
              className="pointer-events-auto relative z-20 truncate rounded-full font-medium text-foreground/80 transition-colors hover:text-oro focus-visible:outline-none"
              aria-label={`Ver el perfil de ${publicacion.vendedorNombre}`}
            >
              {publicacion.vendedorNombre}
            </button>
          ) : (
            <span className="truncate font-medium text-foreground/80">{publicacion.vendedorNombre}</span>
          )}
          {publicacion.vendedorComuna && (
            <>
              <span className="text-border">·</span>
              <span className="flex min-w-0 shrink items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{publicacion.vendedorComuna}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
