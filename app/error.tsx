"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sello } from "@/components/notificacion/sello"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[lektor-ui]", error)
  }, [error])

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="papel flex w-full max-w-md flex-col items-center gap-5 rounded-2xl border border-border/70 bg-card p-8 text-center sombra-tomo">
        <Sello tono="falla" tamano="lg" fijo />
        <div className="flex flex-col gap-2">
          <p className="rotulo text-aviso-falla">Página interrumpida</p>
          <h1 className="font-serif text-2xl tracking-tight">Algo se cayó al cargar esta vista</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            No pudimos completar la consulta. Reinténtalo: si sigue igual, vuelve al catálogo.
          </p>
        </div>
        {error.digest ? (
          <p className="rounded-lg bg-muted px-3 py-1.5 font-mono text-[0.6875rem] tracking-tight text-muted-foreground">
            Referencia {error.digest}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            className="rounded-xl bg-acento text-acento-foreground shadow-none hover:bg-acento/90"
            onClick={() => reset()}
          >
            <RefreshCw data-icon="inline-start" /> Reintentar
          </Button>
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/">Volver a la tienda</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
