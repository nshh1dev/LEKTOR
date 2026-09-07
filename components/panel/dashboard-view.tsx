"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ChevronDown,
  LogOut,
  Package,
  PackageMinus,
  PackagePlus,
  Settings,
  TrendingUp,
  User,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
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

export function DashboardView() {
  const router = useRouter()
  const products = useInventoryStore((s) => s.products)
  const movements = useInventoryStore((s) => s.movements)
  const email = useInventoryStore((s) => s.email)
  const logout = useInventoryStore((s) => s.logout)
  const [tab, setTab] = useState("resumen")

  const stats = useMemo(() => {
    const totalProductos = products.length
    const totalUnidades = products.reduce((acc, p) => acc + p.stockActual, 0)
    const stockCritico = products.filter((p) => p.stockActual <= p.stockMinimo)
    const today = new Date().toDateString()
    const movsHoy = movements.filter((m) => new Date(m.fecha).toDateString() === today)
    const entradasHoy = movsHoy.filter((m) => m.tipo === "entrada").reduce((a, m) => a + m.cantidad, 0)
    const salidasHoy = movsHoy.filter((m) => m.tipo === "salida").reduce((a, m) => a + m.cantidad, 0)
    return { totalProductos, totalUnidades, stockCritico, entradasHoy, salidasHoy, movsHoy }
  }, [products, movements])

  const initials = (email || "AD")
    .split(/[@.]/)[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen del inventario y operaciones del día</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{email}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout()
                router.push("/")
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {stats.stockCritico.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Stock crítico</AlertTitle>
          <AlertDescription>
            {stats.stockCritico.length} producto{stats.stockCritico.length > 1 ? "s" : ""} bajo el mínimo:{" "}
            {stats.stockCritico
              .slice(0, 3)
              .map((p) => p.nombre)
              .join(", ")}
            {stats.stockCritico.length > 3 ? "..." : ""}
          </AlertDescription>
        </Alert>
      )}

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
              label="Productos"
              value={stats.totalProductos.toString()}
              hint="SKUs registrados"
            />
            <KpiCard
              icon={<Boxes className="h-4 w-4 text-muted-foreground" />}
              label="Unidades"
              value={stats.totalUnidades.toLocaleString("es-CL")}
              hint="Stock total"
            />
            <KpiCard
              icon={<ArrowUpRight className="h-4 w-4 text-emerald-600" />}
              label="Entradas hoy"
              value={stats.entradasHoy.toString()}
              hint="Unidades ingresadas"
              tone="positive"
            />
            <KpiCard
              icon={<ArrowDownRight className="h-4 w-4 text-amber-600" />}
              label="Salidas hoy"
              value={stats.salidasHoy.toString()}
              hint="Unidades despachadas"
              tone="warning"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Productos con mejor rotación</CardTitle>
              <CardDescription>Top 5 por movimientos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <TopProductsTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alertas">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Productos bajo stock mínimo
              </CardTitle>
              <CardDescription>Reabastecer cuanto antes para evitar quiebres</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.stockCritico.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No hay productos en estado crítico</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.stockCritico.map((p) => (
                      <TableRow key={p.sku}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-right font-mono">{p.stockActual}</TableCell>
                        <TableCell className="text-right font-mono">{p.stockMinimo}</TableCell>
                        <TableCell>
                          <Badge variant={p.stockActual === 0 ? "destructive" : "secondary"}>
                            {p.stockActual === 0 ? "Sin stock" : "Bajo mínimo"}
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

        <TabsContent value="actividad">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Movimientos recientes
              </CardTitle>
              <CardDescription>Últimos 10 movimientos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {movements.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos registrados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead>Usuario</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.slice(0, 10).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(m.fecha).toLocaleString("es-CL")}
                        </TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
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
          className={
            tone === "positive"
              ? "text-2xl font-semibold text-emerald-600"
              : tone === "warning"
                ? "text-2xl font-semibold text-amber-600"
                : "text-2xl font-semibold"
          }
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function TopProductsTable() {
  const products = useInventoryStore((s) => s.products)
  const movements = useInventoryStore((s) => s.movements)

  const top = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of movements) counts.set(m.sku, (counts.get(m.sku) ?? 0) + m.cantidad)
    return [...products]
      .sort((a, b) => (counts.get(b.sku) ?? 0) - (counts.get(a.sku) ?? 0))
      .slice(0, 5)
      .map((p) => ({ ...p, total: counts.get(p.sku) ?? 0 }))
  }, [products, movements])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead className="text-right">Stock actual</TableHead>
          <TableHead className="text-right">Movimientos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {top.map((p) => (
          <TableRow key={p.sku}>
            <TableCell>
              <div className="font-medium">{p.nombre}</div>
              <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
            </TableCell>
            <TableCell className="text-right font-mono">{p.stockActual}</TableCell>
            <TableCell className="text-right font-mono">{p.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
