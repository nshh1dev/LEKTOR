"use client"

import { useEffect, useMemo, useState } from "react"
import { LoaderCircle, RefreshCw, Search, UserCog, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { avisar } from "@/components/notificacion/avisar"
import { Aviso } from "@/components/notificacion/avisos"
import { ConfirmarAccion } from "@/components/notificacion/confirmar-accion"
import { mensajeDeFallo } from "@/lib/avisos"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROLES_USUARIO, type RolUsuario } from "@/lib/catalog"
import { formatCLP, formatDate } from "@/lib/format"
import { panelEnviar, usePanelQuery } from "@/lib/panel-client"
import { cn } from "@/lib/utils"

type UsuarioPanel = {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  activo: boolean
  comuna: string | null
  region: string | null
  fechaCreacion: string
  ultimoAcceso: string | null
  publicaciones: number
  unidades: number
  compras: number
  ventas: number
}

type Respuesta = {
  usuarios: UsuarioPanel[]
  roles: Record<string, number>
  totalActivos: number
  paginacion: { pagina: number; porPagina: number; total: number; paginas: number }
}

const ROL_LABEL: Record<RolUsuario, string> = {
  admin: "Administración",
  lector: "Lector",
}

export function UsersView() {
  const [busqueda, setBusqueda] = useState("")
  const [q, setQ] = useState("")
  const [rol, setRol] = useState("todos")
  const [activo, setActivo] = useState("todos")
  const [pagina, setPagina] = useState(1)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [porDesactivar, setPorDesactivar] = useState<UsuarioPanel | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(busqueda)
      setPagina(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [busqueda])

  const url = useMemo(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    params.set("rol", rol)
    params.set("activo", activo)
    params.set("porPagina", "20")
    params.set("pagina", String(pagina))
    return `/api/panel/usuarios?${params.toString()}`
  }, [q, rol, activo, pagina])

  const { data, cargando, error, recargar } = usePanelQuery<Respuesta>(url)

  const cambiarRol = async (usuario: UsuarioPanel, nuevoRol: RolUsuario) => {
    setOcupado(usuario.id)
    try {
      await panelEnviar("/api/panel/usuarios", "PATCH", { id: usuario.id, rol: nuevoRol })
      avisar.ok({
        titulo: "Rol actualizado",
        descripcion: `${usuario.nombre} ahora es ${ROL_LABEL[nuevoRol].toLowerCase()}.`,
        referencia: usuario.email,
      })
      recargar()
    } catch (fallo) {
      avisar.falla({
        titulo: "No se pudo cambiar el rol",
        descripcion: mensajeDeFallo(fallo, "Inténtalo otra vez."),
        referencia: usuario.nombre,
      })
    } finally {
      setOcupado(null)
    }
  }

  const confirmarDesactivacion = async () => {
    if (!porDesactivar) return
    setOcupado(porDesactivar.id)
    try {
      await panelEnviar("/api/panel/usuarios", "PATCH", { id: porDesactivar.id, activo: false })
      avisar.ok({
        titulo: "Cuenta desactivada",
        descripcion: "Se cerraron todas sus sesiones activas.",
        referencia: porDesactivar.nombre,
      })
      setPorDesactivar(null)
      recargar()
    } catch (fallo) {
      avisar.falla({
        titulo: "No se pudo desactivar la cuenta",
        descripcion: mensajeDeFallo(fallo, "Inténtalo otra vez."),
        referencia: porDesactivar.nombre,
        duracion: 8000,
      })
    } finally {
      setOcupado(null)
    }
  }

  const reactivar = async (usuario: UsuarioPanel) => {
    setOcupado(usuario.id)
    try {
      await panelEnviar("/api/panel/usuarios", "PATCH", { id: usuario.id, activo: true })
      avisar.ok({
        titulo: "Cuenta reactivada",
        descripcion: "El usuario vuelve a poder entrar a LEKTOR.",
        referencia: usuario.nombre,
      })
      recargar()
    } catch (fallo) {
      avisar.falla({
        titulo: "No se pudo reactivar la cuenta",
        descripcion: mensajeDeFallo(fallo, "Inténtalo otra vez."),
        referencia: usuario.nombre,
      })
    } finally {
      setOcupado(null)
    }
  }

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Cuentas, roles y actividad de la comunidad LEKTOR</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent" onClick={recargar} disabled={cargando}>
          <RefreshCw className={cn("h-4 w-4", cargando && "animate-spin")} />
          Actualizar
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Indicador
          titulo="Cuentas"
          valor={data?.paginacion.total ?? 0}
          detalle={`${data?.totalActivos ?? 0} activas`}
        />
        {ROLES_USUARIO.map((valor) => (
          <Indicador
            key={valor}
            titulo={ROL_LABEL[valor]}
            valor={data?.roles[valor] ?? 0}
            detalle={valor === "lector" ? "compradores y vendedores" : "equipo interno"}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Filtros
          </CardTitle>
          <CardDescription>Busca por nombre o correo electrónico</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar usuario…"
              aria-label="Buscar usuario por nombre o correo"
              className="pl-9"
            />
          </div>
          <Select
            value={rol}
            onValueChange={(valor) => {
              setRol(valor)
              setPagina(1)
            }}
          >
            <SelectTrigger aria-label="Filtrar usuarios por rol">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los roles</SelectItem>
              {ROLES_USUARIO.map((valor) => (
                <SelectItem key={valor} value={valor}>
                  {ROL_LABEL[valor]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activo}
            onValueChange={(valor) => {
              setActivo(valor)
              setPagina(1)
            }}
          >
            <SelectTrigger aria-label="Filtrar usuarios por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              <SelectItem value="activos">Solo activos</SelectItem>
              <SelectItem value="inactivos">Solo inactivos</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuentas registradas</CardTitle>
          <CardDescription>
            {data ? `${data.paginacion.total} usuarios encontrados` : "Cargando usuarios…"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Aviso tono="falla" titulo="No se pudo cargar el listado" className="py-6">
              {error} Vuelve a intentarlo o recarga la página.
            </Aviso>
          ) : null}
          {cargando && !data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, indice) => (
                <Skeleton key={indice} className="h-12 w-full" />
              ))}
            </div>
          ) : null}
          {data && data.usuarios.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Users className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No hay usuarios con estos filtros</p>
            </div>
          ) : null}
          {data && data.usuarios.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Usuario</TableHead>
                    <TableHead scope="col">Ubicación</TableHead>
                    <TableHead scope="col" className="text-right">Publicaciones</TableHead>
                    <TableHead scope="col" className="text-right">Compras</TableHead>
                    <TableHead scope="col" className="text-right">Ventas</TableHead>
                    <TableHead scope="col">Alta</TableHead>
                    <TableHead scope="col">Rol</TableHead>
                    <TableHead scope="col" className="text-right">Activo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell>
                        <div className="font-medium">{usuario.nombre}</div>
                        <div className="text-xs text-muted-foreground">{usuario.email}</div>
                        {!usuario.activo && (
                          <Badge variant="destructive" className="mt-1">
                            Desactivada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {usuario.comuna ?? "—"}
                        {usuario.region ? `, ${usuario.region.replace("Región de ", "").replace("Región del ", "")}` : ""}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {usuario.publicaciones}
                        <div className="text-xs text-muted-foreground">{usuario.unidades} uds.</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{usuario.compras}</TableCell>
                      <TableCell className="text-right font-mono">{formatCLP(usuario.ventas)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(usuario.fechaCreacion)}</TableCell>
                      <TableCell>
                        <Select
                          value={usuario.rol}
                          onValueChange={(valor) => void cambiarRol(usuario, valor as RolUsuario)}
                          disabled={ocupado === usuario.id}
                        >
                          <SelectTrigger
                            size="sm"
                            className="w-40"
                            aria-label={`Cambiar rol de ${usuario.nombre}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES_USUARIO.map((valor) => (
                              <SelectItem key={valor} value={valor}>
                                {ROL_LABEL[valor]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {ocupado === usuario.id && <LoaderCircle className="h-4 w-4 animate-spin" />}
                          <Switch
                            checked={usuario.activo}
                            disabled={ocupado === usuario.id}
                            onCheckedChange={(valor) => {
                              if (valor) void reactivar(usuario)
                              else setPorDesactivar(usuario)
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.paginacion.paginas > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.paginacion.pagina} de {data.paginacion.paginas}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((valor) => Math.max(1, valor - 1))}
              disabled={data.paginacion.pagina <= 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagina((valor) => Math.min(data.paginacion.paginas, valor + 1))}
              disabled={data.paginacion.pagina >= data.paginacion.paginas}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <ConfirmarAccion
        abierto={Boolean(porDesactivar)}
        tono="falla"
        rotulo="Cerrar el acceso"
        titulo="¿Desactivar esta cuenta?"
        descripcion={`${porDesactivar?.nombre} no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Sus publicaciones dejarán de mostrarse en el catálogo y no admitirán nuevas reservas. Las órdenes existentes se conservarán. Puedes reactivar la cuenta cuando quieras.`}
        confirmTexto="Desactivar"
        cargando={Boolean(porDesactivar) && ocupado === porDesactivar?.id}
        onConfirmar={() => void confirmarDesactivacion()}
        onCerrar={() => setPorDesactivar(null)}
      />
    </main>
  )
}

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: number; detalle: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className="text-2xl font-semibold">{valor.toLocaleString("es-CL")}</p>
        <p className="text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  )
}
