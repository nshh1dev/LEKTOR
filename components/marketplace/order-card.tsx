"use client"

import { Clock3, PackageCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatOrden } from "@/components/marketplace/chat-orden"
import { type EstadoOrden, type OrdenUI } from "@/lib/catalog"
import { ESTADO_ORDEN_BADGE, ESTADO_ORDEN_LABEL, ESTADO_ORDEN_PASOS, METODO_ENTREGA_LABEL, formatCLP, formatDateTime, ordenCode, tiempoRestante } from "@/lib/format"

function PasoOrden({ estado }: { estado: EstadoOrden }) {
  if (estado === "cancelada") {
    return <Badge className={ESTADO_ORDEN_BADGE.cancelada}>Cancelada</Badge>
  }
  const pasoActual = ESTADO_ORDEN_PASOS.indexOf(estado)
  return (
    <div className="flex items-center gap-1">
      {ESTADO_ORDEN_PASOS.map((paso, index) => (
        <div key={paso} className="flex flex-1 flex-col gap-1">
          <div className={`h-1.5 rounded-full ${index <= pasoActual ? "bg-primary" : "bg-muted"}`} />
          <span className={`text-[10px] font-medium uppercase tracking-wide ${index <= pasoActual ? "text-foreground" : "text-muted-foreground/60"}`}>
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
  alCambiarEstado: (ordenId: string, estado: EstadoOrden) => void
}) {
  const contraparte = rol === "comprador" ? orden.vendedor : orden.comprador
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

  return (
    <Card className="rounded-xl">
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="size-4 text-primary" />
            {orden.tituloSnapshot}
          </CardTitle>
          <Badge className={ESTADO_ORDEN_BADGE[orden.estado]}>{ESTADO_ORDEN_LABEL[orden.estado]}</Badge>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-mono">{ordenCode(orden.id)}</span>
          <span>{formatDateTime(orden.fechaCreacion)}</span>
          <span>
            {rol === "comprador" ? "Vende" : "Compra"}: {contraparte.nombre}
              {contraparte.comuna ? ` · ${contraparte.comuna}` : ""}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PasoOrden estado={orden.estado} />
        <div className="grid gap-2 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Entrega</p>
            <p className="font-medium">{METODO_ENTREGA_LABEL[orden.datosDespacho.metodoEntrega as keyof typeof METODO_ENTREGA_LABEL] ?? orden.datosDespacho.metodoEntrega}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Recibe</p>
            <p className="font-medium">{orden.datosDespacho.nombreRecibe}</p>
            <p className="text-xs text-muted-foreground">{orden.datosDespacho.telefono}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-medium">{formatCLP(orden.total)}</p>
          </div>
        </div>
        {orden.estado === "reservada" && (
          <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
            <Clock3 className="size-3" /> La reserva expira en {tiempoRestante(orden.reservaExpiraEn)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {puedeAvanzar && siguiente && (
            <Button
              size="sm"
              className="rounded-lg"
              onClick={() => alCambiarEstado(orden.id, siguiente)}
            >
              {etiquetaAvance[siguiente] ?? "Avanzar"}
            </Button>
          )}
          {(orden.estado === "reservada" || orden.estado === "en_preparacion") && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={() => alCambiarEstado(orden.id, "cancelada")}
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
        </div>
      </CardContent>
    </Card>
  )
}
