"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  PackageSearch,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { StockMovementDialog } from "@/components/panel/stock-movement-dialog"
import { avisar } from "@/components/notificacion/avisar"
import { Aviso } from "@/components/notificacion/avisos"
import { ConfirmarAccion } from "@/components/notificacion/confirmar-accion"
import { mensajeDeFallo } from "@/lib/avisos"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CATEGORIAS, type Categoria, type EstadoPublicacion } from "@/lib/catalog"
import { ESTADO_PUBLICACION_LABEL, formatCLP, formatDate } from "@/lib/format"
import { panelEnviar, usePanelQuery } from "@/lib/panel-client"
import { cn } from "@/lib/utils"

type PublicacionPanel = {
  id: string
  titulo: string
  autor: string
  editorial: string
  volumen: number | null
  categoria: Categoria
  condicion: string
precio: number
  stock: number
  isbn: string | null
  estado: EstadoPublicacion
  fechaPublicacion: string
  vendedorId: string
  vendedorNombre: string
  vendedorComuna: string | null
  unidadesVendidas: number
  ventas: number
  ordenesActivas: number
}

type Respuesta = {
  publicaciones: PublicacionPanel[]
  vendedores: { id: string; nombre: string }[]
  resumen: Record<string, { total: number; unidades: number }>
  paginacion: { pagina: number; porPagina: number; total: number; paginas: number }
}

const ESTADOS: { value: string; label: string }[] = [
  { value: "todas", label: "Todos los estados" },
  { value: "activa", label: "Activas" },
  { value: "pausada", label: "Pausadas" },
  { value: "agotada", label: "Agotadas" },
]

const ESTADO_BADGE: Record<EstadoPublicacion, string> = {
  activa: "border-aviso-ok/35 bg-aviso-ok-tenue text-foreground",
  pausada: "border-aviso-revisar/30 bg-aviso-revisar-tenue text-foreground",
  agotada: "border-border bg-muted text-muted-foreground",
}

