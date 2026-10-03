/**
 * Simulación end-to-end del marketplace contra el dev server.
 *
 *   pnpm db:reset     # deja la base limpia y sembrada
 *   pnpm dev          # en otra terminal
 *   pnpm simular
 *
 * Es un camino feliz, no un suite de tests: su trabajo es dejar constancia de que
 * el flujo completo funciona y de que el stock cuadra. Las aserciones son
 * relativas (comparan deltas), porque el seed deja órdenes y stock ya cargados.
 *
 * Los valores del dominio (costo de envío, tope de página) se importan en vez de
 * escribirse acá: una copia se desincroniza sin avisar.
 */

import "dotenv/config"

import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { COMISION_PLATAFORMA, COSTO_ENVIO_DOMICILIO, PAGE_SIZE_MAX, RANGOS_PRECISO, comisionPlataforma } from "../lib/catalog"

const BASE = process.env.SIMULAR_BASE_URL ?? "http://localhost:3000"
const CLAVE = "simulacion123"

/**
 * Una sola conexión, y solo para envejecer reservas: no hay forma de esperar 48 horas
 * dentro de una corrida, y ningún endpoint permite hacerlo. Todo lo demás se comprueba
 * por HTTP contra el servidor, como el resto de la simulación.
 */
let pool: Pool | null = null

function baseDeDatos() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Falta DATABASE_URL en .env, y sin ella no se puede envejecer una reserva")
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return drizzle(pool)
}

async function cerrarBaseDeDatos(): Promise<void> {
  if (!pool) return
  await pool.end()
  pool = null
}

type Actor = { nombre: string; email: string; rol: string; cookie: string }
type Resultado = { ok: boolean; detalle: string }

/** Respuestas de la API: solo usamos estos campos, no hace falta modelar todo. */
type Respuesta = Record<string, unknown>
type Publicacion = {
  id: string
  titulo: string
  precio: number
  stock: number
  estado?: string
  rating?: string | null
  ratingCount?: number
}
type Orden = {
  id: string
  publicacionId: string
  total: number
  estado?: string
  compradorEmail?: string
}
type Movimiento = {
  id: string
  tipo: string
  cantidad: number
  stockAnterior: number
  stockResultante: number
  motivo?: string
  publicacion?: { id: string; titulo: string }
  publicacionId?: string
}
type MensajeConversacion = { id: string; mensaje: string; fechaCreacion: string }
type Conversacion = {
  id: string
  publicacionId?: string
  publicacionTitulo?: string
  rol?: string
  contraparte?: { id: string; nombre: string }
  mensajes?: MensajeConversacion[]
  ultimoMensaje?: string | null
}

const etapas: {
  nombre: string
  necesitaActores: boolean
  abreActores: boolean
  fn: () => Promise<Resultado>
}[] = []
let fallos = 0

function check(condicion: unknown, mensaje: string): boolean {
  if (condicion) return true
  fallos += 1
  console.log(`      x ${mensaje}`)
  return false
}

function igual<T>(real: T, esperado: T, etiqueta: string): boolean {
  return check(
    real === esperado,
    `${etiqueta}: esperaba ${JSON.stringify(esperado)}, obtuve ${JSON.stringify(real)}`,
  )
}

/** Como `igual`, pero comparando el contenido: `===` sobre dos arrays nunca coincide. */
function igualLista<T>(real: T[], esperado: T[], etiqueta: string): boolean {
  return igual(JSON.stringify(real), JSON.stringify(esperado), etiqueta)
}

function etapa(
  nombre: string,
  fn: () => Promise<Resultado>,
  opciones: { necesitaActores?: boolean; abreActores?: boolean } = {},
) {
  etapas.push({
    nombre,
    fn,
    necesitaActores: opciones.necesitaActores ?? true,
    // Solo la etapa que abre las sesiones habilita las que dependen de ellas: se
    // marca acá en vez de adivinar por el nombre, porque si una etapa posterior
    // falla no debe dejar sin correr todo lo que viene detrás.
    abreActores: opciones.abreActores ?? false,
  })
}

async function pedir(
  ruta: string,
  opciones: {
    method?: string
    cookie?: string
    body?: unknown
    headers?: Record<string, string>
  } = {},
): Promise<{ status: number; datos: Respuesta; headers: Headers }> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: opciones.method ?? "GET",
    headers: {
      ...(opciones.headers ?? {}),
      ...(opciones.cookie ? { cookie: opciones.cookie } : {}),
      ...(opciones.body ? { "content-type": "application/json" } : {}),
    },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
    redirect: "manual",
  })
  const texto = await respuesta.text()
  let datos: Respuesta = {}
  try {
    datos = texto ? JSON.parse(texto) : {}
  } catch {
    datos = { _crudo: texto.slice(0, 200) }
  }
  return { status: respuesta.status, datos, headers: respuesta.headers }
}

function lista<T>(datos: Respuesta, clave: string): T[] {
  const valor = datos[clave]
  return Array.isArray(valor) ? (valor as T[]) : []
}

function cookieDe(respuesta: Headers): string {
  const cruda = respuesta.getSetCookie?.() ?? []
  const pares = cruda.map((c) => c.split(";")[0]).filter((c) => c.includes("="))
  return pares.join("; ")
}

async function entrar(email: string, clave: string): Promise<Actor | null> {
  const r = await pedir("/api/auth/login", { method: "POST", body: { email, password: clave } })
  if (r.status !== 200) {
    console.log(`      x login de ${email} devolvió ${r.status}: ${JSON.stringify(r.datos)}`)
    fallos += 1
    return null
  }
  const user = (r.datos.user ?? {}) as { nombre?: string; rol?: string }
  return {
    nombre: user.nombre ?? email,
    email,
    rol: user.rol ?? "?",
    cookie: cookieDe(r.headers),
  }
}

function cuerpoRegistro(
  nombre: string,
  email: string,
  telefono: string,
  comuna = "Providencia",
  region = "Región Metropolitana",
) {
  return {
    nombre,
    email,
    password: CLAVE,
    confirmarPassword: CLAVE,
    telefono,
    comuna,
    region,
  }
}

// ---------------------------------------------------------------- F0 servidor

etapa(
  "F0 · el dev server responde",
  async () => {
    const r = await pedir("/api/auth/me")
    check(r.status === 200 || r.status === 401, `GET /api/auth/me devolvió ${r.status}`)
    return { ok: fallos === 0, detalle: `GET /api/auth/me → ${r.status}` }
  },
  { necesitaActores: false },
)

// ---------------------------------------------------------------- F1 registro

const actor = {} as {
  vendedor: Actor
  comprador1: Actor
  comprador2: Actor
  admin: Actor
}
const publicaciones: Publicacion[] = []
const ordenes: Orden[] = []

/**
 * El registro está limitado a 5 intentos por hora y por IP, y el contador vive en
 * la memoria del dev server: corridas repetidas lo consumen. Por eso la simulación
 * solo necesita un registro y degrada con elegancia: si el límite está agotado usa
 * una cuenta del seed, y si el correo ya existe (corrida previa sin reset) lo
 * reutiliza. Los compradores siempre vienen del seed.
 */
const VENDEDOR_NUEVO = {
  nombre: "Vendedor Sim",
  email: "vendedor@sim.cl",
  telefono: "+56911110010",
  comuna: "Providencia",
  region: "Región Metropolitana",
}
const VENDEDOR_SUPLENTE = { email: "otaku@lektor.cl", password: "otaku123" }
const COMPRADORES = [
  { email: "nico@lektor.cl", password: "123456" },
  { email: "camila@lektor.cl", password: "123456" },
]
/** "nuevo" registro, "existente" de una corrida previa, o seed por rate limit. */
let origenVendedor: "nuevo" | "existente" | "seed" = "seed"

