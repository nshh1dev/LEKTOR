"use client"

import { useState } from "react"
import { Clock3, FileText, PackageCheck, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmarAccion } from "@/components/notificacion/confirmar-accion"
import { ChatOrden } from "@/components/marketplace/chat-orden"
import { DialogoComprobante } from "@/components/marketplace/comprobante"
import { DialogoValoracion } from "@/components/marketplace/dialogo-valoracion"
import { type EstadoOrden, type OrdenUI } from "@/lib/catalog"
import { formatearTelefono } from "@/lib/entrada"
import { ESTADO_ORDEN_LABEL, ESTADO_ORDEN_PASOS, METODO_ENTREGA_LABEL, formatCLP, formatDateTime, ordenCode, tiempoRestante } from "@/lib/format"

function PasoOrden({ estado }: { estado: EstadoOrden }) {
  if (estado === "cancelada") {
    return null
  }
  const pasoActual = ESTADO_ORDEN_PASOS.indexOf(estado)
  return (
    <div aria-label={`Estado de la orden: ${ESTADO_ORDEN_LABEL[estado]}`} className="grid grid-cols-4 gap-1.5">
      {ESTADO_ORDEN_PASOS.map((paso, index) => (
        <div key={paso} className="flex min-w-0 flex-col gap-2">
          <div className={`h-1 ${index <= pasoActual ? "bg-acento" : "bg-muted"}`} />
          <span className={`text-[10px] font-medium leading-snug sm:text-xs ${index === pasoActual ? "text-acento" : "text-muted-foreground"}`}>
            {ESTADO_ORDEN_LABEL[paso]}
          </span>
        </div>
      ))}
    </div>
  )
}