export function ProductsView({ esAdmin }: { esAdmin: boolean }) {
  const [busqueda, setBusqueda] = useState("")
  const [q, setQ] = useState("")
  const [estado, setEstado] = useState("todas")
  const [categoria, setCategoria] = useState("todas")
  const [vendedorId, setVendedorId] = useState("todos")
  const [orden, setOrden] = useState("recientes")
  const [pagina, setPagina] = useState(1)
  const [movimiento, setMovimiento] = useState<PublicacionPanel | null>(null)
  const [porEliminar, setPorEliminar] = useState<PublicacionPanel | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(busqueda)
      setPagina(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [busqueda])

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    params.set("estado", estado)
    params.set("categoria", categoria)
    params.set("orden", orden)
    params.set("porPagina", "20")
    params.set("pagina", String(pagina))
    if (vendedorId !== "todos") params.set("vendedorId", vendedorId)
    return `/api/panel/publicaciones?${params.toString()}`
  }, [q, estado, categoria, orden, pagina, vendedorId])

  const { data, cargando, error, recargar } = usePanelQuery<Respuesta>(url)

  const alternarEstado = async (publicacion: PublicacionPanel) => {
    const siguiente = publicacion.estado === "pausada" ? "activa" : "pausada"
    setOcupado(publicacion.id)
    try {
      await panelEnviar(`/api/publications/${publicacion.id}`, "PATCH", { estado: siguiente })
      avisar.ok({
        titulo: siguiente === "pausada" ? "Publicación pausada" : "Publicación reactivada",
        descripcion:
          siguiente === "pausada"
            ? "Dejó de aparecer en el catálogo. El enlace sigue funcionando."
            : "Volvió al catálogo con el stock que tiene ahora.",
        referencia: publicacion.titulo,
      })
      recargar()
    } catch (fallo) {
      avisar.falla({
        titulo: "No se pudo actualizar la publicación",
        descripcion: mensajeDeFallo(fallo, "El estado sigue igual."),
        referencia: publicacion.titulo,
      })
    } finally {
      setOcupado(null)
    }
  }

  const eliminar = async () => {
    if (!porEliminar) return
    setOcupado(porEliminar.id)
    try {
      await panelEnviar(`/api/publications/${porEliminar.id}`, "DELETE")
      avisar.ok({
        titulo: "Publicación eliminada",
        descripcion: "El ejemplar salió del catálogo.",
        referencia: porEliminar.titulo,
      })
      setPorEliminar(null)
      recargar()
    } catch (fallo) {
      avisar.falla({
        titulo: "No se pudo eliminar la publicación",
        descripcion: mensajeDeFallo(fallo, "Si tiene reservas activas, ciérralas primero."),
        referencia: porEliminar.titulo,
        duracion: 8000,
      })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Publicaciones</h1>
          <p className="text-sm text-muted-foreground">Moderación del catálogo, stock y estado de los exemplares</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent" onClick={recargar} disabled={cargando}>
          <RefreshCw className={cn("h-4 w-4", cargando && "animate-spin")} />
          Actualizar
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </CardTitle>
          <CardDescription>Busca por título, autor, editorial o ISBN</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar publicación…"
              aria-label="Buscar publicación por título, autor, editorial o ISBN"
              className="pl-9"
            />
          </div>
          <Select value={orden} onValueChange={setOrden}>
            <SelectTrigger aria-label="Ordenar publicaciones">
              <SelectValue placeholder="Orden" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recientes">Más recientes</SelectItem>
              <SelectItem value="titulo">Título (A-Z)</SelectItem>
              <SelectItem value="stock">Menor stock</SelectItem>
              <SelectItem value="precio_desc">Mayor precio</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={estado}
            onValueChange={(valor) => {
              setEstado(valor)
              setPagina(1)
            }}
          >
            <SelectTrigger aria-label="Filtrar por estado de publicación">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={categoria}
            onValueChange={(valor) => {
              setCategoria(valor)
              setPagina(1)
            }}
          >
            <SelectTrigger aria-label="Filtrar por categoría">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {CATEGORIAS.map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {valor}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={vendedorId}
            onValueChange={(valor) => {
              setVendedorId(valor)
              setPagina(1)
            }}
          >
            <SelectTrigger aria-label="Filtrar por vendedor">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los vendedores</SelectItem>
              {(data?.vendedores ?? []).map((vendedor) => (
                <SelectItem key={vendedor.id} value={vendedor.id}>
                  {vendedor.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-3 sm:grid-cols-3">
          {(["activa", "pausada", "agotada"] as EstadoPublicacion[]).map((valor) => (
            <Card key={valor}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm text-muted-foreground">{ESTADO_PUBLICACION_LABEL[valor]}</p>
                  <p className="text-xl font-semibold">{data.resumen[valor]?.total ?? 0}</p>
                </div>
                <p className="font-mono text-sm text-muted-foreground">
                  {data.resumen[valor]?.unidades ?? 0} uds.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo moderado</CardTitle>
          <CardDescription>
            {data ? `${data.paginacion.total} publicaciones encontradas` : "Cargando publicaciones…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Aviso
              tono="falla"
              titulo="No se pudo cargar el listado"
              rotulo="Sin datos"
              className="py-6"
            >
              {error} Vuelve a intentarlo o recarga la página.
            </Aviso>
          ) : null}
          {cargando && !data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, indice) => (
                <Skeleton key={indice} className="h-12 w-full" />
              ))}
            </div>
          ) : null}
          {data && data.publicaciones.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <PackageSearch className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No hay publicaciones con estos filtros</p>
            </div>
          ) : null}
          {data && data.publicaciones.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Publicación</TableHead>
                    <TableHead scope="col">Vendedor</TableHead>
                    <TableHead scope="col" className="text-right">Precio</TableHead>
                    <TableHead scope="col" className="text-right">Stock</TableHead>
                    <TableHead scope="col" className="text-right">Vendidas</TableHead>
                    <TableHead scope="col">Estado</TableHead>
                    <TableHead scope="col" className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.publicaciones.map((publicacion) => (
                    <TableRow key={publicacion.id}>
                      <TableCell>
                        <div className="font-medium">{publicacion.titulo}</div>
                        <div className="text-xs text-muted-foreground">
                          {publicacion.autor}
                          {publicacion.isbn ? ` · ISBN ${publicacion.isbn}` : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(publicacion.fechaPublicacion)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{publicacion.vendedorNombre}</div>
                        {publicacion.vendedorComuna && (
                          <div className="text-xs text-muted-foreground">{publicacion.vendedorComuna}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCLP(publicacion.precio)}</TableCell>
<TableCell className="text-right font-mono">{publicacion.stock}</TableCell>
                      <TableCell className="text-right font-mono">
                        {publicacion.unidadesVendidas}
                        {publicacion.ordenesActivas > 0 && (
                          <div className="text-xs text-aviso-revisar">{publicacion.ordenesActivas} activas</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            ESTADO_BADGE[publicacion.estado],
                          )}
                        >
                          {ESTADO_PUBLICACION_LABEL[publicacion.estado]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setMovimiento(publicacion)}
                            disabled={ocupado === publicacion.id}
                          >
                            Stock
                          </Button>
                          {esAdmin && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void alternarEstado(publicacion)}
                                disabled={ocupado === publicacion.id || publicacion.estado === "agotada"}
                              >
                                {publicacion.estado === "pausada" ? "Reactivar" : "Pausar"}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Eliminar ${publicacion.titulo}`}
                                onClick={() => setPorEliminar(publicacion)}
                                disabled={ocupado === publicacion.id}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.paginacion.paginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.paginacion.pagina} de {data.paginacion.paginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
              disabled={data.paginacion.pagina <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((valor) => Math.min(data.paginacion.paginas, valor + 1))}
              disabled={data.paginacion.pagina >= data.paginacion.paginas}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <StockMovementDialog
        publicacion={movimiento}
        onCerrar={() => setMovimiento(null)}
        onGuardado={() => {
          setMovimiento(null)
          recargar()
        }}
      />


      <ConfirmarAccion
        abierto={Boolean(porEliminar)}
        tono="falla"
        titulo="¿Eliminar esta publicación?"
        descripcion={`«${porEliminar?.titulo}» sale del catálogo junto con su historial de stock. Las órdenes ya cerradas se conservan. Esta acción no se puede deshacer.`}
        confirmTexto="Eliminar"
        cargando={Boolean(porEliminar) && ocupado === porEliminar?.id}
        onConfirmar={() => void eliminar()}
        onCerrar={() => setPorEliminar(null)}
      />

      {data && data.publicaciones.some((publicacion) => publicacion.estado === "agotada") && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          Las publicaciones agotadas se activan solas cuando ingresas ejemplares.
        </p>
      )}
    </main>
  )
}