etapa(
  "F1 · un lector se registra",
  async () => {
    const r = await pedir("/api/auth/register", {
      method: "POST",
      body: cuerpoRegistro(
        VENDEDOR_NUEVO.nombre,
        VENDEDOR_NUEVO.email,
        VENDEDOR_NUEVO.telefono,
        VENDEDOR_NUEVO.comuna,
        VENDEDOR_NUEVO.region,
      ),
    })

    if (r.status === 429) {
      // No es un fallo: el límite está funcionando. Se usa la cuenta del seed.
      const reintento = r.headers.get("retry-after")
      console.log(
        `      · registro limitado por el rate limit (429, Retry-After: ${reintento ?? "?"});` +
          " se sigue con la cuenta del seed",
      )
      origenVendedor = "seed"
      return { ok: true, detalle: "rate limit activo, se usa cuenta del seed" }
    }

    if (r.status === 409) {
      // Corrida previa sobre la misma base: la cuenta ya existe y se puede reusar.
      console.log(
        `      · ${VENDEDOR_NUEVO.email} ya existía (409); se reutiliza la cuenta`,
      )
      origenVendedor = "existente"
      return { ok: true, detalle: "cuenta reutilizada de una corrida previa" }
    }

    igual(r.status, 201, `registro de ${VENDEDOR_NUEVO.email}`)
    const user = (r.datos.user ?? {}) as Record<string, unknown>
    igual(user.rol, "lector", `rol inicial de ${VENDEDOR_NUEVO.email}`)
    igual(user.email, VENDEDOR_NUEVO.email, `correo de ${VENDEDOR_NUEVO.email}`)
    // El registro no expone teléfono ni comuna a propósito: se comprueba en F2.
    origenVendedor = "nuevo"
    return { ok: fallos === 0, detalle: "1 registro creado" }
  },
  { necesitaActores: false },
)

// ----------------------------------------------------------------- F1b registro

/**
 * El registro también se rechaza: un correo repetido no puede abrir una segunda
 * cuenta y una contraseña corta no pasa el esquema. Como el límite es de 5
 * intentos por hora y por IP, un 429 no es un fallo: la etapa se salta.
 */
etapa(
  "F1b · un registro repetido o con contraseña corta se rechaza",
  async () => {
    const repetido = await pedir("/api/auth/register", {
      method: "POST",
      body: cuerpoRegistro(
        VENDEDOR_NUEVO.nombre,
        VENDEDOR_NUEVO.email,
        VENDEDOR_NUEVO.telefono,
        VENDEDOR_NUEVO.comuna,
        VENDEDOR_NUEVO.region,
      ),
    })
    if (repetido.status === 429) {
      console.log("      · rate limit de registro activo (429); etapa sin comprobaciones")
      return { ok: true, detalle: "rate limit activo, etapa omitida" }
    }
    igual(repetido.status, 409, "registro con correo ya usado")
    igual(repetido.datos.reason, "email-exists", "motivo del correo ya usado")

    // Mismo esquema que valida el formulario, con una contraseña de 5 caracteres.
    const corta = await pedir("/api/auth/register", {
      method: "POST",
      body: {
        ...cuerpoRegistro("Corto Sim", "corto@sim.cl", "+56911110011"),
        password: "12345",
        confirmarPassword: "12345",
      },
    })
    igual(corta.status, 400, "registro con contraseña de 5 caracteres")
    igual(corta.datos.reason, "invalid", "motivo de la contraseña corta")

    // Y la cuenta corta nunca llegó a existir.
    const intentoCorto = await pedir("/api/auth/login", {
      method: "POST",
      body: { email: "corto@sim.cl", password: "12345" },
    })
    igual(intentoCorto.status, 401, "la cuenta con contraseña corta llegó a existir")

    return { ok: fallos === 0, detalle: "409 por correo repetido y 400 por contraseña corta" }
  },
  { necesitaActores: false },
)

// ------------------------------------------------------------------ F2 login

etapa(
  "F2 · los cuatro actores inician sesión",
  async () => {
    const vend =
      origenVendedor === "seed"
        ? await entrar(VENDEDOR_SUPLENTE.email, VENDEDOR_SUPLENTE.password)
        : await entrar(VENDEDOR_NUEVO.email, CLAVE)
    const c1 = await entrar(COMPRADORES[0].email, COMPRADORES[0].password)
    const c2 = await entrar(COMPRADORES[1].email, COMPRADORES[1].password)
    const a = await entrar("admin@lektor.cl", "admin123")
    if (!vend || !c1 || !c2 || !a) return { ok: false, detalle: "faltaron sesiones" }

    Object.assign(actor, { vendedor: vend, comprador1: c1, comprador2: c2, admin: a })
    igual(a.rol, "admin", "rol del admin")
    check(actor.vendedor.cookie.length > 0, "el vendedor no recibió cookie")

    // Nadie puede comprar su propia publicación: los tres deben ser distintos.
    const correos = new Set([vend.email, c1.email, c2.email])
    igual(correos.size, 3, "los tres actores son cuentas distintas")

    // Los datos de contacto se exigieron en el registro: comprueban que se guardaron.
    if (origenVendedor === "nuevo") {
      const r = await pedir("/api/profile", { cookie: vend.cookie })
      igual(r.status, 200, `perfil de ${vend.email}`)
      const perfil = (r.datos.perfil ?? {}) as Record<string, unknown>
      igual(perfil.telefono, VENDEDOR_NUEVO.telefono, "teléfono guardado tras el registro")
      igual(perfil.comuna, VENDEDOR_NUEVO.comuna, "comuna guardada tras el registro")
      igual(perfil.region, VENDEDOR_NUEVO.region, "región guardada tras el registro")
    }

    return { ok: fallos === 0, detalle: `5 sesiones (vendedor: ${vend.email})` }
  },
  { necesitaActores: false, abreActores: true },
)

// ------------------------------------------------------------------ F2b login

/**
 * El login no distingue entre "correo equivocado" y "contraseña equivocada":
 * las dos cosas responden igual para no filtrar qué correos están registrados.
 */
etapa(
  "F2b · el login rechaza lo que no corresponde sin filtrar el correo",
  async () => {
    const malaClave = await pedir("/api/auth/login", {
      method: "POST",
      body: { email: COMPRADORES[0].email, password: "no-es-la-clave" },
    })
    igual(malaClave.status, 401, "login con contraseña incorrecta")
    igual(malaClave.datos.reason, "bad-credentials", "motivo de la contraseña incorrecta")

    const correoFantasma = await pedir("/api/auth/login", {
      method: "POST",
      body: { email: "nadie-aqui@lektor.cl", password: "123456" },
    })
    igual(correoFantasma.status, 401, "login con correo inexistente")
    igual(correoFantasma.datos.reason, "bad-credentials", "motivo del correo inexistente")
    igual(
      correoFantasma.datos.error,
      malaClave.datos.error,
      "el mensaje tampoco distingue entre correo y contraseña",
    )

    // El límite anterior era por intentos fallidos, no una restricción de la
    // cuenta: con los datos buenos se entra igual.
    const buena = await pedir("/api/auth/login", {
      method: "POST",
      body: { email: COMPRADORES[0].email, password: COMPRADORES[0].password },
    })
    igual(buena.status, 200, "login correcto después de los fallidos")

    return { ok: fallos === 0, detalle: "clave mala, correo inexistente y luego entrada correcta" }
  },
  { necesitaActores: false },
)

// --------------------------------------------------- F2c clave y cierre de sesión

/**
 * El cambio de clave y el cierre de sesión se prueban con la cuenta que la
 * simulación se reserva para sí misma, nunca con las del seed: las claves del
 * seed son fijas y otras etapas dependen de ellas. Sirve tanto la recién creada
 * como la que quedó de una corrida previa (las dos se llaman
 * `vendedor@sim.cl` con la clave de la simulación); si el registro se degradó al
 * seed, la etapa se salta. La clave se restaura al final, incluso si una
 * comprobación falla, para no dejar la base en un estado que rompa la próxima
 * corrida.
 */
const CLAVE_NUEVA = "simulacion456"

