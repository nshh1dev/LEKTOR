"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Users,
  UserPlus,
  Search,
  ShieldCheck,
  HardHat,
  MoreHorizontal,
  Mail,
  Pencil,
  Power,
  PowerOff,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useInventoryStore, type Usuario } from "@/lib/store"
import { toast } from "sonner"

type FilterRol = "todos" | "admin" | "worker"
type FilterEstado = "todos" | "activos" | "inactivos"

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
}

function formatRelative(iso?: string) {
  if (!iso) return "Nunca"
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return "Hace instantes"
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h} h`
  const days = Math.floor(h / 24)
  if (days < 7) return `Hace ${days} ${days === 1 ? "día" : "días"}`
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
}

function initials(nombre: string) {
  return nombre
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function UsersView() {
  const usuarios = useInventoryStore((s) => s.usuarios)
  const crearUsuario = useInventoryStore((s) => s.crearUsuario)
  const desactivarUsuario = useInventoryStore((s) => s.desactivarUsuario)
  const activarUsuario = useInventoryStore((s) => s.activarUsuario)
  const actualizarUsuario = useInventoryStore((s) => s.actualizarUsuario)

  const [busqueda, setBusqueda] = useState("")
  const [filtroRol, setFiltroRol] = useState<FilterRol>("todos")
  const [filtroEstado, setFiltroEstado] = useState<FilterEstado>("todos")

  const [openCrear, setOpenCrear] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [pidiendoDesactivar, setPidiendoDesactivar] = useState<Usuario | null>(null)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return usuarios
      .filter((u) => (filtroRol === "todos" ? true : u.rol === filtroRol))
      .filter((u) =>
        filtroEstado === "todos"
          ? true
          : filtroEstado === "activos"
            ? u.activo
            : !u.activo,
      )
      .filter(
        (u) =>
          q === "" ||
          u.nombre.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime())
  }, [usuarios, busqueda, filtroRol, filtroEstado])

  const stats = useMemo(() => {
    const total = usuarios.length
    const activos = usuarios.filter((u) => u.activo).length
    const admins = usuarios.filter((u) => u.rol === "admin").length
    const workers = usuarios.filter((u) => u.rol === "worker").length
    return { total, activos, admins, workers }
  }, [usuarios])

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Users className="h-6 w-6 text-primary" />
            Gestión de usuarios
          </h1>
          <p className="text-sm text-muted-foreground">
            Cree, edite y desactive las cuentas del personal de la bodega.
          </p>
        </div>
        <Button onClick={() => setOpenCrear(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cuentas" value={stats.total} />
        <StatCard label="Activos" value={stats.activos} accent="emerald" />
        <StatCard label="Administradores" value={stats.admins} accent="primary" />
        <StatCard label="Bodegueros" value={stats.workers} accent="amber" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={filtroRol} onValueChange={(v) => setFiltroRol(v as FilterRol)}>
                <TabsList>
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                  <TabsTrigger value="worker">Bodega</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tabs value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as FilterEstado)}>
                <TabsList>
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="activos">Activos</TabsTrigger>
                  <TabsTrigger value="inactivos">Inactivos</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtrados.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>Sin resultados</EmptyTitle>
                <EmptyDescription>
                  No se encontraron usuarios con los filtros aplicados.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBusqueda("")
                    setFiltroRol("todos")
                    setFiltroEstado("todos")
                  }}
                >
                  Limpiar filtros
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="hidden lg:table-cell">Creado</TableHead>
                    <TableHead className="hidden xl:table-cell">Último acceso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[60px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados.map((u) => (
                    <TableRow key={u.id} className={!u.activo ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback
                              className={
                                u.rol === "admin"
                                  ? "bg-primary/10 text-primary text-xs font-semibold"
                                  : "bg-amber-500/15 text-amber-700 text-xs font-semibold dark:text-amber-500"
                              }
                            >
                              {initials(u.nombre)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="leading-tight">
                            <p className="font-medium">{u.nombre}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">{u.email}</span>
                      </TableCell>
                      <TableCell>
                        {u.rol === "admin" ? (
                          <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15" variant="secondary">
                            <ShieldCheck className="h-3 w-3" />
                            Admin
                          </Badge>
                        ) : (
                          <Badge className="gap-1 bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 dark:text-amber-500" variant="secondary">
                            <HardHat className="h-3 w-3" />
                            Bodega
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{formatDate(u.fechaCreacion)}</span>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <span className="text-sm text-muted-foreground">{formatRelative(u.ultimoAcceso)}</span>
                      </TableCell>
                      <TableCell>
                        {u.activo ? (
                          <Badge variant="outline" className="gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Abrir acciones</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditando(u)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {u.activo ? (
                              <DropdownMenuItem
                                onClick={() => setPidiendoDesactivar(u)}
                                className="text-destructive focus:text-destructive"
                              >
                                <PowerOff className="mr-2 h-4 w-4" />
                                Desactivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  activarUsuario(u.id)
                                  toast.success(`${u.nombre} fue activado`)
                                }}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                Activar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crear */}
      <CrearUsuarioDialog
        open={openCrear}
        onOpenChange={setOpenCrear}
        onCrear={(payload, enviarCorreo) => {
          const res = crearUsuario(payload)
          if (!res.ok) {
            toast.error(res.message ?? "No se pudo crear el usuario")
            return false
          }
          if (enviarCorreo) {
            console.log("[v0] Enviando credenciales por email:", {
              destino: payload.email,
              asunto: "Bienvenido a Distribuidora El Teniente",
              cuerpo: `Hola ${payload.nombre}, se ha creado tu cuenta con rol ${payload.rol}. Contraseña temporal: ${payload.password}`,
            })
            toast.success(`Usuario creado · credenciales enviadas a ${payload.email}`, {
              icon: <Mail className="h-4 w-4" />,
            })
          } else {
            toast.success(`Usuario ${payload.nombre} creado correctamente`, {
              description: `Contraseña: ${payload.password}`,
              icon: <CheckCircle2 className="h-4 w-4" />,
            })
          }
          return true
        }}
      />

      {/* Editar */}
      <EditarUsuarioDialog
        usuario={editando}
        onOpenChange={(open) => !open && setEditando(null)}
        onGuardar={(id, data) => {
          actualizarUsuario(id, data)
          toast.success("Cambios guardados")
          setEditando(null)
        }}
      />

      {/* Confirmar desactivar */}
      <AlertDialog
        open={pidiendoDesactivar !== null}
        onOpenChange={(open) => !open && setPidiendoDesactivar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              {pidiendoDesactivar?.nombre} ya no podrá iniciar sesión. Podrá reactivar la cuenta más tarde
              desde esta misma pantalla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pidiendoDesactivar) {
                  desactivarUsuario(pidiendoDesactivar.id)
                  toast.success(`${pidiendoDesactivar.nombre} fue desactivado`)
                  setPidiendoDesactivar(null)
                }
              }}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: "primary" | "emerald" | "amber"
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-500"
      : accent === "primary"
        ? "text-primary"
        : accent === "amber"
          ? "text-amber-600 dark:text-amber-500"
          : "text-foreground"
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-3xl font-semibold tracking-tight ${accentClass}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function generarPassword() {
  const adj = ["azul", "rojo", "verde", "lobo", "sol", "luna", "rio", "cerro"]
  const num = Math.floor(100 + Math.random() * 900)
  return `${adj[Math.floor(Math.random() * adj.length)]}-${num}`
}

function CrearUsuarioDialog({
  open,
  onOpenChange,
  onCrear,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCrear: (
    payload: {
      nombre: string
      email: string
      password: string
      rol: "admin" | "worker"
      activo: boolean
    },
    enviarCorreo: boolean,
  ) => boolean
}) {
  const [nombre, setNombre] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState(() => generarPassword())
  const [showPassword, setShowPassword] = useState(false)
  const [rol, setRol] = useState<"admin" | "worker">("worker")
  const [activo, setActivo] = useState(true)
  const [enviarCorreo, setEnviarCorreo] = useState(true)

  function reset() {
    setNombre("")
    setEmail("")
    setPassword(generarPassword())
    setShowPassword(false)
    setRol("worker")
    setActivo(true)
    setEnviarCorreo(true)
  }

  function copiarPassword() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(password).then(() => {
        toast.success("Contraseña copiada al portapapeles")
      })
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>
            Cree una cuenta para un trabajador. Solo el administrador puede crear cuentas.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const ok = onCrear({ nombre, email, password, rol, activo }, enviarCorreo)
            if (ok) {
              reset()
              onOpenChange(false)
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nombre">Nombre completo</FieldLabel>
              <Input
                id="nombre"
                placeholder="Pedro Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="usuario@tienda.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldDescription>Será su nombre de usuario para iniciar sesión.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña temporal</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <KeyRound className="h-4 w-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="font-mono"
                />
                <InputGroupAddon align="inline-end" className="gap-0.5">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={copiarPassword}
                    aria-label="Copiar contraseña"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setPassword(generarPassword())}
                    aria-label="Generar nueva contraseña"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                El trabajador podrá cambiarla luego de su primer acceso.
              </FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Rol</FieldLabel>
                <Select value={rol} onValueChange={(v) => setRol(v as "admin" | "worker")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Bodeguero</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="activo">Estado inicial</FieldLabel>
                <div className="flex h-10 items-center gap-3 rounded-md border bg-background px-3">
                  <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
                  <span className="text-sm text-muted-foreground">
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </Field>
            </div>
            <Field>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <Switch
                  id="enviarCorreo"
                  checked={enviarCorreo}
                  onCheckedChange={setEnviarCorreo}
                  className="mt-0.5"
                />
                <div className="leading-tight">
                  <FieldLabel htmlFor="enviarCorreo" className="cursor-pointer">
                    Enviar credenciales por email
                  </FieldLabel>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Se enviará una contraseña temporal al correo registrado.
                  </p>
                </div>
              </div>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Crear usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditarUsuarioDialog({
  usuario,
  onOpenChange,
  onGuardar,
}: {
  usuario: Usuario | null
  onOpenChange: (v: boolean) => void
  onGuardar: (id: string, data: Partial<Pick<Usuario, "nombre" | "rol" | "activo">>) => void
}) {
  const [nombre, setNombre] = useState("")
  const [rol, setRol] = useState<"admin" | "worker">("worker")
  const [activo, setActivo] = useState(true)

  // Sync state when opening
  const open = usuario !== null
  const usuarioId = usuario?.id

  // Sync form state when a different user is selected for editing
  useEffect(() => {
    if (usuario) {
      setNombre(usuario.nombre)
      setRol(usuario.rol)
      setActivo(usuario.activo)
    }
  }, [usuario])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>
            Modifique el nombre, el rol o el estado de la cuenta.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (usuarioId) onGuardar(usuarioId, { nombre, rol, activo })
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-nombre">Nombre completo</FieldLabel>
              <Input
                id="edit-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-email">Correo electrónico</FieldLabel>
              <Input id="edit-email" value={usuario?.email ?? ""} disabled />
              <FieldDescription>El email no se puede modificar.</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Rol</FieldLabel>
                <Select value={rol} onValueChange={(v) => setRol(v as "admin" | "worker")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Bodeguero</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-activo">Estado</FieldLabel>
                <div className="flex h-10 items-center gap-3 rounded-md border bg-background px-3">
                  <Switch id="edit-activo" checked={activo} onCheckedChange={setActivo} />
                  <span className="text-sm text-muted-foreground">
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar cambios</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
