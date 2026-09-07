"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ChevronRight,
  HardHat,
  LogOut,
  Moon,
  ScanLine,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useInventoryStore } from "@/lib/store"
import { ScanSheet } from "@/components/worker/scan-sheet"
import { cn } from "@/lib/utils"

export function WorkerView() {
  const router = useRouter()
  const role = useInventoryStore((s) => s.role)
  const email = useInventoryStore((s) => s.email)
  const movements = useInventoryStore((s) => s.movements)
  const products = useInventoryStore((s) => s.products)
  const logout = useInventoryStore((s) => s.logout)
  const [hydrated, setHydrated] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)

  useEffect(() => setHydrated(true), [])
  useEffect(() => {
    if (hydrated && role !== "worker") router.replace("/")
  }, [role, router, hydrated])

  const recent = useMemo(() => movements.slice(0, 5), [movements])
  const lowStockCount = useMemo(
    () => products.filter((p) => p.stockActual <= p.stockMinimo).length,
    [products],
  )

  if (!hydrated || role !== "worker") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  return (
    <main className="min-h-svh bg-muted/30 pb-32">
      <div className="mx-auto flex w-full max-w-[500px] flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-semibold">Bodega El Teniente</p>
              <p className="text-xs text-muted-foreground">Panel de bodeguero</p>
            </div>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cerrar sesión"
              onClick={() => {
                logout()
                router.push("/")
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-col gap-5 p-4">
          {/* Greeting card */}
          <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-primary/5 via-card to-card">
            <CardContent className="flex items-center gap-4 p-5">
              <Avatar className="h-12 w-12 rounded-md">
                <AvatarFallback className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-500">
                  <HardHat className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Sesión activa</p>
                <p className="truncate text-base font-semibold">Bodeguero</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </div>
              <Badge variant="secondary" className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                En línea
              </Badge>
            </CardContent>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Productos" value={products.length} />
            <MiniStat
              label="Stock bajo"
              value={lowStockCount}
              tone={lowStockCount > 0 ? "danger" : "default"}
            />
          </div>

          {/* Primary action */}
          <button
            onClick={() => setScanOpen(true)}
            className="group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-primary p-5 text-left text-primary-foreground shadow-md shadow-primary/20 transition-transform active:scale-[0.99]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
              <ScanLine className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="text-base font-semibold">Escanear producto</p>
              <p className="text-xs text-primary-foreground/80">
                Registrar entrada o salida en bodega
              </p>
            </div>
            <ChevronRight className="h-5 w-5 opacity-70 transition-transform group-hover:translate-x-1" />
          </button>

          {/* Recent movements timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimos movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <Empty className="py-8">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ScanLine className="h-5 w-5" />
                    </EmptyMedia>
                    <EmptyTitle className="text-sm">Aún no hay movimientos</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      Escanea un producto para registrar tu primer movimiento.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-6">
                  {recent.map((m) => (
                    <li key={m.id} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[33px] top-0.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                          m.tipo === "entrada"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-500",
                        )}
                      >
                        {m.tipo === "entrada" ? (
                          <ArrowDownToLine className="h-3 w-3" />
                        ) : (
                          <ArrowUpFromLine className="h-3 w-3" />
                        )}
                      </span>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.nombreProducto}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{m.sku}</span> ·{" "}
                            {new Date(m.fecha).toLocaleString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 tabular-nums",
                            m.tipo === "entrada"
                              ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                              : "border-amber-500/30 text-amber-700 dark:text-amber-500",
                          )}
                        >
                          {m.tipo === "entrada" ? "+" : "−"}
                          {m.cantidad}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating action button (mobile-first) */}
      <button
        onClick={() => setScanOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95 sm:hidden"
        aria-label="Escanear producto"
      >
        <ScanLine className="h-6 w-6" />
      </button>

      <ScanSheet open={scanOpen} onOpenChange={setScanOpen} />
    </main>
  )
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "danger"
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            tone === "danger" && value > 0 && "text-red-600 dark:text-red-400",
          )}
        >
          {value}
        </span>
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
      variant="ghost"
      size="icon"
      aria-label="Cambiar tema"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