etapa(
  "F2c · cambiar la clave cierra la sesión, y cerrar sesión la termina",
  async () => {
    if (origenVendedor === "seed") {
      return { ok: true, detalle: "la cuenta reservada no existe: el registro degradó al seed" }
    }

    const correo = VENDEDOR_NUEVO.email
    const inicial = await entrar(correo, CLAVE)
    let restaurada = false
    try {
      if (!inicial) return { ok: false, detalle: `no se pudo abrir sesión de ${correo}` }
      igual(inicial.cookie.length > 0, true, `cookie de ${correo}`)

      const cambio = await pedir("/api/auth/password", {
        method: "POST",
        cookie: inicial.cookie,
        body: { currentPassword: CLAVE, newPassword: CLAVE_NUEVA },
      })
      igual(cambio.status, 200, "cambio de clave")

      // Cambiar la clave destruye la sesión con la que se hizo: la cookie vieja
      // ya no sirve ni para un GET /api/auth/me.
      const conCookieVieja = await pedir("/api/auth/me", { cookie: inicial.cookie })
      igual(conCookieVieja.status, 401, "la sesión que cambió la clave")

      const conClaveVieja = await pedir("/api/auth/login", {
        method: "POST",
        body: { email: correo, password: CLAVE },
      })
      igual(conClaveVieja.status, 401, "login con la clave anterior al cambio")

      const conClaveNueva = await entrar(correo, CLAVE_NUEVA)
      if (!conClaveNueva) return { ok: false, detalle: "la clave nueva no dejó entrar" }

      // Cierre de sesión: la cookie sirve una vez y después queda anulada.
      const salida = await pedir("/api/auth/logout", {
        method: "POST",
        cookie: conClaveNueva.cookie,
      })
      igual(salida.status, 200, "cierre de sesión")
      const trasSalir = await pedir("/api/auth/me", { cookie: conClaveNueva.cookie })
      igual(trasSalir.status, 401, "la sesión después de cerrar")

      // Dejar la cuenta como estaba. Va con una sesión nueva porque la anterior
      // se acaba de cerrar: es el precio de probar el cierre en la misma cuenta.
      const paraRestaurar = await entrar(correo, CLAVE_NUEVA)
      if (!paraRestaurar) return { ok: false, detalle: "no se pudo reabrir sesión para restaurar" }
      const vuelta = await pedir("/api/auth/password", {
        method: "POST",
        cookie: paraRestaurar.cookie,
        body: { currentPassword: CLAVE_NUEVA, newPassword: CLAVE },
      })
      igual(vuelta.status, 200, "restaurar la clave original")

      const conClaveRestaurada = await entrar(correo, CLAVE)
      restaurada = conClaveRestaurada !== null
      igual(restaurada, true, `entrar con la clave restaurada de ${correo}`)

      return {
        ok: fallos === 0,
        detalle: "cambio, sesión anulada, logout y clave restaurada",
      }
    } finally {
      if (!restaurada) {
        // Red de seguridad: si una comprobación falló a mitad de camino, la
        // cuenta queda igual con la clave de siempre.
        const vigente = await pedir("/api/auth/login", {
          method: "POST",
          body: { email: correo, password: CLAVE_NUEVA },
        })
        if (vigente.status === 200) {
          await pedir("/api/auth/password", {
            method: "POST",
            cookie: cookieDe(vigente.headers),
            body: { currentPassword: CLAVE_NUEVA, newPassword: CLAVE },
          })
          console.log(`      · la clave de ${correo} quedó restaurada a mano`)
        }
      }
      if (inicial) {
        await pedir("/api/auth/logout", { method: "POST", cookie: inicial.cookie })
      }
    }
  },
  { necesitaActores: false },
)

// ---------------------------------------------- F2d cuenta desactivada

/**
 * Una cuenta desactivada no entra y pierde todas sus sesiones. Se apaga por el
 * panel, que es la vía real: `PATCH /api/panel/usuarios` borra las sesiones del
 * usuario, así que después hay que reabrir la del vendedor que usan las etapas que
 * siguen. Si el registro degradó al seed la etapa se salta, porque las cuentas del
 * seed las necesitan intactas. La cuenta se reactiva siempre, en el `finally`.
 */
async function alternarActivo(id: string, activo: boolean) {
  return pedir("/api/panel/usuarios", {
    method: "PATCH",
    cookie: actor.admin.cookie,
    body: { id, activo },
  })
}

etapa(
  "F2d · una cuenta desactivada no puede iniciar sesión y pierde sus sesiones",
  async () => {
    if (origenVendedor === "seed") {
      return { ok: true, detalle: "la cuenta reservada no existe: el registro degradó al seed" }
    }

    const correo = VENDEDOR_NUEVO.email
    const buscados = await pedir(`/api/panel/usuarios?q=${encodeURIComponent(correo)}`, {
      cookie: actor.admin.cookie,
    })
    const [objetivo] = lista<{ id: string; email: string }>(buscados.datos, "usuarios")
    if (!objetivo) return { ok: false, detalle: `el panel no encontró a ${correo}` }

    // Sesión emitida mientras la cuenta está activa: tiene que dejar de servir.
    const previa = await entrar(correo, CLAVE)
    if (!previa) return { ok: false, detalle: `no se pudo abrir sesión de ${correo}` }

    let reactivada = false
    try {
      igual((await alternarActivo(objetivo.id, false)).status, 200, "desactivar la cuenta")

      const conClave = await pedir("/api/auth/login", {
        method: "POST",
        body: { email: correo, password: CLAVE },
      })
      igual(conClave.status, 403, "login con la clave correcta en una cuenta desactivada")
      igual(conClave.datos.reason, "inactive", "motivo de la cuenta desactivada")
      check(!conClave.headers.get("set-cookie"), "no se entrega cookie a una cuenta desactivada")

      // La clave se verifica antes que el estado: una cuenta desactivada responde
      // igual que una inexistente, así que no confirma que el correo exista.
      const malaClave = await pedir("/api/auth/login", {
        method: "POST",
        body: { email: correo, password: "clave-incorrecta" },
      })
      igual(malaClave.status, 401, "login con la clave incorrecta en una cuenta desactivada")
      igual(malaClave.datos.reason, "bad-credentials", "no se filtra que la cuenta existe")

      const conSesionVieja = await pedir("/api/auth/me", { cookie: previa.cookie })
      igual(conSesionVieja.status, 401, "la sesión emitida antes de desactivar")

      await alternarActivo(objetivo.id, true)
      reactivada = true

      // Desactivar borró todas las sesiones del usuario, incluida la del vendedor
      // que usan las etapas siguientes: se entra de nuevo y se guarda en su actor.
      const deVuelta = await entrar(correo, CLAVE)
      if (!deVuelta) return { ok: false, detalle: "no se pudo volver a entrar tras reactivar" }
      actor.vendedor = deVuelta
      const meDelVendedor = await pedir("/api/auth/me", { cookie: actor.vendedor.cookie })
      igual(meDelVendedor.status, 200, "sesión del vendedor restablecida para las etapas siguientes")

      return {
        ok: fallos === 0,
        detalle: "desactivada rechaza el login, pierde las sesiones y vuelve a entrar",
      }
    } finally {
      if (!reactivada) {
        await alternarActivo(objetivo.id, true)
        const deVuelta = await entrar(correo, CLAVE)
        if (deVuelta) actor.vendedor = deVuelta
      }
    }
  },
)

// ------------------------------------------------------------- F3 publicar

etapa("F3 · el vendedor publica tres ejemplares", async () => {
  const base = {
    autor: "Eiichiro Oda",
    editorial: "Shueisha",
    categoria: "Mangas",
    condicion: "Como nuevo",
    descripcion: "Ejemplar de prueba creado por la simulación.",
    fotos: [],
  }
  const casos = [
    { titulo: "Sim One Piece vol. 1", precio: 8000, stock: 3 },
    { titulo: "Sim Berserk deluxe 3", precio: 12500, stock: 2 },
    { titulo: "Sim Dune Messiah", precio: 9500, stock: 1 },
  ]
  for (const caso of casos) {
    const r = await pedir("/api/publications", {
      method: "POST",
      cookie: actor.vendedor.cookie,
      body: { ...base, ...caso },
    })
    igual(r.status, 201, `publicación de ${caso.titulo}`)
    const p = r.datos.publication as Publicacion | undefined
    if (p) {
      igual(p.estado, "activa", `estado inicial de ${caso.titulo}`)
      igual(p.stock, caso.stock, `stock inicial de ${caso.titulo}`)
      publicaciones.push(p)
    }
  }
  igual(publicaciones.length, 3, "publicaciones creadas")
  return { ok: fallos === 0, detalle: `${publicaciones.length} publicaciones` }
})

// ------------------------------------------------------------- F4 buscar

etapa("F4 · el catálogo muestra las tres y filtra por precio", async () => {
  const r = await pedir(`/api/publications?q=Sim%20&porPagina=${PAGE_SIZE_MAX}`)
  igual(r.status, 200, "búsqueda del catálogo")
  const encontradas = lista<Publicacion>(r.datos, "publications")
  // Se comparan los ids creados en esta corrida: una base con datos de corridas
  // previas puede devolver más resultados con el mismo título.
  const ids = new Set(encontradas.map((p) => p.id))
  const faltantes = publicaciones.filter((p) => !ids.has(p.id))
  igual(faltantes.length, 0, `el catálogo no muestra: ${faltantes.map((p) => p.titulo).join(", ")}`)

  // El filtro de precio son tramos cerrados, sin campo de texto: se toma el
  // precio de una publicación y se consulta el tramo exacto que la contiene.
  const precio = publicaciones[0].precio
  const tramo = RANGOS_PRECISO.find((rango) => rango.min !== null && rango.max !== null && precio >= rango.min && precio <= rango.max)
  check(tramo !== undefined, `ningún tramo de RANGOS_PRECISO contiene el precio ${precio}`)

  if (tramo) {
    const params = new URLSearchParams({ porPagina: String(PAGE_SIZE_MAX) })
    if (tramo.min !== null) params.set("precioMin", String(tramo.min))
    if (tramo.max !== null) params.set("precioMax", String(tramo.max))
    const filtrado = await pedir(`/api/publications?${params.toString()}`)
    igual(filtrado.status, 200, "catálogo filtrado por precio")
    const enTramo = lista<Publicacion>(filtrado.datos, "publications")
    const fuera = enTramo.filter((p) => p.precio < tramo.min! || p.precio > tramo.max!)
    igual(fuera.length, 0, `el tramo ${tramo.id} devolvió precios fuera de rango`)
    check(
      enTramo.some((p) => p.id === publicaciones[0].id),
      "el tramo no incluye la publicación que lo originó",
    )
  }

  return { ok: fallos === 0, detalle: "catálogo y filtro de precio OK" }
})

