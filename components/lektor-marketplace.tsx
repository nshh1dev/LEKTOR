"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { ArrowLeft, LayoutDashboard, LoaderCircle, LogIn, Moon, Search, Sun, Tag, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { avisar } from "@/components/notificacion/avisar"
import { Sello } from "@/components/notificacion/sello"
import { mensajeDeFallo } from "@/lib/avisos"
import { esStaff, type Categoria, type Condicion, type Facetas, type OrdenUI, type Paginacion, type PerfilVendedorUI, type PublicacionListItem, type ReputacionUI, type ReviewUI, type SesionUsuario } from "@/lib/catalog"
import { normalizarFila } from "@/components/marketplace/shared"
import { api } from "@/components/marketplace/api"
import { type Vista, type OrdenCatalogo } from "@/components/marketplace/types"
import { CatalogView } from "@/components/marketplace/catalog-view"
import { DetalleView } from "@/components/marketplace/detail-view"
import { PublicarView } from "@/components/marketplace/sell-view"
import { CheckoutView } from "@/components/marketplace/checkout-view"
import { PerfilView } from "@/components/marketplace/profile-view"
import { AuthView } from "@/components/marketplace/auth-view"
import { SellerView } from "@/components/marketplace/seller-view"

/** Lo que el detalle necesita saber de las valoraciones, en una sola cosa. */
type DatosValoraciones = {
  reviews: ReviewUI[]
  reputacion: ReputacionUI
  puedeValorar: boolean
}

const REPUTACION_VACIA: ReputacionUI = {
  promedio: null,
  total: 0,
  distribucion: [5, 4, 3, 2, 1].map((puntaje) => ({ puntaje, cantidad: 0, porcentaje: 0 })),
}

