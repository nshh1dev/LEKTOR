"use client"

import { useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ClipboardList,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { avisar } from "@/components/notificacion/avisar"
import { mensajeDeFallo } from "@/lib/avisos"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StockMovementDialog, type PublicacionMovible } from "@/components/panel/stock-movement-dialog"
import type { EstadoOrden, MetodoEntrega } from "@/lib/catalog"
import {
  ESTADO_ORDEN_BADGE,
  ESTADO_ORDEN_LABEL,
  formatCLP,
  formatDateTime,
  METODO_ENTREGA_LABEL,
  ordenCode,
  tiempoRestante,
} from "@/lib/format"
import { panelEnviar, usePanelQuery } from "@/lib/panel-client"

type OrdenBodega = {
  id: string
  publicacionId: string | null
  tituloSnapshot: string
  cantidad: number
  total: number
  estado: EstadoOrden
  reservaExpiraEn: string | null
  fechaCreacion: string
  datosDespacho: { metodoEntrega: MetodoEntrega } | null
  comprador: { id: string; nombre: string; telefono: string | null; comuna: string | null }
  vendedor: { id: string; nombre: string; telefono: string | null; comuna: string | null }
}

type RespuestaOrdenes = {
  ordenes: OrdenBodega[]
  estados: Record<string, number>
  paginacion: { pagina: number; porPagina: number; total: number; paginas: number }
}

type PublicacionBodega = {
  id: string
  titulo: string
  stock: number
  stockMinimo: number
  estado: "activa" | "pausada" | "agotada"
  vendedorNombre: string
}

type RespuestaPublicaciones = { publicaciones: PublicacionBodega[] }

const PESTANAS: { valor: string; etiqueta: string }[] = [
  { valor: "reservada", etiqueta: "Por preparar" },
  { valor: "en_preparacion", etiqueta: "En preparación" },
  { valor: "despachada", etiqueta: "Despachadas" },
  { valor: "todas", etiqueta: "Todas" },
]

