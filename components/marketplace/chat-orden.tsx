"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LoaderCircle, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { avisar } from "@/components/notificacion/avisar"
import { mensajeDeFallo } from "@/lib/avisos"
import { api } from "@/components/marketplace/api"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

type MensajeUI = {
  id: string
  mensaje: string
  fechaCreacion: string
  emisor: { id: string; nombre: string }
}

const INTERVALO_MS = 4000

/**
 * El chat se abre desde la tarjeta de una orden, así que solo existe cuando hubo
 * una compra: es la conversación del comprador con el vendedor de ese ejemplar.
 * Mientras el diálogo está abierto va leyendo el hilo cada 4 segundos.
 */
export function ChatOrden({
  ordenId,
  yoId,
  contraparte,
  titulo,
}: {
  ordenId: string
  yoId: string
  contraparte: string
  titulo: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeUI[]>([])
  const [texto, setTexto] = useState("")
  const [cargando, setCargando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const finHilo = useRef<HTMLDivElement | null>(null)

  const leer = useCallback(async () => {
    const data = await api<{ mensajes: MensajeUI[] }>(`/api/orders/${ordenId}/chat`)
    setMensajes(data.mensajes)
  }, [ordenId])

  useEffect(() => {
    if (!abierto) return
    let vigente = true
    const consultar = async () => {
      try {
        await leer()
      } catch (error) {
        if (vigente) {
          avisar.falla({
            titulo: "No pudimos leer el chat",
            descripcion: mensajeDeFallo(error, "Intenta de nuevo en un momento."),
          })
        }
      } finally {
        if (vigente) setCargando(false)
      }
    }
    setCargando(true)
    void consultar()
    const temporizador = setInterval(() => void consultar(), INTERVALO_MS)
    return () => {
      vigente = false
      clearInterval(temporizador)
      setCargando(false)
    }
  }, [abierto, leer])

  useEffect(() => {
    if (abierto) finHilo.current?.scrollIntoView({ block: "end" })
  }, [abierto, mensajes])

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    const mensaje = texto.trim()
    if (mensaje.length === 0 || enviando) return
    setEnviando(true)
    try {
      const data = await api<{ mensaje: MensajeUI }>(`/api/orders/${ordenId}/chat`, {
        method: "POST",
        body: JSON.stringify({ mensaje }),
      })
      setMensajes((previos) => [...previos, data.mensaje])
      setTexto("")
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo enviar el mensaje",
        descripcion: mensajeDeFallo(error, "Revisa que el mensaje no esté vacío."),
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="rounded-none hover:bg-transparent">
          <MessageCircle data-icon="inline-start" /> Chat de la compra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat con {contraparte}</DialogTitle>
          <DialogDescription>{titulo}</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 min-h-40 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/40 p-3">
          {cargando && mensajes.length === 0 ? (
            <p className="flex items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Cargando el hilo
            </p>
          ) : null}
          {!cargando && mensajes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay mensajes. Coordinen la entrega por aquí.
            </p>
          ) : null}
          {mensajes.map((item) => {
            const propio = item.emisor.id === yoId
            return (
              <div key={item.id} className={cn("flex flex-col gap-1", propio ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    propio ? "bg-primary text-primary-foreground" : "bg-background ring-1 ring-border/60",
                  )}
                >
                  {item.mensaje}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {item.emisor.nombre} · {formatDateTime(item.fechaCreacion)}
                </span>
              </div>
            )
          })}
          <div ref={finHilo} />
        </div>

        <form onSubmit={enviar} className="flex gap-2">
          <Input
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Escribe un mensaje"
            maxLength={1000}
            aria-label="Mensaje"
          />
          <Button type="submit" size="icon" aria-label="Enviar mensaje" disabled={enviando || texto.trim().length === 0}>
            {enviando ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