// ------------------------------------------------------------ F5 pagar

etapa("F5 · la compra se completa con los tres métodos de entrega", async () => {
  const entregas: { metodo: string; datos: Record<string, unknown>; compra: Actor }[] = [
    {
      metodo: "envio_domicilio",
      compra: actor.comprador1,
      datos: {
        nombreRecibe: "Compradora Uno",
        telefono: "+56911110011",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Providencia 1234, depto 5",
        comuna: "Providencia",
        region: "Región Metropolitana",
        puntoRetiro: null,
      },
    },
    {
      metodo: "retiro_punto",
      compra: actor.comprador2,
      datos: {
        nombreRecibe: "Comprador Dos",
        telefono: "+56911110012",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Providencia",
        region: "Región Metropolitana",
        puntoRetiro: "Bóveda LEKTOR,456",
      },
    },
    {
      metodo: "coordinar",
      compra: actor.comprador1,
      datos: {
        nombreRecibe: "Compradora Uno",
        telefono: "+56911110011",
        metodoEntrega: "coordinar",
        direccion: null,
        comuna: "Providencia",
        region: "Región Metropolitana",
        puntoRetiro: null,
      },
    },
  ]

  const stockAntes = new Map(publicaciones.map((p) => [p.id, p.stock]))

  for (const entrega of entregas) {
    const publicacion = publicaciones.find((p) => !ordenes.some((o) => o.publicacionId === p.id))!
    const r = await pedir("/api/orders", {
      method: "POST",
      cookie: entrega.compra.cookie,
      body: { publicacionId: publicacion.id, datosDespacho: entrega.datos },
    })
    igual(r.status, 201, `orden con ${entrega.metodo}`)
    const orden = r.datos.order as (Orden & { metodoPago?: string; reservaExpiraEn?: string }) | undefined
    if (!orden) continue
    igual(orden.estado, "reservada", `estado inicial con ${entrega.metodo}`)
    igual(orden.metodoPago, "simulado", `método de pago con ${entrega.metodo}`)
    const esperado =
      publicacion.precio + (entrega.metodo === "envio_domicilio" ? COSTO_ENVIO_DOMICILIO : 0)
    igual(orden.total, esperado, `total con ${entrega.metodo}`)
    check(Boolean(orden.reservaExpiraEn), `falta reservaExpiraEn con ${entrega.metodo}`)
    ordenes.push({
      id: orden.id,
      publicacionId: publicacion.id,
      total: orden.total,
      compradorEmail: entrega.compra.email,
    })

    // Al agotarse, la publicación queda `agotada` y por regla de visibilidad solo
    // el dueño y los admins pueden abrirla: el comprador recibe 404 a propósito.
    const esperadoStock = (stockAntes.get(publicacion.id) ?? 0) - 1
    if (esperadoStock === 0) {
      const vistoPorComprador = await pedir(`/api/publications/${publicacion.id}`, {
        cookie: entrega.compra.cookie,
      })
      igual(
        vistoPorComprador.status,
        404,
        `un comprador no debería ver ${publicacion.titulo} ya agotada`,
      )
    }

    const detalle = await pedir(`/api/publications/${publicacion.id}`, {
      cookie: actor.vendedor.cookie,
    })
    const vista = detalle.datos.publication as Publicacion | undefined
    igual(vista?.stock, esperadoStock, `stock tras comprar ${publicacion.titulo}`)
  }

  igual(ordenes.length, 3, "órdenes creadas")
  return { ok: fallos === 0, detalle: `${ordenes.length} órdenes reservadas` }
})

// --------------------------------------------------------- F6 perfil y stock

etapa("F6 · el perfil marca esVendedor y un ajuste de stock deja rastro", async () => {
  const perfil = await pedir("/api/profile", { cookie: actor.vendedor.cookie })
  igual(perfil.status, 200, "lectura del perfil")
  const datos = perfil.datos as { esVendedor?: boolean; publicaciones?: number }
  check(
    datos.esVendedor === true || (datos.publicaciones ?? 0) > 0,
    "el perfil no refleja que el usuario vende",
  )

  const objetivo = publicaciones[0]
  const antes = await pedir(`/api/publications/${objetivo.id}`, { cookie: actor.vendedor.cookie })
  const stockPrevio = (antes.datos.publication as Publicacion).stock
  const nuevo = stockPrevio + 2

  const ajuste = await pedir(`/api/publications/${objetivo.id}`, {
    method: "PATCH",
    cookie: actor.vendedor.cookie,
    body: { stock: nuevo },
  })
  check(ajuste.status === 200, `el ajuste devolvió ${ajuste.status}`)

  const movimientos = await pedir(
    `/api/panel/movimientos?publicacionId=${objetivo.id}&tipo=ajuste`,
    { cookie: actor.admin.cookie },
  )
  igual(movimientos.status, 200, "lectura del historial de movimientos")
  const hayAjuste = lista<Movimiento>(movimientos.datos, "movimientos").some(
    (m) => m.tipo === "ajuste" && m.stockResultante === nuevo,
  )
  check(hayAjuste, `no hay movimiento de ajuste con stock resultante ${nuevo}`)

  publicaciones[0] = { ...objetivo, stock: nuevo }
  return { ok: fallos === 0, detalle: "perfil y ajuste de stock OK" }
})

// ------------------------------------------------------------ F7 bodega

etapa("F7 · la administración ve las reservadas y las agotadas", async () => {
  const r = await pedir("/api/panel/ordenes?estado=reservada&porPagina=50", {
    cookie: actor.admin.cookie,
  })
  igual(r.status, 200, "lectura de órdenes del panel")
  const ids = lista<{ id: string }>(r.datos, "ordenes").map((o) => o.id)
  for (const orden of ordenes) {
    check(ids.includes(orden.id), `la orden ${orden.id} no aparece en el panel`)
  }

  const bajo = await pedir("/api/panel/publicaciones?orden=stock&porPagina=50", {
    cookie: actor.admin.cookie,
  })
  igual(bajo.status, 200, "lectura de publicaciones ordenadas por stock")
  const todas = lista<Publicacion>(bajo.datos, "publicaciones")
  check(todas.length > 0, "el panel de publicaciones no devolvió filas")
  // Ordenadas por stock ascendente: las primeras son las que exigen reposición.
  const stocks = todas.map((p) => p.stock)
  const ordenado = stocks.every((valor, indice) => indice === 0 || stocks[indice - 1] <= valor)
  check(ordenado, `el panel no respetar el orden por stock: ${stocks.join(", ")}`)

  return { ok: fallos === 0, detalle: `${ids.length} órdenes reservadas en el panel` }
})

// ----------------------------------------------------- F8/F9 ciclo de la orden

etapa("F8 · el vendedor prepara y despacha la primera orden", async () => {
  const orden = ordenes[0]
  for (const estado of ["en_preparacion", "despachada"]) {
    const r = await pedir(`/api/orders/${orden.id}`, {
      method: "PATCH",
      cookie: actor.vendedor.cookie,
      body: { estado },
    })
    igual(r.status, 200, `transición a ${estado}`)
    igual((r.datos.order as Orden)?.estado, estado, `estado tras pedir ${estado}`)
  }
  return { ok: fallos === 0, detalle: "orden despachada" }
})

