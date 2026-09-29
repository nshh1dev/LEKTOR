"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ORDENES_CATALOGO, type Categoria, type Condicion, type Facetas, type Paginacion, type PublicacionListItem } from "@/lib/catalog"
import { ORDEN_LABELS, pluralEjemplares } from "@/components/marketplace/shared"
import { cn } from "@/lib/utils"
import { type OrdenCatalogo } from "@/components/marketplace/types"
import { ProductCard } from "@/components/marketplace/product-card"
import { IndiceFiltros } from "@/components/marketplace/filter-index"

/** Recuerda si la columna de filtros quedó plegada, como la preferencia de tema. */
const CLAVE_FILTROS = "lektor:filtros"

type Filtros = {
  categoria: Categoria[]
  condicion: Condicion[]
  comuna: string[]
  precioMin: number | null
  precioMax: number | null
}

type GrupoFiltro = "categoria" | "condicion" | "comuna"

export function CatalogView({
  publicaciones,
  facetas,
  paginacion,
  cargando,
  orden,
  setOrden,
  filtros,
  alternarFiltro,
  setPrecioRango,
  limpiarFiltros,
  filtrosActivos,
  onDetalle,
  onPagina,
}: {
  publicaciones: PublicacionListItem[]
  facetas: Facetas
  paginacion: Paginacion
  cargando: boolean
  orden: OrdenCatalogo
  setOrden: (value: OrdenCatalogo) => void
  filtros: Filtros
  alternarFiltro: <K extends GrupoFiltro>(grupo: K, valor: string) => void
  setPrecioRango: (min: number | null, max: number | null) => void
  limpiarFiltros: () => void
  filtrosActivos: number
  onDetalle: (id: string) => void
  onPagina: (pagina: number) => void
}) {
  const [cajonAbierto, setCajonAbierto] = useState(false)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(true)

  useEffect(() => {
    try {
      setFiltrosAbiertos(window.localStorage.getItem(CLAVE_FILTROS) !== "ocultos")
    } catch {
      setFiltrosAbiertos(true)
    }
  }, [])

  const alternarFiltros = () => {
    setFiltrosAbiertos((abierto) => {
      const siguiente = !abierto
      try {
        window.localStorage.setItem(CLAVE_FILTROS, siguiente ? "abiertos" : "ocultos")
      } catch {
        // Si el navegador bloquea el almacenamiento, el pliegue igual dura la sesión.
      }
      return siguiente
    })
  }

  const indice = (idRaiz: string) => (
    <IndiceFiltros
      idRaiz={idRaiz}
      facetas={facetas}
      filtros={filtros}
      alternarFiltro={alternarFiltro}
      setPrecioRango={setPrecioRango}
      limpiarFiltros={limpiarFiltros}
      filtrosActivos={filtrosActivos}
    />
  )
  const resultados = paginacion.total

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-5 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="rotulo text-oro/80">Mangas · Cómics · Libros</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-balance md:text-5xl">
            Encuentra tu próxima historia.
          </h1>
          <p className="mt-3 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
            Cada ejemplar viene con un lector antes que tú. Este es el lugar para encontrar el
            siguiente.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-fit shrink-0 rounded-full lg:hidden"
          onClick={() => setCajonAbierto(true)}
        >
          <SlidersHorizontal data-icon="inline-start" /> Filtros
          {filtrosActivos > 0 && (
            <span className="ml-0.5 font-mono text-[10px] text-oro">{filtrosActivos}</span>
          )}
        </Button>
      </header>

      <div
        className={cn(
          "grid gap-x-12 gap-y-8",
          filtrosAbiertos ? "lg:grid-cols-[15rem_1fr]" : "lg:grid-cols-1",
        )}
      >
        {filtrosAbiertos && (
          <aside id="indice-filtros" className="hidden lg:block">
            <div className="scrollbar-fina sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pe-3 pb-8">
              {indice("indice")}
            </div>
          </aside>
        )}

        <section className="flex flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <span className="sr-only">{pluralEjemplares(resultados)}</span>
              <span aria-hidden className="text-pretty">
                {filtrosActivos > 0
                  ? "Filtrando el índice"
                  : "Todo el índice, a la espera de que elijas"}
              </span>
              {cargando && <span className="text-muted-foreground/70"> · actualizando</span>}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden h-9 rounded-full border-border/70 text-xs lg:inline-flex"
                aria-expanded={filtrosAbiertos}
                aria-controls="indice-filtros"
                onClick={alternarFiltros}
              >
                {filtrosAbiertos ? (
                  <PanelLeftClose data-icon="inline-start" />
                ) : (
                  <PanelLeftOpen data-icon="inline-start" />
                )}
                {filtrosAbiertos ? "Ocultar filtros" : "Mostrar filtros"}
              </Button>
              <span className="rotulo text-[9px]">Ordenar</span>
              <Select value={orden} onValueChange={(value) => setOrden(value as OrdenCatalogo)}>
                <SelectTrigger
                  className="h-9 w-[10.5rem] rounded-full border-border/70 text-xs"
                  aria-label="Ordenar resultados"
                >
                  <SelectValue>{ORDEN_LABELS[orden]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ORDENES_CATALOGO.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ORDEN_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {publicaciones.length > 0 ? (
            <div
              className={`grid auto-rows-fr grid-cols-2 gap-x-5 gap-y-9 md:gap-x-7 lg:grid-cols-3 2xl:grid-cols-4 ${cargando ? "opacity-60" : ""}`}
            >
              {publicaciones.map((publicacion) => (
                <ProductCard
                  key={publicacion.id}
                  publicacion={publicacion}
                  onDetalle={() => onDetalle(publicacion.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 border-t border-border/60 py-24 text-center">
              <Search className="size-8 text-muted-foreground/50" />
              <p className="font-serif text-2xl">No encontramos resultados</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Prueba con otra búsqueda o vuelve a abrir todo el índice.
              </p>
              {filtrosActivos > 0 && (
                <Button variant="outline" className="mt-2 rounded-full" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}

          {paginacion.paginas > 1 && (
            <nav
              aria-label="Paginación del catálogo"
              className="flex items-center justify-between gap-3 border-t border-border/60 pt-6"
            >
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                disabled={paginacion.pagina <= 1}
                onClick={() => onPagina(paginacion.pagina - 1)}
              >
                <ChevronLeft data-icon="inline-start" /> Anterior
              </Button>
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {String(paginacion.pagina).padStart(2, "0")} / {String(paginacion.paginas).padStart(2, "0")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full"
                disabled={paginacion.pagina >= paginacion.paginas}
                onClick={() => onPagina(paginacion.pagina + 1)}
              >
                Siguiente <ChevronRight data-icon="inline-end" />
              </Button>
            </nav>
          )}
        </section>
      </div>

      <Sheet open={cajonAbierto} onOpenChange={setCajonAbierto}>
          <SheetContent side="left" className="scrollbar-fina w-[19rem] overflow-y-auto px-6">
          <SheetHeader>
            <SheetTitle>Índice del catálogo</SheetTitle>
            <SheetDescription>Ajusta la búsqueda sin perder de vista los ejemplares.</SheetDescription>
          </SheetHeader>
          {indice("cajon")}
          <Button
            className="mt-8 w-full rounded-full"
            onClick={() => setCajonAbierto(false)}
          >
            Ver resultados
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  )
}
