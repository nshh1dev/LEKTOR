"use client"

import { useState } from "react"
import { FileSpreadsheet, FileText, RefreshCw, TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Aviso } from "@/components/notificacion/avisos"
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
import { type EstadoOrden, type MetodoEntrega } from "@/lib/catalog"
import { ESTADO_ORDEN_LABEL, formatCLP, formatDateTime } from "@/lib/format"
import { usePanelQuery } from "@/lib/panel-client"
import { cn } from "@/lib/utils"
import { generarCSV } from "@/lib/format"

type Reporte = {
  dias: number
  desde: string
  resumen: {
    ordenes: number
    unidades: number
    recibidas: number
    ventas: number
    brutas: number
    envios: number
    canceladas: number
    ticketPromedio: number
    tasaCancelacion: number
    movimientos: { entradas: number; salidas: number; ajustes: number; balance: number }
  }
  serie: { dia: string; ordenes: number; unidades: number; ventas: number; brutas: number; recibidas: number }[]
  topTitulos: { titulo: string; unidades: number; ventas: number; ordenes: number }[]
  porCategoria: { categoria: string; unidades: number; ventas: number }[]
  porEstado: { estado: EstadoOrden; total: number }[]
  vendedores: { id: string; nombre: string; ventas: number; ordenes: number }[]
  entregas: { metodo: MetodoEntrega | string; total: number }[]
  ordenesDetalle: {
    id: string
    tituloSnapshot: string
    categoria: string | null
    cantidad: number
    total: number
    envio: number
    estado: EstadoOrden
    metodoEntrega: string
    fechaCreacion: string
  }[]
}

const PERIODOS: { value: string; label: string }[] = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "365", label: "Último año" },
]