export function TarjetaOrden({
  orden,
  rol,
  yoId,
  alCambiarEstado,
}: {
  orden: OrdenUI
  rol: "comprador" | "vendedor"
  yoId: string
  alCambiarEstado: (ordenId: string, estado: EstadoOrden) => void | Promise<void>
}) {
  const contraparte = rol === "comprador" ? orden.vendedor : orden.comprador
  const [comprobanteAbierto, setComprobanteAbierto] = useState(false)
  const [cancelacionAbierta, setCancelacionAbierta] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [valorando, setValorando] = useState(false)
  const [valoradoLocal, setValoradoLocal] = useState(false)
  const yaValorada = orden.valorada || valoradoLocal
  // El vendedor recorre los cuatro pasos: prepara, despacha y el comprador confirma.
  const siguiente: EstadoOrden | null =
    orden.estado === "reservada"
      ? "en_preparacion"
      : orden.estado === "en_preparacion"
        ? "despachada"
        : orden.estado === "despachada"
          ? "recibida"
          : null
  const puedeAvanzar =
    siguiente !== null && (rol === "vendedor" ? siguiente !== "recibida" : siguiente === "recibida")
  const etiquetaAvance: Record<string, string> = {
    en_preparacion: "Marcar en preparación",
    despachada: "Marcar despachada",
    recibida: "Confirmar recepción",
  }
  const indicacion: Record<EstadoOrden, string> = {
    reservada: rol === "comprador" ? "Tu ejemplar está reservado. Coordina el pago con el vendedor." : "Coordina el pago con el comprador y prepara el ejemplar.",
    en_preparacion: rol === "comprador" ? "El vendedor está preparando tu ejemplar." : "Prepara la entrega y marca el despacho cuando esté listo.",
    despachada: rol === "comprador" ? "Confirma la recepción cuando tengas el ejemplar." : "El comprador debe confirmar que recibió el ejemplar.",
    recibida: "Entrega completada.",
    cancelada: "La orden se canceló. El chat sigue disponible para coordinar cualquier devolución.",
  }
  const restante = orden.estado === "reservada" ? tiempoRestante(orden.reservaExpiraEn) : null

  return (
    <article className="flex flex-col gap-5 border-b border-border/60 py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="flex min-w-0 items-start gap-2 text-lg font-semibold">
              <PackageCheck className="mt-1 size-4 shrink-0 text-acento" />
              <span className="break-words">{orden.tituloSnapshot}</span>
            </h3>
            <span className={`text-xs font-medium ${orden.estado === "cancelada" ? "text-muted-foreground" : "text-acento"}`}>{ESTADO_ORDEN_LABEL[orden.estado]}</span>
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{ordenCode(orden.id, orden.fechaCreacion)}</span>
            <span>{formatDateTime(orden.fechaCreacion)}</span>
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-xs text-muted-foreground">Total de la orden</p>
          <p className="font-serif text-2xl font-semibold text-acento">{formatCLP(orden.total)}</p>
        </div>
      </header>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
        <dl className="grid grid-cols-2 content-start gap-x-5 gap-y-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">{rol === "comprador" ? "Vendedor" : "Comprador"}</dt>
            <dd className="mt-1 break-words font-medium">{contraparte.nombre}{contraparte.comuna ? ` · ${contraparte.comuna}` : ""}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Entrega</dt>
            <dd className="mt-1 font-medium">{METODO_ENTREGA_LABEL[orden.datosDespacho.metodoEntrega as keyof typeof METODO_ENTREGA_LABEL] ?? orden.datosDespacho.metodoEntrega}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Recibe</dt>
            <dd className="mt-1 break-words font-medium">{orden.datosDespacho.nombreRecibe}</dd>
            <dd className="mt-1 text-xs text-muted-foreground">{formatearTelefono(orden.datosDespacho.telefono)}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-3">
          <PasoOrden estado={orden.estado} />
          <p className="text-sm leading-relaxed text-muted-foreground">{indicacion[orden.estado]}</p>
          {restante !== null && (
            <p className="flex items-center gap-2 text-xs text-acento">
              <Clock3 className="size-3 shrink-0" /> {restante === "expirada" ? "El plazo de la reserva venció." : `Reserva disponible por ${restante}`}
            </p>
          )}
        </div>
      </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {puedeAvanzar && siguiente && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-none text-acento hover:bg-transparent"
              onClick={() => alCambiarEstado(orden.id, siguiente)}
            >
              {etiquetaAvance[siguiente] ?? "Avanzar"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="rounded-none hover:bg-transparent"
            onClick={() => setComprobanteAbierto(true)}
          >
            <FileText data-icon="inline-start" /> Ver comprobante
          </Button>
          {(orden.estado === "reservada" || orden.estado === "en_preparacion") && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-none hover:bg-transparent"
              disabled={cancelando}
              onClick={() => setCancelacionAbierta(true)}
            >
              {orden.estado === "reservada" ? "Liberar reserva" : "Cancelar orden"}
            </Button>
          )}
          {/* Cancelada incluida: la conversación sirve para acordar la devolución. */}
          <ChatOrden
            ordenId={orden.id}
            yoId={yoId}
            contraparte={contraparte.nombre}
            titulo={orden.tituloSnapshot}
          />
          {rol === "comprador" && orden.estado === "recibida" && orden.publicacionId && !yaValorada && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-none text-acento hover:bg-transparent"
              onClick={() => setValorando(true)}
            >
              <Star data-icon="inline-start" /> Valorar compra
            </Button>
          )}
          {rol === "comprador" && orden.estado === "recibida" && yaValorada && (
            <span className="flex items-center gap-1.5 self-center text-xs font-medium text-muted-foreground">
              <Star className="size-3.5 fill-acento text-acento" /> Valoración hecha
            </span>
          )}
        </div>

      <ConfirmarAccion
        abierto={cancelacionAbierta}
        tono="revisar"
        titulo="¿Cancelar esta orden?"
        descripcion={`La orden ${ordenCode(orden.id, orden.fechaCreacion)} por "${orden.tituloSnapshot}" se cancelará y el ejemplar reservado se devolverá al stock de la publicación.`}
        confirmTexto="Confirmar cancelación"
        cancelTexto="Volver"
        cargando={cancelando}
        onConfirmar={async () => {
          if (cancelando) return
          setCancelando(true)
          try {
            await alCambiarEstado(orden.id, "cancelada")
          } finally {
            setCancelando(false)
            setCancelacionAbierta(false)
          }
        }}
        onCerrar={() => {
          if (!cancelando) setCancelacionAbierta(false)
        }}
      />
      <DialogoComprobante
        ordenId={comprobanteAbierto ? orden.id : null}
        alCerrar={() => setComprobanteAbierto(false)}
      />
      <DialogoValoracion
        orden={valorando ? orden : null}
        abierto={valorando}
        onOpenChange={(abierto) => !abierto && setValorando(false)}
        onValorada={(ordenId) => {
          if (orden.id === ordenId) setValoradoLocal(true)
          setValorando(false)
        }}
      />
    </article>
  )
}
