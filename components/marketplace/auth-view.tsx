"use client"

import { useMemo, useState } from "react"
import { BookOpen, LoaderCircle, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { avisar } from "@/components/notificacion/avisar"
import { Aviso, FaltanDatos } from "@/components/notificacion/avisos"
import { mensajeDeFallo, type Faltante } from "@/lib/avisos"
import { REGIONES, type SesionUsuario } from "@/lib/catalog"
import { formatearTelefono } from "@/lib/entrada"
import { api, ApiFailure } from "@/components/marketplace/api"

const CAMPOS: Record<string, string> = {
  nombre: "Nombre visible",
  telefono: "Teléfono de contacto",
  comuna: "Comuna",
  region: "Región",
  email: "Correo electrónico",
  password: "Contraseña",
  confirmarPassword: "Repite la contraseña",
}

const ANCLAS: Record<string, string> = {
  nombre: "auth-name",
  telefono: "auth-telefono",
  comuna: "auth-comuna",
  region: "auth-region",
  email: "auth-email",
  password: "auth-password",
  confirmarPassword: "auth-confirmar",
}

/**
 * Atajos para la demostración: rellenan el formulario con las cuentas que crea
 * `pnpm db:seed` y dejan que la persona pulse «Entrar» por su cuenta. Se borran
 * borrando este bloque y `MOSTRAR_DEMO`; con el gate de NODE_ENV tampoco aparecen
 * en un build de producción.
 */
const CUENTAS_DEMO = [
  { etiqueta: "Lector", email: "nico@lektor.cl", password: "123456" },
  { etiqueta: "Vendedor", email: "otaku@lektor.cl", password: "otaku123" },
  { etiqueta: "Admin", email: "admin@lektor.cl", password: "admin123" },
]
const MOSTRAR_DEMO = process.env.NODE_ENV !== "production"

export function AuthView({
  onSuccess,
  onVolver,
}: {
  onSuccess: (user: SesionUsuario) => void
  onVolver: () => void
}) {
  const [modo, setModo] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [confirmarPassword, setConfirmarPassword] = useState("")
  const [telefono, setTelefono] = useState("")
  const [comuna, setComuna] = useState("")
  const [region, setRegion] = useState("")
  const [cargando, setCargando] = useState(false)
  const [rechazo, setRechazo] = useState<string | null>(null)

  const faltan: Faltante[] = useMemo(() => {
    const vacios: Record<string, { falta: boolean; mensaje?: string }> = {
      email: { falta: !email.trim(), mensaje: "Escribe un correo válido" },
      password: { falta: !password || password.length < 6, mensaje: "Mínimo 6 caracteres" },
    }
    if (modo === "register") {
      vacios.nombre = { falta: nombre.trim().length < 2, mensaje: "Mínimo 2 caracteres" }
      vacios.telefono = { falta: telefono.trim().length < 6, mensaje: "Para coordinar la entrega" }
      vacios.comuna = { falta: comuna.trim().length < 2 }
      vacios.region = { falta: !region, mensaje: "Elige una de las regiones" }
      vacios.confirmarPassword = {
        falta: !confirmarPassword || confirmarPassword !== password,
        mensaje:
          confirmarPassword && confirmarPassword !== password
            ? "Las dos contraseñas no coinciden"
            : undefined,
      }
    }
    return Object.entries(vacios)
      .filter(([, estado]) => estado.falta)
      .map(([campo, estado]) => ({
        campo,
        etiqueta: CAMPOS[campo],
        ancla: ANCLAS[campo],
        mensaje: estado.mensaje,
      }))
  }, [modo, email, password, nombre, telefono, comuna, region, confirmarPassword])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (faltan.length > 0) {
      avisar.revisar({
        titulo: "Aún te faltan datos",
        descripcion:
          modo === "register"
            ? `Completa ${faltan.length === 1 ? "el campo marcado" : `los ${faltan.length} campos marcados`} para crear tu cuenta.`
            : "Escribe tu correo y tu contraseña para entrar.",
        accion: {
          etiqueta: "Llevarme al primer campo",
          alPulsar: () => {
            const ancla = faltan[0]?.ancla
            const destino = ancla ? document.getElementById(ancla) : null
            destino?.focus()
          },
        },
      })
      return
    }
    setRechazo(null)
    setCargando(true)
    try {
      const data = await api<{ user: SesionUsuario }>(
        modo === "register" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            modo === "register"
              ? { nombre, email, password, confirmarPassword, telefono, comuna, region }
              : { email, password },
          ),
        },
      )
      if (modo === "register") {
        avisar.ok({
          titulo: `Bienvenido a LEKTOR, ${data.user.nombre}`,
          descripcion: "Ya puedes publicar tus tomos y seguir las compras que hagas.",
        })
      } else {
        avisar.ok({
          titulo: "Sesión iniciada",
          descripcion: `Hola de nuevo, ${data.user.nombre}. Tu estantería te estaba esperando.`,
        })
      }
      onSuccess(data.user)
    } catch (error) {
      const campos = error instanceof ApiFailure ? error.campos : undefined
      setRechazo(mensajeDeFallo(error, "No se pudo iniciar sesión"))
      avisar.falla({
        titulo: modo === "register" ? "No pudimos crear tu cuenta" : "No pudimos iniciar sesión",
        descripcion: mensajeDeFallo(error, "Revisa los datos e inténtalo otra vez."),
        referencia: campos ? `${Object.keys(campos).length} campo(s) por corregir` : undefined,
        duracion: 8000,
      })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center py-8">
      <Card className="w-full max-w-md rounded-2xl border-0 shadow-xl ring-1 ring-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-oro/15 text-oro">
            <BookOpen className="size-6" />
          </div>
          <CardTitle className="font-serif text-2xl tracking-tight">
            {modo === "register" ? "Únete a LEKTOR" : "Vuelve a LEKTOR"}
          </CardTitle>
          <CardDescription>Tu próxima historia está a un intercambio de distancia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
            <Button
              type="button"
              variant={modo === "login" ? "default" : "ghost"}
              onClick={() => setModo("login")}
              className="rounded-md"
            >
              Iniciar Sesión
            </Button>
            <Button
              type="button"
              variant={modo === "register" ? "default" : "ghost"}
              onClick={() => setModo("register")}
              className="rounded-md"
            >
              Crear Cuenta
            </Button>
          </div>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            {modo === "register" && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="auth-name">Nombre visible</Label>
                  <Input
                    id="auth-name"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    placeholder="OtakuStore99"
                    minLength={2}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="auth-telefono">Teléfono de contacto</Label>
                  <Input
                    id="auth-telefono"
                    type="tel"
                    inputMode="tel"
                    value={telefono}
                    onChange={(event) => setTelefono(formatearTelefono(event.target.value))}
                    placeholder="+56 9 1234 5678"
                    minLength={6}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="auth-comuna">Comuna</Label>
                  <Input
                    id="auth-comuna"
                    value={comuna}
                    onChange={(event) => setComuna(event.target.value)}
                    placeholder="Providencia"
                    minLength={2}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="auth-region">Región</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger id="auth-region" className="w-full">
                      <SelectValue placeholder="Selecciona tu región" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONES.map((valor) => (
                        <SelectItem key={valor} value={valor}>
                          {valor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-email">Correo electrónico</Label>
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="auth-password">Contraseña</Label>
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="mínimo 6 caracteres"
                minLength={6}
                required
              />
            </div>
            {modo === "register" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="auth-confirmar">Repite la contraseña</Label>
                <Input
                  id="auth-confirmar"
                  type="password"
                  value={confirmarPassword}
                  onChange={(event) => setConfirmarPassword(event.target.value)}
                  placeholder="mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            )}
            <Button type="submit" className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90" disabled={cargando}>
              {cargando ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn />}
              {modo === "register" ? "Crear mi cuenta" : "Entrar"}
            </Button>
            {faltan.length > 0 ? (
              <FaltanDatos
                titulo="Para seguirte faltan"
                datos={faltan}
                vivo={false}
              />
            ) : null}
            {rechazo ? (
              <Aviso tono="falla" titulo={rechazo} className="mt-1" />
            ) : null}
          </form>
          {modo === "login" && MOSTRAR_DEMO && (
            <div
              role="group"
              aria-label="Cuentas de demostración"
              className="mt-6 flex flex-col gap-2 border-t border-border/60 pt-5"
            >
              <p className="rotulo text-muted-foreground">Accesos rápidos</p>
              <div className="grid grid-cols-2 gap-2">
                {CUENTAS_DEMO.map((cuenta) => (
                  <Button
                    key={cuenta.email}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      setEmail(cuenta.email)
                      setPassword(cuenta.password)
                      setRechazo(null)
                      avisar.dato({
                        titulo: "Formulario listo",
                        descripcion: `Pulsa Entrar para iniciar sesión como ${cuenta.etiqueta.toLowerCase()}.`,
                      })
                    }}
                  >
                    {cuenta.etiqueta}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Cuentas de la demostración: rellenan el formulario, tú decides cuándo entrar.
              </p>
            </div>
          )}
          <Button variant="ghost" className="mt-4 w-full" onClick={onVolver}>
            Volver al catálogo
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
