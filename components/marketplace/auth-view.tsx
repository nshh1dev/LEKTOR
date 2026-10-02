"use client"

import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { mensajeDeFallo, resumenFaltantes } from "@/lib/avisos"
import {
  REGIONES,
  cuerpoDeRegistro,
  loginFormSchema,
  registroSchema,
  type LoginFormValues,
  type RegistroFormValues,
  type SesionUsuario,
} from "@/lib/catalog"
import { formatearTelefono } from "@/lib/entrada"
import { MensajeError } from "@/components/marketplace/shared"
import { api, ApiFailure } from "@/components/marketplace/api"

const ETIQUETAS_ACCESO = {
  email: "Correo electrónico",
  password: "Contraseña",
}

const ETIQUETAS_REGISTRO = {
  ...ETIQUETAS_ACCESO,
  nombre: "Nombre visible",
  telefono: "Teléfono de contacto",
  comuna: "Comuna",
  region: "Región",
  confirmarPassword: "Repite la contraseña",
}

const ANCLAS_ACCESO = {
  email: "auth-email",
  password: "auth-password",
}

const ANCLAS_REGISTRO = {
  ...ANCLAS_ACCESO,
  nombre: "auth-name",
  telefono: "auth-telefono",
  comuna: "auth-comuna",
  region: "auth-region",
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

/** El aviso de fallo es el mismo en las dos puertas; solo cambia el título. */
function avisarFallo(error: unknown, titulo: string) {
  const campos = error instanceof ApiFailure ? error.campos : undefined
  avisar.falla({
    titulo,
    descripcion: mensajeDeFallo(error, "Revisa los datos e inténtalo otra vez."),
    referencia: campos ? `${Object.keys(campos).length} campo(s) por corregir` : undefined,
    duracion: 8000,
  })
}

export function AuthView({
  onSuccess,
  onVolver,
}: {
  onSuccess: (user: SesionUsuario) => void
  onVolver: () => void
}) {
  const [modo, setModo] = useState<"login" | "register">("login")

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
          {modo === "login" ? (
            <FormularioAcceso onSuccess={onSuccess} />
          ) : (
            <FormularioRegistro onSuccess={onSuccess} />
          )}
          <Button variant="ghost" className="mt-4 w-full" onClick={onVolver}>
            Volver al catálogo
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function FormularioAcceso({ onSuccess }: { onSuccess: (user: SesionUsuario) => void }) {
  const [cargando, setCargando] = useState(false)
  const [rechazo, setRechazo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  })

  // Sin `useMemo` a propósito: ver la nota en `checkout-view.tsx`. Memoizar
  // sobre el Proxy de `errors` dejaba los pendientes marcados después de corregir
  // el campo.
  const faltan = resumenFaltantes(errors, ETIQUETAS_ACCESO, ANCLAS_ACCESO)

  const entrar = handleSubmit(async (values) => {
    setCargando(true)
    setRechazo(null)
    try {
      const data = await api<{ user: SesionUsuario }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      avisar.ok({
        titulo: "Sesión iniciada",
        descripcion: `Hola de nuevo, ${data.user.nombre}. Tu estantería te estaba esperando.`,
      })
      onSuccess(data.user)
    } catch (error) {
      setRechazo(mensajeDeFallo(error, "No se pudo iniciar sesión"))
      avisarFallo(error, "No pudimos iniciar sesión")
    } finally {
      setCargando(false)
    }
  })

  return (
    <>
      <form onSubmit={entrar} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="auth-email">Correo electrónico</Label>
          <Input
            id="auth-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            placeholder="tu@email.com"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "auth-email-error" : undefined}
            {...register("email")}
          />
          <MensajeError campo="auth-email" className="mt-1" mensaje={errors.email?.message} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="auth-password">Contraseña</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete="current-password"
            placeholder="tu contraseña"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "auth-password-error" : undefined}
            {...register("password")}
          />
          <MensajeError campo="auth-password" className="mt-1" mensaje={errors.password?.message} />
        </div>
        <Button
          type="submit"
          className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
          disabled={cargando}
        >
          {cargando ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn />}
          Entrar
        </Button>
        {faltan.length > 0 ? (
          <FaltanDatos titulo="Para entrar faltan" datos={faltan} vivo={false} />
        ) : null}
        {rechazo ? <Aviso tono="falla" titulo={rechazo} className="mt-1" /> : null}
      </form>
      {MOSTRAR_DEMO ? (
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
                  setValue("email", cuenta.email, { shouldValidate: true })
                  setValue("password", cuenta.password, { shouldValidate: true })
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
      ) : null}
    </>
  )
}

