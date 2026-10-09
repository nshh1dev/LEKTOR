"use client"

import { useCallback, useEffect, useState } from "react"
import { LoaderCircle, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Aviso } from "@/components/notificacion/avisos"
import { Sello } from "@/components/notificacion/sello"
import { api } from "@/components/marketplace/api"
import {
  COMISION_PLATAFORMA,
  comisionPlataforma,
  type DatosDespachoUI,
  type OrdenDetalleUI,
  type ParteOrdenUI,
} from "@/lib/catalog"
import { ESTADO_ORDEN_LABEL, METODO_ENTREGA_LABEL, formatCLP, formatDateTime, ordenCode, tiempoRestante } from "@/lib/format"

type EstadoCarga = "inactivo" | "cargando" | "listo" | "fallido"

/**
 * Trae el detalle de la orden con el contacto liberado de las dos partes. Es el
 * mismo endpoint que usa el panel del seller, así que el comprobante nunca
 * inventa datos: si el servidor no los entrega, no se muestran.
 */
export function useDetalleOrden(ordenId: string | null): {
  orden: OrdenDetalleUI | null
  estado: EstadoCarga
  error: string | null
  recargar: () => void
} {
  const [orden, setOrden] = useState<OrdenDetalleUI | null>(null)
  const [estado, setEstado] = useState<EstadoCarga>("inactivo")
  const [error, setError] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!ordenId) {
      setOrden(null)
      setEstado("inactivo")
      setError(null)
      return
    }

    let vigente = true
    setEstado("cargando")
    setError(null)

    api<{ order: OrdenDetalleUI }>(`/api/orders/${ordenId}`)
      .then((data) => {
        if (!vigente) return
        setOrden(data.order)
        setEstado("listo")
      })
      .catch((fallo: unknown) => {
        if (!vigente) return
        setOrden(null)
        setEstado("fallido")
        setError(fallo instanceof Error ? fallo.message : "No se pudo cargar el comprobante")
      })

    return () => {
      vigente = false
    }
  }, [ordenId, intento])

  const recargar = useCallback(() => setIntento((valor) => valor + 1), [])

  return { orden, estado, error, recargar }
}

function Fila({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string
  valor: string
  destacado?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className={destacado ? "text-right font-serif text-xl font-semibold" : "text-right font-medium"}>
        {valor}
      </dd>
    </div>
  )
}

function BloqueParte({ titulo, parte }: { titulo: string; parte: ParteOrdenUI }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="rotulo">{titulo}</p>
      <p className="font-semibold">{parte.nombre}</p>
      <p className="font-mono text-xs break-all text-muted-foreground">{parte.email}</p>
      {parte.telefono ? <p className="font-mono text-sm">{parte.telefono}</p> : null}
      <p className="text-xs text-muted-foreground">
        {[parte.comuna, parte.region].filter(Boolean).join(", ") || "Sin comuna informada"}
      </p>
    </div>
  )
}

function LineaDespacho({ entrega }: { entrega: DatosDespachoUI }) {
  const metodo = METODO_ENTREGA_LABEL[entrega.metodoEntrega] ?? entrega.metodoEntrega
  const destino = entrega.direccion ?? entrega.puntoRetiro
  return (
    <div className="flex flex-col gap-1">
      <p className="rotulo">Despacho</p>
      <p className="text-sm font-medium">{metodo}</p>
      {destino ? <p className="text-sm text-muted-foreground">{destino}</p> : null}
      <p className="text-xs text-muted-foreground">
        Recibe {entrega.nombreRecibe} · {entrega.telefono}
      </p>
      <p className="text-xs text-muted-foreground">
        {[entrega.comuna, entrega.region].filter(Boolean).join(", ")}
      </p>
    </div>
  )
}

/**
 * Comprobante de Orden de Compra. Documenta lo que ocurrió en la transacción y
 * libera el contacto de las dos partes para que el acuerdo sea directo.
 */
