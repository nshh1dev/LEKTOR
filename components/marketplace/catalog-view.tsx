"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, LoaderCircle, PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ORDENES_CATALOGO, type Categoria, type Condicion, type Facetas, type Paginacion, type PublicacionListItem } from "@/lib/catalog"
import { ORDEN_LABELS, pluralEjemplares } from "@/components/marketplace/shared"
import { cn } from "@/lib/utils"
import { formatCLP } from "@/lib/format"
import { type OrdenCatalogo } from "@/components/marketplace/types"
import { ProductCard } from "@/components/marketplace/product-card"
import { IndiceFiltros } from "@/components/marketplace/filter-index"

/** Recuerda si la columna de filtros quedó plegada, como la preferencia de tema. */
const CLAVE_FILTROS = "lektor:filtros"

type Filtros = {
  categoria: Categoria[]
  condicion: Condicion[]
  comuna: string[]
  autor: string | null
  editorial: string | null
  precioMin: number | null
  precioMax: number | null
}

type GrupoFiltro = "categoria" | "condicion" | "comuna"

export function CatalogView({
  publicaciones,
  facetas,
  paginacion,
  cargando,
  errorCarga,
  onReintentar,
  orden,
  setOrden,
  filtros,
  alternarFiltro,
  elegirFiltro,
  setPrecioRango,
  limpiarFiltros,
  filtrosActivos,
  onDetalle,
  onVendedor,
  onPagina,
}: {
  publicaciones: PublicacionListItem[]
  facetas: Facetas
  paginacion: Paginacion
  cargando: boolean
  errorCarga: boolean
  onReintentar: () => void
  orden: OrdenCatalogo
  setOrden: (value: OrdenCatalogo) => void
  filtros: Filtros
  alternarFiltro: <K extends GrupoFiltro>(grupo: K, valor: string) => void
  elegirFiltro: (grupo: "autor" | "editorial", valor: string) => void
  setPrecioRango: (min: number | null, max: number | null) => void
  limpiarFiltros: () => void
  filtrosActivos: number
  onDetalle: (id: string) => void
  onVendedor: (vendedorId: string) => void
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
      elegirFiltro={elegirFiltro}
      setPrecioRango={setPrecioRango}
    />
  )
  const resultados = paginacion.total
  const etiquetas: { clave: string; texto: string; quitar: () => void }[] = []
  for (const grupo of ["categoria", "condicion", "comuna"] as const) {
    for (const valor of filtros[grupo]) {
      etiquetas.push({
        clave: `${grupo}:${valor}`,
        texto: `${grupo === "categoria" ? "Tipo" : grupo === "condicion" ? "Estado" : "Comuna"}: ${valor}`,
        quitar: () => alternarFiltro(grupo, valor),
      })
    }
  }
  for (const grupo of ["autor", "editorial"] as const) {
    const valor = filtros[grupo]
    if (valor) {
      etiquetas.push({
        clave: grupo,
        texto: `${grupo === "autor" ? "Autoría" : "Editorial"}: ${valor}`,
        quitar: () => elegirFiltro(grupo, valor),
      })
    }
  }
  if (filtros.precioMin !== null || filtros.precioMax !== null) {
    const texto = filtros.precioMin !== null && filtros.precioMax !== null
      ? `${formatCLP(filtros.precioMin)} a ${formatCLP(filtros.precioMax)}`
      : filtros.precioMin !== null
        ? `Desde ${formatCLP(filtros.precioMin)}`
        : `Hasta ${formatCLP(filtros.precioMax ?? 0)}`
    etiquetas.push({ clave: "precio", texto: `Precio: ${texto}`, quitar: () => setPrecioRango(null, null) })
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <header className="border-b border-border/60 pb-5 md:pb-8">
        <div className="max-w-2xl">
          <p className="rotulo text-acento/80">Mangas · Cómics · Libros</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-[1.05] tracking-tight text-balance md:mt-3 md:text-5xl">
            Encuentra tu próxima historia.
          </h1>
          <p className="mt-3 max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
            Cada ejemplar viene con un lector antes que tú. Este es el lugar para encontrar el
            siguiente.
          </p>
        </div>
      </header>

      <div
        className={cn(
          "grid gap-x-12 gap-y-8",
          filtrosAbiertos ? "lg:grid-cols-[15rem_1fr]" : "lg:grid-cols-1",
        )}
      >
        {filtrosAbiertos && (
          <aside id="indice-filtros" className="hidden lg:block">
            <div className="sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col">
              <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
                <span className="rotulo">Filtros</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 cursor-pointer rounded-full px-2 text-xs text-muted-foreground"
                  aria-expanded={filtrosAbiertos}
                  aria-controls="indice-filtros"
                  onClick={alternarFiltros}
                >
                  <PanelLeftClose data-icon="inline-start" /> Plegar
                </Button>
              </div>
              <div className="scrollbar-fina min-h-0 overflow-y-auto pe-3 pb-8">
              {indice("indice")}
              </div>
            </div>
          </aside>
        )}

        <section aria-label="Resultados del catálogo" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex flex-col items-start gap-2">
                {!filtrosAbiertos && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden h-8 w-fit cursor-pointer justify-start rounded-md px-0 text-xs text-muted-foreground hover:bg-transparent has-[>svg]:px-0 lg:inline-flex"
                    aria-label="Mostrar filtros"
                    title="Mostrar filtros"
                    aria-expanded={false}
                    aria-controls="indice-filtros"
                    onClick={alternarFiltros}
                  >
                    <PanelLeftOpen data-icon="inline-start" /> Mostrar
                  </Button>
                )}
                <p role="status" className="text-sm">
                  {errorCarga ? "Resultados no disponibles" : cargando ? "Buscando ejemplares…" : (
                    <>
                      <span className="font-semibold tabular-nums">{pluralEjemplares(resultados)}</span>
                      <span className="text-muted-foreground">{filtrosActivos > 0 ? " con tus filtros" : " en el catálogo"}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  className="min-h-10 cursor-pointer rounded-full lg:hidden"
                  onClick={() => setCajonAbierto(true)}
                >
                  <SlidersHorizontal data-icon="inline-start" /> Filtros
                  {filtrosActivos > 0 && <span>({filtrosActivos})</span>}
                </Button>
                <label htmlFor="orden-catalogo" className="hidden text-sm text-muted-foreground sm:block">Ordenar</label>
                <Select value={orden} onValueChange={(value) => setOrden(value as OrdenCatalogo)}>
                  <SelectTrigger
                    id="orden-catalogo"
                    className="min-h-10 w-[11rem] cursor-pointer rounded-full"
                    aria-label="Ordenar resultados"
                  >
                    <SelectValue>{ORDEN_LABELS[orden]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ORDENES_CATALOGO.map((value) => (
                        <SelectItem key={value} value={value}>
                          {ORDEN_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {etiquetas.length > 0 && (
              <div aria-label="Filtros activos" className="flex flex-wrap items-center gap-2">
                {etiquetas.map((etiqueta) => (
                  <Button
                    key={etiqueta.clave}
                    variant="secondary"
                    size="sm"
                    className="h-auto min-h-9 max-w-full cursor-pointer rounded-full py-2"
                    aria-label={`Quitar filtro ${etiqueta.texto}`}
                    onClick={etiqueta.quitar}
                  >
                    <span className="min-w-0 whitespace-normal break-words text-left">{etiqueta.texto}</span>
                    <X data-icon="inline-end" />
                  </Button>
                ))}
                <Button variant="ghost" size="sm" className="min-h-9 cursor-pointer rounded-full" onClick={limpiarFiltros}>
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>

          {errorCarga ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center" role="alert">
              <p className="font-serif text-2xl">No pudimos actualizar el catálogo</p>
              <p className="text-sm text-muted-foreground">Comprueba tu conexión e inténtalo otra vez.</p>
              <Button variant="outline" onClick={onReintentar}>Reintentar</Button>
            </div>
          ) : cargando && publicaciones.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center" role="status">
              <LoaderCircle className="size-6 animate-spin text-acento" />
              <p className="text-sm text-muted-foreground">Buscando ejemplares…</p>
            </div>
          ) : publicaciones.length > 0 ? (
            <div
              className={`grid auto-rows-fr grid-cols-2 gap-x-5 gap-y-9 md:gap-x-7 lg:grid-cols-3 2xl:grid-cols-4 ${cargando ? "opacity-60" : ""}`}
            >
              {publicaciones.map((publicacion) => (
                <ProductCard
                  key={publicacion.id}
                  publicacion={publicacion}
                  onDetalle={() => onDetalle(publicacion.id)}
                  onVendedor={onVendedor}
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
                disabled={cargando || paginacion.pagina <= 1}
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
                disabled={cargando || paginacion.pagina >= paginacion.paginas}
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
