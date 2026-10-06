"use client"

import { useEffect, useRef, useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { normalizeIsbn } from "@/lib/isbn"

export function EscanerIsbn({
  onDetectado,
  titulo = "Escanear ISBN",
  detenido = false,
}: {
  onDetectado: (isbn: string) => void
  titulo?: string
  detenido?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const detectarRef = useRef(onDetectado)
  const [activo, setActivo] = useState(false)
  const [soportado, setSoportado] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    detectarRef.current = onDetectado
  }, [onDetectado])

  useEffect(() => {
    setSoportado(typeof window !== "undefined" && "BarcodeDetector" in window)
  }, [])

  useEffect(() => {
    if (detenido) setActivo(false)
  }, [detenido])

  useEffect(() => {
    if (!activo) return
    let stream: MediaStream | null = null
    let cancelado = false
    let timer: ReturnType<typeof setInterval> | null = null
    let detectando = false
    const detener = () => {
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
    }
    setError(null)

    const iniciar = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        if (cancelado) {
          detener()
          return
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (cancelado) {
          detener()
          return
        }
        const Detector = (
          window as unknown as {
            BarcodeDetector: new (options: { formats: string[] }) => {
              detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>
            }
          }
        ).BarcodeDetector
        const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] })
        timer = setInterval(async () => {
          if (!videoRef.current || cancelado || detectando) return
          detectando = true
          try {
            const codes = await detector.detect(videoRef.current)
            if (cancelado) return
            const valor = codes[0]?.rawValue
            if (valor) {
              cancelado = true
              detener()
              setActivo(false)
              detectarRef.current(normalizeIsbn(valor))
            }
          } catch {
            if (!cancelado) setError("No se pudo leer el código. Acerca más el tomo o escribe el ISBN.")
          } finally {
            detectando = false
          }
        }, 700)
      } catch {
        detener()
        if (cancelado) return
        setActivo(false)
        setError("No pudimos acceder a la cámara. Revisa los permisos del navegador.")
      }
    }

    void iniciar()
    return () => {
      cancelado = true
      detener()
    }
  }, [activo])

  if (soportado === false) {
    return (
      <Card className="rounded-2xl border-dashed bg-muted/40 shadow-none">
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <Camera className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Este navegador no soporta lectura de códigos. Escribe el ISBN a mano y continuamos.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-border/60">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950">
          <video ref={videoRef} playsInline muted className="size-full object-cover" />
          {!activo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-200">
              <Camera className="size-8" />
              <p className="text-sm">Apunta al código de barras del tomo</p>
            </div>
          )}
          {activo && <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-primary" />}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          type="button"
          variant={activo ? "secondary" : "default"}
          className="w-full rounded-xl"
          onClick={() => setActivo((value) => !value)}
        >
          <Camera data-icon="inline-start" /> {activo ? "Detener escáner" : titulo}
        </Button>
      </CardContent>
    </Card>
  )
}
