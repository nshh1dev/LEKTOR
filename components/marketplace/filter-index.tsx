"use client"

import { useState } from "react"
import { Heart, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type Categoria,
  type Condicion,
  type Facetas,
} from "@/lib/catalog"
import { pluralEjemplares } from "@/components/marketplace/shared"

type Filtros = {
  categoria: Categoria[]
  editorial: string[]
  condicion: Condicion[]
  comuna: string[]
  disponible: boolean
}

type FacetasIndice = Pick<Facetas, "totalActivos" | "categorias" | "condiciones" | "editoriales" | "comunas">

export function IndiceFiltros({
  facetas,
  filtros,
  alternarFiltro,
  setDisponible,
  limpiarFiltros,
  filtrosActivos,
  soloFavoritos,
  setSoloFavoritos,
  favoritos,
  idRaiz,
}: {
  facetas: FacetasIndice
  filtros: Filtros
  alternarFiltro: <K extends "categoria" | "editorial" | "condicion" | "comuna">(
    grupo: K,
    valor: string,
  ) => void
  setDisponible: (value: boolean) => void
  limpiarFiltros: () => void
  filtrosActivos: number
  soloFavoritos: boolean
  setSoloFavoritos: (value: boolean) => void
  favoritos: string[]
  idRaiz: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="rotulo">Catálogo</p>
        <p className="mt-2.5 font-serif text-2xl leading-tight">
          {pluralEjemplares(facetas.totalActivos)}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          disponibles para explorar, de lectores que ya cuidaron su estantería.
        </p>
        {filtrosActivos > 0 && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="mt-4 flex cursor-pointer items-center gap-1.5 text-xs text-oro transition-colors hover:text-oro/75"
          >
            <RotateCcw className="size-3" /> Limpiar filtros
          </button>
        )}
      </div>

      <Bloque idRaiz={idRaiz} titulo="Mi selección">
        <FilaAlternador
          activo={soloFavoritos}
          onToggle={() => setSoloFavoritos(!soloFavoritos)}
          etiqueta="Solo favoritos"
          conteo={favoritos.length}
          icono={<Heart className="size-3.5" />}
        />
      </Bloque>

      <Bloque idRaiz={idRaiz} titulo="Tipo de lectura">
        {facetas.categorias.map((item) => (
          <FilaFiltro
            key={item.value}
            activo={filtros.categoria.includes(item.value)}
            onClick={() => alternarFiltro("categoria", item.value)}
            etiqueta={item.value}
            total={item.total}
          />
        ))}
      </Bloque>

      <Bloque idRaiz={idRaiz} titulo="Estado del ejemplar">
        {facetas.condiciones.map((item) => (
          <FilaFiltro
            key={item.value}
            activo={filtros.condicion.includes(item.value)}
            onClick={() => alternarFiltro("condicion", item.value)}
            etiqueta={item.value}
            total={item.total}
          />
        ))}
        <FilaAlternador
          activo={filtros.disponible}
          onToggle={() => setDisponible(!filtros.disponible)}
          etiqueta="Solo con stock"
        />
      </Bloque>

      <Bloque idRaiz={idRaiz} titulo="Editoriales">
        <ListaFiltros
          items={facetas.editoriales}
          activo={(value) => filtros.editorial.includes(value)}
          onAlternar={(value) => alternarFiltro("editorial", value)}
        />
      </Bloque>

      <Bloque idRaiz={idRaiz} titulo="Ubicación">
        {facetas.comunas.length > 0 ? (
          <ListaFiltros
            items={facetas.comunas}
            activo={(value) => filtros.comuna.includes(value)}
            onAlternar={(value) => alternarFiltro("comuna", value)}
          />
        ) : (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Aún no hay ejemplares publicados con ubicación.
          </p>
        )}
      </Bloque>
    </div>
  )
}

const FILAS_INDICE = 5

function ListaFiltros({
  items,
  activo,
  onAlternar,
}: {
  items: { value: string; total: number }[]
  activo: (value: string) => boolean
  onAlternar: (value: string) => void
}) {
  const [expandida, setExpandida] = useState(false)
  const seleccionados = items.filter((item) => activo(item.value))
  const pendientes = items.filter((item) => !activo(item.value))
  const visibles = expandida
    ? items
    : [...seleccionados, ...pendientes].slice(0, FILAS_INDICE)
  const ocultas = Math.max(
    0,
    pendientes.length - Math.max(0, FILAS_INDICE - seleccionados.length),
  )
  const activasOcultas = Math.max(0, seleccionados.length - FILAS_INDICE)
  const plegable = items.length > FILAS_INDICE

  return (
    <>
      {visibles.map((item) => (
        <FilaFiltro
          key={item.value}
          activo={activo(item.value)}
          onClick={() => onAlternar(item.value)}
          etiqueta={item.value}
          total={item.total}
        />
      ))}
      {expandida && plegable && (
        <button
          type="button"
          onClick={() => setExpandida(false)}
          className="mt-1 w-fit cursor-pointer text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Ver menos
        </button>
      )}
      {!expandida && ocultas > 0 && (
        <button
          type="button"
          onClick={() => setExpandida(true)}
          className={cn(
            "mt-1 w-fit cursor-pointer text-[11px] transition-colors",
            activasOcultas > 0
              ? "font-medium text-oro hover:text-oro/75"
              : "text-oro/80 hover:text-oro",
          )}
        >
          + {ocultas} más
          {activasOcultas > 0 && (
            <span className="text-oro">
              {" "}
              · {activasOcultas} {activasOcultas === 1 ? "activa" : "activas"}
            </span>
          )}
        </button>
      )}
    </>
  )
}

function slug(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function Bloque({
  idRaiz,
  titulo,
  children,
}: {
  idRaiz: string
  titulo: string
  children: React.ReactNode
}) {
  const id = `${idRaiz}-${slug(titulo)}`
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5">
      <h3 id={id} className="rotulo mb-1.5">
        {titulo}
      </h3>
      <div className="filete mb-2" />
      {children}
    </section>
  )
}

function FilaFiltro({
  activo,
  onClick,
  etiqueta,
  total,
}: {
  activo: boolean
  onClick: () => void
  etiqueta: string
  total: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        "group flex w-full cursor-pointer items-baseline gap-2 rounded-md py-1.5 pr-1 text-left text-sm",
        "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro",
        activo ? "text-oro" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "w-3 shrink-0 translate-y-[-1px] text-[0.7rem] transition-opacity duration-150",
          activo ? "opacity-100" : "opacity-0 group-hover:opacity-40",
        )}
      >
        —
      </span>
      <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
      <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-55">{total}</span>
    </button>
  )
}

function FilaAlternador({
  activo,
  onToggle,
  etiqueta,
  conteo,
  icono,
}: {
  activo: boolean
  onToggle: () => void
  etiqueta: string
  conteo?: number
  icono?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={activo}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-2 rounded-md py-1.5 pr-1 text-left text-sm",
        "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro",
        activo ? "text-oro" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          activo ? "border-oro bg-oro" : "border-muted-foreground/40 group-hover:border-foreground/50",
        )}
      >
        {activo && <span className="size-1.5 rounded-full bg-background" />}
      </span>
      <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
      {icono && <span className={cn("shrink-0", activo ? "text-oro" : "text-muted-foreground/50")}>{icono}</span>}
      {conteo !== undefined && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums opacity-55">{conteo}</span>
      )}
    </button>
  )
}
