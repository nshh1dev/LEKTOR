"use client"

import { useEffect, useRef, useState } from "react"
import { LoaderCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { avisar } from "@/components/notificacion/avisar"
import { mensajeDeFallo } from "@/lib/avisos"
import { api } from "@/components/marketplace/api"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ConversacionDetalleUI, MensajeConversacionUI } from "@/lib/catalog"

const INTERVALO_MS = 4000

/**
 * El contacto previo es la conversación antes de la compra: un lector le
 * escribe al vendedor de una publicación y el hilo queda entre los dos, igual
 * que el chat de una orden. Desde el detalle se abre con una pregunta nueva; ya
 * creada, se reabre con su id para seguir el hilo.
 */
export function DialogoContacto({
  abierto,
  onOpenChange,
  yoId,
  conversacionId,
  nueva,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  yoId: string
  conversacionId?: string | null
  nueva?: {
    publicacionId: string
    publicacionTitulo: string
    vendedorNombre: string
  } | null
}) {
  const [conversacion, setConversacion] = useState<ConversacionDetalleUI | null>(null)
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const finHilo = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (abierto) {
      setConversacion(null)
      setTexto("")
    }
  }, [abierto, conversacionId, nueva?.publicacionId, yoId])

  const idActivo = abierto ? (conversacion?.id ?? conversacionId) : null

  useEffect(() => {
    if (!idActivo) return
    let vigente = true
    const consultar = async () => {
      try {
        const data = await api<{ conversacion: ConversacionDetalleUI }>(
          `/api/conversaciones/${idActivo}`,
        )
        if (vigente) setConversacion(data.conversacion)
      } catch (error) {
        if (vigente) {
          avisar.falla({
            titulo: "No pudimos leer la conversación",
            descripcion: mensajeDeFallo(error, "Intenta de nuevo en un momento."),
          })
        }
      }
    }
    void consultar()
    const temporizador = setInterval(() => void consultar(), INTERVALO_MS)
    return () => {
      vigente = false
      clearInterval(temporizador)
    }
  }, [idActivo])

  useEffect(() => {
    if (abierto) finHilo.current?.scrollIntoView({ block: "end" })
  }, [abierto, conversacion])

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    const mensaje = texto.trim()
    if (mensaje.length === 0 || enviando) return
    setEnviando(true)
    try {
      if (conversacion) {
        const data = await api<{ mensaje: MensajeConversacionUI }>(
          `/api/conversaciones/${conversacion.id}`,
          { method: "POST", body: JSON.stringify({ mensaje }) },
        )
        setConversacion((previo) =>
          previo ? { ...previo, mensajes: [...previo.mensajes, data.mensaje] } : previo,
        )
      } else if (nueva) {
        const data = await api<{ conversacion: ConversacionDetalleUI }>("/api/conversaciones", {
          method: "POST",
          body: JSON.stringify({ publicacionId: nueva.publicacionId, mensaje }),
        })
        setConversacion(data.conversacion)
      } else {
        return
      }
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

  const cargando = abierto && Boolean(conversacionId) && conversacion === null
  const hiloTitulo = conversacion?.contraparte.nombre ?? nueva?.vendedorNombre
  const publicacionTitulo = conversacion?.publicacionTitulo ?? nueva?.publicacionTitulo

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contacto previo con {hiloTitulo}</DialogTitle>
          <DialogDescription>
            {publicacionTitulo}. La conversación queda entre {hiloTitulo} y tú; la administración no
            entra.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-72 min-h-40 flex-col gap-3 overflow-y-auto rounded-lg bg-muted/40 p-3">
          {cargando ? (
            <p className="flex items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Cargando el hilo
            </p>
          ) : null}
          {!cargando && conversacion && conversacion.mensajes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Todavía no hay mensajes. Coordinen la consulta por aquí.
            </p>
          ) : null}
          {!cargando && !conversacion ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no empieza el hilo. Tu pregunta solo la verá el vendedor.
            </p>
          ) : null}
          {conversacion?.mensajes.map((item) => {
            const propio = item.emisor.id === yoId
            return (
              <div
                key={item.id}
                className={cn("flex flex-col gap-1", propio ? "items-end" : "items-start")}
              >
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
            placeholder="Escribe tu pregunta"
            maxLength={1000}
            aria-label="Mensaje"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Enviar mensaje"
            disabled={enviando || texto.trim().length === 0}
          >
            {enviando ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
