"use client"

import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CreditCard, LoaderCircle, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Aviso, FaltanDatos } from "@/components/notificacion/avisos"
import { Sello } from "@/components/notificacion/sello"
import { mensajeDeFallo, resumenFaltantes } from "@/lib/avisos"
import { MensajeError } from "@/components/marketplace/shared"
import { ApiFailure } from "@/components/marketplace/api"
import { pagoFormSchema, type PagoFormValues } from "@/lib/catalog"
import { formatCLP } from "@/lib/format"
import {
  detectarMarca,
  formatearCodigoSeguridad,
  formatearNumeroTarjeta,
  formatearVencimiento,
  ultimosDigitos,
} from "@/lib/pago"

const ETIQUETAS_TARJETA: Record<string, string> = {
  numeroTarjeta: "Número de tarjeta",
  nombreTitular: "Nombre del titular",
  vencimiento: "Vencimiento",
  codigoSeguridad: "Código de seguridad",
}

/**
 * Ventana de la pasarela de pago. Reproduce el paso de pago por tarjeta: commerce,
 * monto, formulario y confirmación. Los datos de la tarjeta se validan en el
 * navegador y no se envían a la API.
 */
export function PagoView({
  abierto,
  monto,
  comercio,
  descripcion,
  alConfirmar,
  alCerrar,
}: {
  abierto: boolean
  monto: number
  comercio: string
  descripcion: string
  alConfirmar: (datos: PagoFormValues) => Promise<void>
  alCerrar: () => void
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoFormSchema),
    defaultValues: { numeroTarjeta: "", nombreTitular: "", vencimiento: "", codigoSeguridad: "" },
  })

  const [procesando, setProcesando] = useState(false)
  const [fallo, setFallo] = useState<{ titulo: string; ayuda: string } | null>(null)

  const numero = useWatch({ control, name: "numeroTarjeta" })
  const marca = detectarMarca(numero)

  // Sin `useMemo` a propósito: ver la nota en `checkout-view.tsx`. Memoizar
  // sobre el Proxy de `errors` dejaba la tarjeta marcada como faltante después
  // de corregirla.
  const faltan = resumenFaltantes(errors, ETIQUETAS_TARJETA, {
    numeroTarjeta: "numeroTarjeta",
    nombreTitular: "nombreTitular",
    vencimiento: "vencimiento",
    codigoSeguridad: "codigoSeguridad",
  })

  useEffect(() => {
    if (!abierto) {
      reset()
      setFallo(null)
      setProcesando(false)
    }
  }, [abierto, reset])

  const onSubmit = handleSubmit(async (datos) => {
    setProcesando(true)
    setFallo(null)
    try {
      await alConfirmar(datos)
    } catch (error) {
      const sinStock = error instanceof ApiFailure && error.reason === "stock-insuficiente"
      setFallo({
        titulo: mensajeDeFallo(error, "El pago no se pudo completar."),
        ayuda: sinStock
          ? "Otro lector se llevó el último ejemplar. Vuelve al detalle para ver alternativas."
          : "Revisa los datos de la tarjeta o prueba con otra tarjeta.",
      })
      setProcesando(false)
    }
  })

  return (
    <Dialog
      open={abierto}
      onOpenChange={(estado) => {
        if (!estado && !procesando) alCerrar()
      }}
    >
      <DialogContent
        showCloseButton={!procesando}
        className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <div className="filete-vertical flex items-center justify-between gap-3 border-b border-border/70 bg-foreground px-6 py-4 text-background">
          <div className="flex items-center gap-2">
            <Sello tono="ok" tamano="sm" className="text-acento" />
            <span className="font-serif text-lg tracking-tight">LEKTOR Pay</span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-widest text-background/70">
            <Lock className="size-3.5" /> Conexión segura
          </span>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5 px-6 py-6">
          <DialogHeader>
            <DialogTitle>Pagar {formatCLP(monto)}</DialogTitle>
            <DialogDescription>
              {comercio} · {descripcion}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="numeroTarjeta">Número de tarjeta</Label>
              <div className="relative">
                <Input
                  id="numeroTarjeta"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0000 0000 0000 0000"
                  className="pr-28 font-mono tracking-wider"
                  aria-invalid={errors.numeroTarjeta ? true : undefined}
                  aria-describedby={errors.numeroTarjeta ? "numeroTarjeta-error" : undefined}
                  {...register("numeroTarjeta", {
                    onChange: (event) =>
                      setValue("numeroTarjeta", formatearNumeroTarjeta(event.target.value), {
                        shouldValidate: event.target.value.length > 0,
                      }),
                  })}
                />
                {marca ? (
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {marca}
                  </span>
                ) : null}
              </div>
              <MensajeError campo="numeroTarjeta" mensaje={errors.numeroTarjeta?.message} />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="nombreTitular">Nombre del titular</Label>
              <Input
                id="nombreTitular"
                placeholder="Como aparece en la tarjeta"
                aria-invalid={errors.nombreTitular ? true : undefined}
                aria-describedby={errors.nombreTitular ? "nombreTitular-error" : undefined}
                {...register("nombreTitular")}
              />
              <MensajeError campo="nombreTitular" mensaje={errors.nombreTitular?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="vencimiento">Vencimiento</Label>
                <Input
                  id="vencimiento"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="MM/AA"
                  className="font-mono"
                  aria-invalid={errors.vencimiento ? true : undefined}
                  aria-describedby={errors.vencimiento ? "vencimiento-error" : undefined}
                  {...register("vencimiento", {
                    onChange: (event) =>
                      setValue("vencimiento", formatearVencimiento(event.target.value), {
                        shouldValidate: event.target.value.length > 0,
                      }),
                  })}
                />
                <MensajeError campo="vencimiento" mensaje={errors.vencimiento?.message} />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="codigoSeguridad">Código de seguridad</Label>
                <Input
                  id="codigoSeguridad"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="123"
                  className="font-mono"
                  aria-invalid={errors.codigoSeguridad ? true : undefined}
                  aria-describedby={errors.codigoSeguridad ? "codigoSeguridad-error" : undefined}
                  {...register("codigoSeguridad", {
                    onChange: (event) =>
                      setValue("codigoSeguridad", formatearCodigoSeguridad(event.target.value), {
                        shouldValidate: event.target.value.length > 0,
                      }),
                  })}
                />
                <MensajeError campo="codigoSeguridad" mensaje={errors.codigoSeguridad?.message} />
              </div>
            </div>
          </div>

          {numero && !errors.numeroTarjeta ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="size-3.5" /> Tarjeta terminada en{" "}
              {ultimosDigitos(numero)}
            </p>
          ) : null}

          {fallo ? (
            <Aviso tono="falla" titulo={fallo.titulo} rotulo="Pago rechazado">
              {fallo.ayuda}
            </Aviso>
          ) : null}

          {faltan.length > 0 && !fallo ? (
            <FaltanDatos
                titulo="Faltan datos de la tarjeta"
                datos={faltan}
              />
          ) : null}

          <Separator />

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl bg-acento text-acento-foreground shadow-none hover:bg-acento/90"
              disabled={procesando}
            >
              {procesando ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Lock className="size-4" />
              )}
              {procesando ? "Procesando pago" : `Pagar ${formatCLP(monto)}`}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={procesando}
              onClick={alCerrar}
            >
              Volver al pedido
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Al pagar aceptas las condiciones de compra de {comercio}.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