etapa("F8b · el chat de la orden es privado entre comprador y vendedor", async () => {
  const orden = ordenes[0]
  const hilo = `/api/orders/${orden.id}/chat`

  const vacio = await pedir(hilo, { cookie: actor.comprador1.cookie })
  igual(vacio.status, 200, "lectura del chat por el comprador")
  igual(lista(vacio.datos, "mensajes").length, 0, "el chat arranca vacío")

  const enviado = await pedir(hilo, {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { mensaje: "¿Te sirve entregar mañana a las 18?" },
  })
  igual(enviado.status, 201, "el comprador escribe en el chat")

  const respuesta = await pedir(hilo, {
    method: "POST",
    cookie: actor.vendedor.cookie,
    body: { mensaje: "Sí, te espero en el punto de retiro." },
  })
  igual(respuesta.status, 201, "el vendedor contesta en el chat")

  // El hilo se lee completo y en orden para los dos participantes.
  for (const [etiqueta, quien] of [
    ["comprador", actor.comprador1],
    ["vendedor", actor.vendedor],
  ] as const) {
    const leido = await pedir(hilo, { cookie: quien.cookie })
    const mensajes = lista<{ mensaje: string; emisor: { nombre: string } }>(leido.datos, "mensajes")
    igual(mensajes.length, 2, `el ${etiqueta} ve los dos mensajes`)
    igualLista(
      mensajes.map((m) => m.mensaje),
      ["¿Te sirve entregar mañana a las 18?", "Sí, te espero en el punto de retiro."],
      `orden del hilo leído por el ${etiqueta}`,
    )
  }

  // Ni un tercero ni la administración entran: la conversación es de la orden.
  for (const [etiqueta, quien] of [
    ["otro comprador", actor.comprador2],
    ["administración", actor.admin],
  ] as const) {
    const leer = await pedir(hilo, { cookie: quien.cookie })
    igual(leer.status, 403, `el ${etiqueta} no puede leer el chat`)
    const escribir = await pedir(hilo, {
      method: "POST",
      cookie: quien.cookie,
      body: { mensaje: "Mensaje indebido" },
    })
    igual(escribir.status, 403, `el ${etiqueta} no puede escribir en el chat`)
  }

  const vacioTexto = await pedir(hilo, {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { mensaje: "   " },
  })
  igual(vacioTexto.status, 400, "el chat rechaza un mensaje vacío")

  return { ok: fallos === 0, detalle: "2 mensajes, cerrado a terceros" }
})

etapa(
  "F8c · el comprobante arma la orden y libera el contacto a las dos partes",
  async () => {
    const orden = ordenes[0]
    const detalle = `/api/orders/${orden.id}`
    let montos = { subtotal: 0, envio: 0, total: 0 }

    // El comprobante se arma con el mismo detalle que ve la tarjeta de la orden:
    // número, montos y el contacto liberado de comprador y vendedor.
    for (const [etiqueta, quien, contraparte] of [
      ["comprador", actor.comprador1, "vendedor"],
      ["vendedor", actor.vendedor, "comprador"],
    ] as const) {
      const r = await pedir(detalle, { cookie: quien.cookie })
      igual(r.status, 200, `el ${etiqueta} lee el detalle de su orden`)

      const order = (r.datos.order ?? {}) as Record<string, unknown>
      check(Boolean(order.id), `el detalle leído por el ${etiqueta} no trae id`)
      igual(order.metodoPago, "simulado", `método de pago en el detalle del ${etiqueta}`)

      // El documento cuadra: el total es el subtotal más el envío.
      const { subtotal = 0, envio = 0, total = 0 } = order as {
        subtotal?: number
        envio?: number
        total?: number
      }
      igual(total, subtotal + envio, `total del comprobante leído por el ${etiqueta}`)

      // El comprobante dibuja el ejemplar y el despacho: si el endpoint deja de
      // devolver cualquiera de los dos, el documento sale con huecos.
      const publicacion = (order.publicacion ?? {}) as Record<string, unknown>
      check(Boolean(publicacion.titulo), `el comprobante no trae la publicación de la orden`)
      check(Boolean(publicacion.condicion), `el comprobante no trae la condición del ejemplar`)

      const despacho = (order.datosDespacho ?? {}) as Record<string, unknown>
      check(Boolean(despacho.nombreRecibe), `el comprobante no trae a quién recibe`)
      check(Boolean(despacho.telefono), `el comprobante no trae el teléfono de despacho`)
      check(Boolean(despacho.metodoEntrega), `el comprobante no trae el método de entrega`)
      check(Boolean(despacho.comuna), `el comprobante no trae la comuna de despacho`)

      // El contacto liberado es el corazón del comprobante: sin correo de la
      // contraparte no hay acuerdo P2P posible.
      const parte = (order[contraparte] ?? {}) as { email?: string; nombre?: string }
      check(Boolean(parte.email), `el ${etiqueta} no ve el correo del ${contraparte}`)
      check(Boolean(parte.nombre), `el ${etiqueta} no ve el nombre del ${contraparte}`)

      if (etiqueta === "comprador") montos = { subtotal, envio, total }
    }

    // La comisión de plataforma se retiene del subtotal: nunca lo supera, se
    // queda en pesos enteros y el vendedor recibe exactamente la diferencia.
    const comision = comisionPlataforma(montos.subtotal)
    check(Number.isInteger(comision), `la comisión ${comision} no es un peso entero`)
    check(comision < montos.subtotal, `la comisión ${comision} iguala o supera el subtotal`)
    igual(comision, Math.round(montos.subtotal * COMISION_PLATAFORMA), "comisión de plataforma")
    igual(montos.subtotal - comision, Math.round(montos.subtotal * (1 - COMISION_PLATAFORMA)), "parte del vendedor")

    // El contacto liberado no sale de la orden: un tercero queda fuera.
    const tercero = await pedir(detalle, { cookie: actor.comprador2.cookie })
    igual(tercero.status, 403, "otro comprador no puede leer el comprobante")

    return { ok: fallos === 0, detalle: "contacto liberado a las dos partes" }
  },
)

etapa("F9 · el comprador la recibe y recibe notificación", async () => {
  const orden = ordenes[0]
  const r = await pedir(`/api/orders/${orden.id}`, {
    method: "PATCH",
    cookie: actor.comprador1.cookie,
    body: { estado: "recibida" },
  })
  igual(r.status, 200, "recepción de la orden")
  igual((r.datos.order as Orden)?.estado, "recibida", "estado tras recibir")

  const notificaciones = await pedir("/api/notifications", { cookie: actor.comprador1.cookie })
  igual(notificaciones.status, 200, "lectura de notificaciones")
  const hayAviso = lista<{ id: string }>(notificaciones.datos, "notifications").length > 0
  check(hayAviso, "no hay notificaciones para el comprador")
  return { ok: fallos === 0, detalle: "orden recibida" }
})

// ------------------------------------------- F9c valoraciones verificadas

type Valoracion = {
  id: string
  puntaje: number
  visible: boolean
  editadoEn?: string | null
  autor: { id: string; nombre: string }
}

