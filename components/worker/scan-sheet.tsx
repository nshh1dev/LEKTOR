"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Keyboard,
  Loader2,
  Minus,
  Package,
  Plus,
  ScanLine,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useInventoryStore, type Product } from "@/lib/store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Phase = "scanning" | "detected"

export function ScanSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const products = useInventoryStore((s) => s.products)
  const getProductBySku = useInventoryStore((s) => s.getProductBySku)
  const addMovement = useInventoryStore((s) => s.addMovement)

  const [phase, setPhase] = useState<Phase>("scanning")
  const [product, setProduct] = useState<Product | null>(null)
  const [cantidad, setCantidad] = useState(1)
  const [manualOpen, setManualOpen] = useState(false)
  const [skuInput, setSkuInput] = useState("")
  const [registering, setRegistering] = useState<"entrada" | "salida" | null>(null)
  const autoScanRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset al abrir; simula detección automática de código de barras
  useEffect(() => {
    if (open) {
      setPhase("scanning")
      setProduct(null)
      setCantidad(1)
      setManualOpen(false)
      setSkuInput("")
      setRegistering(null)
      // Simula que la cámara detecta un código tras un breve instante
      autoScanRef.current = setTimeout(() => {
        const random = products[Math.floor(Math.random() * products.length)]
        if (random) {
          setProduct(random)
          setPhase("detected")
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate?.(60)
          }
        }
      }, 2600)
    }
    return () => {
      if (autoScanRef.current) clearTimeout(autoScanRef.current)
    }
  }, [open, products])

  // Bloquea el scroll del body mientras la cámara está a pantalla completa
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  function detectSku(code: string) {
    const found = getProductBySku(code.trim())
    if (!found) {
      toast.error(`SKU "${code}" no encontrado`)
      return
    }
    if (autoScanRef.current) clearTimeout(autoScanRef.current)
    setProduct(found)
    setPhase("detected")
    setManualOpen(false)
    setSkuInput("")
  }

  function rescan() {
    if (autoScanRef.current) clearTimeout(autoScanRef.current)
    setProduct(null)
    setPhase("scanning")
    setCantidad(1)
    autoScanRef.current = setTimeout(() => {
      const random = products[Math.floor(Math.random() * products.length)]
      if (random) {
        setProduct(random)
        setPhase("detected")
      }
    }, 2600)
  }

  function handleRegister(tipo: "entrada" | "salida") {
    if (!product) {
      toast.info("Escanee un producto primero")
      return
    }
    if (tipo === "salida" && cantidad > product.stockActual) {
      toast.error("Stock insuficiente para esta salida", {
        description: `Disponible: ${product.stockActual}`,
      })
      return
    }
    setRegistering(tipo)
    setTimeout(() => {
      const result = addMovement(product.sku, tipo, cantidad, "worker")
      setRegistering(null)
      if (!result.ok) {
        toast.error(result.message ?? "No se pudo registrar el movimiento")
        return
      }
      if (result.alertaStockBajo) {
        toast.warning("Stock bajo el mínimo", {
          description: `${product.nombre} quedó en o bajo su mínimo. Avise al administrador.`,
          icon: <AlertTriangle className="h-4 w-4" />,
        })
      } else {
        toast.success("Movimiento registrado", {
          description: `${tipo === "entrada" ? "Entrada" : "Salida"} de ${cantidad} × ${product.nombre}`,
          icon: <CheckCircle2 className="h-4 w-4" />,
        })
      }
      onOpenChange(false)
    }, 450)
  }

  if (!open) return null

  const stockInsuficiente =
    phase === "detected" && product ? cantidad > product.stockActual : false

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      {/* Feed de cámara simulado */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Fondo tipo lente/oscuro con viñeta */}
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 via-black to-neutral-950" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.12), transparent 55%)",
          }}
        />
        {/* Grano sutil */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 3px)",
          }}
        />
      </div>

      {/* Barra superior */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-rec-blink" />
            <span className="text-xs font-semibold tracking-wide">REC</span>
          </span>
          <span className="text-xs text-white/60">Cámara del dispositivo</span>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60"
          aria-label="Cerrar cámara"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Zona central: marco de escaneo */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-8">
        <div className="relative aspect-square w-full max-w-[300px]">
          {/* Esquinas de enfoque */}
          <span className="absolute left-0 top-0 h-10 w-10 rounded-tl-lg border-l-4 border-t-4 border-white" />
          <span className="absolute right-0 top-0 h-10 w-10 rounded-tr-lg border-r-4 border-t-4 border-white" />
          <span className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-lg border-b-4 border-l-4 border-white" />
          <span className="absolute bottom-0 right-0 h-10 w-10 rounded-br-lg border-b-4 border-r-4 border-white" />

          {/* Ventana de escaneo */}
          <div className="absolute inset-4 overflow-hidden rounded-md">
            {phase === "scanning" && (
              <>
                {/* Línea láser roja animada */}
                <div className="absolute inset-x-0">
                  <div className="animate-scanline absolute inset-x-2 h-0.5 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.9)]" />
                </div>
                {/* Código de barras tenue de referencia */}
                <div className="absolute inset-x-6 top-1/2 flex h-16 -translate-y-1/2 items-stretch gap-[3px] opacity-25">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <span
                      key={i}
                      className="bg-white"
                      style={{ width: `${(i % 3) + 1}px` }}
                    />
                  ))}
                </div>
              </>
            )}

            {phase === "detected" && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg">
                  <CheckCircle2 className="h-9 w-9" />
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estado de escaneo */}
      <div className="relative z-10 flex flex-col items-center gap-1 pb-3 text-center">
        {phase === "scanning" ? (
          <p className="flex items-center gap-2 text-sm font-medium text-white/80">
            <ScanLine className="h-4 w-4 animate-pulse" />
            Buscando código de barras...
          </p>
        ) : (
          <p className="text-sm font-medium text-emerald-400">Código detectado</p>
        )}
      </div>

      {/* Panel inferior: producto + acciones */}
      <div className="relative z-10 rounded-t-3xl bg-background px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 text-foreground shadow-2xl">
        {phase === "detected" && product ? (
          <div className="flex flex-col gap-4">
            {/* Producto detectado */}
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {product.sku}
                  </Badge>
                  {product.stockActual <= product.stockMinimo && (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 text-xs text-red-600 dark:text-red-400"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Stock bajo
                    </Badge>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-semibold">{product.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  Stock actual:{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    {product.stockActual}
                  </span>
                </p>
              </div>
              <Button variant="ghost" size="sm" className="shrink-0" onClick={rescan}>
                <ScanLine className="mr-1 h-4 w-4" />
                Reescanear
              </Button>
            </div>

            {/* Cantidad */}
            <div className="flex items-center justify-between rounded-xl bg-muted/60 p-2">
              <span className="pl-2 text-sm font-medium">Cantidad</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-lg bg-background"
                  onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                  aria-label="Restar"
                >
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="w-12 text-center text-xl font-bold tabular-nums">
                  {cantidad}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 rounded-lg bg-background"
                  onClick={() => setCantidad((c) => c + 1)}
                  aria-label="Sumar"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {stockInsuficiente && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Stock insuficiente para la salida (disponible {product.stockActual})
              </p>
            )}

            {/* Botones grandes de acción */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-16 flex-col gap-0.5 rounded-xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
                onClick={() => handleRegister("entrada")}
                disabled={registering !== null}
              >
                {registering === "entrada" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ArrowDownToLine className="h-6 w-6" />
                    Registrar Entrada
                  </>
                )}
              </Button>
              <Button
                size="lg"
                className="h-16 flex-col gap-0.5 rounded-xl bg-orange-600 text-base font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                onClick={() => handleRegister("salida")}
                disabled={registering !== null || stockInsuficiente}
              >
                {registering === "salida" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ArrowUpFromLine className="h-6 w-6" />
                    Registrar Salida
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {!manualOpen ? (
              <>
                <p className="text-center text-sm text-muted-foreground">
                  Mantenga el código dentro del recuadro
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setManualOpen(true)}
                >
                  <Keyboard className="mr-2 h-4 w-4" />
                  Ingresar SKU manualmente
                </Button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (skuInput.trim()) detectSku(skuInput)
                }}
                className="flex flex-col gap-2"
              >
                <InputGroup>
                  <InputGroupAddon>
                    <Keyboard className="h-4 w-4" />
                  </InputGroupAddon>
                  <InputGroupInput
                    autoFocus
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value.toUpperCase())}
                    placeholder="Ej. CARP01"
                    autoComplete="off"
                  />
                </InputGroup>
                <div className="flex flex-wrap gap-1.5">
                  {products.map((p) => (
                    <Button
                      key={p.sku}
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 font-mono text-xs"
                      onClick={() => detectSku(p.sku)}
                    >
                      {p.sku}
                    </Button>
                  ))}
                </div>
                <Button type="submit" className="w-full">
                  Buscar producto
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
