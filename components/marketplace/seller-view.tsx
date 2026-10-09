"use client"

import { ArrowLeft, BookOpen, MapPin } from "lucide-react"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ProductCard } from "@/components/marketplace/product-card"
import { BarrasEstrellas, ResumenEstrellas } from "@/components/marketplace/valoraciones"
import { formatDate } from "@/lib/format"
import type { PerfilVendedorUI } from "@/lib/catalog"
import { api } from "@/components/marketplace/api"
import { avisar } from "@/components/notificacion/avisar"
import { mensajeDeFallo } from "@/lib/avisos"

export function SellerView({
  perfil,
  onVolver,
  onAbrirPublicacion,
}: {
  perfil: PerfilVendedorUI
  onVolver: () => void
  onAbrirPublicacion: (id: string) => void
}) {
  const [datos, setDatos] = useState(perfil)
  const [cargando, setCargando] = useState(false)
  const consultando = useRef(false)
  const encabezado = useRef<HTMLHeadingElement>(null)
  const { vendedor, reputacion, publicaciones, paginacion } = datos
  const ubicacion = [vendedor.comuna, vendedor.region].filter(Boolean).join(", ")

  const cambiarPagina = async (pagina: number) => {
    if (consultando.current) return
    consultando.current = true
    setCargando(true)
    try {
      const siguiente = await api<PerfilVendedorUI>(`/api/sellers/${vendedor.id}?pagina=${pagina}`)
      setDatos(siguiente)
      encabezado.current?.focus()
    } catch (error) {
      avisar.falla({
        titulo: "No se pudieron cargar los ejemplares",
        descripcion: mensajeDeFallo(error, "Intenta cambiar de página otra vez."),
      })
    } finally {
      consultando.current = false
      setCargando(false)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 rounded-full" onClick={onVolver}>
          <ArrowLeft data-icon="inline-start" /> Volver al catálogo
        </Button>
      </div>

      <header className="flex flex-col gap-6 border-b border-border/60 pb-10 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start gap-4">
          {vendedor.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vendedor.avatarUrl}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {vendedor.nombre.slice(0, 1)}
            </span>
          )}
          <div>
            <p className="rotulo flex items-center gap-1.5 text-acento/80">
              <BookOpen className="size-3.5" /> {vendedor.nivel}
            </p>
            <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              {vendedor.nombre}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              En LEKTOR desde {formatDate(vendedor.fechaCreacion)}
              {ubicacion && (
                <span className="mt-0.5 flex items-center gap-1">
                  <MapPin className="size-3.5" /> {ubicacion}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-acento/25 bg-acento/[0.04] px-5 py-4">
          <p className="rotulo text-[9px] text-muted-foreground">Reputación</p>
          {reputacion.total > 0 ? (
            <div className="mt-1 flex items-baseline gap-3">
              <span className="font-serif text-4xl font-semibold tabular-nums text-acento">
                {reputacion.promedio?.toFixed(1)}
              </span>
              <span>
                <ResumenEstrellas reputacion={reputacion} />
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Todavía sin valoraciones</p>
          )}
        </div>
      </header>

      {vendedor.bio && (
        <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
          {vendedor.bio}
        </p>
      )}

      {reputacion.total > 0 && (
        <section>
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-border/60 p-5">
            <BarrasEstrellas reputacion={reputacion} />
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              Promedio calculado sobre {reputacion.total}{" "}
              {reputacion.total === 1 ? "valoración verificada" : "valoraciones verificadas"}:
              solo quienes recibieron un ejemplar suyo pueden dejar estrellas.
            </p>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-5" aria-busy={cargando}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 ref={encabezado} tabIndex={-1} className="font-serif text-2xl font-semibold tracking-tight">
            Sus ejemplares en venta
          </h2>
          <span className="text-xs tabular-nums text-muted-foreground">
            {paginacion.total} {paginacion.total === 1 ? "título" : "títulos"}
          </span>
        </div>

        {publicaciones.length > 0 ? (
          <div className="grid auto-rows-fr grid-cols-2 gap-x-5 gap-y-9 md:gap-x-7 lg:grid-cols-3 2xl:grid-cols-4">
            {publicaciones.map((publicacion) => (
              <ProductCard
                key={publicacion.id}
                publicacion={publicacion}
                onDetalle={() => onAbrirPublicacion(publicacion.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 py-14 text-center">
            <p className="font-serif text-xl">No tiene ejemplares a la venta por ahora</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Vuelve pronto: su estantería se va completando con cada lectura terminada.
            </p>
          </div>
        )}
        {paginacion.paginas > 1 && (
          <nav aria-label="Páginas de ejemplares del vendedor" className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" disabled={cargando || paginacion.pagina <= 1} onClick={() => void cambiarPagina(paginacion.pagina - 1)}>
              Anterior
            </Button>
            <span role="status" className="text-sm text-muted-foreground">
              {cargando ? "Cargando ejemplares…" : `Página ${paginacion.pagina} de ${paginacion.paginas}`}
            </span>
            <Button variant="outline" disabled={cargando || paginacion.pagina >= paginacion.paginas} onClick={() => void cambiarPagina(paginacion.pagina + 1)}>
              Siguiente
            </Button>
          </nav>
        )}
      </section>
    </div>
  )
}