etapa("F9c · solo quien recibió el ejemplar puede valorarlo", async () => {
  const orden = ordenes[0]
  const publicacionId = orden.publicacionId
  const ruta = `/api/publications/${publicacionId}/reviews`

  // Un lector que no compró ese ejemplar no puede opinar sobre él.
  const intruso = await pedir(ruta, {
    method: "POST",
    cookie: actor.comprador2.cookie,
    body: { puntaje: 1 },
  })
  igual(intruso.status, 403, "un lector sin compra no puede valorar")
  igual(intruso.datos.reason, "sin-compra-verificada", "motivo del rechazo")

  // El vendedor tampoco: no se valora a uno mismo.
  const propio = await pedir(ruta, {
    method: "POST",
    cookie: actor.vendedor.cookie,
    body: { puntaje: 5 },
  })
  igual(propio.status, 400, "el vendedor no puede valorar su publicación")
  igual(propio.datos.reason, "own-publication", "motivo del rechazo al vendedor")

  // Sin sesión tampoco.
  const anonimo = await pedir(ruta, { method: "POST", body: { puntaje: 5 } })
  igual(anonimo.status, 401, "sin sesión no se puede valorar")

  // El orderId de una compra ajena no sirve para valorar la propia.
  const ajena = await pedir(ruta, {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { puntaje: 4, orderId: ordenes[1].id },
  })
  igual(ajena.status, 403, "el orderId de una compra ajena no permite valorar")
  igual(ajena.datos.reason, "sin-compra-verificada", "motivo del rechazo por orden ajena")

  // Ahora sí, el comprador que recibió el ejemplar, anclando la reseña a esa orden.
  const creada = await pedir(ruta, {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { puntaje: 4, orderId: orden.id },
  })
  igual(creada.status, 201, "valoración publicada")
  const review = creada.datos.review as Valoracion | undefined
  check(Boolean(review), "la respuesta no trae la valoración creada")
  // La API devuelve la valoración creada solo con su id y la lista ya
  // recalculada; el puntaje se comprueba en la lista, que es lo que el cliente
  // usa después de publicar.
  const publicadas = creada.datos.reviews as Valoracion[] | undefined
  const guardada = publicadas?.find((item) => item.id === review?.id)
  igual(guardada?.puntaje, 4, "puntaje guardado")

  // La orden recibida queda marcada como valorada en el perfil del comprador.
  const compras = (await pedir("/api/orders?rol=comprador", {
    cookie: actor.comprador1.cookie,
  })).datos.orders as { id: string; valorada: boolean }[]
  check(
    compras.some((orden) => orden.id === ordenes[0].id && orden.valorada === true),
    "la orden recibida no queda marcada como valorada",
  )

  // El promedio sale recalculado y la publicación lo refleja.
  const reputacion = creada.datos.reputacion as { promedio: number; total: number } | undefined
  igual(reputacion?.promedio, 4, "promedio tras la primera valoración")
  igual(reputacion?.total, 1, "total de valoraciones")

  const detalle = await pedir(`/api/publications/${publicacionId}`)
  igual(detalle.status, 200, "lectura pública de la publicación")
  const publication = detalle.datos.publication as Publicacion
  igual(publication.rating, "4.0", "nota en la publicación")
  igual(publication.ratingCount, 1, "contador en la publicación")

  // La lista es pública y no necesita sesión.
  const publica = await pedir(ruta)
  igual(publica.status, 200, "lectura anónima de las valoraciones")
  const reviews = lista<Valoracion>(publica.datos, "reviews")
  igual(reviews.length, 1, "valoraciones visibles")
  igual(publica.datos.puedeValorar, null, "sin sesión no se anuncia si se puede valorar")

  // Repetir la valoración sobre la misma orden no vale: la orden ya está usada.
  const repetida = await pedir(ruta, {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { puntaje: 5, orderId: orden.id },
  })
  igual(repetida.status, 403, "no se puede valorar dos veces la misma orden")

  return { ok: fallos === 0, detalle: "valoración verificada publicada" }
})

etapa("F9d · el autor edita la nota y el promedio se mueve al instante", async () => {
  const orden = ordenes[0]
  const ruta = `/api/publications/${orden.publicacionId}/reviews`
  const reviews = lista<Valoracion>((await pedir(ruta)).datos, "reviews")
  const review = reviews[0]
  check(Boolean(review), "no hay valoración sobre la que trabajar")

  // El autor guarda su cambio y el promedio se mueve.
  const editada = await pedir(`/api/reviews/${review.id}`, {
    method: "PATCH",
    cookie: actor.comprador1.cookie,
    body: { puntaje: 5 },
  })
  igual(editada.status, 200, "edición de la valoración por su autor")
  igual(
    (editada.datos.reputacion as { promedio: number }).promedio,
    5,
    "promedio tras editar",
  )
  check(
    Boolean((editada.datos.review as Valoracion).editadoEn),
    "la edición no marca editadoEn",
  )

  // Otro lector no edita lo ajeno.
  const ajena = await pedir(`/api/reviews/${review.id}`, {
    method: "PATCH",
    cookie: actor.comprador2.cookie,
    body: { puntaje: 1 },
  })
  igual(ajena.status, 403, "un tercero no edita la valoración de otro")
  igual(ajena.datos.reason, "forbidden", "motivo del rechazo al editor ajeno")

  return { ok: fallos === 0, detalle: "edición de la nota" }
})

etapa("F9e · moderar oculta la valoración y recalcula el promedio", async () => {
  const orden = ordenes[0]
  const ruta = `/api/publications/${orden.publicacionId}/reviews`
  const review = lista<Valoracion>((await pedir(ruta)).datos, "reviews")[0]
  check(Boolean(review), "no hay valoración que moderar")

  const cola = await pedir("/api/panel/valoraciones", { cookie: actor.admin.cookie })
  igual(cola.status, 200, "la administración abre la cola de valoraciones")
  check(
    lista<Valoracion>(cola.datos, "reviews").length > 0,
    "la cola de valoraciones viene vacía",
  )

  // Un lector no moderra.
  const intrusa = await pedir(`/api/panel/valoraciones/${review.id}`, {
    method: "PATCH",
    cookie: actor.comprador1.cookie,
    body: { visible: false },
  })
  igual(intrusa.status, 403, "un lector no puede moderar")

  const oculta = await pedir(`/api/panel/valoraciones/${review.id}`, {
    method: "PATCH",
    cookie: actor.admin.cookie,
    body: { visible: false },
  })
  igual(oculta.status, 200, "la administración oculta la valoración")
  igual(
    (oculta.datos.reputacion as { promedio: number | null }).promedio,
    null,
    "sin valoraciones visibles no hay promedio",
  )

  // Oculta no es borrada: sigue en la cola de moderación.
  const ocultas = await pedir("/api/panel/valoraciones?soloOcultas=true", {
    cookie: actor.admin.cookie,
  })
  check(
    lista<Valoracion>(ocultas.datos, "reviews").some((r) => r.id === review.id),
    "la valoración oculta no aparece en la cola de ocultas",
  )
  igual(
    lista<Valoracion>((await pedir(ruta)).datos, "reviews").length,
    0,
    "una valoración oculta no se muestra en la publicación",
  )

  // Se restituye para no dejar el seed descuadrado.
  const visible = await pedir(`/api/panel/valoraciones/${review.id}`, {
    method: "PATCH",
    cookie: actor.admin.cookie,
    body: { visible: true },
  })
  igual(visible.status, 200, "la administración restituye la valoración")
  igual(
    (visible.datos.reputacion as { promedio: number }).promedio,
    5,
    "el promedio vuelve tras restituir",
  )

  return { ok: fallos === 0, detalle: "moderación y recálculo" }
})

etapa("F9f · el autor borra su valoración y el promedio se rehace", async () => {
  const orden = ordenes[0]
  const ruta = `/api/publications/${orden.publicacionId}/reviews`
  const review = lista<Valoracion>((await pedir(ruta)).datos, "reviews")[0]
  check(Boolean(review), "no hay valoración que borrar")

  const ajena = await pedir(`/api/reviews/${review.id}`, {
    method: "DELETE",
    cookie: actor.comprador2.cookie,
  })
  igual(ajena.status, 403, "un tercero no borra la valoración de otro")

  const borrada = await pedir(`/api/reviews/${review.id}`, {
    method: "DELETE",
    cookie: actor.comprador1.cookie,
  })
  igual(borrada.status, 200, "el autor borra su valoración")
  igual(
    (borrada.datos.reputacion as { total: number }).total,
    0,
    "el total de valoraciones queda en cero",
  )
  igual(lista<Valoracion>((await pedir(ruta)).datos, "reviews").length, 0, "la lista queda vacía")

  // Borrada la nota, la orden sigue recibida y ya se puede volver a valorar.
  const repetible = await pedir(ruta, {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { puntaje: 4 },
  })
  igual(repetible.status, 201, "se puede volver a valorar tras borrar")
  igual(
    (repetible.datos.reputacion as { promedio: number }).promedio,
    4,
    "el promedio sale de la nueva valoración",
  )

  return { ok: fallos === 0, detalle: "borrado y nueva valoración" }
})

etapa("F9g · la página pública del vendedor junta ficha y reputación", async () => {
  const detalle = await pedir(`/api/publications/${ordenes[0].publicacionId}`)
  igual(detalle.status, 200, "lectura pública de la publicación")
  const vendedorId = (detalle.datos.vendedor as { id: string }).id
  check(Boolean(vendedorId), "la publicación no trae a su vendedor")

  const sinSesion = await pedir(`/api/sellers/${vendedorId}`)
  igual(sinSesion.status, 200, "la página del vendedor es pública, sin sesión")
  igual(
    (sinSesion.datos.vendedor as { nombre: string }).nombre,
    actor.vendedor.nombre,
    "el perfil corresponde al vendedor del flujo",
  )
  check(
    typeof (sinSesion.datos.vendedor as { nivel: string }).nivel === "string",
    "el perfil no trae el nivel de coleccionista",
  )
  check(
    lista<Publicacion>(sinSesion.datos, "publicaciones").length > 0,
    "la página no trae sus ejemplares en venta",
  )
  igual(typeof sinSesion.datos.reputacion, "object", "la reputación viene en el perfil")

  const conSesion = await pedir(`/api/sellers/${vendedorId}`, {
    cookie: actor.comprador1.cookie,
  })
  igual(conSesion.status, 200, "un lector con sesión también puede mirar al vendedor")

  const inexistente = await pedir("/api/sellers/no-es-un-uuid")
  igual(inexistente.status, 404, "un vendedor inexistente da 404")

  return { ok: fallos === 0, detalle: "página pública del vendedor" }
})

