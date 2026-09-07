"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, History, PackageMinus, PackagePlus, ScanBarcode, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { useInventoryStore, type Product } from "@/lib/store"

const SESSION_GOAL = 10

type SessionEntry = {
  id: string
  sku: string
  nombre: string
  tipo: "entrada" | "salida"
  cantidad: number
  fecha: string
}

export function ScannerView() {
  const products = useInventoryStore((s) => s.products)
  const addMovement = useInventoryStore((s) => s.addMovement)
  const getProductBySku = useInventoryStore((s) => s.getProductBySku)

  const [sku, setSku] = useState("")
  const [cantidad, setCantidad] = useState(1)
  const [tipo, setTipo] = useState<"entrada" | "salida">("salida")
  const [scanned, setScanned] = useState<Product | null>(null)
  const [session, setSession] = useState<SessionEntry[]>([])
  const [sheetOpen, setSheetOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const progress = useMemo(() => Math.min(100, (session.length / SESSION_GOAL) * 100), [session.length])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const product = getProductBySku(sku.trim())
    if (!product) {
      toast({ title: "SKU no encontrado", description: `No existe el producto "${sku}"`, variant: "destructive" })
      setScanned(null)
      return
    }
    setScanned(product)
  }

  const handleRegister = () => {
    if (!scanned) return
    const result = addMovement(scanned.sku, tipo, cantidad, "admin")
    if (!result.ok) {
      toast({ title: "Error", description: result.message, variant: "destructive" })
      return
    }
    const entry: SessionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku: scanned.sku,
      nombre: scanned.nombre,
      tipo,
      cantidad,
      fecha: new Date().toISOString(),
    }
    setSession((s) => [entry, ...s])
    toast({
      title: tipo === "entrada" ? "Entrada registrada" : "Salida registrada",
      description: `${cantidad} × ${scanned.nombre}`,
    })
    if (result.alertaStockBajo) {
      toast({
        title: "Stock bajo",
        description: `${scanned.nombre} alcanzó el mínimo`,
        variant: "destructive",
      })
    }
    setSku("")
    setScanned(null)
    setCantidad(1)
    inputRef.current?.focus()
  }

  const stockBadge = (p: Product) => {
    if (p.stockActual === 0) return { label: "Sin stock", variant: "destructive" as const }
    if (p.stockActual <= p.stockMinimo) return { label: "Bajo mínimo", variant: "secondary" as const }
    return { label: "Disponible", variant: "default" as const }
  }

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Escáner</h1>
          <p className="text-sm text-muted-foreground">Registra entradas y salidas escaneando o ingresando el SKU</p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <History className="h-4 w-4" />
              Sesión actual
              {session.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {session.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="flex w-full flex-col sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Resumen de sesión</SheetTitle>
              <SheetDescription>Movimientos registrados en esta sesión de escaneo</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto pt-4">
              {session.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Aún no hay registros en esta sesión</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {session.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium">{s.nombre}</div>
                          <div className="font-mono text-xs text-muted-foreground">{s.sku}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.tipo === "entrada" ? "default" : "secondary"} className="gap-1">
                            {s.tipo === "entrada" ? (
                              <PackagePlus className="h-3 w-3" />
                            ) : (
                              <PackageMinus className="h-3 w-3" />
                            )}
                            {s.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{s.cantidad}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="border-t pt-4">
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => setSession([])}
                disabled={session.length === 0}
              >
                Limpiar sesión
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progreso de la sesión</CardTitle>
          <CardDescription>
            {session.length} de {SESSION_GOAL} movimientos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanBarcode className="h-4 w-4" />
              Escanear producto
            </CardTitle>
            <CardDescription>Ingresa o escanea el código SKU del producto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Ej: CARP01"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="font-mono uppercase"
                autoComplete="off"
              />
              <Button type="submit">Buscar</Button>
            </form>

            <div>
              <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
                Tipo de movimiento
              </Label>
              <ToggleGroup
                type="single"
                value={tipo}
                onValueChange={(v) => v && setTipo(v as "entrada" | "salida")}
                className="w-full"
              >
                <ToggleGroupItem value="entrada" className="flex-1 gap-2">
                  <PackagePlus className="h-4 w-4" />
                  Entrada
                </ToggleGroupItem>
                <ToggleGroupItem value="salida" className="flex-1 gap-2">
                  <PackageMinus className="h-4 w-4" />
                  Salida
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Producto escaneado</CardTitle>
            <CardDescription>Verifica los datos antes de registrar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scanned ? (
              <>
                <div className="rounded-md border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground">{scanned.sku}</div>
                      <div className="text-lg font-semibold">{scanned.nombre}</div>
                      <div className="text-xs text-muted-foreground">Proveedor: {scanned.proveedor}</div>
                    </div>
                    <Badge variant={stockBadge(scanned).variant}>{stockBadge(scanned).label}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Stock actual</div>
                      <div className="font-mono text-lg font-semibold">{scanned.stockActual}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Stock mínimo</div>
                      <div className="font-mono text-lg font-semibold">{scanned.stockMinimo}</div>
                    </div>
                  </div>
                </div>

                <Button size="lg" className="h-14 w-full text-base" onClick={handleRegister}>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Registrar {tipo} de {cantidad} unidad{cantidad > 1 ? "es" : ""}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setScanned(null)
                    setSku("")
                    inputRef.current?.focus()
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                {/* Feed de cámara simulado (BYOD) */}
                <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                  {/* Fondo tipo lente */}
                  <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 via-black to-neutral-950" />
                  <div
                    className="absolute inset-0 opacity-40"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.14), transparent 55%)",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 3px)",
                    }}
                  />

                  {/* Indicador REC */}
                  <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-rec-blink" />
                    <span className="text-[11px] font-semibold tracking-wide text-white">REC</span>
                  </div>
                  <span className="absolute right-3 top-3 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white/70 backdrop-blur-sm">
                    Cámara del dispositivo
                  </span>

                  {/* Marco de enfoque */}
                  <div className="absolute left-1/2 top-1/2 aspect-square w-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="absolute left-0 top-0 h-6 w-6 rounded-tl border-l-2 border-t-2 border-emerald-400" />
                    <span className="absolute right-0 top-0 h-6 w-6 rounded-tr border-r-2 border-t-2 border-emerald-400" />
                    <span className="absolute bottom-0 left-0 h-6 w-6 rounded-bl border-b-2 border-l-2 border-emerald-400" />
                    <span className="absolute bottom-0 right-0 h-6 w-6 rounded-br border-b-2 border-r-2 border-emerald-400" />
                    {/* Línea láser roja animada */}
                    <div className="absolute inset-x-2 overflow-hidden">
                      <div className="animate-scanline absolute inset-x-0 h-0.5 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.9)]" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-center">
                  <ScanBarcode className="h-4 w-4 animate-pulse text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Apunte la cámara al código o ingrese un SKU
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos disponibles</CardTitle>
          <CardDescription>Toca un producto para precargarlo en el escáner</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const status = stockBadge(p)
                return (
                  <TableRow key={p.sku}>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="text-right font-mono">{p.stockActual}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSku(p.sku)
                          setScanned(p)
                        }}
                      >
                        Cargar
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