const COLORES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function ReportsView() {
  const [dias, setDias] = useState("30")
  const { data, cargando, error, recargar } = usePanelQuery<Reporte>(`/api/panel/reportes?dias=${dias}`)

  const exportarCSV = () => {
    if (!data) return
    const cabeceras = ["Fecha", "Publicación", "Categoría", "Estado", "Entrega", "Total"]
    const filas = data.ordenesDetalle.map((orden) => [
      new Date(orden.fechaCreacion).toLocaleString("es-CL"),
      orden.tituloSnapshot,
      orden.categoria ?? "—",
      ESTADO_ORDEN_LABEL[orden.estado] ?? orden.estado,
      orden.metodoEntrega,
      orden.total.toString(),
    ])
    const csv = generarCSV([cabeceras, ...filas])
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const enlace = document.createElement("a")
    enlace.href = url
    enlace.download = `reporte-ordenes-${dias}d.csv`
    enlace.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Reportes</h1>
          <p className="text-sm text-muted-foreground">Ventas, órdenes y movimientos de inventario</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={dias} onValueChange={setDias}>
            <SelectTrigger className="w-48" aria-label="Período de análisis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map((periodo) => (
                <SelectItem key={periodo.value} value={periodo.value}>
                  {periodo.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={recargar} disabled={cargando}>
            <RefreshCw className={cn("h-4 w-4", cargando && "animate-spin")} />
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={exportarCSV} disabled={!data}>
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => window.print()}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </header>

      {error ? <Aviso tono="falla" titulo="No se pudieron calcular los reportes" className="mb-4">{error}</Aviso> : null}

      {cargando && !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <ResumenCard label="Ventas completadas" value={formatCLP(data.resumen.ventas)} hint="Órdenes recibidas" />
            <ResumenCard
              label="Órdenes"
              value={data.resumen.ordenes.toLocaleString("es-CL")}
              hint={`${data.resumen.canceladas} canceladas · ${data.resumen.tasaCancelacion}%`}
              tone={data.resumen.canceladas > 0 ? "warning" : "default"}
            />
            <ResumenCard
              label="Ticket promedio"
              value={formatCLP(data.resumen.ticketPromedio)}
              hint={`${data.resumen.recibidas} ventas concretadas`}
            />
            <ResumenCard
              label="Balance de bodega"
              value={`${data.resumen.movimientos.balance >= 0 ? "+" : ""}${data.resumen.movimientos.balance}`}
              hint={`${data.resumen.movimientos.entradas} entradas · ${data.resumen.movimientos.salidas} salidas`}
              tone={data.resumen.movimientos.balance >= 0 ? "positive" : "warning"}
            />
          </div>

          <Tabs defaultValue="movimientos" className="space-y-4">
            <TabsList>
              <TabsTrigger value="movimientos">Órdenes</TabsTrigger>
              <TabsTrigger value="graficos">Gráficos</TabsTrigger>
              <TabsTrigger value="analisis">Análisis</TabsTrigger>
            </TabsList>

            <TabsContent value="movimientos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detalle de órdenes</CardTitle>
                  <CardDescription>
                    {data.ordenesDetalle.length} órdenes del período (máximo 200 por reporte)
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {data.ordenesDetalle.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted-foreground">
                      No hay órdenes en el período seleccionado
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">Fecha</TableHead>
                          <TableHead scope="col">Publicación</TableHead>
                          <TableHead scope="col">Categoría</TableHead>
                          <TableHead scope="col">Estado</TableHead>
                          <TableHead scope="col">Entrega</TableHead>
                          <TableHead scope="col" className="text-right">Envío</TableHead>
                          <TableHead scope="col" className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.ordenesDetalle.map((orden) => (
                          <TableRow key={orden.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDateTime(orden.fechaCreacion)}
                            </TableCell>
                            <TableCell className="font-medium">{orden.tituloSnapshot}</TableCell>
                            <TableCell className="text-muted-foreground">{orden.categoria ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{ESTADO_ORDEN_LABEL[orden.estado] ?? orden.estado}</Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{orden.metodoEntrega.replace(/_/g, " ")}</TableCell>
                            <TableCell className="text-right font-mono">{formatCLP(orden.envio)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCLP(orden.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="graficos" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ventas por día</CardTitle>
                  <CardDescription>Montos de órdenes recibidas y brutas del período</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.serie}>
                      <defs>
                        <linearGradient id="ventas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="dia" tickFormatter={(valor: string) => valor.slice(5)} fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(valor: number) => `${Math.round(valor / 1000)}k`} />
                      <Tooltip
                        formatter={(valor: number) => formatCLP(valor)}
                        labelFormatter={(etiqueta) => String(etiqueta)}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="ventas"
                        name="Ventas"
                        stroke="var(--chart-1)"
                        fill="url(#ventas)"
                      />
                      <Area
                        type="monotone"
                        dataKey="brutas"
                        name="Bruto"
                        stroke="var(--chart-3)"
                        fill="transparent"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Reparto por categoría</CardTitle>
                    <CardDescription>Ventas completadas por tipo de ejemplar</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    {data.porCategoria.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">Sin datos</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.porCategoria}
                            dataKey="ventas"
                            nameKey="categoria"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                          >
                            {data.porCategoria.map((fila, indice) => (
                              <Cell key={fila.categoria} fill={COLORES[indice % COLORES.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(valor: number) => formatCLP(valor)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top títulos por venta</CardTitle>
                    <CardDescription>Unidades recibidas en el período</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topTitulos} layout="vertical" margin={{ left: 12 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" allowDecimals={false} fontSize={12} />
                        <YAxis
                          type="category"
                          dataKey="titulo"
                          width={130}
                          fontSize={12}
                          tickFormatter={(valor: string) => (valor.length > 22 ? `${valor.slice(0, 22)}…` : valor)}
                        />
                        <Tooltip formatter={(valor: number) => `${valor} uds.`} />
                        <Bar dataKey="unidades" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analisis" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top títulos</CardTitle>
                    <CardDescription>Mayor rotación del período</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.topTitulos.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Sin ventas en el período</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead scope="col">Publicación</TableHead>
                            <TableHead scope="col" className="text-right">Unidades recibidas</TableHead>
                            <TableHead scope="col" className="text-right">Ventas</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.topTitulos.map((fila) => (
                            <TableRow key={fila.titulo}>
                              <TableCell className="font-medium">{fila.titulo}</TableCell>
                              <TableCell className="text-right font-mono">{fila.unidades}</TableCell>
                              <TableCell className="text-right font-mono">{formatCLP(fila.ventas)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumen ejecutivo</CardTitle>
                    <CardDescription>Indicadores del período seleccionado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Fila label="Órdenes creadas" valor={data.resumen.ordenes.toString()} />
                    <Fila
                      label="Órdenes recibidas"
                      valor={data.resumen.recibidas.toString()}
                      badge={data.resumen.recibidas === 0 ? "Sin ventas" : undefined}
                      badgeVariant="secondary"
                    />
                    <Fila label="Unidades recibidas" valor={data.resumen.unidades.toString()} />
                    <Fila label="Ventas realizadas" valor={formatCLP(data.resumen.ventas)} />
                    <Fila label="Ventas brutas" valor={formatCLP(data.resumen.brutas)} />
                    <Fila label="Envíos cobrados" valor={formatCLP(data.resumen.envios)} />
                    <Fila
                      label="Tasa de cancelación"
                      valor={`${data.resumen.tasaCancelacion}%`}
                      badge={data.resumen.tasaCancelacion > 20 ? "Revisar" : "Normal"}
                      badgeVariant={data.resumen.tasaCancelacion > 20 ? "destructive" : "secondary"}
                    />
                    <Fila
                      label="Ajustes de inventario"
                      valor={data.resumen.movimientos.ajustes.toString()}
                      badge="Bodega"
                      badgeVariant="secondary"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Vendedores</CardTitle>
                    <CardDescription>Ventas completadas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.vendedores.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Sin datos</p>
                    ) : (
                      data.vendedores.map((fila) => (
                        <div
                          key={fila.id}
                          className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{fila.nombre}</p>
                            <p className="text-xs text-muted-foreground">{fila.ordenes} ventas</p>
                          </div>
                          <span className="shrink-0 font-mono text-sm">{formatCLP(fila.ventas)}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estados de orden</CardTitle>
                    <CardDescription>Distribución del período</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.porEstado.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Sin datos</p>
                    ) : (
                      data.porEstado.map((fila) => (
                        <Fila
                          key={fila.estado}
                          label={ESTADO_ORDEN_LABEL[fila.estado] ?? fila.estado}
                          valor={fila.total.toString()}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Métodos de entrega</CardTitle>
                    <CardDescription>Cómo reciben los compradores</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.entregas.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Sin datos</p>
                    ) : (
                      data.entregas.map((fila) => (
                        <Fila key={fila.metodo} label={fila.metodo.replace(/_/g, " ")} valor={fila.total.toString()} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </main>
  )
}

function ResumenCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint: string
  tone?: "default" | "positive" | "warning"
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {label === "Ventas completadas" && <TrendingUp className="h-3.5 w-3.5" />}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-2xl font-semibold",
            tone === "positive" && "text-aviso-ok",
            tone === "warning" && "text-aviso-revisar",
          )}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function Fila({
  label,
  valor,
  badge,
  badgeVariant,
}: {
  label: string
  valor: string
  badge?: string
  badgeVariant?: "default" | "destructive" | "secondary"
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{valor}</span>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </div>
    </div>
  )
}
