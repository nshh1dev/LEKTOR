"use client"

import { useMemo, useState } from "react"
import { CalendarIcon, Download, FileSpreadsheet, FileText, PackageMinus, PackagePlus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInventoryStore } from "@/lib/store"
import { cn } from "@/lib/utils"

type DateRange = { from?: Date; to?: Date }
type TipoFiltro = "todos" | "entrada" | "salida"

export function ReportsView() {
  const products = useInventoryStore((s) => s.products)
  const movements = useInventoryStore((s) => s.movements)

  const [range, setRange] = useState<DateRange>({})
  const [skuFiltro, setSkuFiltro] = useState<string>("todos")
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos")

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const date = new Date(m.fecha)
      if (range.from && date < range.from) return false
      if (range.to) {
        const end = new Date(range.to)
        end.setHours(23, 59, 59, 999)
        if (date > end) return false
      }
      if (skuFiltro !== "todos" && m.sku !== skuFiltro) return false
      if (tipoFiltro !== "todos" && m.tipo !== tipoFiltro) return false
      return true
    })
  }, [movements, range, skuFiltro, tipoFiltro])

  const stats = useMemo(() => {
    const entradas = filtered.filter((m) => m.tipo === "entrada").reduce((a, m) => a + m.cantidad, 0)
    const salidas = filtered.filter((m) => m.tipo === "salida").reduce((a, m) => a + m.cantidad, 0)
    const balance = entradas - salidas
    return { total: filtered.length, entradas, salidas, balance }
  }, [filtered])

  const porProducto = useMemo(() => {
    const map = new Map<string, { nombre: string; entradas: number; salidas: number }>()
    for (const m of filtered) {
      const cur = map.get(m.sku) ?? { nombre: m.nombreProducto, entradas: 0, salidas: 0 }
      if (m.tipo === "entrada") cur.entradas += m.cantidad
      else cur.salidas += m.cantidad
      map.set(m.sku, cur)
    }
    return [...map.entries()]
      .map(([sku, v]) => ({ sku, ...v, total: v.entradas + v.salidas }))
      .sort((a, b) => b.total - a.total)
  }, [filtered])

  const maxBar = Math.max(1, ...porProducto.map((p) => p.total))

  const exportCSV = () => {
    const headers = ["Fecha", "SKU", "Producto", "Tipo", "Cantidad", "Usuario"]
    const rows = filtered.map((m) => [
      new Date(m.fecha).toLocaleString("es-CL"),
      m.sku,
      m.nombreProducto,
      m.tipo,
      m.cantidad.toString(),
      m.usuario,
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-movimientos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Reportes</h1>
          <p className="text-sm text-muted-foreground">Análisis de movimientos de inventario</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-transparent" onClick={exportCSV}>
            <FileSpreadsheet className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => window.print()}>
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button className="gap-2" onClick={exportCSV}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Refina el reporte por fecha, producto y tipo de movimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start gap-2 text-left font-normal bg-transparent",
                    !range.from && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {range.from ? (
                    range.to ? (
                      <>
                        {format(range.from, "dd MMM", { locale: es })} -{" "}
                        {format(range.to, "dd MMM yyyy", { locale: es })}
                      </>
                    ) : (
                      format(range.from, "dd MMM yyyy", { locale: es })
                    )
                  ) : (
                    "Rango de fechas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: range.from, to: range.to } as never}
                  onSelect={((r: { from?: Date; to?: Date } | undefined) =>
                    setRange(r ?? {})) as never}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>

            <Select value={skuFiltro} onValueChange={setSkuFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los productos</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.sku} value={p.sku}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={tipoFiltro} onValueChange={(v: TipoFiltro) => setTipoFiltro(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="entrada">Entradas</SelectItem>
                <SelectItem value="salida">Salidas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              onClick={() => {
                setRange({})
                setSkuFiltro("todos")
                setTipoFiltro("todos")
              }}
            >
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Movimientos" value={stats.total.toString()} hint="Total filtrado" />
        <SummaryCard
          label="Entradas"
          value={stats.entradas.toLocaleString("es-CL")}
          hint="Unidades ingresadas"
          tone="positive"
        />
        <SummaryCard
          label="Salidas"
          value={stats.salidas.toLocaleString("es-CL")}
          hint="Unidades despachadas"
          tone="warning"
        />
        <SummaryCard
          label="Balance"
          value={(stats.balance >= 0 ? "+" : "") + stats.balance.toLocaleString("es-CL")}
          hint="Entradas - Salidas"
          tone={stats.balance >= 0 ? "positive" : "warning"}
        />
      </div>

      <Tabs defaultValue="movimientos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="movimientos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalle de movimientos</CardTitle>
              <CardDescription>{filtered.length} registros encontrados</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        No hay movimientos para los filtros seleccionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(m.fecha).toLocaleString("es-CL")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                        <TableCell className="font-medium">{m.nombreProducto}</TableCell>
                        <TableCell>
                          <Badge variant={m.tipo === "entrada" ? "default" : "secondary"} className="gap-1">
                            {m.tipo === "entrada" ? (
                              <PackagePlus className="h-3 w-3" />
                            ) : (
                              <PackageMinus className="h-3 w-3" />
                            )}
                            {m.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{m.cantidad}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{m.usuario}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Movimientos por producto</CardTitle>
              <CardDescription>Distribución de entradas y salidas en el período</CardDescription>
            </CardHeader>
            <CardContent>
              {porProducto.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Sin datos para visualizar con los filtros actuales
                </p>
              ) : (
                <div className="space-y-4">
                  {porProducto.map((p) => (
                    <div key={p.sku} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.nombre}</span>
                          <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {p.entradas} entradas / {p.salidas} salidas
                        </span>
                      </div>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(p.entradas / maxBar) * 100}%` }}
                        />
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{ width: `${(p.salidas / maxBar) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 pt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-emerald-500" />
                      Entradas
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-500" />
                      Salidas
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analisis">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top productos por movimiento</CardTitle>
                <CardDescription>Mayor rotación en el período</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porProducto.slice(0, 5).map((p) => (
                      <TableRow key={p.sku}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{p.total}</TableCell>
                      </TableRow>
                    ))}
                    {porProducto.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-6 text-center text-sm text-muted-foreground">
                          Sin datos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen ejecutivo</CardTitle>
                <CardDescription>Indicadores clave del período seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Total de movimientos" value={stats.total.toString()} />
                <Row label="Productos involucrados" value={porProducto.length.toString()} />
                <Row label="Promedio por movimiento" value={
                  stats.total > 0
                    ? ((stats.entradas + stats.salidas) / stats.total).toFixed(1)
                    : "0"
                } />
                <Row
                  label="Balance neto"
                  value={(stats.balance >= 0 ? "+" : "") + stats.balance}
                  badge={stats.balance >= 0 ? "Positivo" : "Negativo"}
                  badgeVariant={stats.balance >= 0 ? "default" : "destructive"}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function SummaryCard({
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
        <CardDescription>{label}</CardDescription>
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

function Row({
  label,
  value,
  badge,
  badgeVariant,
}: {
  label: string
  value: string
  badge?: string
  badgeVariant?: "default" | "destructive" | "secondary"
}) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-medium">{value}</span>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </div>
    </div>
  )
}
