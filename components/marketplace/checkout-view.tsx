"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CreditCard, LoaderCircle, Lock, MapPin, PackageCheck, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { avisar } from "@/components/notificacion/avisar"
import { FaltanDatos } from "@/components/notificacion/avisos"
import { Sello } from "@/components/notificacion/sello"
import { resumenFaltantes } from "@/lib/avisos"
import { COSTO_ENVIO_DOMICILIO, REGIONES, RESERVA_HORAS, checkoutFormSchema, type CheckoutFormValues, type OrdenUI, type PublicacionListItem, type SesionUsuario } from "@/lib/catalog"
import { formatearTelefono } from "@/lib/entrada"
import { METODO_ENTREGA_LABEL, formatCLP, ordenCode } from "@/lib/format"
import { MensajeError } from "@/components/marketplace/shared"
import { PagoView } from "@/components/marketplace/pago-view"
import { ComprobanteCarga } from "@/components/marketplace/comprobante"
import { api } from "@/components/marketplace/api"
import { Portada } from "@/components/marketplace/hero"

const ETIQUETAS_ENTREGA: Record<string, string> = {
  nombreRecibe: "Quién recibe",
  telefono: "Teléfono",
  metodoEntrega: "Método de entrega",
  direccion: "Dirección completa",
  comuna: "Comuna",
  region: "Región",
  puntoRetiro: "Punto de retiro",
}

