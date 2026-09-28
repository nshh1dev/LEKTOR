"use client"

import { useState } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Package,
  PackageMinus,
  PackagePlus,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Aviso } from "@/components/notificacion/avisos"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ESTADO_ORDEN_BADGE, ESTADO_ORDEN_LABEL, ESTADO_PUBLICACION_LABEL, formatCLP, formatDateTime } from "@/lib/format"
import { type EstadoOrden, type EstadoPublicacion } from "@/lib/catalog"
import { usePanelQuery } from "@/lib/panel-client"
import { cn } from "@/lib/utils"

type PanelResumen = {
  kpis: {
    publicaciones: number
    unidades: number
    bajoMinimo: number
    agotadas: number
    ordenes: number
    ordenesHoy: number
    recibidas: number
    ventasMes: number
    ventasMesPrevio: number
    tendencia: number | null
    ventasTotal: number
    usuarios: number
    usuariosActivos: number
    usuariosNuevos: number
    reservasPorVencer: number
  }
  publicacionesPorEstado: Record<string, number>
  ordenesPorEstado: Record<string, number>
  ordenesRecientes: {
    id: string
    tituloSnapshot: string
    total: number
    estado: EstadoOrden
    fechaCreacion: string
    comprador: string
    vendedor: string
  }[]
  topPublicaciones: { publicacionId: string | null; titulo: string; unidades: number; ventas: number; stock: number }[]
  topVendedores: { id: string; nombre: string; publicaciones: number; ventas: number }[]
  movimientos: {
    id: string
    tipo: "entrada" | "salida" | "ajuste"
    cantidad: number
    motivo: string | null
    fechaCreacion: string
    titulo: string
    usuario: string
  }[]
  alertasStock: {
    id: string
    titulo: string
    stock: number
    stockMinimo: number
    estado: EstadoPublicacion
    vendedor: string
  }[]
  reservaHoras: number
}