export function Comprobante({
  orden,
  alImprimir,
  className,
}: {
  orden: OrdenDetalleUI
  alImprimir?: () => void
  className?: string
}) {
  const { publicacion, datosDespacho } = orden
  const comision = comisionPlataforma(orden.subtotal)
  const parteVendedor = orden.subtotal - comision
  const entrega: DatosDespachoUI = {
    ...datosDespacho,
    direccion: datosDespacho.direccion ?? null,
    puntoRetiro: datosDespacho.puntoRetiro ?? null,
  }

  return (
    <article
      className={`comprobante-documento papel flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-5 text-left text-sm sombra-tomo ${className ?? ""}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sello tono="ok" tamano="lg" fijo className="text-acento" />
          <div className="flex flex-col">
            <p className="font-serif text-2xl leading-none tracking-tight">LEKTOR</p>
            <p className="text-xs text-muted-foreground">Marketplace de libros usados</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <p className="rotulo">Comprobante de Orden de Compra</p>
          <p className="text-xs text-muted-foreground">Emisión digital</p>
        </div>
      </header>

      <div className="filete" />

      <dl className="flex flex-col divide-y divide-dashed divide-border/70">
        <Fila etiqueta="Código de orden" valor={ordenCode(orden.id, orden.fechaCreacion)} />
        <Fila etiqueta="Fecha de emisión" valor={formatDateTime(orden.fechaCreacion)} />
        <Fila etiqueta="Estado de la orden" valor={ESTADO_ORDEN_LABEL[orden.estado]} />
        {orden.estado === "reservada" ? (
          <Fila etiqueta="Reserva expira en" valor={tiempoRestante(orden.reservaExpiraEn)} />
        ) : null}
        <Fila etiqueta="Método de pago" valor="Tarjeta de crédito" />
      </dl>

      <div className="flex flex-col gap-2">
        <p className="rotulo">Detalle del ejemplar</p>
        <p className="font-serif text-lg font-semibold leading-tight">{orden.tituloSnapshot}</p>
        {publicacion ? (
          <p className="text-muted-foreground">
            {[publicacion.autor, publicacion.editorial, publicacion.volumen ? `Vol. ${publicacion.volumen}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="text-muted-foreground">La publicación fue retirada del catálogo.</p>
        )}
        {publicacion ? (
          <p className="text-muted-foreground">
            {[publicacion.categoria, publicacion.condicion].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <div className="filete" />
        <dl className="flex flex-col">
          <Fila etiqueta="Cantidad" valor={String(orden.cantidad)} />
          <Fila etiqueta="Precio unitario" valor={formatCLP(orden.precioUnitario)} />
          <Fila etiqueta="Subtotal" valor={formatCLP(orden.subtotal)} />
        </dl>
      </div>

      <div className="flex flex-col gap-1">
        <p className="rotulo">Totales</p>
        <dl className="flex flex-col">
          <Fila etiqueta="Subtotal" valor={formatCLP(orden.subtotal)} />
          <Fila etiqueta="Envío" valor={orden.envio > 0 ? formatCLP(orden.envio) : "Por coordinar"} />
        </dl>
        <div className="filete mt-1" />
        <dl className="flex flex-col">
          <Fila etiqueta="Total de la orden" valor={formatCLP(orden.total)} destacado />
        </dl>
        <div className="filete" />
        <dl className="flex flex-col">
          <Fila
            etiqueta={`Comisión de la plataforma (${COMISION_PLATAFORMA * 100}%)`}
            valor={formatCLP(comision)}
          />
          <Fila etiqueta="Parte del vendedor" valor={formatCLP(parteVendedor)} />
        </dl>
        <p className="text-xs text-muted-foreground">
          Del total pagado, LEKTOR retiene su comisión de plataforma y el vendedor recibe la
          diferencia sobre el subtotal.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <p className="rotulo">Contacto liberado para el acuerdo P2P</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <BloqueParte titulo="Vendedor" parte={orden.vendedor} />
          <BloqueParte titulo="Comprador" parte={orden.comprador} />
        </div>
        <div className="filete" />
        <LineaDespacho entrega={entrega} />
      </div>

      <div className="filete" />

      <footer className="flex flex-col gap-2">
        {alImprimir ? (
          <Button variant="outline" className="print:hidden w-fit rounded-xl" onClick={alImprimir}>
            <Printer data-icon="inline-start" /> Imprimir comprobante
          </Button>
        ) : null}
      </footer>
    </article>
  )
}

/**
 * Comprobante montado en la propia página, sin diálogo. Es lo que ve el
 * comprador apenas vuelve del pago: la orden ya existe, así que el comprobante
 * se pide al endpoint y se muestra en cuanto llega.
 */
export function ComprobanteCarga({ ordenId }: { ordenId: string }) {
  const { orden, estado, error, recargar } = useDetalleOrden(ordenId)

  if (estado === "listo" && orden) {
    return <Comprobante orden={orden} alImprimir={() => window.print()} className="w-full" />
  }

  if (estado === "fallido") {
    return (
      <div className="flex w-full flex-col items-start gap-3 rounded-2xl border border-border/70 p-5 text-left">
        <Aviso tono="falla" titulo="No se pudo emitir el comprobante">
          {error}
        </Aviso>
        <Button variant="outline" className="rounded-xl" onClick={recargar}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <p className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 p-10 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" /> Emitiendo el comprobante
    </p>
  )
}

/**
 * El comprobante abierto sobre una orden existente. Trae el detalle al abrirse
 * para no inflar la lista del perfil, y solo lo muestra a quien es parte de la
 * orden: el endpoint aplica el mismo control de acceso que el resto del dominio.
 */
export function DialogoComprobante({
  ordenId,
  alCerrar,
}: {
  ordenId: string | null
  alCerrar: () => void
}) {
  const { orden, estado, error, recargar } = useDetalleOrden(ordenId)

  return (
    <Dialog open={ordenId !== null} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent className="comprobante-hoja max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Comprobante de Orden de Compra</DialogTitle>
          <DialogDescription>
            Detalle de la compra, con el contacto liberado para coordinar la entrega.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 sm:p-6">
          {estado === "cargando" ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Cargando el comprobante
            </p>
          ) : estado === "fallido" ? (
            <div className="flex flex-col items-start gap-3 py-6">
              <Aviso tono="falla" titulo="No se pudo cargar el comprobante">
                {error}
              </Aviso>
              <Button variant="outline" className="rounded-xl" onClick={recargar}>
                Reintentar
              </Button>
            </div>
          ) : orden ? (
            <Comprobante orden={orden} alImprimir={() => window.print()} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