export function CheckoutView({
  publicacion,
  usuario,
  onVolver,
  onConfirmada,
  ordenConfirmada,
  onVerPerfil,
}: {
  publicacion: PublicacionListItem
  usuario: SesionUsuario
  onVolver: () => void
  onConfirmada: (orden: OrdenUI) => void
  ordenConfirmada: OrdenUI | null
  onVerPerfil: () => void
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      nombreRecibe: usuario.nombre,
      telefono: usuario.telefono ? formatearTelefono(usuario.telefono) : "",
      metodoEntrega: "envio_domicilio",
      direccion: "",
      comuna: "",
      region: "",
      puntoRetiro: "",
    },
  })

  const metodoEntrega = useWatch({ control, name: "metodoEntrega" })
  const telefonoActual = useWatch({ control, name: "telefono" })
  const regionActual = useWatch({ control, name: "region" })
  const envio = metodoEntrega === "envio_domicilio" ? COSTO_ENVIO_DOMICILIO : 0
  const total = publicacion.precio + envio
  const [datosDespacho, setDatosDespacho] = useState<CheckoutFormValues | null>(null)
  const [pagando, setPagando] = useState(false)

  // Sin `useMemo` a propósito: `errors` de react-hook-form es un Proxy que la
  // librería puede reutilizar cuando un campo deja de tener error, y memoizar
  // sobre él dejaba en `FaltanDatos` los datos que la persona ya había
  // completado. `resumenFaltantes` recorre unos pocos campos, no compensa memoizar.
  const faltan = resumenFaltantes(errors, ETIQUETAS_ENTREGA, {
    nombreRecibe: "nombreRecibe",
    telefono: "telefono",
    direccion: "direccion",
    comuna: "comuna",
    region: "region",
    puntoRetiro: "puntoRetiro",
  })

  if (ordenConfirmada && ordenConfirmada.publicacionId === publicacion.id) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 py-8 text-center">
        <Sello tono="ok" tamano="lg" className="animate-sello" />
        <div className="flex flex-col gap-2">
          <p className="rotulo text-aviso-ok">Reserva confirmada</p>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">Reserva confirmada</h1>
          <p className="mx-auto max-w-md text-muted-foreground">
            <span className="text-foreground">{ordenConfirmada.tituloSnapshot}</span> quedó reservado por ti.{" "}
            El vendedor tiene {RESERVA_HORAS} horas para coordinar la entrega antes de que el
            ejemplar vuelva al catálogo.
          </p>
        </div>

        <ComprobanteCarga ordenId={ordenConfirmada.id} />

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
            onClick={onVerPerfil}
          >
            Ver mis compras
          </Button>
          <Button size="lg" variant="outline" className="rounded-xl" onClick={onVolver}>
            Volver al detalle
          </Button>
        </div>
      </div>
    )
  }

  const pagar = async () => {
    if (!datosDespacho) return
    setPagando(true)
    try {
      const data = await api<{ order: OrdenUI; vendedor: OrdenUI["vendedor"] | null }>(
        "/api/orders",
        {
          method: "POST",
          body: JSON.stringify({
            publicacionId: publicacion.id,
            datosDespacho: {
              nombreRecibe: datosDespacho.nombreRecibe,
              telefono: datosDespacho.telefono,
              metodoEntrega: datosDespacho.metodoEntrega,
              direccion: datosDespacho.direccion.trim() || null,
              comuna: datosDespacho.comuna,
              region: datosDespacho.region,
              puntoRetiro: datosDespacho.puntoRetiro.trim() || null,
            },
          }),
        },
      )
      avisar.ok({
        titulo: "Pago aprobado",
        descripcion: "El ejemplar quedó reservado a tu nombre.",
        referencia: ordenCode(data.order.id, data.order.fechaCreacion),
        duracion: 6000,
      })
      setDatosDespacho(null)
      setPagando(false)
      onConfirmada({
        ...data.order,
        vendedor: data.vendedor ?? data.order.vendedor,
        publicacionId: publicacion.id,
      })
    } catch (error) {
      setPagando(false)
      throw error instanceof Error ? error : new Error("No se pudo completar la compra")
    }
  }

  const onSubmit = handleSubmit((values) => {
    setDatosDespacho(values)
  })

  return (
    <div className="mx-auto max-w-6xl">
      <button
        type="button"
        onClick={onVolver}
        className="mb-6 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al detalle
      </button>

      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Finaliza tu compra</CardTitle>
            <CardDescription>
              Pagas directo al vendedor. El ejemplar se aparta apenas confirmes.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">1. Datos de entrega</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="nombreRecibe">Quien recibe</Label>
                  <Input aria-invalid={errors.nombreRecibe ? true : undefined} aria-describedby={errors.nombreRecibe ? "nombreRecibe-error" : undefined} id="nombreRecibe" {...register("nombreRecibe")} />
                  <MensajeError campo="nombreRecibe" mensaje={errors.nombreRecibe?.message} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input aria-invalid={errors.telefono ? true : undefined} aria-describedby={errors.telefono ? "telefono-error" : undefined} id="telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" className="font-mono" value={telefonoActual ?? ""} onChange={(event) => setValue("telefono", formatearTelefono(event.target.value), { shouldValidate: true })} />
                  <MensajeError campo="telefono" mensaje={errors.telefono?.message} />
                </div>
              </div>

              <Label>Metodo de entrega</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {(["envio_domicilio", "retiro_punto", "coordinar"] as const).map((opcion) => (
                  <button
                    type="button"
                    key={opcion}
                    aria-pressed={metodoEntrega === opcion}
                    onClick={() => setValue("metodoEntrega", opcion, { shouldValidate: true })}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 p-3 text-left text-sm transition-colors ${
                      metodoEntrega === opcion ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    {opcion === "envio_domicilio" ? (
                      <Truck className="size-4" />
                    ) : opcion === "retiro_punto" ? (
                      <MapPin className="size-4" />
                    ) : (
                      <PackageCheck className="size-4" />
                    )}
                    {METODO_ENTREGA_LABEL[opcion]}
                  </button>
                ))}
              </div>

              {metodoEntrega === "envio_domicilio" && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="direccion">Dirección completa</Label>
                  <Input aria-invalid={errors.direccion ? true : undefined} aria-describedby={errors.direccion ? "direccion-error" : undefined} id="direccion" placeholder="Calle, número, depto" {...register("direccion")} />
                  <MensajeError campo="direccion" mensaje={errors.direccion?.message} />
                </div>
              )}

              {metodoEntrega === "retiro_punto" && (
                <div className="flex flex-col gap-1">
                  <Label htmlFor="puntoRetiro">Punto de retiro</Label>
                  <Input aria-invalid={errors.puntoRetiro ? true : undefined} aria-describedby={errors.puntoRetiro ? "puntoRetiro-error" : undefined} id="puntoRetiro" placeholder="Bluexpress Providencia" {...register("puntoRetiro")} />
                  <MensajeError campo="puntoRetiro" mensaje={errors.puntoRetiro?.message} />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="comuna">Comuna</Label>
                  <Input aria-invalid={errors.comuna ? true : undefined} aria-describedby={errors.comuna ? "comuna-error" : undefined} id="comuna" placeholder="Providencia" {...register("comuna")} />
                  <MensajeError campo="comuna" mensaje={errors.comuna?.message} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="region">Region</Label>
                  <Select
                    value={regionActual || undefined}
                    onValueChange={(value) => setValue("region", value, { shouldValidate: true })}
                  >
                    <SelectTrigger
                      id="region"
                      className="w-full"
                      aria-invalid={errors.region ? true : undefined}
                      aria-describedby={errors.region ? "region-error" : undefined}
                    >
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONES.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <MensajeError campo="region" mensaje={errors.region?.message} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">2. Pago</h2>
              <Card className="rounded-xl bg-muted/40 shadow-none">
                <CardContent className="flex items-center gap-3 p-4 text-sm">
                  <CreditCard className="size-5 shrink-0 text-primary" />
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium">Pago con tarjeta</p>
                    <p className="text-muted-foreground">
                      Te llevamos a la pasarela de LEKTOR Pay para completar el pago de{" "}
                      {formatCLP(total)}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-16 shrink-0">
                  <Portada publicacion={publicacion} foto={publicacion.fotos[0]} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{publicacion.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                      {publicacion.condicion} · Vende {publicacion.vendedorNombre}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ejemplar</span>
                  <span>{formatCLP(publicacion.precio)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Envio</span>
                  <span>{envio === 0 ? "Por coordinar" : formatCLP(envio)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCLP(total)}</span>
                </div>
              </div>
              <FaltanDatos titulo="No podemos enviarte el ejemplar sin esto" datos={faltan} />
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
                disabled={pagando}
              >
                {pagando ? <LoaderCircle className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Continuar al pago
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Reserva válida por {RESERVA_HORAS} horas. Si expira, el ejemplar vuelve al catálogo.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>

      <PagoView
        abierto={datosDespacho !== null}
        monto={total}
        comercio="LEKTOR"
        descripcion={publicacion.titulo}
        alConfirmar={pagar}
        alCerrar={() => {
          setDatosDespacho(null)
          setPagando(false)
        }}
      />
    </div>
  )
}