export function LektorMarketplace({
  initialPublications,
  initialFacetas,
  initialPaginacion,
}: {
  initialPublications: PublicacionListItem[]
  initialFacetas: Facetas
  initialPaginacion: Paginacion
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [intentoCatalogo, setIntentoCatalogo] = useState(0)
  const [vista, setVista] = useState<Vista>("catalog")
  const vistaRef = useRef<Vista>("catalog")
  const navegacionRef = useRef(0)
  const solicitudCatalogoRef = useRef<AbortController | null>(null)
  const solicitudNavegacionRef = useRef<AbortController | null>(null)
  const [pestanaInicialPerfil, setPestanaInicialPerfil] = useState<"publicaciones" | "compras">("publicaciones")
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null)
  const [authPrompt, setAuthPrompt] = useState<"sell" | "buy" | "contact" | null>(null)

  const [publicaciones, setPublicaciones] = useState(initialPublications)
  const [facetas, setFacetas] = useState(initialFacetas)
  const [paginacion, setPaginacion] = useState(initialPaginacion)
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const [claveErrorCatalogo, setClaveErrorCatalogo] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [busquedaAplicada, setBusquedaAplicada] = useState("")
  const [filtros, setFiltros] = useState<{
    categoria: Categoria[]
    condicion: Condicion[]
    comuna: string[]
    autor: string | null
    editorial: string | null
    precioMin: number | null
    precioMax: number | null
  }>({
    categoria: [],
    condicion: [],
    comuna: [],
    autor: null,
    editorial: null,
    precioMin: null,
    precioMax: null,
  })
  const [orden, setOrden] = useState<OrdenCatalogo>("recientes")
  const [pagina, setPagina] = useState(1)
  const [claveResultados, setClaveResultados] = useState(
    () => new URLSearchParams({ orden: "recientes", pagina: "1", porPagina: String(initialPaginacion.porPagina) }).toString(),
  )

  const parametrosCatalogo = new URLSearchParams()
  if (busquedaAplicada) parametrosCatalogo.set("q", busquedaAplicada)
  if (filtros.categoria.length) parametrosCatalogo.set("categoria", filtros.categoria.join(","))
  if (filtros.condicion.length) parametrosCatalogo.set("condicion", filtros.condicion.join(","))
  if (filtros.comuna.length) parametrosCatalogo.set("comuna", filtros.comuna.join(","))
  if (filtros.autor) parametrosCatalogo.set("autor", filtros.autor)
  if (filtros.editorial) parametrosCatalogo.set("editorial", filtros.editorial)
  if (filtros.precioMin !== null) parametrosCatalogo.set("precioMin", String(filtros.precioMin))
  if (filtros.precioMax !== null) parametrosCatalogo.set("precioMax", String(filtros.precioMax))
  parametrosCatalogo.set("orden", orden)
  parametrosCatalogo.set("pagina", String(pagina))
  parametrosCatalogo.set("porPagina", String(initialPaginacion.porPagina))
  const claveConsultaCatalogo = parametrosCatalogo.toString()
  const consultaCatalogoVigente = claveResultados === claveConsultaCatalogo && busqueda.trim() === busquedaAplicada

  const [detalle, setDetalle] = useState<PublicacionListItem | null>(null)
  const [detalleSolicitadoId, setDetalleSolicitadoId] = useState<string | null>(null)
  const [detalleFallido, setDetalleFallido] = useState(false)
  const [ordenCreada, setOrdenCreada] = useState<OrdenUI | null>(null)
  const [vendedorPerfil, setVendedorPerfil] = useState<PerfilVendedorUI | null>(null)
  const [vendedorSolicitadoId, setVendedorSolicitadoId] = useState<string | null>(null)
  const [cargandoVendedor, setCargandoVendedor] = useState(false)
  const [vendedorFallido, setVendedorFallido] = useState(false)
  const [valoraciones, setValoraciones] = useState<DatosValoraciones>({
    reviews: [],
    reputacion: REPUTACION_VACIA,
    puedeValorar: false,
  })

  useEffect(() => setMounted(true), [])

  const irAVista = (siguiente: Vista) => {
    navegacionRef.current += 1
    solicitudNavegacionRef.current?.abort()
    solicitudNavegacionRef.current = null
    if (siguiente !== "catalog") solicitudCatalogoRef.current?.abort()
    vistaRef.current = siguiente
    setVista(siguiente)
  }

  useEffect(() => {
    const timer = setTimeout(() => setBusquedaAplicada(busqueda.trim()), 320)
    return () => clearTimeout(timer)
  }, [busqueda])

  useEffect(() => {
    if (vista !== "catalog") return
    const controller = new AbortController()
    solicitudCatalogoRef.current?.abort()
    solicitudCatalogoRef.current = controller
    setCargandoCatalogo(true)
    setClaveErrorCatalogo(null)
    const cargar = async () => {
      try {
        const data = await api<{
          publications: Record<string, unknown>[]
          facetas: Facetas
          paginacion: Paginacion
        }>(`/api/publications?${claveConsultaCatalogo}`, { signal: controller.signal })
        if (controller.signal.aborted) return
        setPublicaciones(data.publications.map(normalizarFila))
        setClaveResultados(claveConsultaCatalogo)
        setFacetas(data.facetas)
        setPaginacion(data.paginacion)
        setPagina(data.paginacion.pagina)
      } catch (error) {
        if (controller.signal.aborted) return
        setClaveErrorCatalogo(claveConsultaCatalogo)
        avisar.falla({
          titulo: "No se pudo cargar el catálogo",
          descripcion: mensajeDeFallo(error, "Revisa tu conexión e inténtalo otra vez."),
          accion: {
            etiqueta: "Reintentar",
            alPulsar: () => setIntentoCatalogo((n) => n + 1),
          },
        })
      } finally {
        if (!controller.signal.aborted) setCargandoCatalogo(false)
      }
    }
    void cargar()
    return () => controller.abort()
  }, [vista, claveConsultaCatalogo, intentoCatalogo])

  const buscadorRef = useRef<HTMLInputElement>(null)
  const onBusquedaChange = (value: string) => {
    setBusqueda(value)
    setPagina(1)
    if (vistaRef.current !== "catalog") irAVista("catalog")
  }

  useEffect(() => () => {
    solicitudCatalogoRef.current?.abort()
    solicitudNavegacionRef.current?.abort()
  }, [])

  useEffect(() => {
    const alPulsar = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return
      const activo = document.activeElement
      const editable =
        activo instanceof HTMLInputElement ||
        activo instanceof HTMLTextAreaElement ||
        (activo instanceof HTMLElement && activo.isContentEditable)
      if (editable) return
      event.preventDefault()
      buscadorRef.current?.focus()
    }
    window.addEventListener("keydown", alPulsar)
    return () => window.removeEventListener("keydown", alPulsar)
  }, [])

  useEffect(() => {
    api<{ user: SesionUsuario }>("/api/auth/me")
      .then((data) => setUsuario(data.user))
      .catch(() => setUsuario(null))
  }, [])

  const abrirDetalle = async (id: string) => {
    const solicitud = ++navegacionRef.current
    solicitudNavegacionRef.current?.abort()
    solicitudCatalogoRef.current?.abort()
    const controller = new AbortController()
    solicitudNavegacionRef.current = controller
    vistaRef.current = "detail"
    setVista("detail")
    setDetalle(null)
    setDetalleSolicitadoId(id)
    setDetalleFallido(false)
    setValoraciones({ reviews: [], reputacion: REPUTACION_VACIA, puedeValorar: false })
    try {
      const [data, datosReviews] = await Promise.all([
        api<{
          publication: PublicacionListItem
          vendedor: { nombre: string; comuna?: string | null } | null
        }>(`/api/publications/${id}`, { signal: controller.signal }),
        api<DatosValoraciones>(`/api/publications/${id}/reviews`, { signal: controller.signal }),
      ])
      if (solicitud !== navegacionRef.current || controller.signal.aborted) return
      const publication = normalizarFila(data.publication as unknown as Record<string, unknown>)
      setDetalle({
        ...publication,
        vendedorNombre: data.vendedor?.nombre ?? "Vendedor",
        vendedorComuna: data.vendedor?.comuna ?? null,
      })
      setValoraciones({ ...datosReviews, puedeValorar: datosReviews.puedeValorar === true })
    } catch (error) {
      if (solicitud !== navegacionRef.current || controller.signal.aborted) return
      setDetalleFallido(true)
      avisar.falla({
        titulo: "Esta publicación ya no está disponible",
        descripcion: mensajeDeFallo(error, "Puede que otro lector la haya reservado."),
        accion: { etiqueta: "Reintentar", alPulsar: () => void abrirDetalle(id) },
      })
    }
  }

  const abrirVendedor = async (vendedorId: string) => {
    const solicitud = ++navegacionRef.current
    solicitudNavegacionRef.current?.abort()
    solicitudCatalogoRef.current?.abort()
    const controller = new AbortController()
    solicitudNavegacionRef.current = controller
    vistaRef.current = "seller"
    setVista("seller")
    setVendedorPerfil(null)
    setVendedorSolicitadoId(vendedorId)
    setCargandoVendedor(true)
    setVendedorFallido(false)
    try {
      const perfil = await api<PerfilVendedorUI>(`/api/sellers/${vendedorId}`, { signal: controller.signal })
      if (solicitud !== navegacionRef.current || controller.signal.aborted) return
      setVendedorPerfil(perfil)
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error) {
      if (solicitud !== navegacionRef.current || controller.signal.aborted) return
      setVendedorFallido(true)
      avisar.falla({
        titulo: "Este vendedor no está disponible",
        descripcion: mensajeDeFallo(error, "Puede que haya cerrado su cuenta."),
        accion: { etiqueta: "Reintentar", alPulsar: () => void abrirVendedor(vendedorId) },
      })
    } finally {
      if (solicitud === navegacionRef.current) setCargandoVendedor(false)
    }
  }

  /**
   * Tras valorar o responder llegan la lista y el promedio ya recalculados. Se
   * refletan también en la publicación en memoria para que la tarjeta del
   * catálogo no salga con la nota anterior cuando se vuelve atrás.
   */
  const actualizarValoraciones = useCallback(
    (datos: { reviews: ReviewUI[]; reputacion: ReputacionUI }) => {
      setValoraciones((previas) => ({ ...previas, ...datos, puedeValorar: false }))
      const { promedio, total } = datos.reputacion
      const id = detalle?.id
      if (!id) return
      const tocar = (publicacion: PublicacionListItem) =>
        publicacion.id === id
          ? { ...publicacion, rating: promedio === null ? null : promedio.toFixed(1), ratingCount: total }
          : publicacion
      setDetalle((previo) => (previo ? tocar(previo) : previo))
      setPublicaciones((previas) => previas.map(tocar))
    },
    [detalle?.id],
  )

  const cerrarSesion = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined)
    setUsuario(null)
    irAVista("catalog")
    avisar.ok({
      titulo: "Sesión cerrada",
      descripcion: "Vuelve cuando quieras.",
    })
  }

  const filtrosActivos =
    filtros.categoria.length +
    filtros.condicion.length +
    filtros.comuna.length +
    (filtros.autor ? 1 : 0) +
    (filtros.editorial ? 1 : 0) +
    (filtros.precioMin !== null || filtros.precioMax !== null ? 1 : 0)

  const alternarFiltro = <K extends "categoria" | "condicion" | "comuna">(
    grupo: K,
    valor: string,
  ) => {
    setPagina(1)
    setFiltros((current) => {
      const lista = current[grupo] as string[]
      const siguiente = lista.includes(valor)
        ? lista.filter((item) => item !== valor)
        : [...lista, valor]
      return { ...current, [grupo]: siguiente } as typeof current
    })
  }

  // Autor y editorial son de un solo valor, a diferencia de los grupos de arriba.
  // Volver a elegir el mismo lo desmarca.
  const elegirFiltro = (grupo: "autor" | "editorial", valor: string) => {
    setPagina(1)
    setFiltros((current) => ({
      ...current,
      [grupo]: current[grupo] === valor ? null : valor,
    }))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#catalogo" className="skip-link">
        Saltar al catálogo
      </a>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[92rem] grid-cols-[1fr_auto] items-center gap-x-2 gap-y-3 px-4 py-3 sm:gap-x-4 md:h-[4.5rem] md:grid-cols-[auto_1fr_auto] md:gap-8 md:px-8 md:py-0">
          <button
            type="button"
            onClick={() => {
              irAVista("catalog")
              setPagina(1)
            }}
            className="flex shrink-0 cursor-pointer flex-col items-start text-left"
            aria-label="Ir al catálogo"
          >
            <span className="font-serif text-2xl font-semibold leading-none tracking-tight">
              LEKTOR
            </span>
            <span className="mt-1 hidden text-[10px] leading-none tracking-[0.14em] text-muted-foreground uppercase sm:block">
              Mercado de segunda mano
            </span>
          </button>

          <div className="relative col-span-2 row-start-2 w-full min-w-0 justify-self-center md:col-span-1 md:col-start-2 md:row-start-1 md:max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={buscadorRef}
              value={busqueda}
              onChange={(event) => onBusquedaChange(event.target.value)}
              placeholder="Busca por título, autor o editorial"
              className="h-11 rounded-full border-border/60 bg-foreground/[0.045] pr-16 pl-11 transition-colors focus-visible:border-oro/50"
              aria-label="Buscar publicaciones"
            />
            <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-full border border-border/60 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:block">
              /
            </kbd>
          </div>

          <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1 md:col-start-3 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-muted-foreground hover:text-oro"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Cambiar tema"
            >
              {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
            </Button>
            {usuario && esStaff(usuario.rol) && (
              <Button
                variant="ghost"
                className="hidden rounded-full text-muted-foreground hover:text-foreground md:inline-flex"
                asChild
              >
                <Link href="/admin">
                  <LayoutDashboard data-icon="inline-start" /> Panel
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              className="size-10 rounded-full p-0 text-muted-foreground hover:text-foreground md:h-9 md:w-auto md:px-3"
              onClick={() => {
                setPestanaInicialPerfil("publicaciones")
                irAVista(usuario ? "profile" : "auth")
              }}
              aria-label={usuario ? "Mi Perfil" : "Iniciar sesión o crear una cuenta"}
            >
              <UserCircle data-icon="inline-start" />
              <span className="hidden md:inline">Mi Perfil</span>
            </Button>
            <Button
              className="h-10 rounded-full bg-oro px-5 text-oro-foreground shadow-none hover:bg-oro/90"
              onClick={() => (usuario ? irAVista("sell") : setAuthPrompt("sell"))}
            >
              <Tag data-icon="inline-start" />
              <span className="hidden sm:inline">Vender un tomo</span>
              <span className="sm:hidden">Vender</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="catalogo" tabIndex={-1} className={`mx-auto max-w-[92rem] px-4 md:px-8 ${vista === "detail" ? "py-4 md:py-5" : "py-10 md:py-14"}`}>
        {vista === "catalog" && (
          <CatalogView
            publicaciones={consultaCatalogoVigente ? publicaciones : []}
            facetas={facetas}
            paginacion={consultaCatalogoVigente ? paginacion : { ...paginacion, pagina: 1, paginas: 1, total: 0 }}
            cargando={cargandoCatalogo || !consultaCatalogoVigente}
            errorCarga={consultaCatalogoVigente && claveErrorCatalogo === claveConsultaCatalogo}
            onReintentar={() => setIntentoCatalogo((n) => n + 1)}
            orden={orden}
            setOrden={(value) => {
              setOrden(value)
              setPagina(1)
            }}
            filtros={filtros}
            alternarFiltro={alternarFiltro}
            elegirFiltro={elegirFiltro}
            setPrecioRango={(min, max) => {
              setFiltros((current) => ({ ...current, precioMin: min, precioMax: max }))
              setPagina(1)
            }}
            limpiarFiltros={() => {
              setFiltros({
                categoria: [],
                condicion: [],
                comuna: [],
                autor: null,
                editorial: null,
                precioMin: null,
                precioMax: null,
              })
              setPagina(1)
            }}
            filtrosActivos={filtrosActivos}
            onDetalle={abrirDetalle}
            onVendedor={abrirVendedor}
            onPagina={(value) => {
              setPagina(value)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}

        {vista === "detail" && detalleFallido ? (
          <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 text-center">
            <p className="font-serif text-2xl">No pudimos cargar esta publicación</p>
            <p className="text-sm text-muted-foreground">Revisa tu conexión y vuelve a intentarlo.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => irAVista("catalog")}><ArrowLeft data-icon="inline-start" /> Catálogo</Button>
              <Button onClick={() => detalleSolicitadoId && void abrirDetalle(detalleSolicitadoId)}>Reintentar</Button>
            </div>
          </div>
        ) : vista === "detail" && (
          <DetalleView
            publicacion={detalle}
            reviews={valoraciones.reviews}
            reputacion={valoraciones.reputacion}
            puedeValorar={valoraciones.puedeValorar}
            yoId={usuario?.id ?? null}
            onVolver={() => irAVista("catalog")}
            onComprar={() => {
              if (!usuario) {
                setAuthPrompt("buy")
                return
              }
              setOrdenCreada(null)
              irAVista("checkout")
            }}
            onValoraciones={actualizarValoraciones}
            onVendedor={abrirVendedor}
            onNecesitaSesion={() => setAuthPrompt("contact")}
          />
        )}

        {vista === "seller" && (vendedorPerfil ? (
          <SellerView
            key={vendedorPerfil.vendedor.id}
            perfil={vendedorPerfil}
            onVolver={() => irAVista("catalog")}
            onAbrirPublicacion={abrirDetalle}
          />
        ) : (
          <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-4 text-center" role={cargandoVendedor ? "status" : undefined}>
            {cargandoVendedor ? (
              <><LoaderCircle className="size-6 animate-spin text-oro" /><p className="text-sm text-muted-foreground">Cargando perfil del vendedor…</p></>
            ) : (
              <><p className="font-serif text-2xl">{vendedorFallido ? "No pudimos cargar este perfil" : "Perfil no disponible"}</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => irAVista("catalog")}><ArrowLeft data-icon="inline-start" /> Catálogo</Button>
                  {vendedorFallido && vendedorSolicitadoId && <Button onClick={() => void abrirVendedor(vendedorSolicitadoId)}>Reintentar</Button>}
                </div>
              </>
            )}
          </div>
        ))}

        {vista === "sell" && usuario && (
          <PublicarView
            onVolver={() => irAVista("catalog")}
            onPublicado={() => {
              irAVista("catalog")
              setPagina(1)
              setIntentoCatalogo((n) => n + 1)
            }}
          />
        )}

        {vista === "checkout" && detalle && usuario && (
          <CheckoutView
            publicacion={detalle}
            usuario={usuario}
            onVolver={() => irAVista("detail")}
            onConfirmada={(orden) => {
              setOrdenCreada(orden)
              irAVista("checkout")
            }}
            ordenConfirmada={ordenCreada}
            onVerPerfil={() => {
              setPestanaInicialPerfil("compras")
              irAVista("profile")
            }}
          />
        )}

        {vista === "auth" && (
          <AuthView
            onSuccess={(user) => {
              setUsuario(user)
              setPestanaInicialPerfil("publicaciones")
              irAVista(user ? "profile" : "catalog")
            }}
            onVolver={() => irAVista("catalog")}
          />
        )}

        {vista === "profile" && usuario && (
          <PerfilView
            key={pestanaInicialPerfil}
            usuario={usuario}
            pestanaInicial={pestanaInicialPerfil}
            onActualizarUsuario={setUsuario}
            onCerrarSesion={cerrarSesion}
            onVolver={() => irAVista("catalog")}
            onNuevaPublicacion={() => irAVista("sell")}
            onAbrirPublicacion={abrirDetalle}
          />
        )}
      </main>

      <Dialog open={authPrompt !== null} onOpenChange={(open) => !open && setAuthPrompt(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader className="text-left">
            <Sello tono="revisar" tamano="md" className="mb-3" />
            <p className="rotulo text-aviso-revisar">Falta una cuenta</p>
            <DialogTitle className="mt-1.5 font-serif text-2xl tracking-tight">
              {authPrompt === "sell"
                ? "Publica tu primer tomo"
                : authPrompt === "buy"
                  ? "Entra para reservar"
                  : "Entra para preguntar al vendedor"}
            </DialogTitle>
            <DialogDescription className="text-[0.9375rem] leading-relaxed">
              {authPrompt === "sell"
                ? "Crea tu cuenta de lector para publicar tus tomos y encontrarles estantería."
                : authPrompt === "buy"
                  ? "Necesitas una cuenta para comprar de forma segura y seguir tus compras."
                  : "Necesitas una cuenta para escribirle al vendedor antes de reservar."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button
              className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
              onClick={() => {
                setAuthPrompt(null)
                irAVista("auth")
              }}
            >
              <LogIn data-icon="inline-start" /> Iniciar Sesión
            </Button>
            <Button variant="ghost" className="rounded-xl" onClick={() => setAuthPrompt(null)}>
              Seguir mirando el catálogo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
