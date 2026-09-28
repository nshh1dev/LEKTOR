"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, KeyRound, LayoutDashboard, LoaderCircle, Tag, Trash2, UserPen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { avisar } from "@/components/notificacion/avisar"
import { ConfirmarAccion } from "@/components/notificacion/confirmar-accion"
import { mensajeDeFallo } from "@/lib/avisos"
import { REGIONES, esStaff, perfilFormSchema, type EstadoOrden, type NotificacionUI, type OrdenUI, type PublicacionListItem, type SesionUsuario } from "@/lib/catalog"
import { formatearTelefono } from "@/lib/entrada"
import { ESTADO_ORDEN_LABEL, ESTADO_PUBLICACION_LABEL, formatCLP, formatDate, formatDateTime } from "@/lib/format"
import { normalizarFila, MensajeError } from "@/components/marketplace/shared"
import { api } from "@/components/marketplace/api"
import { Portada } from "@/components/marketplace/hero"
import { TarjetaOrden } from "@/components/marketplace/order-card"

export function PerfilView({
  usuario,
  onActualizarUsuario,
  onCerrarSesion,
  onVolver,
  onNuevaPublicacion,
  onAbrirPublicacion,
}: {
  usuario: SesionUsuario
  onActualizarUsuario: (user: SesionUsuario) => void
  onCerrarSesion: () => void
  onVolver: () => void
  onNuevaPublicacion: () => void
  onAbrirPublicacion: (id: string) => void
}) {
  const [pestana, setPestana] = useState<"publicaciones" | "ventas" | "compras" | "notificaciones">(
    "publicaciones",
  )
  const [perfil, setPerfil] = useState<{
    nombre: string
    bio: string | null
    telefono: string | null
    comuna: string | null
    region: string | null
    avatarUrl: string | null
    fechaCreacion: string
  } | null>(null)
  const [misPublicaciones, setMisPublicaciones] = useState<PublicacionListItem[]>([])
  const [ventas, setVentas] = useState<OrdenUI[]>([])
  const [compras, setCompras] = useState<OrdenUI[]>([])
  const [notificaciones, setNotificaciones] = useState<NotificacionUI[]>([])
  const [editando, setEditando] = useState<PublicacionListItem | null>(null)
  const [stockEdicion, setStockEdicion] = useState("0")
  const [eliminando, setEliminando] = useState<PublicacionListItem | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [cambiandoClave, setCambiandoClave] = useState(false)
  const [clave, setClave] = useState({ actual: "", nueva: "", confirmar: "" })
  const [intento, setIntento] = useState(0)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(perfilFormSchema),
    defaultValues: { nombre: usuario.nombre, bio: "", telefono: "", comuna: "", region: "" },
  })

  const cargarTodo = useCallback(async () => {
    try {
      const [datos, propias, ordenesVendedor, ordenesComprador, avisos] = await Promise.all([
        api<{ perfil: typeof perfil; esVendedor: boolean; publicaciones: number }>("/api/profile"),
        api<{ publications: Record<string, unknown>[] }>(`/api/publications?vendedor=${usuario.id}&porPagina=48`),
        api<{ orders: OrdenUI[] }>("/api/orders?rol=vendedor"),
        api<{ orders: OrdenUI[] }>("/api/orders?rol=comprador"),
        api<{ notifications: NotificacionUI[] }>("/api/notifications"),
      ])
      const ficha = datos.perfil
      setPerfil(ficha)
      if (ficha) {
        reset({
          nombre: ficha.nombre,
          bio: ficha.bio ?? "",
          telefono: ficha.telefono ? formatearTelefono(ficha.telefono) : "",
          comuna: ficha.comuna ?? "",
          region: ficha.region ?? "",
        })
      }
      setMisPublicaciones(propias.publications.map(normalizarFila))
      setVentas(ordenesVendedor.orders)
      setCompras(ordenesComprador.orders)
      setNotificaciones(avisos.notifications)
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo cargar tu perfil",
        descripcion: mensajeDeFallo(error, "Inténtalo otra vez en un momento."),
        accion: { etiqueta: "Reintentar", alPulsar: () => setIntento((n) => n + 1) },
      })
    }
  }, [usuario.id, reset])

  useEffect(() => {
    void cargarTodo()
  }, [cargarTodo, intento])

  const telefonoActual = useWatch({ control, name: "telefono" })

  const guardarPerfil = handleSubmit(async (values) => {
    setGuardando(true)
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          nombre: values.nombre,
          bio: values.bio?.trim() || null,
          telefono: values.telefono?.trim() || null,
          comuna: values.comuna?.trim() || null,
          region: values.region || null,
        }),
      })
      avisar.ok({
        titulo: "Perfil actualizado",
        descripcion: "Los compradores ven este nombre cuando coordinan la entrega.",
      })
      onActualizarUsuario({ ...usuario, nombre: values.nombre })
      await cargarTodo()
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
      setClave({ actual: "", nueva: "", confirmar: "" })
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

  const cambiarEstadoOrden = async (ordenId: string, estado: EstadoOrden) => {
    try {
      await api(`/api/orders/${ordenId}`, { method: "PATCH", body: JSON.stringify({ estado }) })
      avisar.ok({
        titulo: `Orden ${ESTADO_ORDEN_LABEL[estado].toLowerCase()}`,
        descripcion: "El comprador ya puede ver el nuevo estado.",
      })
      await cargarTodo()
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo actualizar la orden",
        descripcion: mensajeDeFallo(error, "El estado sigue siendo el anterior."),
      })
    }
  }

  const marcarLeidas = async () => {
    try {
      await api("/api/notifications", { method: "PATCH", body: JSON.stringify({ todas: true }) })
      setNotificaciones((current) => current.map((item) => ({ ...item, leida: true })))
    } catch {
      avisar.falla({
        titulo: "No se pudieron marcar las notificaciones",
        descripcion: "Las vas a tener que leer una por una.",
      })
    }
  }

  const alternarEstadoPublicacion = async (publicacion: PublicacionListItem) => {
    const nuevo = publicacion.estado === "pausada" ? "activa" : "pausada"
    try {
      await api(`/api/publications/${publicacion.id}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: nuevo }),
      })
      setMisPublicaciones((current) =>
        current.map((item) => (item.id === publicacion.id ? { ...item, estado: nuevo } : item)),
      )
      avisar.ok({
        titulo: nuevo === "pausada" ? "Publicación pausada" : "Publicación reactivada",
        descripcion:
          nuevo === "pausada"
            ? "Deja de aparecer en el catálogo, pero nadie pierde el enlace."
            : "Vuelve a aparecer en el catálogo con su stock actual.",
        referencia: publicacion.titulo,
      })
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo actualizar la publicación",
        descripcion: mensajeDeFallo(error, "El estado sigue igual."),
        referencia: publicacion.titulo,
      })
    }
  }

  const confirmarEliminacion = async () => {
    if (!eliminando) return
    const titulo = eliminando.titulo
    try {
      await api(`/api/publications/${eliminando.id}`, { method: "DELETE" })
      setMisPublicaciones((current) => current.filter((item) => item.id !== eliminando.id))
      avisar.ok({
        titulo: "Publicación eliminada",
        descripcion: "El ejemplar salió del catálogo.",
        referencia: titulo,
      })
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo eliminar la publicación",
        descripcion: mensajeDeFallo(error, "Si tiene reservas activas, ciérralas primero."),
        referencia: titulo,
        duracion: 8000,
      })
    } finally {
      setEliminando(null)
    }
  }

  const guardarStock = async () => {
    if (!editando) return
    const nuevo = Number(stockEdicion)
    if (!Number.isInteger(nuevo) || nuevo < 0 || nuevo > 999) {
      avisar.revisar({
        titulo: "Ese número de ejemplares no sirve",
        descripcion: "Ingresa un número entre 0 y 999.",
        accion: { etiqueta: "Corregir", alPulsar: () => document.getElementById("stock-actual")?.focus() },
      })
      return
    }
    try {
      const respuesta = await api<{ publication: PublicacionListItem }>(
        `/api/publications/${editando.id}`,
        { method: "PATCH", body: JSON.stringify({ stock: nuevo }) },
      )
      setMisPublicaciones((current) =>
        current.map((item) => (item.id === editando.id ? { ...item, ...respuesta.publication } : item)),
      )
      avisar.ok({
        titulo: "Stock actualizado",
        descripcion: `Quedan ${nuevo} ejemplar(es) disponibles.`,
        referencia: editando.titulo,
      })
      setEditando(null)
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo actualizar el stock",
        descripcion: mensajeDeFallo(error, "El stock sigue como estaba."),
        referencia: editando.titulo,
      })
    }
  }

  const iniciales = (perfil?.nombre ?? usuario.nombre).slice(0, 2).toUpperCase()
  const sinLeer = notificaciones.filter((item) => !item.leida).length

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onVolver}
          className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver al catálogo
        </button>
        <Button variant="outline" size="sm" onClick={onCerrarSesion}>
          Cerrar sesión
        </Button>
      </div>

      <Card className="rounded-2xl border-0 bg-primary text-primary-foreground shadow-lg">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-foreground/15 text-2xl font-bold ring-4 ring-primary-foreground/10">
            {perfil?.avatarUrl ? (
              <Image src={perfil.avatarUrl} alt="Avatar" width={80} height={80} className="size-full object-cover" unoptimized />
            ) : (
              iniciales
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-primary-foreground/70">Mi perfil</p>
            <h1 className="text-3xl font-bold">{perfil?.nombre ?? usuario.nombre}</h1>
            <p className="mt-1 text-sm text-primary-foreground/75">
              {[perfil?.comuna, perfil?.region].filter(Boolean).join(", ") || "Completa tu ubicación"}
            </p>
            {perfil?.bio && <p className="mt-2 max-w-lg text-sm text-primary-foreground/80">{perfil.bio}</p>}
            <p className="mt-2 text-xs text-primary-foreground/60">
              Miembro desde {perfil ? formatDate(perfil.fechaCreacion) : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {esStaff(usuario.rol) && (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/admin">
                  <LayoutDashboard data-icon="inline-start" /> Ir al panel
                </Link>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onNuevaPublicacion}>
              <Tag data-icon="inline-start" /> Publicar
            </Button>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={guardarPerfil} className="grid gap-4 rounded-2xl border p-5 md:grid-cols-2">
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
          <Label htmlFor="perfil-region">Region</Label>
          <Select onValueChange={(value) => setValue("region", value, { shouldValidate: true })}>
            <SelectTrigger id="perfil-region" className="w-full">
              <SelectValue placeholder="Selecciona tu region" />
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
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" className="rounded-xl" disabled={guardando}>
            {guardando ? <LoaderCircle className="size-4 animate-spin" /> : <UserPen />} Guardar cambios
          </Button>
        </div>
      </form>

      <form
        onSubmit={cambiarClave}
        className="grid gap-4 rounded-2xl border p-5 md:grid-cols-2"
      >
        <div className="flex flex-col gap-1 md:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <KeyRound className="size-4" /> Seguridad
          </h2>
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

      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ["publicaciones", "Mis publicaciones", misPublicaciones.length],
            ["ventas", "Ventas", ventas.length],
            ["compras", "Compras", compras.length],
            ["notificaciones", "Notificaciones", notificaciones.length],
          ] as const
        ).map(([clave, etiqueta, total]) => (
          <Button
            key={clave}
            variant={pestana === clave ? "default" : "ghost"}
            className="flex-1"
            onClick={() => setPestana(clave)}
          >
            {etiqueta}
            <Badge variant="secondary" className="ml-2">
              {total}
            </Badge>
          </Button>
        ))}
        {sinLeer > 0 && <Badge className="ml-auto">{sinLeer} sin leer</Badge>}
      </div>

      {pestana === "publicaciones" && (
        <div className="flex flex-col gap-4">
          {misPublicaciones.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 py-12 text-center">
              <Tag className="size-8 text-muted-foreground" />
              <CardTitle>Aun no publicas nada</CardTitle>
              <CardDescription>Escanea un ISBN y tu primer ejemplar queda listo en minutos.</CardDescription>
              <Button className="rounded-xl" onClick={onNuevaPublicacion}>
                Publicar mi primer ejemplar
              </Button>
            </Card>
          ) : (
            misPublicaciones.map((publicacion) => (
              <Card key={publicacion.id} className="rounded-xl">
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <div className="w-20 shrink-0">
                    <Portada publicacion={publicacion} foto={publicacion.fotos[0]} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{publicacion.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {publicacion.condicion} · {formatCLP(publicacion.precio)} · stock {publicacion.stock}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{ESTADO_PUBLICACION_LABEL[publicacion.estado]}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => onAbrirPublicacion(publicacion.id)}>
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => {
                        setStockEdicion(String(publicacion.stock))
                        setEditando(publicacion)
                      }}
                    >
                      Stock
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-lg" onClick={() => void alternarEstadoPublicacion(publicacion)}>
                      {publicacion.estado === "pausada" ? "Reactivar" : "Pausar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg text-destructive"
                      onClick={() => setEliminando(publicacion)}
                      aria-label={`Eliminar ${publicacion.titulo}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {pestana === "ventas" && (
        <div className="flex flex-col gap-4">
          {ventas.length === 0 ? (
            <Card className="py-12 text-center">
              <CardTitle>Sin ventas por ahora</CardTitle>
              <CardDescription>Cuando alguien reserve uno de tus ejemplares aparecerá aquí.</CardDescription>
            </Card>
          ) : (
            ventas.map((orden) => (
              <TarjetaOrden
                key={orden.id}
                orden={orden}
                rol="vendedor"
                yoId={usuario.id}
                alCambiarEstado={cambiarEstadoOrden}
              />
            ))
          )}
        </div>
      )}

      {pestana === "compras" && (
        <div className="flex flex-col gap-4">
          {compras.length === 0 ? (
            <Card className="py-12 text-center">
              <CardTitle>Todavia no has comprado</CardTitle>
              <CardDescription>Tu primera reserva aparecerá aquí con su estado y contacto del vendedor.</CardDescription>
            </Card>
          ) : (
            compras.map((orden) => (
              <TarjetaOrden
                key={orden.id}
                orden={orden}
                rol="comprador"
                yoId={usuario.id}
                alCambiarEstado={cambiarEstadoOrden}
              />
            ))
          )}
        </div>
      )}

      {pestana === "notificaciones" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Avisos</h2>
            {sinLeer > 0 && (
              <Button size="sm" variant="outline" className="rounded-lg" onClick={marcarLeidas}>
                Marcar todo como leido
              </Button>
            )}
          </div>
          {notificaciones.length === 0 ? (
            <Card className="py-12 text-center">
              <CardTitle>Sin avisos</CardTitle>
              <CardDescription>Te avisaremos cuando alguien reserve o cancele un ejemplar tuyo.</CardDescription>
            </Card>
          ) : (
            notificaciones.map((aviso) => (
              <Card key={aviso.id} className={`rounded-xl ${aviso.leida ? "opacity-70" : "border-primary/40"}`}>
                <CardContent className="flex flex-col gap-1 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{aviso.titulo}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(aviso.fechaCreacion)}</span>
                  </div>
                  {aviso.cuerpo && <p className="text-sm text-muted-foreground">{aviso.cuerpo}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <ConfirmarAccion
        abierto={eliminando !== null}
        tono="falla"
        rotulo="Acción irreversible"
        titulo="¿Eliminar esta publicación?"
        descripcion={`${eliminando?.titulo} dejará de aparecer en el catálogo. Las órdenes históricas y los movimientos de stock se conservan.`}
        confirmTexto="Eliminar"
        onConfirmar={() => void confirmarEliminacion()}
        onCerrar={() => setEliminando(null)}
      />

      <Dialog
        open={editando !== null}
        onOpenChange={(open) => {
          if (!open) setEditando(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar stock</DialogTitle>
            <DialogDescription>Ajusta las unidades disponibles de {editando?.titulo}.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="stock-actual">Ejemplares disponibles</Label>
            <Input
              id="stock-actual"
              type="number"
              min={0}
              max={999}
              value={stockEdicion}
              onChange={(event) => setStockEdicion(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Con 0 unidades la publicación queda como agotada y deja de aparecer en el catálogo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
              onClick={() => void guardarStock()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
