"use client"

import { useEffect, useState } from "react"
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
import { api } from "@/components/marketplace/api"
import { MensajeError } from "@/components/marketplace/shared"

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

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 p-6 pb-4">
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Estos datos son los que ven los compradores cuando coordinan la entrega.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          <form id="perfil-datos" onSubmit={guardarPerfil} className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <Label htmlFor="perfil-nombre">Nombre visible</Label>
              <Input aria-invalid={errors.nombre ? true : undefined} aria-describedby={errors.nombre ? "nombre-error" : undefined} id="perfil-nombre" {...register("nombre")} />
              <MensajeError campo="nombre" mensaje={errors.nombre?.message} />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <Label htmlFor="perfil-bio">Bio</Label>
              <Textarea aria-invalid={errors.bio ? true : undefined} aria-describedby={errors.bio ? "bio-error" : undefined} id="perfil-bio" rows={2} placeholder="Coleccionista de mangas, compro sellados y los intercambio" {...register("bio")} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="perfil-telefono">Teléfono de contacto</Label>
              <Input aria-invalid={errors.telefono ? true : undefined} aria-describedby={errors.telefono ? "telefono-error" : undefined} id="perfil-telefono" type="tel" inputMode="tel" autoComplete="tel" placeholder="+56 9 1234 5678" className="font-mono" value={telefonoActual ?? ""} onChange={(event) => setValue("telefono", formatearTelefono(event.target.value), { shouldValidate: true })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="perfil-comuna">Comuna</Label>
              <Input aria-invalid={errors.comuna ? true : undefined} aria-describedby={errors.comuna ? "comuna-error" : undefined} id="perfil-comuna" placeholder="Providencia" {...register("comuna")} />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <Label htmlFor="perfil-region">Región</Label>
              <Select value={regionActual ?? ""} onValueChange={(value) => setValue("region", value, { shouldValidate: true })}>
                <SelectTrigger id="perfil-region" className="w-full">
                  <SelectValue placeholder="Selecciona tu región" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONES.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>

          <form onSubmit={cambiarClave} className="grid gap-4 border-t border-border/60 pt-6 md:grid-cols-2">
            <div className="flex flex-col gap-1 md:col-span-2">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="size-4" /> Seguridad
              </h3>
              <p className="text-sm text-muted-foreground">
                Al cambiar la contraseña se cerrará tu sesión en este dispositivo.
              </p>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <Label htmlFor="clave-actual">Contraseña actual</Label>
              <Input
                id="clave-actual"
                type="password"
                autoComplete="current-password"
                value={clave.actual}
                onChange={(event) => setClave((valor) => ({ ...valor, actual: event.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="clave-nueva">Nueva contraseña</Label>
              <Input
                id="clave-nueva"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={clave.nueva}
                onChange={(event) => setClave((valor) => ({ ...valor, nueva: event.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="clave-confirmar">Repite la nueva contraseña</Label>
              <Input
                id="clave-confirmar"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={clave.confirmar}
                onChange={(event) => setClave((valor) => ({ ...valor, confirmar: event.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button
                type="submit"
                variant="outline"
                className="rounded-xl"
                disabled={cambiandoClave}
              >
                {cambiandoClave && <LoaderCircle className="size-4 animate-spin" />} Cambiar contraseña
              </Button>
            </div>
          </form>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/30 p-4">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="perfil-datos"
            className="rounded-xl"
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
