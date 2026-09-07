"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Moon,
  Package,
  Pencil,
  Sun,
  Wifi,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInventoryStore } from "@/lib/store"
import { EditProductDialog } from "@/components/admin/edit-product-dialog"
import { ReportSection } from "@/components/admin/report-section"
import { cn } from "@/lib/utils"

export function AdminDashboard() {
  const products = useInventoryStore((s) => s.products)
  const movements = useInventoryStore((s) => s.movements)
  const [now, setNow] = useState<Date | null>(null)
  const [pulse, setPulse] = useState(false)
  const [lastMovementCount, setLastMovementCount] = useState(0)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Pulse effect when new movements arrive (real-time sync indication)
  useEffect(() => {
    if (movements.length > lastMovementCount && lastMovementCount !== 0) {
      setPulse(true)
      const t = setTimeout(() => setPulse(false), 1500)
      return () => clearTimeout(t)
    }
    setLastMovementCount(movements.length)
  }, [movements.length, lastMovementCount])

  const stats = useMemo(() => {
    const totalProducts = products.length
    const lowStock = products.filter((p) => p.stockActual <= p.stockMinimo).length
    const today = new Date().toDateString()
    const movementsToday = movements.filter((m) => new Date(m.fecha).toDateString() === today).length
    return { totalProducts, lowStock, movementsToday }
  }, [products, movements])

  const fechaTexto =
    now?.toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }) ?? ""

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Bodega El Teniente</h1>
            <Badge
              variant="secondary"
              className={cn(
                "rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 transition-all",
                pulse && "scale-110 ring-2 ring-emerald-500/40",
              )}
            >
              <Wifi className="mr-1 h-3 w-3" />
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Sincronizado en tiempo real
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground capitalize">{fechaTexto}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Productos únicos"
          value={stats.totalProducts}
          icon={<Package className="h-4 w-4" />}
          hint="SKUs activos en bodega"
          accent="primary"
        />
        <StatCard
          title="Stock bajo"
          value={stats.lowStock}
          icon={<AlertTriangle className="h-4 w-4" />}
          hint="Productos en o bajo el mínimo"
          accent={stats.lowStock > 0 ? "danger" : "success"}
        />
        <StatCard
          title="Movimientos hoy"
          value={stats.movementsToday}
          icon={<Activity className="h-4 w-4" />}
          hint="Entradas y salidas registradas"
          accent="info"
        />
      </div>

      {/* Tabs: Inventario & Reportes */}
      <Tabs defaultValue="inventario" className="w-full">
        <TabsList>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
          <TabsTrigger value="reportes">Reporte sin papel</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos recientes</TabsTrigger>
        </TabsList>

        <TabsContent value="inventario" className="mt-4">
          <InventoryTable />
        </TabsContent>

        <TabsContent value="reportes" className="mt-4">
          <ReportSection />
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <RecentMovementsCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  hint,
  accent,
}: {
  title: string
  value: number
  icon: React.ReactNode
  hint: string
  accent: "primary" | "danger" | "success" | "info"
}) {
  const accentClasses = {
    primary: "bg-primary/10 text-primary",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    info: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  }
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", accentClasses[accent])}>
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function InventoryTable() {
  const products = useInventoryStore((s) => s.products)
  const [editingSku, setEditingSku] = useState<string | null>(null)
  const editingProduct = products.find((p) => p.sku === editingSku) ?? null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>
            Productos resaltados en rojo tienen stock igual o por debajo del mínimo definido.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="text-right">Stock actual</TableHead>
                  <TableHead className="text-right">Stock mínimo</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="w-[120px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const low = p.stockActual <= p.stockMinimo
                  return (
                    <TableRow
                      key={p.sku}
                      className={cn(
                        low &&
                          "bg-red-50 hover:bg-red-100/70 dark:bg-red-950/30 dark:hover:bg-red-950/40",
                      )}
                    >
                      <TableCell className="font-mono text-xs font-medium">{p.sku}</TableCell>
                      <TableCell className="font-medium">{p.nombre}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-2">
                          {low && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                          )}
                          <span className={cn(low && "font-semibold text-red-700 dark:text-red-400")}>
                            {p.stockActual}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.stockMinimo}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {p.proveedor}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditingSku(p.sku)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <EditProductDialog
        product={editingProduct}
        open={editingProduct !== null}
        onOpenChange={(open) => !open && setEditingSku(null)}
      />
    </>
  )
}

function RecentMovementsCard() {
  const movements = useInventoryStore((s) => s.movements)
  const recent = movements.slice(0, 15)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos recientes</CardTitle>
        <CardDescription>Últimos {recent.length} movimientos registrados en bodega.</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No hay movimientos registrados aún.</p>
            <p className="text-xs text-muted-foreground">
              Registra movimientos desde la vista del bodeguero para verlos aquí en tiempo real.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center gap-4 py-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                    m.tipo === "entrada"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-500",
                  )}
                >
                  {m.tipo === "entrada" ? (
                    <ArrowDownToLine className="h-4 w-4" />
                  ) : (
                    <ArrowUpFromLine className="h-4 w-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{m.nombreProducto}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{m.sku}</span> ·{" "}
                    {new Date(m.fecha).toLocaleString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    · {m.usuario}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "tabular-nums",
                    m.tipo === "entrada"
                      ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                      : "border-amber-500/30 text-amber-700 dark:text-amber-500",
                  )}
                >
                  {m.tipo === "entrada" ? "+" : "−"}
                  {m.cantidad}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-9 w-9" />
  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark"
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Cambiar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