export function DashboardView() {
  const { data, cargando, error, recargar } = usePanelQuery<PanelResumen>("/api/panel/dashboard")
  const [tab, setTab] = useState("resumen")

  const kpis = data?.kpis

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Estado del marketplace y operaciones del día</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent" onClick={recargar} disabled={cargando}>
          <RefreshCw className={cn("h-4 w-4", cargando && "animate-spin")} />
          Actualizar
        </Button>
      </header>

      {error ? (
        <Aviso tono="falla" titulo="No pudimos cargar el resumen">
          {error}
        </Aviso>
      ) : null}

      {cargando && !data ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {kpis && kpis.reservasPorVencer > 0 && (
        <Aviso tono="revisar" titulo="Reservas por vencer">
          {kpis.reservasPorVencer} reserva{kpis.reservasPorVencer > 1 ? "s" : ""} vence
          {kpis.reservasPorVencer > 1 ? "n" : ""} dentro de 6 horas. La reserva dura {data?.reservaHoras} horas
          desde su creación.
        </Aviso>
      )}

      {kpis && kpis.bajoMinimo + kpis.agotadas > 0 && (
        <Aviso tono="falla" titulo="Stock crítico">
          {kpis.agotadas} publicación{kpis.agotadas > 1 ? "es" : ""} sin ejemplares y {kpis.bajoMinimo} bajo
          stock mínimo.
        </Aviso>
      )}

      {data && kpis && (
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
            <TabsTrigger value="actividad">Actividad</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                icon={<Package className="h-4 w-4 text-muted-foreground" />}
                label="Publicaciones"
                value={kpis.publicaciones.toLocaleString("es-CL")}
                hint={`${data.publicacionesPorEstado.activa ?? 0} activas en catálogo`}
              />
              <KpiCard
                icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
                label="Unidades"
                value={kpis.unidades.toLocaleString("es-CL")}
                hint="Ejemplares disponibles"
              />
              <KpiCard
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                label="Órdenes"
                value={kpis.ordenes.toLocaleString("es-CL")}
                hint={`${kpis.ordenesHoy} creadas hoy · ${kpis.recibidas} completadas`}
              />
              <KpiCard
                icon={
                  kpis.tendencia === null ? (
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  ) : kpis.tendencia < 0 ? (
                    <ArrowDownRight className="h-4 w-4 text-amber-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                  )
                }
                label="Ventas del mes"
                value={formatCLP(kpis.ventasMes)}
                hint={
                  kpis.tendencia === null
                    ? `Histórico: ${formatCLP(kpis.ventasTotal)}`
                    : `${kpis.tendencia > 0 ? "+" : ""}${kpis.tendencia}% vs. mes anterior`
                }
                tone={
                  kpis.tendencia === null
                    ? "default"
                    : kpis.tendencia < 0
                      ? "warning"
                      : "positive"
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Publicaciones con más ventas</CardTitle>
                  <CardDescription>Top 5 por unidades recibidas</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.topPublicaciones.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Aún no hay ventas registradas</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">Publicación</TableHead>
                          <TableHead scope="col" className="text-right">Vendidas</TableHead>
                          <TableHead scope="col" className="text-right">Venta</TableHead>
                          <TableHead scope="col" className="text-right">Stock</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topPublicaciones.map((fila) => (
                          <TableRow key={fila.publicacionId ?? fila.titulo}>
                            <TableCell className="font-medium">{fila.titulo}</TableCell>
                            <TableCell className="text-right font-mono">{fila.unidades}</TableCell>
                            <TableCell className="text-right font-mono">{formatCLP(fila.ventas)}</TableCell>
                            <TableCell className="text-right font-mono">{fila.stock}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vendedores</CardTitle>
                  <CardDescription>Mayor venta completada</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.topVendedores.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Sin ventas por ahora</p>
                  ) : (
                    data.topVendedores.map((fila) => (
                      <div key={fila.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{fila.nombre}</p>
                          <p className="text-xs text-muted-foreground">
                            {fila.publicaciones} publicación{fila.publicaciones === 1 ? "" : "es"}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm">{formatCLP(fila.ventas)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <EstadoCard titulo="Publicaciones" filas={data.publicacionesPorEstado} />
              <EstadoCard titulo="Órdenes" filas={data.ordenesPorEstado} />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comunidad</CardTitle>
                  <CardDescription>Cuentas registradas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="font-mono text-sm font-medium">{kpis.usuarios}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground">Activas</span>
                    <span className="font-mono text-sm font-medium">{kpis.usuariosActivos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nuevas (30 días)</span>
                    <span className="font-mono text-sm font-medium">{kpis.usuariosNuevos}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alertas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Publicaciones agotadas o bajo mínimo
                </CardTitle>
                <CardDescription>Reabastecer o pausar la publicación para evitar quiebres</CardDescription>
              </CardHeader>
              <CardContent>
                {data.alertasStock.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No hay publicaciones en estado crítico</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Publicación</TableHead>
                        <TableHead scope="col">Vendedor</TableHead>
                        <TableHead scope="col" className="text-right">Stock</TableHead>
                        <TableHead scope="col" className="text-right">Mínimo</TableHead>
                        <TableHead scope="col">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.alertasStock.map((fila) => (
                        <TableRow key={fila.id}>
                          <TableCell className="font-medium">{fila.titulo}</TableCell>
                          <TableCell className="text-muted-foreground">{fila.vendedor}</TableCell>
                          <TableCell className="text-right font-mono">{fila.stock}</TableCell>
                          <TableCell className="text-right font-mono">{fila.stockMinimo}</TableCell>
                          <TableCell>
                            <Badge variant={fila.stock === 0 ? "destructive" : "secondary"}>
                              {fila.stock === 0 ? "Sin stock" : "Bajo mínimo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actividad" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Órdenes recientes
                </CardTitle>
                <CardDescription>Últimas 8 órdenes del marketplace</CardDescription>
              </CardHeader>
              <CardContent>
                {data.ordenesRecientes.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin órdenes registradas</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Fecha</TableHead>
                        <TableHead scope="col">Publicación</TableHead>
                        <TableHead scope="col">Comprador</TableHead>
                        <TableHead scope="col">Vendedor</TableHead>
                        <TableHead scope="col" className="text-right">Total</TableHead>
                        <TableHead scope="col">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ordenesRecientes.map((orden) => (
                        <TableRow key={orden.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(orden.fechaCreacion)}
                          </TableCell>
                          <TableCell className="font-medium">{orden.tituloSnapshot}</TableCell>
                          <TableCell className="text-muted-foreground">{orden.comprador}</TableCell>
                          <TableCell className="text-muted-foreground">{orden.vendedor}</TableCell>
                          <TableCell className="text-right font-mono">{formatCLP(orden.total)}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                                ESTADO_ORDEN_BADGE[orden.estado],
                              )}
                            >
                              {ESTADO_ORDEN_LABEL[orden.estado]}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movimientos de inventario</CardTitle>
                <CardDescription>Entradas, salidas y ajustes registrados por el equipo</CardDescription>
              </CardHeader>
              <CardContent>
                {data.movimientos.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos registrados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Fecha</TableHead>
                        <TableHead scope="col">Publicación</TableHead>
                        <TableHead scope="col">Tipo</TableHead>
                        <TableHead scope="col" className="text-right">Cantidad</TableHead>
                        <TableHead scope="col">Motivo</TableHead>
                        <TableHead scope="col">Registrado por</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.movimientos.map((movimiento) => (
                        <TableRow key={movimiento.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(movimiento.fechaCreacion)}
                          </TableCell>
                          <TableCell className="font-medium">{movimiento.titulo}</TableCell>
                          <TableCell>
                            <Badge variant={movimiento.tipo === "entrada" ? "default" : "secondary"} className="gap-1">
                              {movimiento.tipo === "entrada" ? (
                                <PackagePlus className="h-3 w-3" />
                              ) : (
                                <PackageMinus className="h-3 w-3" />
                              )}
                              {movimiento.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">{movimiento.cantidad}</TableCell>
                          <TableCell className="text-muted-foreground">{movimiento.motivo ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{movimiento.usuario}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </main>
  )
}

function EstadoCard({ titulo, filas }: { titulo: string; filas: Record<string, number> }) {
  const entradas = Object.entries(filas).sort((a, b) => b[1] - a[1])
  const total = entradas.reduce((suma, [, valor]) => suma + valor, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        <CardDescription>{total} en total</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entradas.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Sin datos</p>
        ) : (
          entradas.map(([estado, total]) => {
            const porcentaje = total === 0 ? 0 : (total / Math.max(...entradas.map(([, v]) => v))) * 100
            const etiqueta =
              estado in ESTADO_PUBLICACION_LABEL
                ? ESTADO_PUBLICACION_LABEL[estado as EstadoPublicacion]
                : ESTADO_ORDEN_LABEL[estado as EstadoOrden]
            return (
              <div key={estado} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{etiqueta}</span>
                  <span className="font-mono text-xs text-muted-foreground">{total}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${porcentaje}%` }} />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
  tone?: "default" | "positive" | "warning"
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold",
            tone === "positive" && "text-emerald-600",
            tone === "warning" && "text-amber-600",
          )}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
