"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ChevronLeft, ChevronRight, LayoutDashboard, MessageCircle, Tag, Trash2, UserPen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { avisar } from "@/components/notificacion/avisar"
import { ConfirmarAccion } from "@/components/notificacion/confirmar-accion"
import { mensajeDeFallo } from "@/lib/avisos"
import { cuerpoDeStock, esStaff, stockEdicionSchema, type ConversacionUI, type EstadoOrden, type NotificacionUI, type OrdenUI, type Paginacion, type PerfilUI, type PublicacionListItem, type ReviewUI, type SesionUsuario } from "@/lib/catalog"
import { ESTADO_ORDEN_LABEL, ESTADO_PUBLICACION_LABEL, formatCLP, formatDate, formatDateTime } from "@/lib/format"
import { normalizarFila } from "@/components/marketplace/shared"
import { api } from "@/components/marketplace/api"
import { Portada } from "@/components/marketplace/hero"
import { TarjetaOrden } from "@/components/marketplace/order-card"
import { Estrellas } from "@/components/marketplace/valoraciones"
import { DialogoContacto } from "@/components/marketplace/dialogo-contacto"
import { DialogoEditarPerfil } from "@/components/marketplace/dialogo-editar-perfil"

export function PerfilView({
  usuario,
  pestanaInicial = "publicaciones",
  onActualizarUsuario,
  onCerrarSesion,
  onVolver,
  onNuevaPublicacion,
  onAbrirPublicacion,
}: {
  usuario: SesionUsuario
  pestanaInicial?: "publicaciones" | "compras"
  onActualizarUsuario: (user: SesionUsuario) => void
  onCerrarSesion: () => void
  onVolver: () => void
  onNuevaPublicacion: () => void
  onAbrirPublicacion: (id: string) => void
}) {
  const [pestana, setPestana] = useState<
    "publicaciones" | "ventas" | "compras" | "notificaciones" | "resenas" | "mensajes"
  >(pestanaInicial)
  const [perfil, setPerfil] = useState<PerfilUI | null>(null)
  const [misPublicaciones, setMisPublicaciones] = useState<PublicacionListItem[]>([])
  const [ventas, setVentas] = useState<OrdenUI[]>([])
  const [compras, setCompras] = useState<OrdenUI[]>([])
  const [paginas, setPaginas] = useState<{ ventas: Paginacion; compras: Paginacion }>({
    ventas: { pagina: 1, porPagina: 10, total: 0, paginas: 1 },
    compras: { pagina: 1, porPagina: 10, total: 0, paginas: 1 },
  })
  const [notificaciones, setNotificaciones] = useState<NotificacionUI[]>([])
  const [reseñas, setReseñas] = useState<{ escritas: ReviewUI[]; recibidas: ReviewUI[] }>({
    escritas: [],
    recibidas: [],
  })
  const [conversaciones, setConversaciones] = useState<ConversacionUI[]>([])
  const [conversacionAbierta, setConversacionAbierta] = useState<ConversacionUI | null>(null)
  const [editando, setEditando] = useState<PublicacionListItem | null>(null)
  const [stockEdicion, setStockEdicion] = useState("0")
  const [eliminando, setEliminando] = useState<PublicacionListItem | null>(null)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const [intento, setIntento] = useState(0)
  const [cargandoFicha, setCargandoFicha] = useState(true)

  const cargarTodo = useCallback(async () => {
    setCargandoFicha(true)
    try {
      const [datos, propias, ordenesVendedor, ordenesComprador, avisos, misReseñas, hilos] = await Promise.all([
        api<{ perfil: PerfilUI; esVendedor: boolean; publicaciones: number }>("/api/profile"),
        api<{ publications: Record<string, unknown>[] }>(`/api/publications?vendedor=${usuario.id}&porPagina=48`),
        api<{ orders: OrdenUI[]; paginacion: Paginacion }>("/api/orders?rol=vendedor"),
        api<{ orders: OrdenUI[]; paginacion: Paginacion }>("/api/orders?rol=comprador"),
        api<{ notifications: NotificacionUI[] }>("/api/notifications"),
        api<{ escritas: ReviewUI[]; recibidas: ReviewUI[] }>("/api/profile/reviews"),
        api<{ conversaciones: ConversacionUI[] }>("/api/conversaciones"),
      ])
      setPerfil(datos.perfil)
      setMisPublicaciones(propias.publications.map(normalizarFila))
      setVentas(ordenesVendedor.orders)
      setCompras(ordenesComprador.orders)
      setPaginas({ ventas: ordenesVendedor.paginacion, compras: ordenesComprador.paginacion })
      setNotificaciones(avisos.notifications)
      setReseñas(misReseñas)
      setConversaciones(hilos.conversaciones)
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo cargar tu perfil",
        descripcion: mensajeDeFallo(error, "Inténtalo otra vez en un momento."),
        accion: { etiqueta: "Reintentar", alPulsar: () => setIntento((n) => n + 1) },
      })
    } finally {
      setCargandoFicha(false)
    }
  }, [usuario.id])

  /** Solo la ficha: al guardar el perfil la cabecera y el diálogo se alimentan de acá. */
  const recargarFicha = useCallback(async () => {
    try {
      const datos = await api<{ perfil: PerfilUI }>("/api/profile")
      setPerfil(datos.perfil)
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo refrescar tu perfil",
        descripcion: mensajeDeFallo(error, "Los cambios están guardados, pero la vista quedó desactualizada."),
        accion: { etiqueta: "Reintentar", alPulsar: () => setIntento((n) => n + 1) },
      })
    }
  }, [])

  const cambiarPaginaOrdenes = useCallback(
    async (rol: "ventas" | "compras", pagina: number) => {
      const consulta = rol === "ventas" ? "vendedor" : "comprador"
      try {
        const r = await api<{ orders: OrdenUI[]; paginacion: Paginacion }>(
          `/api/orders?rol=${consulta}&pagina=${pagina}`,
        )
        setPaginas((actual) => ({ ...actual, [rol]: r.paginacion }))
        if (rol === "ventas") setVentas(r.orders)
        else setCompras(r.orders)
      } catch (error) {
        avisar.falla({
          titulo: "No se pudieron cambiar las órdenes",
          descripcion: mensajeDeFallo(error, "Inténtalo otra vez en un momento."),
        })
      }
    },
    [],
  )

  useEffect(() => {
    void cargarTodo()
  }, [cargarTodo, intento])

  const cambiarEstadoOrden = async (ordenId: string, estado: EstadoOrden) => {
    try {
      await api(`/api/orders/${ordenId}`, { method: "PATCH", body: JSON.stringify({ estado }) })
      avisar.ok({
        titulo: `Orden ${ESTADO_ORDEN_LABEL[estado].toLowerCase()}`,
        descripcion: "El comprador ya puede ver el nuevo estado.",
      })
      // Solo se recarga la lista afectada y en la página que ya se estaba viendo.
      const rol = ventas.some((orden) => orden.id === ordenId) ? "ventas" : "compras"
      await cambiarPaginaOrdenes(rol, paginas[rol].pagina)
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
    const resultado = stockEdicionSchema.safeParse(stockEdicion)
    if (!resultado.success) {
      document.getElementById("stock-actual")?.focus()
      avisar.revisar({
        titulo: "Ese número de ejemplares no sirve",
        descripcion: stockEdicion.trim() === ""
          ? "Ingresa la cantidad de ejemplares disponibles."
          : "Ingresa un número entre 0 y 999.",
        accion: { etiqueta: "Corregir", alPulsar: () => document.getElementById("stock-actual")?.focus() },
      })
      return
    }
    const nuevo = resultado.data
    try {
      const respuesta = await api<{ publication: PublicacionListItem }>(
        `/api/publications/${editando.id}`,
        { method: "PATCH", body: JSON.stringify(cuerpoDeStock(nuevo)) },
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
      </div>

      <header className="flex flex-col gap-6 border-b border-border/60 pb-8 md:flex-row md:items-center">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-serif text-2xl font-semibold text-foreground">
            {perfil?.avatarUrl ? (
              <Image src={perfil.avatarUrl} alt="Avatar" width={80} height={80} className="size-full object-cover" unoptimized />
            ) : (
              iniciales
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="rotulo text-oro">Mi perfil</p>
            <h1 className="mt-2 break-words font-serif text-3xl font-semibold">{perfil?.nombre ?? usuario.nombre}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[perfil?.comuna, perfil?.region].filter(Boolean).join(", ") || "Completa tu ubicación"}
            </p>
            {perfil?.bio && <p className="mt-3 max-w-lg whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{perfil.bio}</p>}
            <p className="mt-3 text-xs text-muted-foreground">
              Miembro desde {perfil ? formatDate(perfil.fechaCreacion) : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:max-w-52 md:justify-end">
            {esStaff(usuario.rol) && (
              <Button variant="secondary" size="sm" asChild>
                <Link href="/admin">
                  <LayoutDashboard data-icon="inline-start" /> Ir al panel
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" disabled={!perfil || cargandoFicha} onClick={() => setEditandoPerfil(true)}>
              <UserPen data-icon="inline-start" /> {cargandoFicha ? "Cargando perfil…" : "Editar perfil"}
            </Button>
            {!perfil && !cargandoFicha && (
              <Button variant="outline" size="sm" onClick={() => setIntento((n) => n + 1)}>
                Reintentar carga del perfil
              </Button>
            )}
          </div>
      </header>

      <nav aria-label="Secciones de mi perfil" className="grid gap-6 border-b border-border/60 pb-6 lg:grid-cols-2">
        {([
          { titulo: "Actividad", secciones: [
            ["publicaciones", "Publicaciones", misPublicaciones.length],
            ["compras", "Compras", paginas.compras.total],
            ["ventas", "Ventas", paginas.ventas.total],
          ] },
          { titulo: "Comunidad", secciones: [
            ["mensajes", "Mensajes", conversaciones.length],
            ["resenas", "Reseñas", reseñas.escritas.length + reseñas.recibidas.length],
            ["notificaciones", "Avisos", notificaciones.length],
          ] },
        ] as const).map((grupo) => (
          <div key={grupo.titulo} className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {grupo.secciones.map(([clave, etiqueta, total]) => (
                <Button
                  key={clave}
                  variant="ghost"
                  className={`h-auto min-h-14 min-w-0 flex-col gap-1 rounded-none border-b-2 px-2 py-2 sm:min-h-11 sm:flex-row ${pestana === clave ? "border-oro text-oro" : "border-transparent text-muted-foreground"}`}
                  aria-current={pestana === clave ? "page" : undefined}
                  onClick={() => setPestana(clave)}
                >
                  <span className="text-xs sm:text-sm">{etiqueta}</span>
                  <span className="text-xs tabular-nums opacity-70">
                    {cargandoFicha ? "…" : total}
                  </span>
                  {clave === "notificaciones" && sinLeer > 0 && (
                    <span className="sr-only">{sinLeer} sin leer</span>
                  )}
                </Button>
              ))}
            </div>
            {grupo.titulo === "Comunidad" && sinLeer > 0 && (
              <p className="text-xs text-muted-foreground">{sinLeer} aviso{sinLeer > 1 ? "s" : ""} sin leer</p>
            )}
          </div>
        ))}
      </nav>

      {pestana === "publicaciones" && (
        <div className="flex flex-col gap-4">
          {misPublicaciones.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 rounded-none border-0 bg-transparent py-12 text-center shadow-none">
              <Tag className="size-8 text-muted-foreground" />
              <CardTitle>Aun no publicas nada</CardTitle>
              <CardDescription>Escanea un ISBN y tu primer ejemplar queda listo en minutos.</CardDescription>
              <Button className="rounded-xl" onClick={onNuevaPublicacion}>
                Publicar mi primer ejemplar
              </Button>
            </Card>
          ) : (
            misPublicaciones.map((publicacion) => (
              <article key={publicacion.id} className="flex flex-col gap-4 border-b border-border/60 py-5 sm:flex-row sm:items-center">
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
                    <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => onAbrirPublicacion(publicacion.id)}>
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg"
                      onClick={() => {
                        setStockEdicion(String(publicacion.stock))
                        setEditando(publicacion)
                      }}
                    >
                      Stock
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => void alternarEstadoPublicacion(publicacion)}>
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
              </article>
            ))
          )}
        </div>
      )}

      {pestana === "ventas" && (
        <div className="flex flex-col gap-4">
          {ventas.length === 0 ? (
            <Card className="rounded-none border-0 bg-transparent py-12 text-center shadow-none">
              <CardTitle>Sin ventas por ahora</CardTitle>
              <CardDescription>Cuando alguien reserve uno de tus ejemplares aparecerá aquí.</CardDescription>
            </Card>
          ) : (
            <>
              {ventas.map((orden) => (
                <TarjetaOrden
                  key={orden.id}
                  orden={orden}
                  rol="vendedor"
                  yoId={usuario.id}
                  alCambiarEstado={cambiarEstadoOrden}
                />
              ))}
              <PaginacionOrdenes
                paginacion={paginas.ventas}
                etiqueta="Paginación de tus ventas"
                alCambiar={(valor) => void cambiarPaginaOrdenes("ventas", valor)}
              />
            </>
          )}
        </div>
      )}

      {pestana === "compras" && (
        <div className="flex flex-col gap-4">
          {compras.length === 0 ? (
            <Card className="rounded-none border-0 bg-transparent py-12 text-center shadow-none">
              <CardTitle>Todavia no has comprado</CardTitle>
              <CardDescription>Tu primera reserva aparecerá aquí con su estado y contacto del vendedor.</CardDescription>
            </Card>
          ) : (
            <>
              {compras.map((orden) => (
                <TarjetaOrden
                  key={orden.id}
                  orden={orden}
                  rol="comprador"
                  yoId={usuario.id}
                  alCambiarEstado={cambiarEstadoOrden}
                />
              ))}
              <PaginacionOrdenes
                paginacion={paginas.compras}
                etiqueta="Paginación de tus compras"
                alCambiar={(valor) => void cambiarPaginaOrdenes("compras", valor)}
              />
            </>
          )}
        </div>
      )}

      {pestana === "resenas" && (
        <div className="flex flex-col gap-8">
          {reseñas.escritas.length === 0 && reseñas.recibidas.length === 0 ? (
            <Card className="rounded-none border-0 bg-transparent py-12 text-center shadow-none">
              <CardTitle>Todavía sin reseñas</CardTitle>
              <CardDescription>
                Cuando recibas un ejemplar y lo valores, tu reseña quedará guardada acá.
              </CardDescription>
            </Card>
          ) : (
            <>
              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold">Las que escribí</h2>
                {reseñas.escritas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no publicas una opinión sobre algún ejemplar recibido.
                  </p>
                ) : (
                  reseñas.escritas.map((reseña) => (
                    <article key={reseña.id} className="flex flex-col gap-3 border-b border-border/60 py-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">{reseña.publicacionTitulo}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(reseña.fechaCreacion)}
                          </span>
                        </div>
                        <Estrellas nota={reseña.puntaje} />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-fit rounded-lg"
                          onClick={() => onAbrirPublicacion(reseña.publicacionId)}
                        >
                          Ver publicación
                        </Button>
                    </article>
                  ))
                )}
              </section>

              <section className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">Las que recibí</h2>
                  <span className="text-xs text-muted-foreground">
                    {reseñas.recibidas.length}{" "}
                    {reseñas.recibidas.length === 1 ? "reseña" : "reseñas"}
                  </span>
                </div>
                {reseñas.recibidas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Cuando alguien reciba un ejemplar tuyo, su valoración aparecerá acá.
                  </p>
                ) : (
                  reseñas.recibidas.map((reseña) => (
                    <article key={reseña.id} className="flex flex-col gap-3 border-b border-border/60 py-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold">{reseña.autor.nombre}</p>
                          <div className="flex items-center gap-2">
                            {!reseña.visible && (
                              <Badge variant="secondary">Oculta por moderación</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(reseña.fechaCreacion)}
                            </span>
                          </div>
                        </div>
                        <Estrellas nota={reseña.puntaje} />
                        <p className="text-xs text-muted-foreground">
                          Sobre <span className="font-medium text-foreground">{reseña.publicacionTitulo}</span>
                        </p>
                    </article>
                  ))
                )}
              </section>
            </>
          )}
        </div>
      )}

      {pestana === "mensajes" && (
        <div className="flex flex-col gap-4">
          {conversaciones.length === 0 ? (
            <Card className="rounded-none border-0 bg-transparent py-12 text-center shadow-none">
              <CardTitle>Sin mensajes por ahora</CardTitle>
              <CardDescription>
                Cuando preguntes por un ejemplar o te pregunten por uno tuyo, el hilo aparecerá
                acá antes de cualquier compra.
              </CardDescription>
            </Card>
          ) : (
            conversaciones.map((conversacion) => (
              <article key={conversacion.id} className="flex flex-col gap-3 border-b border-border/60 py-5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{conversacion.publicacionTitulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {conversacion.rol === "vendedor"
                        ? `Pregunta de ${conversacion.contraparte.nombre}`
                        : `Conversación con ${conversacion.contraparte.nombre}`}
                    </p>
                    {conversacion.ultimoMensaje && (
                      <p className="mt-1 truncate text-sm text-muted-foreground/90">
                        {conversacion.ultimoMensaje}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(conversacion.actualizadoEn)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg"
                      onClick={() => setConversacionAbierta(conversacion)}
                    >
                      <MessageCircle data-icon="inline-start" /> Abrir
                    </Button>
                  </div>
              </article>
            ))
          )}
        </div>
      )}

      {pestana === "notificaciones" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Avisos</h2>
            {sinLeer > 0 && (
              <Button size="sm" variant="ghost" className="rounded-lg" onClick={marcarLeidas}>
                Marcar todo como leido
              </Button>
            )}
          </div>
          {notificaciones.length === 0 ? (
            <Card className="rounded-none border-0 bg-transparent py-12 text-center shadow-none">
              <CardTitle>Sin avisos</CardTitle>
              <CardDescription>Te avisaremos cuando alguien reserve o cancele un ejemplar tuyo.</CardDescription>
            </Card>
          ) : (
            notificaciones.map((aviso) => (
              <article key={aviso.id} className={`flex flex-col gap-2 border-b border-border/60 py-5 ${aviso.leida ? "opacity-70" : "border-l-2 border-l-oro pl-4"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{aviso.titulo}</p>
                    {!aviso.leida && <span className="text-xs text-oro">Sin leer</span>}
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(aviso.fechaCreacion)}</span>
                  </div>
                  {aviso.cuerpo && <p className="text-sm text-muted-foreground">{aviso.cuerpo}</p>}
              </article>
            ))
          )}
        </div>
      )}

      <DialogoEditarPerfil
        abierto={editandoPerfil}
        onOpenChange={setEditandoPerfil}
        perfil={perfil}
        nombreActual={usuario.nombre}
        onGuardado={(nombre) => {
          onActualizarUsuario({ ...usuario, nombre })
          void recargarFicha()
        }}
        onCerrarSesion={onCerrarSesion}
      />

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

      <DialogoContacto
        abierto={conversacionAbierta !== null}
        onOpenChange={(abierto) => {
          if (!abierto) {
            setConversacionAbierta(null)
            void cargarTodo()
          }
        }}
        yoId={usuario.id}
        conversacionId={conversacionAbierta?.id ?? null}
        nueva={null}
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

function PaginacionOrdenes({
  paginacion,
  etiqueta,
  alCambiar,
}: {
  paginacion: Paginacion
  etiqueta: string
  alCambiar: (pagina: number) => void
}) {
  if (paginacion.paginas <= 1) return null

  return (
    <nav
      aria-label={etiqueta}
      className="flex items-center justify-between gap-3 border-t border-border/60 pt-6"
    >
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full"
        disabled={paginacion.pagina <= 1}
        onClick={() => alCambiar(paginacion.pagina - 1)}
      >
        <ChevronLeft data-icon="inline-start" /> Anterior
      </Button>
      <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {String(paginacion.pagina).padStart(2, "0")} / {String(paginacion.paginas).padStart(2, "0")}
        <span className="ml-2">· {paginacion.total} en total</span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-full"
        disabled={paginacion.pagina >= paginacion.paginas}
        onClick={() => alCambiar(paginacion.pagina + 1)}
      >
        Siguiente <ChevronRight data-icon="inline-end" />
      </Button>
    </nav>
  )
}