etapa("F9h · cada persona ve sus reseñas en el perfil", async () => {
  const publicas = lista<Valoracion>(
    (await pedir(`/api/publications/${ordenes[0].publicacionId}/reviews`)).datos,
    "reviews",
  )
  const reseña = publicas[publicas.length - 1]
  check(Boolean(reseña), "no hay reseña que ver en el perfil")

  const sinSesion = await pedir("/api/profile/reviews")
  igual(sinSesion.status, 401, "sin sesión no se ven reseñas del perfil")

  const delAutor = await pedir("/api/profile/reviews", { cookie: actor.comprador1.cookie })
  igual(delAutor.status, 200, "el autor lee su perfil de reseñas")
  check(
    lista<Valoracion>(delAutor.datos, "escritas").some((unaReseña) => unaReseña.id === reseña?.id),
    "la reseña que el comprador escribió no aparece en sus reseñas",
  )

  const delVendedor = await pedir("/api/profile/reviews", { cookie: actor.vendedor.cookie })
  igual(delVendedor.status, 200, "el vendedor lee su perfil de reseñas")
  check(
    lista<Valoracion>(delVendedor.datos, "recibidas").some(
      (unaReseña) => unaReseña.id === reseña?.id,
    ),
    "la reseña recibida no aparece para el vendedor",
  )

  return { ok: fallos === 0, detalle: "reseñas escritas y recibidas por perfil" }
})

// ---------------------------------------------- F9i contacto previo (precompra)

etapa("F9i · el contacto previo permite preguntar antes de comprar", async () => {
  const publicacionId = ordenes[0].publicacionId

  const sinSesion = await pedir("/api/conversaciones")
  igual(sinSesion.status, 401, "sin sesión no se listan conversaciones")

  const empieza = await pedir("/api/conversaciones", {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { publicacionId, mensaje: "¿Me confirmas el estado de las hojas?" },
  })
  igual(empieza.status, 201, "el comprador abre el contacto previo")
  const hilo = (empieza.datos.conversacion ?? {}) as Conversacion
  check(Boolean(hilo.id), "la conversación no devuelve su id")
  igual(hilo.rol, "comprador", "el rol del que abre es comprador")
  igual(hilo.contraparte?.nombre, actor.vendedor.nombre, "la contraparte es el vendedor")
  igual(hilo.mensajes?.length, 1, "la primera pregunta queda guardada")

  const listaVendedor = await pedir("/api/conversaciones", { cookie: actor.vendedor.cookie })
  igual(listaVendedor.status, 200, "el vendedor lista sus conversaciones")
  check(
    lista<Conversacion>(listaVendedor.datos, "conversaciones").some((c) => c.id === hilo.id),
    "la pregunta del comprador no aparece para el vendedor",
  )

  const lecturaVendedor = await pedir(`/api/conversaciones/${hilo.id}`, {
    cookie: actor.vendedor.cookie,
  })
  igual(lecturaVendedor.status, 200, "el vendedor abre el hilo")
  igual(
    (lecturaVendedor.datos.conversacion as Conversacion).mensajes?.length,
    1,
    "el vendedor ve una pregunta",
  )

  const responde = await pedir(`/api/conversaciones/${hilo.id}`, {
    method: "POST",
    cookie: actor.vendedor.cookie,
    body: { mensaje: "Está impecable, forrado y sin subrayados." },
  })
  igual(responde.status, 201, "el vendedor responde en el hilo")

  const compradorVe = await pedir(`/api/conversaciones/${hilo.id}`, {
    cookie: actor.comprador1.cookie,
  })
  igual(compradorVe.status, 200, "el comprador reabre el hilo")
  igual(
    (compradorVe.datos.conversacion as Conversacion).mensajes?.length,
    2,
    "el comprador ve pregunta y respuesta",
  )

  const tercero = await pedir(`/api/conversaciones/${hilo.id}`, {
    cookie: actor.comprador2.cookie,
  })
  igual(tercero.status, 403, "un tercero no entra al hilo")

  const auto = await pedir("/api/conversaciones", {
    method: "POST",
    cookie: actor.vendedor.cookie,
    body: { publicacionId, mensaje: "¿Prueba sobre un ejemplar propio?" },
  })
  igual(auto.status, 400, "el vendedor no se escribe a sí mismo")
  igual(
    (auto.datos as { reason?: string }).reason,
    "auto-contacto",
    "motivo de auto contacto",
  )

  const invalido = await pedir("/api/conversaciones/no-es-un-uuid", {
    cookie: actor.comprador1.cookie,
  })
  igual(invalido.status, 404, "un id inválido de conversación da 404")

  const avisos = await pedir("/api/notifications", { cookie: actor.vendedor.cookie })
  check(
    lista<{ tipo: string; titulo: string }>(avisos.datos, "notifications").some(
      (n) => n.tipo === "contacto" && (n.titulo ?? "").includes(publicaciones[0].titulo),
    ),
    `el vendedor no fue notificado del contacto por ${publicaciones[0].titulo}`,
  )

  return { ok: fallos === 0, detalle: "pregunta, respuesta y privacidad del contacto previo" }
})

// ------------------------------------------- F9b cancelación y devolución

etapa("F9b · cancelar una reserva devuelve el stock con entrada auditada", async () => {
  const orden = ordenes[1]
  const publicacion = publicaciones.find((p) => p.id === orden.publicacionId)!
  const stockCreado = publicacion.stock

  const antes = await pedir(`/api/publications/${orden.publicacionId}`, {
    cookie: actor.vendedor.cookie,
  })
  const stockReservado = (antes.datos.publication as Publicacion).stock
  igual(stockReservado, stockCreado - 1, "stock reservado antes de cancelar")

  const r = await pedir(`/api/orders/${orden.id}`, {
    method: "PATCH",
    cookie: actor.vendedor.cookie,
    body: { estado: "cancelada" },
  })
  igual(r.status, 200, "cancelación por el vendedor")
  igual((r.datos.order as Orden)?.estado, "cancelada", "estado tras cancelar")

  // El ejemplar vuelve al catálogo y el movimiento queda registrado.
  const despues = await pedir(`/api/publications/${orden.publicacionId}`, {
    cookie: actor.vendedor.cookie,
  })
  igual(
    (despues.datos.publication as Publicacion).stock,
    stockCreado,
    "stock devuelto tras cancelar",
  )

  const historial = await pedir(
    `/api/panel/movimientos?publicacionId=${orden.publicacionId}&tipo=entrada`,
    { cookie: actor.admin.cookie },
  )
  igual(historial.status, 200, "lectura del movimiento de devolución")
  const devoluciones = lista<Movimiento>(historial.datos, "movimientos")
  check(devoluciones.length > 0, "no hay movimiento de entrada tras cancelar")
  const devolucion = devoluciones.find((m) => m.stockResultante === stockCreado)
  check(Boolean(devolucion), `ninguna entrada deja el stock en ${stockCreado}`)
  if (devolucion) {
    igual(devolucion.stockAnterior, stockReservado, "stock previo en el movimiento de devolución")
    igual(devolucion.cantidad, 1, "cantidad devuelta")
  }

  // El comprador afectado debe quedar notificado. Las transiciones notifican con el
  // tipo genérico `orden_actualizada`, así que se comprueba el aviso de esta orden.
  const compradores = [actor.comprador1, actor.comprador2]
  const afectado = compradores.find((c) => c.email === orden.compradorEmail) ?? actor.comprador2
  const notificaciones = await pedir("/api/notifications", { cookie: afectado.cookie })
  igual(notificaciones.status, 200, "lectura de notificaciones del comprador cancelado")
  const avisos = lista<{ titulo?: string; datos?: { orderId?: string } }>(
    notificaciones.datos,
    "notifications",
  )
  const avisoCancelacion = avisos.find(
    (n) => n.datos?.orderId === orden.id && (n.titulo ?? "").includes("Cancelada"),
  )
  check(
    Boolean(avisoCancelacion),
    `${afectado.email} no fue notificado de la cancelación de ${orden.id.slice(0, 8)}`,
  )

  orden.estado = "cancelada"
  return { ok: fallos === 0, detalle: `stock devuelto a ${stockCreado} con entrada auditada` }
})

