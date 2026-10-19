"use client"

import { useEffect, useRef, useState } from "react"
import { Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Aviso } from "@/components/notificacion/avisos"
import { errorDeCamara, isbnDeCodigo } from "@/lib/escaner"

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
  const [disponibilidad, setDisponibilidad] = useState<"https" | "sin-camara" | "lista" | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    detectarRef.current = onDetectado
  }, [onDetectado])

  useEffect(() => {
    setDisponibilidad(!window.isSecureContext ? "https" : !navigator.mediaDevices?.getUserMedia ? "sin-camara" : "lista")
  }, [])

  useEffect(() => {
    if (detenido) setActivo(false)
  }, [detenido])

  useEffect(() => {
    const alSalir = () => setActivo(false)
    const alOcultar = () => {
      if (document.hidden) alSalir()
    }
    document.addEventListener("visibilitychange", alOcultar)
    window.addEventListener("pagehide", alSalir)
    return () => {
      document.removeEventListener("visibilitychange", alOcultar)
      window.removeEventListener("pagehide", alSalir)
    }
  }, [])

  useEffect(() => {
    if (!activo || detenido) return
    let stream: MediaStream | null = null
    let cancelado = false
    let controles: { stop: () => void } | null = null
    const video = videoRef.current
    const detener = () => {
      controles?.stop()
      controles = null
      stream?.getTracks().forEach((track) => track.stop())
      if (video?.srcObject === stream) video.srcObject = null
    }
    setError(null)
    setIniciando(true)

    const iniciar = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelado) {
          detener()
          return
        }
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType, NotFoundException, ChecksumException, FormatException }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ])
        if (cancelado) {
          detener()
          return
        }
        if (!video) throw new Error("Vista de cámara no disponible")
        const lector = new BrowserMultiFormatReader(
          new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]),
          { delayBetweenScanAttempts: 250, delayBetweenScanSuccess: 500 },
        )
        controles = await lector.decodeFromStream(stream, video, (resultado, fallo, control) => {
          if (cancelado) return
          if (fallo && !(fallo instanceof NotFoundException || fallo instanceof ChecksumException || fallo instanceof FormatException)) {
            cancelado = true
            control.stop()
            detener()
            setActivo(false)
            setIniciando(false)
            setError(errorDeCamara(fallo))
            return
          }
          if (!resultado) return
          const isbn = isbnDeCodigo(resultado.getText())
          if (!isbn) return
          cancelado = true
          control.stop()
          detener()
          setActivo(false)
          setIniciando(false)
          detectarRef.current(isbn)
        })
        if (cancelado) detener()
        else setIniciando(false)
      } catch (fallo) {
        detener()
        if (cancelado) return
        setActivo(false)
        setIniciando(false)
        setError(errorDeCamara(fallo))
      }
    }

    void iniciar()
    return () => {
      cancelado = true
      detener()
    }
  }, [activo, detenido])

  if (disponibilidad === "https" || disponibilidad === "sin-camara") {
    return (
      <Card className="rounded-2xl border-dashed bg-muted/40 shadow-none">
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <Camera className="size-6 text-muted-foreground" />
          <Aviso tono="revisar" vivo={false} titulo={disponibilidad === "https" ? "La cámara necesita una conexión segura" : "La cámara no está disponible"}>
            {disponibilidad === "https"
              ? "Abre LEKTOR por HTTPS con un certificado confiable para este dispositivo. Por HTTP puedes escribir el ISBN a mano."
              : "Abre esta página en Safari o Chrome y permite el uso de la cámara. También puedes escribir el ISBN a mano."}
          </Aviso>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-border/60">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-950">
          <video ref={videoRef} autoPlay playsInline muted aria-label="Cámara para leer el código de barras ISBN" className="size-full object-cover" />
          {!activo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-200">
              <Camera className="size-8" />
              <p className="text-sm">Apunta al código de barras del tomo</p>
            </div>
          )}
          {activo && <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-primary" />}
        </div>
        <p role="status" className="text-xs text-muted-foreground">
          {activo ? iniciando ? "Iniciando cámara…" : "Apunta al código de barras ISBN (978 o 979), no a un QR. Busca buena luz y mantén el libro quieto." : "La cámara se usa solo para leer el ISBN; no se guardan ni se envían imágenes."}
        </p>
        {error && <Aviso titulo="No se pudo abrir la cámara">{error}</Aviso>}
        <Button
          type="button"
          variant={activo ? "secondary" : "default"}
          className="w-full rounded-xl"
          disabled={disponibilidad !== "lista" || detenido}
          onClick={() => setActivo((value) => !value)}
        >
          <Camera data-icon="inline-start" /> {activo ? "Detener escáner" : titulo}
        </Button>
      </CardContent>
    </Card>
  )
}