export function WorkerView() {
  const [pestana, setPestana] = useState("reservada")
  const [busqueda, setBusqueda] = useState("")
  const [consulta, setConsulta] = useState("")
  const [procesando, setProcesando] = useState<string | null>(null)
  const [movimiento, setMovimiento] = useState<PublicacionMovible | null>(null)

  const url = `/api/panel/ordenes?estado=${pestana}&porPagina=25${
    consulta ? `&q=${encodeURIComponent(consulta)}` : ""
  }`
  const { data, cargando, error, recargar } = usePanelQuery<RespuestaOrdenes>(url)
  const criticos = usePanelQuery<RespuestaPublicaciones>(
    "/api/panel/publicaciones?orden=stock&porPagina=8&estado=todas&bajoMinimo=true",
  )

  const transicionar = async (orden: OrdenBodega, estado: EstadoOrden) => {
    setProcesando(orden.id)
    const codigo = ordenCode(orden.id)
    try {
      await panelEnviar(`/api/orders/${orden.id}`, "PATCH", { estado })
      avisar.ok({
        titulo: "Orden actualizada",
        descripcion: `${codigo} pasó a ${ESTADO_ORDEN_LABEL[estado].toLowerCase()}.`,
        referencia: orden.tituloSnapshot,
      })
      recargar()
    } catch (fallo) {
      avisar.falla({
        titulo: "No se pudo actualizar la orden",
        descripcion: mensajeDeFallo(fallo, "La orden sigue en el estado anterior."),
        referencia: codigo,
      })
    } finally {
      setProcesando(null)
    }
  }

  // El servidor ya filtra por bajoMinimo (stock > 0 y <= stockMinimo), así que la
  // paginación ya no se come con las publicaciones agotadas.
  const criticosBajo = criticos.data?.publicaciones ?? []

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Bodega</h1>
        <p className="text-sm text-muted-foreground">
          Prepara y despacha las órdenes reservadas, y controla el stock de los ejemplares
        </p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Input
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") setConsulta(busqueda.trim())
            }}
            placeholder="Buscar por título, comprador, vendedor u orden"
            aria-label="Buscar órdenes por título, comprador, vendedor u orden"
            className="md:w-80"
          />
          <Button
            variant="outline"
            onClick={() => setConsulta(busqueda.trim())}
            disabled={busqueda.trim() === consulta}
          >
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/escaner">Escanear ISBN</Link>
          </Button>
          <Button variant="outline" onClick={recargar}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs value={pestana} onValueChange={setPestana}>
        <TabsList>
          {PESTANAS.map((item) => (
            <TabsTrigger key={item.valor} value={item.valor}>
              {item.etiqueta}
              {data?.estados[item.valor] ? (
                <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                  {data.estados[item.valor]}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        {PESTANAS.map((item) => (
          <TabsContent key={item.valor} value={item.valor} className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {item.etiqueta}
                </CardTitle>
                <CardDescription>
                  {cargando
                    ? "Cargando órdenes…"
                    : `${data?.paginacion.total ?? 0} orden(es) en esta bandeja`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {cargando ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (data?.ordenes.length ?? 0) === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No hay órdenes en esta bandeja por ahora.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">Orden</TableHead>
                          <TableHead scope="col">Ejemplar</TableHead>
                          <TableHead scope="col">Comprador</TableHead>
                          <TableHead scope="col">Vendedor</TableHead>
                          <TableHead scope="col" className="text-right">Total</TableHead>
                          <TableHead scope="col">Entrega</TableHead>
                          <TableHead scope="col">Estado</TableHead>
                          <TableHead scope="col" className="text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data?.ordenes.map((orden) => (
                          <TableRow key={orden.id}>
                            <TableCell>
                              <div className="font-mono text-xs">{ordenCode(orden.id)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatDateTime(orden.fechaCreacion)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{orden.tituloSnapshot}</div>
                              <div className="text-xs text-muted-foreground">
                                {orden.cantidad} unidad(es)
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>{orden.comprador.nombre}</div>
                              <div className="text-xs text-muted-foreground">
                                {orden.comprador.comuna ?? "Sin comuna"}
                                {orden.comprador.telefono ? ` · ${orden.comprador.telefono}` : ""}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{orden.vendedor.nombre}</TableCell>
                            <TableCell className="text-right font-mono">{formatCLP(orden.total)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {orden.datosDespacho
                                ? (METODO_ENTREGA_LABEL[orden.datosDespacho.metodoEntrega] ??
                                  orden.datosDespacho.metodoEntrega)
                                : "Sin método"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={ESTADO_ORDEN_BADGE[orden.estado] as "default" | "secondary"}>
                                {ESTADO_ORDEN_LABEL[orden.estado]}
                              </Badge>
                              {orden.estado === "reservada" && orden.reservaExpiraEn && (
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {tiempoRestante(orden.reservaExpiraEn)}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {orden.estado === "reservada" && (
                                <Button
                                  size="sm"
                                  disabled={procesando === orden.id}
                                  onClick={() => void transicionar(orden, "en_preparacion")}
                                >
                                  {procesando === orden.id ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <PackageCheck className="mr-2 h-4 w-4" />
                                  )}
                                  Preparar
                                </Button>
                              )}
                              {orden.estado === "en_preparacion" && (
                                <Button
                                  size="sm"
                                  disabled={procesando === orden.id}
                                  onClick={() => void transicionar(orden, "despachada")}
                                >
                                  {procesando === orden.id ? (
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Truck className="mr-2 h-4 w-4" />
                                  )}
                                  Despachar
                                </Button>
                              )}
                              {(orden.estado === "despachada" || orden.estado === "recibida") && (
                                <span className="text-xs text-muted-foreground">
                                  {orden.estado === "despachada" ? "Esperando al comprador" : "Cerrada"}
                                </span>
                              )}
                              {orden.estado === "cancelada" && (
                                <span className="text-xs text-muted-foreground">Cancelada</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Stock crítico
          </CardTitle>
          <CardDescription>
            Ejemplares en o por debajo del mínimo configurado por el vendedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {criticos.cargando ? (
            <Skeleton className="h-20 w-full" />
          ) : criticosBajo.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ninguna publicación está bajo su mínimo de stock.
            </p>
          ) : (
            <ul className="space-y-2">
              {criticosBajo.map((publicacion) => (
                <li
                  key={publicacion.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-medium">{publicacion.titulo}</div>
                    <div className="text-xs text-muted-foreground">
                      {publicacion.vendedorNombre} · stock {publicacion.stock} / mín{" "}
                      {publicacion.stockMinimo}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setMovimiento({
                        id: publicacion.id,
                        titulo: publicacion.titulo,
                        stock: publicacion.stock,
                      })
                    }
                  >
                    Registrar movimiento
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <StockMovementDialog
        publicacion={movimiento}
        onCerrar={() => setMovimiento(null)}
        onGuardado={() => {
          setMovimiento(null)
          criticos.recargar()
        }}
      />
    </main>
  )
}
