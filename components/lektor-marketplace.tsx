"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { LayoutDashboard, LogIn, Moon, Search, Sun, Tag, UserCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { avisar } from "@/components/notificacion/avisar"
import { Sello } from "@/components/notificacion/sello"
import { mensajeDeFallo } from "@/lib/avisos"
import { esStaff, type Categoria, type Condicion, type Facetas, type OrdenUI, type Paginacion, type PublicacionListItem, type SesionUsuario } from "@/lib/catalog"
import { normalizarFila } from "@/components/marketplace/shared"
import { api } from "@/components/marketplace/api"
import { type Vista, type OrdenCatalogo } from "@/components/marketplace/types"
import { CatalogView } from "@/components/marketplace/catalog-view"
import { DetalleView } from "@/components/marketplace/detail-view"
import { PublicarView } from "@/components/marketplace/sell-view"
import { CheckoutView } from "@/components/marketplace/checkout-view"
import { PerfilView } from "@/components/marketplace/profile-view"
import { AuthView } from "@/components/marketplace/auth-view"

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
  const [usuario, setUsuario] = useState<SesionUsuario | null>(null)
  const [authPrompt, setAuthPrompt] = useState<"sell" | "buy" | null>(null)

  const [publicaciones, setPublicaciones] = useState(initialPublications)
  const [facetas, setFacetas] = useState(initialFacetas)
  const [paginacion, setPaginacion] = useState(initialPaginacion)
  const [cargandoCatalogo, setCargandoCatalogo] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [filtros, setFiltros] = useState<{
    categoria: Categoria[]
    condicion: Condicion[]
    comuna: string[]
    precioMin: number | null
    precioMax: number | null
  }>({ categoria: [], condicion: [], comuna: [], precioMin: null, precioMax: null })
  const [orden, setOrden] = useState<OrdenCatalogo>("recientes")
  const [pagina, setPagina] = useState(1)

  const [detalle, setDetalle] = useState<PublicacionListItem | null>(null)
  const [ordenCreada, setOrdenCreada] = useState<OrdenUI | null>(null)

  useEffect(() => setMounted(true), [])

  const cargarCatalogo = useCallback(
    async (opciones?: { pagina?: number; busqueda?: string }) => {
      const paginaActual = opciones?.pagina ?? pagina
      const termino = (opciones?.busqueda ?? busqueda).trim()
      const params = new URLSearchParams()
      if (termino) params.set("q", termino)
      if (filtros.categoria.length) params.set("categoria", filtros.categoria.join(","))
      if (filtros.condicion.length) params.set("condicion", filtros.condicion.join(","))
      if (filtros.comuna.length) params.set("comuna", filtros.comuna.join(","))
      if (filtros.precioMin !== null) params.set("precioMin", String(filtros.precioMin))
      if (filtros.precioMax !== null) params.set("precioMax", String(filtros.precioMax))
      params.set("orden", orden)
      params.set("pagina", String(paginaActual))
      params.set("porPagina", String(initialPaginacion.porPagina))

      setCargandoCatalogo(true)
      try {
        const data = await api<{
          publications: Record<string, unknown>[]
          facetas: Facetas
          paginacion: Paginacion
        }>(`/api/publications?${params.toString()}`)
        setPublicaciones(data.publications.map(normalizarFila))
        setFacetas(data.facetas)
        setPaginacion(data.paginacion)
        setPagina(data.paginacion.pagina)
      } catch (error) {
        avisar.falla({
          titulo: "No se pudo cargar el catálogo",
          descripcion: mensajeDeFallo(error, "Revisa tu conexión e inténtalo otra vez."),
          accion: {
            etiqueta: "Reintentar",
            alPulsar: () => setIntentoCatalogo((n) => n + 1),
          },
        })
      } finally {
        setCargandoCatalogo(false)
      }
    },
    [busqueda, filtros, orden, pagina, initialPaginacion.porPagina],
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const buscadorRef = useRef<HTMLInputElement>(null)
  const onBusquedaChange = (value: string) => {
    setBusqueda(value)
    setVista("catalog")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void cargarCatalogo({ pagina: 1, busqueda: value })
    }, 320)
  }

  useEffect(() => {
    if (vista !== "catalog") return
    void cargarCatalogo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, orden, intentoCatalogo])

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
    setVista("detail")
    setDetalle(null)
    try {
      const data = await api<{
        publication: PublicacionListItem
        vendedor: { nombre: string; comuna?: string | null } | null
      }>(`/api/publications/${id}`)
      const publication = normalizarFila(data.publication as unknown as Record<string, unknown>)
      setDetalle({
        ...publication,
        vendedorNombre: data.vendedor?.nombre ?? "Vendedor",
        vendedorComuna: data.vendedor?.comuna ?? null,
      })
    } catch (error) {
      setVista("catalog")
      avisar.falla({
        titulo: "Esta publicación ya no está disponible",
        descripcion: mensajeDeFallo(error, "Puede que otro lector la haya reservado."),
        accion: { etiqueta: "Volver al catálogo", alPulsar: () => setVista("catalog") },
      })
    }
  }

  const cerrarSesion = async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined)
    setUsuario(null)
    setVista("catalog")
    avisar.ok({
      titulo: "Sesión cerrada",
      descripcion: "Vuelve cuando quieras.",
    })
  }

  const filtrosActivos =
    filtros.categoria.length +
    filtros.condicion.length +
    filtros.comuna.length +
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a href="#catalogo" className="skip-link">
        Saltar al catálogo
      </a>
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid h-[4.5rem] max-w-[92rem] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 md:gap-8 md:px-8">
          <button
            type="button"
            onClick={() => {
              setVista("catalog")
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

          <div className="relative justify-self-center md:w-full md:max-w-xl">
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

          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full text-muted-foreground hover:text-oro"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Cambiar tema"
            >
              {mounted && resolvedTheme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <div className="hidden items-center gap-2 md:flex">
              {usuario && esStaff(usuario.rol) && (
                <Button
                  variant="ghost"
                  className="rounded-full text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href="/admin">
                    <LayoutDashboard data-icon="inline-start" /> Panel
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setVista(usuario ? "profile" : "auth")}
              >
                <UserCircle data-icon="inline-start" /> Mi Perfil
              </Button>
            </div>
            <Button
              className="h-10 rounded-full bg-oro px-5 text-oro-foreground shadow-none hover:bg-oro/90"
              onClick={() => (usuario ? setVista("sell") : setAuthPrompt("sell"))}
            >
              <Tag data-icon="inline-start" />
              <span className="hidden sm:inline">Vender un tomo</span>
              <span className="sm:hidden">Vender</span>
            </Button>
          </div>
        </div>
      </header>

      <main id="catalogo" tabIndex={-1} className="mx-auto max-w-[92rem] px-4 py-10 md:px-8 md:py-14">
        {vista === "catalog" && (
          <CatalogView
            publicaciones={publicaciones}
            facetas={facetas}
            paginacion={paginacion}
            cargando={cargandoCatalogo}
            orden={orden}
            setOrden={(value) => {
              setOrden(value)
              setPagina(1)
            }}
            filtros={filtros}
            alternarFiltro={alternarFiltro}
            setPrecioRango={(min, max) => {
              setFiltros((current) => ({ ...current, precioMin: min, precioMax: max }))
              setPagina(1)
            }}
            limpiarFiltros={() => {
              setFiltros({
                categoria: [],
                condicion: [],
                comuna: [],
                precioMin: null,
                precioMax: null,
              })
              setPagina(1)
            }}
            filtrosActivos={filtrosActivos}
            onDetalle={abrirDetalle}
            onPagina={(value) => {
              setPagina(value)
              void cargarCatalogo({ pagina: value })
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}

        {vista === "detail" && (
          <DetalleView
            publicacion={detalle}
            onVolver={() => setVista("catalog")}
            onComprar={() => {
              if (!usuario) {
                setAuthPrompt("buy")
                return
              }
              setVista("checkout")
            }}
          />
        )}

        {vista === "sell" && usuario && (
          <PublicarView
            onVolver={() => setVista("catalog")}
            onPublicado={() => {
              setVista("catalog")
              setPagina(1)
              void cargarCatalogo({ pagina: 1 })
            }}
          />
        )}

        {vista === "checkout" && detalle && usuario && (
          <CheckoutView
            publicacion={detalle}
            usuario={usuario}
            onVolver={() => setVista("detail")}
            onConfirmada={(orden) => {
              setOrdenCreada(orden)
              setVista("checkout")
            }}
            ordenConfirmada={ordenCreada}
            onVerPerfil={() => setVista("profile")}
          />
        )}

        {vista === "auth" && (
          <AuthView
            onSuccess={(user) => {
              setUsuario(user)
              setVista(user ? "profile" : "catalog")
            }}
            onVolver={() => setVista("catalog")}
          />
        )}

        {vista === "profile" && usuario && (
          <PerfilView
            usuario={usuario}
            onActualizarUsuario={setUsuario}
            onCerrarSesion={cerrarSesion}
            onVolver={() => setVista("catalog")}
            onNuevaPublicacion={() => setVista("sell")}
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
              {authPrompt === "sell" ? "Publica tu primer tomo" : "Entra para reservar"}
            </DialogTitle>
            <DialogDescription className="text-[0.9375rem] leading-relaxed">
              {authPrompt === "sell"
                ? "Crea tu cuenta de lector para publicar tus tomos y encontrarles estantería."
                : "Necesitas una cuenta para comprar de forma segura y seguir tus compras."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button
              className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
              onClick={() => {
                setAuthPrompt(null)
                setVista("auth")
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