// --------------------------------------- F9j vencimiento automático de reservas

etapa("F9j · una reserva vencida vuelve al catálogo con entrada auditada", async () => {
  const orden = ordenes[2]
  const publicacion = publicaciones.find((p) => p.id === orden.publicacionId)!
  const stockCreado = publicacion.stock

  const antes = await pedir(`/api/publications/${orden.publicacionId}`, {
    cookie: actor.vendedor.cookie,
  })
  const stockReservado = (antes.datos.publication as Publicacion).stock
  igual(stockReservado, stockCreado - 1, "stock reservado antes de que la reserva venza")

  const secreto = process.env.CRON_SECRET
  check(Boolean(secreto), "CRON_SECRET no está definido en .env, no se puede probar el barrido")

  // Envejecer la fila es lo único que no se puede pedir por la API: no hay forma de
  // esperar 48 horas dentro de una corrida. El barrido, la devolución del stock y los
  // avisos se comprueban todos contra el servidor.
  const db = baseDeDatos()
  const envejecida = await db.execute(sql`
    update orders set reserva_expira_en = now() - interval '1 minute'
    where id = ${orden.id} and estado = 'reservada'`)
  igual(envejecida.rowCount, 1, "la reserva quedó con el vencimiento en el pasado")

  if (secreto) {
    const barrido = await pedir("/api/cron/reservas", {
      headers: { authorization: `Bearer ${secreto}` },
    })
    igual(barrido.status, 200, "barrido de reservas vencidas")
    const canceladas = barrido.datos.canceladas as number | undefined
    check(
      typeof canceladas === "number" && canceladas > 0,
      `el barrido no canceló ninguna reserva vencida: ${String(canceladas)}`,
    )
  }

  const despues = await pedir(`/api/publications/${orden.publicacionId}`, {
    cookie: actor.vendedor.cookie,
  })
  igual(
    (despues.datos.publication as Publicacion).stock,
    stockCreado,
    "stock devuelto al vencer la reserva",
  )

  const historial = await pedir(
    `/api/panel/movimientos?publicacionId=${orden.publicacionId}&tipo=entrada`,
    { cookie: actor.admin.cookie },
  )
  igual(historial.status, 200, "lectura del movimiento por reserva vencida")
  const entradas = lista<Movimiento>(historial.datos, "movimientos")
  const devolucion = entradas.find((m) => m.stockResultante === stockCreado)
  check(Boolean(devolucion), `ninguna entrada deja el stock en ${stockCreado}`)
  if (devolucion) {
    igual(devolucion.stockAnterior, stockReservado, "stock previo en la devolución por vencimiento")
    igual(devolucion.cantidad, 1, "cantidad devuelta por el vencimiento")
    check(
      (devolucion.motivo ?? "").includes("vencida"),
      `el motivo del movimiento no menciona el vencimiento: ${devolucion.motivo}`,
    )
  }

  // El barrido avisa al comprador con el tipo `orden_cancelada`.
  const afectado =
    [actor.comprador1, actor.comprador2].find((c) => c.email === orden.compradorEmail) ??
    actor.comprador2
  const notificaciones = await pedir("/api/notifications", { cookie: afectado.cookie })
  igual(
    notificaciones.status,
    200,
    "lectura de notificaciones del comprador con la reserva vencida",
  )
  const avisos = lista<{ titulo?: string; datos?: { orderId?: string } }>(
    notificaciones.datos,
    "notifications",
  )
  check(
    avisos.some((n) => n.datos?.orderId === orden.id && (n.titulo ?? "").includes("Reserva")),
    `${afectado.email} no fue avisado de que venció la reserva ${orden.id.slice(0, 8)}`,
  )

  orden.estado = "cancelada"
  return { ok: fallos === 0, detalle: `reserva vencida devolvió el stock a ${stockCreado}` }
})

// ------------------------------------------------- F10 cuadre de inventario

etapa("F10 · el inventario cuadra con los movimientos", async () => {
  const r = await pedir("/api/panel/movimientos?porPagina=100", { cookie: actor.admin.cookie })
  igual(r.status, 200, "historial completo de movimientos")

  // El endpoint ordena de más nuevo a más viejo; al revés queda la cadena del inventario.
  const movimientos = lista<Movimiento>(r.datos, "movimientos").reverse()

  const porPublicacion = new Map<string, Movimiento[]>()
  for (const m of movimientos) {
    const id = m.publicacion?.id ?? m.publicacionId
    if (!id) continue
    const actual = porPublicacion.get(id) ?? []
    actual.push(m)
    porPublicacion.set(id, actual)
  }

  for (const orden of ordenes) {
    const propios = porPublicacion.get(orden.publicacionId)
    check(
      propios !== undefined && propios.length > 0,
      `no hay movimientos para ${orden.publicacionId.slice(0, 8)}`,
    )
    const salidas = propios?.filter((m) => m.tipo === "salida") ?? []
    igual(salidas.length, 1, `salidas registradas para ${orden.publicacionId.slice(0, 8)}`)
  }

  // Auditoría del inventario: la cadena de movimientos debe ser continua y terminar
  // en el stock actual. Sin `salida` en la venta, esta comprobación falla.
  for (const publicacion of publicaciones) {
    const propios = porPublicacion.get(publicacion.id) ?? []
    if (propios.length === 0) continue

    for (let i = 1; i < propios.length; i += 1) {
      igual(
        propios[i].stockAnterior,
        propios[i - 1].stockResultante,
        `cadena de ${publicacion.titulo} en el movimiento ${i}`,
      )
    }

    const actual = await pedir(`/api/publications/${publicacion.id}`, {
      cookie: actor.vendedor.cookie,
    })
    const vista = actual.datos.publication as Publicacion | undefined
    igual(
      propios[propios.length - 1].stockResultante,
      vista?.stock,
      `stock final de ${publicacion.titulo} según el historial`,
    )
  }

  const paginacion = r.datos.paginacion as { total?: number } | undefined
  check(
    (paginacion?.total ?? 0) > 0,
    "el historial no registró ningún movimiento de la simulación",
  )
  return {
    ok: fallos === 0,
    detalle: `${paginacion?.total ?? 0} movimientos en el historial`,
  }
})

// ------------------------------------------------------------- F11 reportes

etapa("F11 · los reportes responden para los cuatro períodos", async () => {
  for (const dias of [7, 30, 90, 365]) {
    const r = await pedir(`/api/panel/reportes?dias=${dias}`, { cookie: actor.admin.cookie })
    igual(r.status, 200, `reporte de ${dias} días`)
    check(
      typeof r.datos.desde === "string" && r.datos.desde.length > 0,
      `el reporte de ${dias} días no trae "desde"`,
    )
    check(Array.isArray(r.datos.ventas ?? r.datos.serie), `el reporte de ${dias} días no trae serie`)
  }
  return { ok: fallos === 0, detalle: "4 períodos OK" }
})

etapa("F11b · un lector no puede abrir los reportes", async () => {
  const r = await pedir("/api/panel/reportes?dias=30", { cookie: actor.comprador1.cookie })
  check(r.status === 403 || r.status === 401, `un lector obtuvo ${r.status} en vez de 403`)
  return { ok: fallos === 0, detalle: `lector bloqueado (${r.status})` }
})

// ------------------------------------------------------------------- corrida

async function main() {
  console.log(`Simulación contra ${BASE}\n`)

  let actoresListos = false
  let omitidas = 0

  for (const { nombre, necesitaActores, abreActores, fn } of etapas) {
    // Sin sesiones no hay nada que probar: se omite en vez de encadenar errores.
    if (necesitaActores && !actoresListos) {
      omitidas += 1
      console.log(`  [omit] ${nombre}`)
      continue
    }

    const antes = fallos
    let detalle = ""
    try {
      const r = await fn()
      detalle = r.detalle
    } catch (error) {
      fallos += 1
      detalle = `excepción: ${error instanceof Error ? error.message : String(error)}`
    }

    if (abreActores) actoresListos = fallos === antes

    const marca = fallos === antes ? "ok  " : "FALLA"
    console.log(`  [${marca}] ${nombre}${detalle ? ` — ${detalle}` : ""}`)
  }

  await cerrarBaseDeDatos()

  console.log("")
  if (omitidas > 0) {
    console.log(`${omitidas} etapa(s) omitida(s): no se pudieron abrir las sesiones.`)
  }
  if (fallos > 0) {
    console.log(`Simulación fallida: ${fallos} comprobación(es) sin cumplir.`)
    process.exit(1)
  }
  console.log("Simulación completa sin fallos.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