function FormularioRegistro({ onSuccess }: { onSuccess: (user: SesionUsuario) => void }) {
  const [cargando, setCargando] = useState(false)
  const [rechazo, setRechazo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RegistroFormValues>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      nombre: "",
      telefono: "",
      comuna: "",
      region: "",
      email: "",
      password: "",
      confirmarPassword: "",
    },
  })

  const telefonoActual = useWatch({ control, name: "telefono" })
  const regionActual = useWatch({ control, name: "region" })

  const faltan = resumenFaltantes(errors, ETIQUETAS_REGISTRO, ANCLAS_REGISTRO)

  const crearCuenta = handleSubmit(async (values) => {
    setCargando(true)
    setRechazo(null)
    try {
      const data = await api<{ user: SesionUsuario }>("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoDeRegistro(values)),
      })
      avisar.ok({
        titulo: `Bienvenido a LEKTOR, ${data.user.nombre}`,
        descripcion: "Ya puedes publicar tus tomos y seguir las compras que hagas.",
      })
      onSuccess(data.user)
    } catch (error) {
      setRechazo(mensajeDeFallo(error, "No se pudo crear tu cuenta"))
      avisarFallo(error, "No pudimos crear tu cuenta")
    } finally {
      setCargando(false)
    }
  })

  return (
    <form onSubmit={crearCuenta} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-name">Nombre visible</Label>
        <Input
          id="auth-name"
          autoComplete="nickname"
          placeholder="OtakuStore99"
          aria-invalid={errors.nombre ? true : undefined}
          aria-describedby={errors.nombre ? "auth-name-error" : undefined}
          {...register("nombre")}
        />
        <MensajeError campo="auth-name" className="mt-1" mensaje={errors.nombre?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-telefono">Teléfono de contacto</Label>
        <Input
          id="auth-telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+56 9 1234 5678"
          className="font-mono"
          value={telefonoActual ?? ""}
          onChange={(event) =>
            setValue("telefono", formatearTelefono(event.target.value), { shouldValidate: true })
          }
          aria-invalid={errors.telefono ? true : undefined}
          aria-describedby={errors.telefono ? "auth-telefono-error" : undefined}
        />
        <MensajeError campo="auth-telefono" className="mt-1" mensaje={errors.telefono?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-comuna">Comuna</Label>
        <Input
          id="auth-comuna"
          autoComplete="address-level2"
          placeholder="Providencia"
          aria-invalid={errors.comuna ? true : undefined}
          aria-describedby={errors.comuna ? "auth-comuna-error" : undefined}
          {...register("comuna")}
        />
        <MensajeError campo="auth-comuna" className="mt-1" mensaje={errors.comuna?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-region">Región</Label>
        <Select
          value={regionActual ?? ""}
          onValueChange={(value) => setValue("region", value, { shouldValidate: true })}
        >
          <SelectTrigger
            id="auth-region"
            className="w-full"
            aria-invalid={errors.region ? true : undefined}
            aria-describedby={errors.region ? "auth-region-error" : undefined}
          >
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
        <MensajeError campo="auth-region" className="mt-1" mensaje={errors.region?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-email">Correo electrónico</Label>
        <Input
          id="auth-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@email.com"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "auth-email-error" : undefined}
          {...register("email")}
        />
        <MensajeError campo="auth-email" className="mt-1" mensaje={errors.email?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-password">Contraseña</Label>
        <Input
          id="auth-password"
          type="password"
          autoComplete="new-password"
          placeholder="mínimo 6 caracteres"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "auth-password-error" : undefined}
          {...register("password")}
        />
        <MensajeError campo="auth-password" className="mt-1" mensaje={errors.password?.message} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="auth-confirmar">Repite la contraseña</Label>
        <Input
          id="auth-confirmar"
          type="password"
          autoComplete="new-password"
          placeholder="mínimo 6 caracteres"
          aria-invalid={errors.confirmarPassword ? true : undefined}
          aria-describedby={errors.confirmarPassword ? "auth-confirmar-error" : undefined}
          {...register("confirmarPassword")}
        />
        <MensajeError
          campo="auth-confirmar"
          className="mt-1"
          mensaje={errors.confirmarPassword?.message}
        />
      </div>
      <Button
        type="submit"
        className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
        disabled={cargando}
      >
        {cargando ? <LoaderCircle className="size-4 animate-spin" /> : <LogIn />}
        Crear mi cuenta
      </Button>
      {faltan.length > 0 ? (
        <FaltanDatos titulo="Para seguirte faltan" datos={faltan} vivo={false} />
      ) : null}
      {rechazo ? <Aviso tono="falla" titulo={rechazo} className="mt-1" /> : null}
    </form>
  )
}