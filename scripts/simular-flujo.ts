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

import { COSTO_ENVIO_DOMICILIO, PAGE_SIZE_MAX } from "../lib/catalog"

const BASE = process.env.SIMULAR_BASE_URL ?? "http://localhost:3000"
const CLAVE = "simulacion123"

type Actor = { nombre: string; email: string; rol: string; cookie: string }
type Resultado = { ok: boolean; detalle: string }

/** Respuestas de la API: solo usamos estos campos, no hace falta modelar todo. */
type Respuesta = Record<string, unknown>
type Publicacion = {
  id: string
  titulo: string
  precio: number
  stock: number
  stockMinimo: number
  estado?: string
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
  publicacion?: { id: string; titulo: string }
  publicacionId?: string
}

const etapas: { nombre: string; necesitaActores: boolean; fn: () => Promise<Resultado> }[] = []
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

function etapa(
  nombre: string,
  fn: () => Promise<Resultado>,
  opciones: { necesitaActores?: boolean } = {},
) {
  etapas.push({ nombre, fn, necesitaActores: opciones.necesitaActores ?? true })
}

async function pedir(
  ruta: string,
  opciones: { method?: string; cookie?: string; body?: unknown } = {},
): Promise<{ status: number; datos: Respuesta; headers: Headers }> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: opciones.method ?? "GET",
    headers: {
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
  worker: Actor
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

// ------------------------------------------------------------------ F2 login

etapa(
  "F2 · los cinco actores inician sesión",
  async () => {
    const vend =
      origenVendedor === "seed"
        ? await entrar(VENDEDOR_SUPLENTE.email, VENDEDOR_SUPLENTE.password)
        : await entrar(VENDEDOR_NUEVO.email, CLAVE)
    const c1 = await entrar(COMPRADORES[0].email, COMPRADORES[0].password)
    const c2 = await entrar(COMPRADORES[1].email, COMPRADORES[1].password)
    const w = await entrar("worker@lektor.cl", "worker123")
    const a = await entrar("admin@lektor.cl", "admin123")
    if (!vend || !c1 || !c2 || !w || !a) return { ok: false, detalle: "faltaron sesiones" }

    Object.assign(actor, { vendedor: vend, comprador1: c1, comprador2: c2, worker: w, admin: a })
    igual(a.rol, "admin", "rol del admin")
    igual(w.rol, "worker", "rol del worker")
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
  { necesitaActores: false },
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
    { titulo: "Sim One Piece vol. 1", precio: 8000, stock: 3, stockMinimo: 1 },
    { titulo: "Sim Berserk deluxe 3", precio: 12500, stock: 2, stockMinimo: 2 },
    { titulo: "Sim Dune Messiah", precio: 9500, stock: 1, stockMinimo: 0 },
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

// --------------------------------------------------------- F4 buscar/favoritos

etapa("F4 · el catálogo muestra las tres y un favorito entra y sale", async () => {
  const r = await pedir(`/api/publications?q=Sim%20&porPagina=${PAGE_SIZE_MAX}`)
  igual(r.status, 200, "búsqueda del catálogo")
  const encontradas = lista<Publicacion>(r.datos, "publications")
  // Se comparan los ids creados en esta corrida: una base con datos de corridas
  // previas puede devolver más resultados con el mismo título.
  const ids = new Set(encontradas.map((p) => p.id))
  const faltantes = publicaciones.filter((p) => !ids.has(p.id))
  igual(faltantes.length, 0, `el catálogo no muestra: ${faltantes.map((p) => p.titulo).join(", ")}`)

  const objetivo = publicaciones[0]
  const alta = await pedir("/api/publications/favorites", {
    method: "POST",
    cookie: actor.comprador1.cookie,
    body: { publicationId: objetivo.id },
  })
  check(alta.status === 200 || alta.status === 201, `alta de favorito devolvió ${alta.status}`)

  const esMio = (ids: string[]) => ids.includes(objetivo.id)

  const despuesDeAlta = await pedir("/api/publications/favorites", {
    cookie: actor.comprador1.cookie,
  })
  check(
    esMio(lista<string>(despuesDeAlta.datos, "favoriteIds")),
    "el favorito no aparece en el listado",
  )

  const baja = await pedir(`/api/publications/favorites?publicationId=${objetivo.id}`, {
    method: "DELETE",
    cookie: actor.comprador1.cookie,
  })
  check(baja.status === 200 || baja.status === 204, `baja de favorito devolvió ${baja.status}`)

  const tras = await pedir("/api/publications/favorites", { cookie: actor.comprador1.cookie })
  check(
    !esMio(lista<string>(tras.datos, "favoriteIds")),
    "el favorito sigue presente tras la baja",
  )
  return { ok: fallos === 0, detalle: "catálogo y favoritos OK" }
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
    { cookie: actor.worker.cookie },
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

etapa("F7 · la bodega ve las reservadas y filtra el stock bajo mínimo", async () => {
  const r = await pedir("/api/panel/ordenes?estado=reservada&porPagina=50", {
    cookie: actor.worker.cookie,
  })
  igual(r.status, 200, "lectura de órdenes del panel")
  const ids = lista<{ id: string }>(r.datos, "ordenes").map((o) => o.id)
  for (const orden of ordenes) {
    check(ids.includes(orden.id), `la orden ${orden.id} no aparece en la bodega`)
  }

  const bajo = await pedir("/api/panel/publicaciones?bajoMinimo=true&porPagina=50", {
    cookie: actor.worker.cookie,
  })
  igual(bajo.status, 200, "lectura del filtro bajoMinimo")
  const todas = lista<Publicacion>(bajo.datos, "publications")
  const cumple = todas.every((p) => p.stock > 0 && p.stock <= (p.stockMinimo ?? 0))
  check(
    todas.length === 0 || cumple,
    "el filtro bajoMinimo trajo publicaciones con stock inconsistente",
  )

  return { ok: fallos === 0, detalle: `${ids.length} órdenes en bodega` }
})

// ----------------------------------------------------- F8/F9 ciclo de la orden

etapa("F8 · el worker prepara y despacha la primera orden", async () => {
  const orden = ordenes[0]
  for (const estado of ["en_preparacion", "despachada"]) {
    const r = await pedir(`/api/orders/${orden.id}`, {
      method: "PATCH",
      cookie: actor.worker.cookie,
      body: { estado },
    })
    igual(r.status, 200, `transición a ${estado}`)
    igual((r.datos.order as Orden)?.estado, estado, `estado tras pedir ${estado}`)
  }
  return { ok: fallos === 0, detalle: "orden despachada" }
})

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
    cookie: actor.worker.cookie,
    body: { estado: "cancelada" },
  })
  igual(r.status, 200, "cancelación por bodega")
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
    { cookie: actor.worker.cookie },
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

  for (const { nombre, necesitaActores, fn } of etapas) {
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

    if (nombre.startsWith("F2")) actoresListos = fallos === antes

    const marca = fallos === antes ? "ok  " : "FALLA"
    console.log(`  [${marca}] ${nombre}${detalle ? ` — ${detalle}` : ""}`)
  }

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
