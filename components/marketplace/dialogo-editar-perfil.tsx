"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { KeyRound, LoaderCircle, UserPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { avisar } from "@/components/notificacion/avisar"
import { mensajeDeFallo } from "@/lib/avisos"
import {
  REGIONES,
  cuerpoDePerfil,
  perfilFormSchema,
  type PerfilUI,
} from "@/lib/catalog"
import { formatearTelefono } from "@/lib/entrada"
import { regionDeComuna } from "@/lib/comunas"
import { api } from "@/components/marketplace/api"
import { ComunaInput } from "@/components/marketplace/comuna-input"
import { MensajeError } from "@/components/marketplace/shared"

/** Etiqueta de campo en versalitas, como los rótulos del resto del marketplace. */
const ETIQUETA =
  "text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"

/**
 * "Editar perfil" del perfil del lector: los datos que ve la contraparte (nombre, bio,
 * teléfono, comuna y región) y, debajo, el cambio de contraseña. Se abre desde el botón
 * de la cabecera para que la vista del perfil se lea como resumen y no como formulario.
 */
export function DialogoEditarPerfil({
  abierto,
  onOpenChange,
  perfil,
  nombreActual,
  onGuardado,
  onCerrarSesion,
}: {
  abierto: boolean
  onOpenChange: (abierto: boolean) => void
  perfil: PerfilUI | null
  /** Del sesión, para abrir con algo escrito aunque la ficha todavía no haya llegado. */
  nombreActual: string
  onGuardado: (nombre: string) => void
  onCerrarSesion: () => void
}) {
  const [guardando, setGuardando] = useState(false)
  const [cambiandoClave, setCambiandoClave] = useState(false)
  const [clave, setClave] = useState({ actual: "", nueva: "", confirmar: "" })

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(perfilFormSchema),
    defaultValues: { nombre: nombreActual, bio: "", telefono: "", comuna: "", region: "" },
  })

  const regionActual = useWatch({ control, name: "region" })
  const comunaActual = useWatch({ control, name: "comuna" })
  const telefonoActual = useWatch({ control, name: "telefono" })

  // El diálogo siempre abre con lo que hay guardado: se resetea al abrir y no con cada
  // recarga de la página, para no perder lo que la persona está escribiendo.
  useEffect(() => {
    if (!abierto) return
    reset({
      nombre: perfil?.nombre ?? nombreActual,
      bio: perfil?.bio ?? "",
      telefono: perfil?.telefono ? formatearTelefono(perfil.telefono) : "",
      comuna: perfil?.comuna ?? "",
      region: perfil?.region ?? "",
    })
    setClave({ actual: "", nueva: "", confirmar: "" })
  }, [abierto, perfil, nombreActual, reset])

  const guardarPerfil = handleSubmit(async (values) => {
    setGuardando(true)
    try {
      await api("/api/profile", { method: "PATCH", body: JSON.stringify(cuerpoDePerfil(values)) })
      avisar.ok({
        titulo: "Perfil actualizado",
        descripcion: "Los compradores ven este nombre cuando coordinan la entrega.",
      })
      onGuardado(values.nombre)
      onOpenChange(false)
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo guardar el perfil",
        descripcion: mensajeDeFallo(error, "Tus cambios siguen sin guardar."),
      })
    } finally {
      setGuardando(false)
    }
  })

  const cambiarClave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (clave.nueva.length < 6) {
      avisar.revisar({
        titulo: "La nueva contraseña es muy corta",
        descripcion: "Necesita al menos 6 caracteres.",
        accion: { etiqueta: "Corregir", alPulsar: () => document.getElementById("clave-nueva")?.focus() },
      })
      return
    }
    if (clave.nueva !== clave.confirmar) {
      avisar.revisar({
        titulo: "Las contraseñas no coinciden",
        descripcion: "Vuelve a escribir la nueva contraseña en ambos campos.",
        accion: { etiqueta: "Corregir", alPulsar: () => document.getElementById("clave-confirmar")?.focus() },
      })
      return
    }
    setCambiandoClave(true)
    try {
      await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: clave.actual, newPassword: clave.nueva }),
      })
      avisar.ok({
        titulo: "Contraseña actualizada",
        descripcion: "Por seguridad tienes que volver a iniciar sesión.",
      })
      onCerrarSesion()
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo cambiar la contraseña",
        descripcion: mensajeDeFallo(error, "Revisa que la contraseña actual sea correcta."),
        duracion: 8000,
      })
    } finally {
      setCambiandoClave(false)
    }
  }

  const iniciales = (perfil?.nombre ?? nombreActual).slice(0, 2).toUpperCase()
  const ubicacion = [perfil?.comuna, perfil?.region].filter(Boolean).join(", ")

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="sombra-tomo flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-xl border border-border/70 bg-card p-0 sm:max-w-lg">
        <DialogHeader className="papel gap-3.5 bg-muted/40 p-6 pr-14 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-serif text-sm font-semibold text-primary-foreground ring-1 ring-oro/40">
              {perfil?.avatarUrl ? (
                <Image
                  src={perfil.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-full object-cover"
                  unoptimized
                />
              ) : (
                iniciales
              )}
            </div>
            <div className="min-w-0">
              <p className="rotulo text-oro/80">Tu ficha</p>
              <DialogTitle className="mt-1 truncate font-serif text-xl font-semibold tracking-tight">
                {perfil?.nombre ?? nombreActual}
              </DialogTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {ubicacion || "Sin ubicación"}
              </p>
            </div>
          </div>
          <DialogDescription className="text-[0.8125rem] leading-relaxed text-muted-foreground">
            Estos datos son los que ven los compradores cuando coordinan la entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="filete shrink-0" />

        <div className="scrollbar-fina flex flex-1 flex-col gap-7 overflow-y-auto p-6">
          <form
            id="perfil-datos"
            onSubmit={guardarPerfil}
            className="flex flex-col gap-4"
            aria-label="Datos del perfil"
          >
            <p className="rotulo text-oro/80">Datos</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label className={ETIQUETA} htmlFor="perfil-nombre">Nombre visible</Label>
                <Input aria-invalid={errors.nombre ? true : undefined} aria-describedby={errors.nombre ? "nombre-error" : undefined} id="perfil-nombre" {...register("nombre")} />
                <MensajeError campo="nombre" mensaje={errors.nombre?.message} />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label className={ETIQUETA} htmlFor="perfil-bio">Bio</Label>
                <Textarea aria-invalid={errors.bio ? true : undefined} aria-describedby={errors.bio ? "bio-error" : undefined} id="perfil-bio" rows={2} placeholder="Coleccionista de mangas, compro sellados y los intercambio" {...register("bio")} />
                <MensajeError campo="bio" mensaje={errors.bio?.message} />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label className={ETIQUETA} htmlFor="perfil-telefono">Teléfono de contacto</Label>
                <Input aria-invalid={errors.telefono ? true : undefined} aria-describedby={errors.telefono ? "telefono-error" : undefined} id="perfil-telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" className="font-mono" value={telefonoActual ?? ""} onChange={(event) => setValue("telefono", formatearTelefono(event.target.value), { shouldValidate: true })} />
                <MensajeError campo="telefono" mensaje={errors.telefono?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className={ETIQUETA} htmlFor="perfil-comuna">Comuna</Label>
                <ComunaInput
                  describedBy={errors.comuna ? "comuna-error" : undefined}
                  id="perfil-comuna"
                  invalid={errors.comuna ? true : undefined}
                  onRegionSugerida={(value) => setValue("region", value, { shouldValidate: true })}
                  onValueChange={(valor) => setValue("comuna", valor, { shouldValidate: true })}
                  placeholder="Providencia"
                  region={regionActual}
                  value={comunaActual ?? ""}
                />
                <MensajeError campo="comuna" mensaje={errors.comuna?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className={ETIQUETA} htmlFor="perfil-region">Región</Label>
                <Select
                  value={regionActual ?? ""}
                  onValueChange={(value) => {
                    // La comuna escrita manda: si pertenece a otra región se limpia, para no
                    // guardar una pareja que el catálogo no reconoce.
                    const regionDeLaComuna = regionDeComuna(comunaActual ?? "")
                    if (regionDeLaComuna && regionDeLaComuna !== value) setValue("comuna", "")
                    setValue("region", value, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger id="perfil-region" className="w-full">
                    <SelectValue placeholder="Selecciona tu región" />
                  </SelectTrigger>
                  {/* El desplegable se portaliza al body: sin acotarlo se va más ancho que el
                      modal con los nombres de región más largos y, como el campo es el último
                      de la sección, se abría hacia abajo más allá del marco. Se ata al ancho
                      del campo y se abre hacia arriba, dentro del diálogo. */}
                  <SelectContent
                    side="top"
                    align="start"
                    sideOffset={6}
                    className="max-h-72 w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
                  >
                    {REGIONES.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>

          <div className="filete" />

          <form onSubmit={cambiarClave} className="flex flex-col gap-4" aria-label="Seguridad">
            <div className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-oro/15 text-oro">
                <KeyRound className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="rotulo text-oro/80">Seguridad</p>
                <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted-foreground">
                  Al cambiar la contraseña se cerrará tu sesión en este dispositivo.
                </p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label className={ETIQUETA} htmlFor="clave-actual">Contraseña actual</Label>
                <Input
                  id="clave-actual"
                  type="password"
                  autoComplete="current-password"
                  className="font-mono"
                  value={clave.actual}
                  onChange={(event) => setClave((valor) => ({ ...valor, actual: event.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className={ETIQUETA} htmlFor="clave-nueva">Nueva contraseña</Label>
                <Input
                  id="clave-nueva"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  className="font-mono"
                  value={clave.nueva}
                  onChange={(event) => setClave((valor) => ({ ...valor, nueva: event.target.value }))}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className={ETIQUETA} htmlFor="clave-confirmar">Repite la nueva contraseña</Label>
                <Input
                  id="clave-confirmar"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  className="font-mono"
                  value={clave.confirmar}
                  onChange={(event) => setClave((valor) => ({ ...valor, confirmar: event.target.value }))}
                  required
                />
              </div>
              <div className="flex justify-end md:col-span-2">
                <Button
                  type="submit"
                  variant="outline"
                  className="rounded-lg"
                  disabled={cambiandoClave}
                >
                  {cambiandoClave && <LoaderCircle className="size-4 animate-spin" />} Cambiar contraseña
                </Button>
              </div>
            </div>
          </form>
        </div>

        <div className="filete shrink-0" />

        <DialogFooter className="bg-muted/40 p-4">
          <Button variant="ghost" className="rounded-lg" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="perfil-datos"
            className="rounded-lg bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
            disabled={guardando}
          >
            {guardando ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <UserPen data-icon="inline-start" />
            )}{" "}
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
