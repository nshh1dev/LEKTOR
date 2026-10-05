import { z } from "zod"
import { precioANumero } from "@/lib/entrada"
import { isValidIsbn, normalizeIsbn } from "@/lib/isbn"
import {
  LARGO_CODIGO_SEGURIDAD,
  LARGO_TARJETA,
  formatearCodigoSeguridad,
  formatearNumeroTarjeta,
  formatearVencimiento,
  luhnValido,
  soloDigitos,
  vencimientoBienFormado,
  vencimientoEnVigencia,
} from "@/lib/pago"

export const CATEGORIAS = ["Mangas", "Cómics", "Libros"] as const
export const CONDICIONES = [
  "Sellado",
  "Como nuevo",
  "Usado - Muy buen estado",
  "Usado - Buen estado",
  "Usado - Aceptable",
  "Usado - Con mucho uso",
  "Usado - Con anotaciones",
] as const
export const ESTADOS_PUBLICACION = ["activa", "pausada", "agotada"] as const
export const ESTADOS_ORDEN = [
  "reservada",
  "en_preparacion",
  "despachada",
  "recibida",
  "cancelada",
] as const
export const METODOS_ENTREGA = ["envio_domicilio", "retiro_punto", "coordinar"] as const
export const ORDENES_CATALOGO = ["recientes", "precio_asc", "precio_desc", "titulo"] as const

/**
 * El filtro de precio no se escribe: se elige entre tramos. `min` y `max` van en
 * pesos enteros y se mandan tal cual a `/api/publications`. Los extremos abiertos
 * usan `null`, que el API interpreta como "sin límite" de ese lado.
 */
export const RANGOS_PRECISO = [
  { id: "todos", etiqueta: "Cualquier precio", min: null, max: null },
  { id: "hasta-5000", etiqueta: "Hasta $5.000", min: null, max: 5000 },
  { id: "5000-10000", etiqueta: "$5.000 a $10.000", min: 5001, max: 10000 },
  { id: "10000-15000", etiqueta: "$10.000 a $15.000", min: 10001, max: 15000 },
  { id: "15000-20000", etiqueta: "$15.000 a $20.000", min: 15001, max: 20000 },
  { id: "20000-30000", etiqueta: "$20.000 a $30.000", min: 20001, max: 30000 },
  { id: "mas-30000", etiqueta: "Más de $30.000", min: 30001, max: null },
] as const

export type RangoPrecio = (typeof RANGOS_PRECISO)[number]

/** El tramo que corresponde a un rango dado, para recuperar la selección al pintar. */
export function rangoPrecioDesde(min: number | null, max: number | null): string {
  const encontrado = RANGOS_PRECISO.find((rango) => rango.min === min && rango.max === max)
  return encontrado?.id ?? "todos"
}

export const REGIONES = [
  "Región de Arica y Parinacota",
  "Región de Tarapacá",
  "Región de Antofagasta",
  "Región de Atacama",
  "Región de Coquimbo",
  "Región de Valparaíso",
  "Región Metropolitana",
  "Región del Libertador General Bernardo O'Higgins",
  "Región del Maule",
  "Región del Ñuble",
  "Región del Biobío",
  "Región de La Araucanía",
  "Región de Los Ríos",
  "Región de Los Lagos",
  "Región de Aysén del General Carlos Ibáñez del Campo",
  "Región de Magallanes y de la Antártica Chilena",
] as const

export const RESERVA_HORAS = 48
export const COSTO_ENVIO_DOMICILIO = 3500
export const PAGE_SIZE_DEFAULT = 12
export const PAGE_SIZE_MAX = 48

export type Categoria = (typeof CATEGORIAS)[number]
export type Condicion = (typeof CONDICIONES)[number]
export type EstadoPublicacion = (typeof ESTADOS_PUBLICACION)[number]
export type EstadoOrden = (typeof ESTADOS_ORDEN)[number]
export type MetodoEntrega = (typeof METODOS_ENTREGA)[number]

export const TRANSICIONES_ORDEN: Record<EstadoOrden, EstadoOrden[]> = {
  reservada: ["en_preparacion", "despachada", "cancelada"],
  en_preparacion: ["despachada", "cancelada"],
  despachada: ["recibida", "cancelada"],
  recibida: [],
  cancelada: [],
}

export function transicionValida(actual: EstadoOrden, siguiente: EstadoOrden): boolean {
  return TRANSICIONES_ORDEN[actual]?.includes(siguiente) ?? false
}

export function estadoSegunStock(stock: number, estadoActual: EstadoPublicacion): EstadoPublicacion {
  if (estadoActual === "pausada") return "pausada"
  return stock <= 0 ? "agotada" : "activa"
}

const COVER_PALETTES: Record<string, string> = {
  Mangas: "from-indigo-200 via-violet-100 to-slate-100",
  "Cómics": "from-amber-200 via-rose-100 to-slate-100",
  Libros: "from-emerald-200 via-teal-100 to-slate-100",
}

const COVER_PALETTES_DARK: Record<string, string> = {
  Mangas: "from-indigo-500/30 via-violet-500/20 to-slate-900",
  "Cómics": "from-amber-500/30 via-rose-500/20 to-slate-900",
  Libros: "from-emerald-500/30 via-teal-500/20 to-slate-900",
}

export function coverTone(categoria: string, dark = false): string {
  const palette = dark ? COVER_PALETTES_DARK : COVER_PALETTES
  return palette[categoria] ?? palette.Libros
}

const isbnField = z
  .string()
  .trim()
  .min(1)
  .transform(normalizeIsbn)
  .refine(isValidIsbn, "El ISBN no es válido: revisa el dígito verificador")

const PRECIO_MAXIMO = 10000000

/**
 * El precio llega formateado desde el formulario ($15.000) y como número desde la
 * API, así que `precioANumero` traduce los dos. Se apoya en `preprocess` y no en
 * `z.coerce.number()` a secas: ese convierte `""` y `null` en 0 y dejaría publicar
 * ejemplares a $0.
 */
const precioEsquema = z.preprocess(
  precioANumero,
  z.coerce
    .number({ invalid_type_error: "El precio es obligatorio" })
    .int("El precio debe ser un número entero")
    .min(0, "El precio no puede ser negativo")
    .max(PRECIO_MAXIMO, "El precio es demasiado alto"),
)

export const publicationInputSchema = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio").max(255),
  autor: z.string().trim().min(1, "El autor es obligatorio").max(200),
  editorial: z.string().trim().min(1, "La editorial es obligatoria").max(200),
  volumen: z.coerce.number().int().min(1, "El volumen debe ser un número").max(999).nullable().optional(),
  categoria: z.enum(CATEGORIAS, { message: "Elige una categoría" }),
  condicion: z.enum(CONDICIONES, { message: "Elige la condición física" }),
  precio: precioEsquema,
  stock: z.coerce.number().int().min(1, "El stock debe ser al menos 1").max(999).default(1),
  isbn: z.union([isbnField, z.literal("")]).optional(),
  descripcion: z.string().trim().max(2000).optional(),
  fotos: z.array(z.string().trim().refine(esUrlValida, "Las fotos deben ser URLs o rutas válidas")).max(6).default([]),
})

export const publicationUpdateSchema = publicationInputSchema
  .omit({ isbn: true, stock: true })
  .partial()
  .extend({
    isbn: z.union([isbnField, z.literal("")]).optional(),
    stock: z.coerce.number().int().min(0, "El stock no puede ser negativo").max(999).optional(),
    estado: z.enum(["activa", "pausada"]).optional(),
  })

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoria: z.array(z.enum(CATEGORIAS)).max(3).optional(),
  autor: z.string().trim().max(200).optional(),
  editorial: z.string().trim().max(200).optional(),
  condicion: z.array(z.enum(CONDICIONES)).max(6).optional(),
  comuna: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  precioMin: z.coerce.number().int().min(0).optional(),
  precioMax: z.coerce.number().int().min(0).optional(),
  disponible: z.enum(["true", "false"]).optional(),
  orden: z.enum(ORDENES_CATALOGO).default("recientes"),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
  vendedor: z.string().uuid().optional(),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

export function parseSearchParams(params: URLSearchParams): SearchQuery {
  const repeated = (key: string) => {
    const values = params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean)
    return values.length > 0 ? values : undefined
  }

  return searchQuerySchema.parse({
    q: params.get("q") ?? undefined,
    categoria: repeated("categoria"),
    autor: params.get("autor") ?? undefined,
    editorial: params.get("editorial") ?? undefined,
    condicion: repeated("condicion"),
    comuna: repeated("comuna"),
    precioMin: params.get("precioMin") ?? undefined,
    precioMax: params.get("precioMax") ?? undefined,
    disponible: params.get("disponible") ?? undefined,
    orden: params.get("orden") ?? undefined,
    pagina: params.get("pagina") ?? undefined,
    porPagina: params.get("porPagina") ?? undefined,
    vendedor: params.get("vendedor") ?? undefined,
  })
}

/** Los separadores no cuentan: el largo se mide sobre los dígitos. */
const digitosTelefono = (valor: string) => valor.replace(/[^0-9]/g, "")

/**
 * El largo se valida contra el teléfono que existe de verdad: con código de
 * país son once dígitos (el 56 más nueve) o diez si es un fijo, y E.164 no
 * pasa de quince. Sin este refine la API aceptaba un +56 con lo que se
 * escribiera detrás, que ya no es un teléfono.
 */
const largoTelefonoValido = (valor: string) => {
  const digitos = digitosTelefono(valor)
  if (digitos.length === 0) return true
  if (digitos.length > 15) return false
  if (!digitos.startsWith("56")) return true
  return digitos.length === 10 || digitos.length === 11
}

const TELEFONO_SOLO_NUMEROS = /^[0-9+\-\s()]+$/

const telefonoSchema = z
  .string({ required_error: "Indica un teléfono de contacto" })
  .trim()
  .min(6, "Indica un teléfono de contacto")
  .max(30)
  .regex(TELEFONO_SOLO_NUMEROS, "El teléfono solo admite números")
  .refine(largoTelefonoValido, "Revisa el teléfono: con +56 son ocho o nueve dígitos")

/** Campos comunes al formulario de checkout y al contrato de la API. */
const camposDespacho = {
  nombreRecibe: z
    .string({ required_error: "Indica quién recibe el ejemplar" })
    .trim()
    .min(2, "Indica quién recibe el ejemplar")
    .max(120),
  telefono: telefonoSchema,
  metodoEntrega: z.enum(METODOS_ENTREGA),
  comuna: z
    .string({ required_error: "Indica la comuna" })
    .trim()
    .min(2, "Indica la comuna")
    .max(80),
  region: z
    .string({ required_error: "Indica la región" })
    .trim()
    .min(2, "Indica la región")
    .max(80),
}

/** Reglas que dependen del método de entrega, compartidas por ambos schemas. */
const REGLAS_DESPACHO = [
  {
    cuando: (d: { metodoEntrega: string; direccion: string | null }) =>
      d.metodoEntrega === "envio_domicilio" && (d.direccion?.length ?? 0) <= 5,
    message: "Ingresa la dirección de despacho",
    path: ["direccion"] as const,
  },
  {
    cuando: (d: { metodoEntrega: string; puntoRetiro: string | null }) =>
      d.metodoEntrega === "retiro_punto" && (d.puntoRetiro?.length ?? 0) <= 2,
    message: "Elige un punto de retiro",
    path: ["puntoRetiro"] as const,
  },
]

type DatosDespachoCrudo = {
  metodoEntrega: string
  direccion: string | null
  puntoRetiro: string | null
}

function validarDespacho(
  data: DatosDespachoCrudo,
  ctx: z.RefinementCtx,
): void {
  for (const regla of REGLAS_DESPACHO) {
    if (regla.cuando(data)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: regla.message, path: [...regla.path] })
    }
  }
}

/** Contrato de la API: `direccion` y `puntoRetiro` llegan como `string | null`. */
export const datosDespachoSchema = z
  .object({
    ...camposDespacho,
    direccion: z.string().trim().max(200).nullable(),
    puntoRetiro: z.string().trim().max(120).nullable(),
  })
  .superRefine(validarDespacho)

export type DatosDespacho = z.infer<typeof datosDespachoSchema>

export const orderCreateSchema = z.object({
  publicacionId: z.string().uuid("Publicación inválida"),
  datosDespacho: datosDespachoSchema,
})

export const orderTransitionSchema = z.object({
  estado: z.enum(ESTADOS_ORDEN, { message: "Estado de orden inválido" }),
  motivo: z.string().trim().max(300).optional(),
})

export const chatMessageSchema = z.object({
  mensaje: z
    .string({ required_error: "Escribe un mensaje" })
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(1000, "El mensaje es demasiado largo"),
})

/** Abrir una conversación de contacto previo sobre una publicación. */
export const abrirConversacionSchema = chatMessageSchema.extend({
  publicacionId: z.string().uuid("Publicación inválida"),
})

/**
 * Valoraciones. El formulario valida solo el puntaje, pero la condición de
 * que hubo una compra recibida la verifica el servidor: es la única garantía de
 * que la nota venga de alguien que recibió el ejemplar y no de un adversario.
 */
export const PUNTAJE_MAXIMO = 5

export const reviewSchema = z.object({
  puntaje: z
    .number({ invalid_type_error: "Elige cuántas estrellas le das" })
    .int("Las estrellas van de 1 a 5")
    .min(1, "Con una estrella ya cuentas lo que pasó")
    .max(PUNTAJE_MAXIMO, "Las estrellas van de 1 a 5"),
  /** Orden recibida que se está valorando. Si no viene, el servidor resuelve
   *  sobre la compra recibida más reciente de esa publicación, como antes. */
  orderId: z.string().uuid("Orden inválida").optional(),
})

export type ReviewFormValues = z.infer<typeof reviewSchema>

export const reviewUpdateSchema = z.object({
  puntaje: z
    .number({ invalid_type_error: "Elige cuántas estrellas le das" })
    .int("Las estrellas van de 1 a 5")
    .min(1, "Con una estrella ya cuentas lo que pasó")
    .max(PUNTAJE_MAXIMO, "Las estrellas van de 1 a 5"),
})

export type FilaEstrella = { puntaje: number; cantidad: number; porcentaje: number }

/**
 * Convierte el conteo por puntaje en las cinco filas de la barra de estrellas,
 * de cinco a una, que es como se lee un resumen de reputación. El porcentaje
 * sale contra el total de reseñas para que cada fila se pueda pintar sola.
 *
 * El arreglo entra indexado por `puntaje - 1`: el cero son las de una estrella.
 * Sale ordenado al revés porque así lo pintan las barras.
 */
export function distribucionDesde(conteos: number[]): FilaEstrella[] {
  const total = conteos.reduce((suma, cantidad) => suma + Math.max(0, cantidad), 0)
  return [5, 4, 3, 2, 1].map((puntaje) => {
    const cantidad = Math.max(0, conteos[puntaje - 1] ?? 0)
    return {
      puntaje,
      cantidad,
      porcentaje: total === 0 ? 0 : Math.round((cantidad / total) * 100),
    }
  })
}

const telefonoObligatorio = telefonoSchema

export const registroSchema = z
  .object({
    nombre: z
      .string({ required_error: "Ingresa tu nombre de usuario" })
      .trim()
      .min(2, "Ingresa tu nombre de usuario (mínimo 2 caracteres)")
      .max(80, "El nombre es demasiado largo"),
    email: z
      .string({ required_error: "Ingresa tu correo electrónico" })
      .trim()
      .toLowerCase()
      .email("Email no válido"),
    password: z
      .string({ required_error: "Ingresa una contraseña" })
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .max(100),
    confirmarPassword: z
      .string({ required_error: "Repite la contraseña" })
      .min(1, "Repite la contraseña")
      .max(100),
    telefono: telefonoObligatorio,
    comuna: z
      .string({ required_error: "Indica tu comuna" })
      .trim()
      .min(2, "Indica tu comuna")
      .max(80),
    region: z
      .string({ required_error: "Indica tu región" })
      .trim()
      .min(2, "Indica tu región")
      .max(80),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  })

/**
 * Login del formulario. Deliberadamente no pide mínimo 6 caracteres como el
 * registro: la contraseña la puso el servidor y solo tiene que coincidir con lo
 * que hay en la base. `min(1)` alcanza para distinguir "vacío" de "mal escrita".
 */
export const loginFormSchema = z.object({
  email: z
    .string({ required_error: "Escribe tu correo electrónico" })
    .trim()
    .toLowerCase()
    .email("Email no válido"),
  password: z.string({ required_error: "Ingresa tu contraseña" }).min(1, "Ingresa tu contraseña"),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

/** El registro usa el mismo esquema en el navegador y en la API: una sola voz. */
export type RegistroFormValues = z.infer<typeof registroSchema>

export type CuerpoRegistro = z.infer<typeof registroSchema>

/**
 * Cuerpo que el formulario de registro manda a `POST /api/auth/register`. El tipo de
 * retorno es el propio esquema, así que si `registroSchema` exige un campo y esta función
 * no lo manda, el compilador falla en vez de dejar el registro rebotando en la API.
 */
export function cuerpoDeRegistro(values: RegistroFormValues): CuerpoRegistro {
  return {
    nombre: values.nombre,
    email: values.email,
    password: values.password,
    confirmarPassword: values.confirmarPassword,
    telefono: values.telefono,
    comuna: values.comuna,
    region: values.region,
  }
}

export const profileUpdateSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es demasiado corto").max(120).optional(),
  bio: z.string().trim().max(300).nullable().optional(),
  telefono: z
    .string()
    .trim()
    .max(30)
    .regex(TELEFONO_SOLO_NUMEROS, "El teléfono solo admite números")
    .refine(largoTelefonoValido, "Revisa el teléfono: con +56 son ocho o nueve dígitos")
    .nullable()
    .optional(),
  comuna: z.string().trim().max(80).nullable().optional(),
  region: z.string().trim().max(80).nullable().optional(),
  avatarUrl: z.string().trim().url("La URL del avatar no es válida").max(500).nullable().optional(),
})

export const notificationReadSchema = z.union([
  z.object({ id: z.string().uuid("Notificación inválida") }),
  z.object({ todas: z.literal(true) }),
])

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual").max(100),
    newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres").max(100),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "La nueva contraseña debe ser distinta",
    path: ["newPassword"],
  })

export const ROLES_USUARIO = ["admin", "lector"] as const
export const ROLES_STAFF = ["admin"] as const
export type RolUsuario = (typeof ROLES_USUARIO)[number]

/** Admin: el único que entra al panel. Vive aquí y no en
 * `lib/panel.ts` porque la UI del marketplace también necesita saberlo. Acepta
 * `string` porque el rol sale de un `varchar` y la base ya lo acota. */
export function esStaff(rol: string): boolean {
  return (ROLES_STAFF as readonly string[]).includes(rol)
}
export const ESTADOS_FILTRO = ["todas", ...ESTADOS_PUBLICACION] as const
export const ESTADOS_ORDEN_FILTRO = ["todas", ...ESTADOS_ORDEN] as const
export const TIPOS_MOVIMIENTO_UI = ["entrada", "salida", "ajuste"] as const
export const DIAS_REPORTE = [7, 30, 90, 365] as const
export type PanelDias = (typeof DIAS_REPORTE)[number]

export const panelPublicacionesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  estado: z.enum(ESTADOS_FILTRO).default("todas"),
  categoria: z.union([z.enum(CATEGORIAS), z.literal("todas")]).default("todas"),
  vendedorId: z.string().uuid().optional(),
  orden: z.enum(["recientes", "titulo", "stock", "precio_desc"]).default("recientes"),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
})

export const panelUsuariosQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  rol: z.union([z.enum(ROLES_USUARIO), z.literal("todos")]).default("todos"),
  activo: z.union([z.literal("todos"), z.literal("activos"), z.literal("inactivos")]).default("todos"),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
})

export const panelOrdenesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  estado: z.enum(ESTADOS_ORDEN_FILTRO).default("reservada"),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
})

export const FILTROS_MOVIMIENTO = ["todos", ...TIPOS_MOVIMIENTO_UI] as const

export const misOrdenesQuerySchema = z.object({
  rol: z.enum(["comprador", "vendedor"]).default("comprador"),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(50).default(10),
})

export const panelMovimientosQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  tipo: z.enum(FILTROS_MOVIMIENTO).default("todos"),
  publicacionId: z.string().uuid("Publicación inválida").optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
})

export const panelReportesQuerySchema = z.object({
  dias: z.coerce
    .number()
    .int()
    .refine((valor) => DIAS_REPORTE.includes(valor as PanelDias), {
      message: "El período no está disponible",
    })
    .default(30),
})

/** Moderación de valoraciones. Ocultar recalcula el promedio de la publicación. */
export const moderarReviewSchema = z.object({
  visible: z.boolean({ message: "Indica si la valoración queda visible" }),
})

export const panelValoracionesQuerySchema = z.object({
  soloOcultas: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .default("false"),
})

export const panelMovimientoSchema = z
  .object({
    publicacionId: z.string().uuid("Publicación inválida"),
    tipo: z.enum(TIPOS_MOVIMIENTO_UI, { message: "Elige el tipo de movimiento" }),
    cantidad: z.coerce
      .number()
      .int()
      .min(0, "La cantidad no puede ser negativa")
      .max(999, "La cantidad es demasiado alta"),
    motivo: z.string().trim().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo !== "ajuste" && data.cantidad < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["cantidad"],
        message: "Ingresa al menos un ejemplar",
      })
    }
  })

export const panelUsuarioUpdateSchema = z
  .object({
    id: z.string().uuid("Usuario inválido"),
    rol: z.enum(ROLES_USUARIO).optional(),
    activo: z.boolean().optional(),
  })
  .refine((data) => data.rol !== undefined || data.activo !== undefined, {
    message: "Indica el rol o el estado a actualizar",
  })

export type PanelPublicacionesQuery = z.infer<typeof panelPublicacionesQuerySchema>
export type PanelUsuariosQuery = z.infer<typeof panelUsuariosQuerySchema>
export type PanelOrdenesQuery = z.infer<typeof panelOrdenesQuerySchema>
export type PanelMovimientosQuery = z.infer<typeof panelMovimientosQuerySchema>
export type PanelReportesQuery = z.infer<typeof panelReportesQuerySchema>
export type PanelMovimientoInput = z.infer<typeof panelMovimientoSchema>

export function envioSegunMetodo(metodo: MetodoEntrega): number {
  return metodo === "envio_domicilio" ? COSTO_ENVIO_DOMICILIO : 0
}

/**
 * Take-rate de la plataforma: LEKTOR retiene este porcentaje del subtotal de cada
 * venta y el vendedor recibe la diferencia. En el comprobante aparece como un
 * reparto del total ya pagado, no como un recargo para el comprador.
 */
export const COMISION_PLATAFORMA = 0.1

/** El CLP no usa decimales, así que la comisión se redondea al peso entero. */
export function comisionPlataforma(subtotal: number): number {
  return Math.round(subtotal * COMISION_PLATAFORMA)
}

function esUrlValida(valor: string): boolean {
  if (valor.startsWith("/")) return true
  try {
    new URL(valor)
    return true
  } catch {
    return false
  }
}

export function listaFotosAUrls(valor: string): string[] {
  return valor
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6)
}

export const publicarFormSchema = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio").max(255),
  autor: z.string().trim().min(1, "El autor es obligatorio").max(200),
  editorial: z.string().trim().min(1, "La editorial es obligatoria").max(200),
  volumen: z
    .string()
    .trim()
    .refine((valor) => valor === "" || /^\d{1,3}$/.test(valor), "El volumen debe ser un número")
    .default(""),
  categoria: z.enum(CATEGORIAS, { message: "Elige una categoría" }),
  condicion: z.enum(CONDICIONES, { message: "Elige la condición física" }),
  precio: z.preprocess(
    precioANumero,
    z.coerce
      .number({ invalid_type_error: "El precio es obligatorio" })
      .int("El precio debe ser un número entero")
      .min(0, "El precio no puede ser negativo")
      .max(PRECIO_MAXIMO, "El precio es demasiado alto"),
  ),
  stock: z.coerce.number().int().min(1, "Debes tener al menos 1 ejemplar").max(999),
  isbn: z
    .string()
    .trim()
    .refine((valor) => valor === "" || isValidIsbn(valor), "El ISBN no es válido"),
  descripcion: z.string().trim().max(2000, "La descripción es muy larga"),
  fotos: z
    .string()
    .trim()
    .refine(
      (valor) => listaFotosAUrls(valor).every(esUrlValida),
      "Las fotos deben ser URLs o rutas /uploads válidas",
    ),
})

export type PublicarFormValues = z.infer<typeof publicarFormSchema>

/**
 * Formulario de checkout: valida con las mismas reglas que la API, pero conserva
 * los campos opcionales como texto. `checkout-view` los normaliza a `null` al
 * construir el cuerpo del POST.
 */
export const checkoutFormSchema = z
  .object({
    ...camposDespacho,
    direccion: z.string().trim().max(200),
    puntoRetiro: z.string().trim().max(120),
  })
  .superRefine(validarDespacho)

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>

/**
 * Formulario de la pasarela de pago. El número se formatea mientras se escribe y
 * se valida con Luhn, igual que haría el sitio del procesador.
 */
export const pagoFormSchema = z.object({
  numeroTarjeta: z
    .string({ required_error: "Ingresa el número de tarjeta" })
    .transform(formatearNumeroTarjeta)
    .refine((valor) => soloDigitos(valor).length === LARGO_TARJETA, {
      message: `La tarjeta debe tener ${LARGO_TARJETA} dígitos`,
    })
    .refine(luhnValido, { message: "El número de tarjeta no es válido" }),
  nombreTitular: z
    .string({ required_error: "Ingresa el nombre del titular" })
    .trim()
    .min(5, "Ingresa el nombre tal como aparece en la tarjeta")
    .max(80, "El nombre es demasiado largo")
    .regex(/^[A-Za-zÀ-ÿ]+(?:[\s'’-]+[A-Za-zÀ-ÿ]+)*$/, "El nombre solo admite letras"),
  vencimiento: z
    .string({ required_error: "Ingresa el vencimiento de la tarjeta" })
    .transform(formatearVencimiento)
    .refine(vencimientoBienFormado, { message: "Usa el formato MM/AA" })
    .refine(vencimientoEnVigencia, { message: "La tarjeta está vencida" }),
  codigoSeguridad: z
    .string({ required_error: "Ingresa el código de seguridad" })
    .transform(formatearCodigoSeguridad)
    .refine(
      (valor) => valor.length === 3 || valor.length === LARGO_CODIGO_SEGURIDAD,
      { message: "El código de seguridad debe tener 3 o 4 dígitos" },
    ),
})

export type PagoFormValues = z.infer<typeof pagoFormSchema>

/**
 * Formulario de "Editar perfil": los mismos campos que acepta
 * `PATCH /api/profile`, con el nombre obligatorio porque la sesión lo muestra.
 */
export const perfilFormSchema = profileUpdateSchema.extend({
  nombre: z.string().trim().min(2, "El nombre es demasiado corto").max(120),
})

export type PerfilFormValues = z.infer<typeof perfilFormSchema>

export type CuerpoPerfil = z.infer<typeof profileUpdateSchema>

/**
 * Cuerpo que el diálogo de perfil manda a `PATCH /api/profile`. El tipo de retorno es el
 * propio esquema que valida la API, así que si `profileUpdateSchema` exige un campo y esta
 * función no lo manda, el compilador falla en vez de dejar la ficha rebotando.
 */
export function cuerpoDePerfil(values: PerfilFormValues): CuerpoPerfil {
  return {
    nombre: values.nombre,
    bio: values.bio?.trim() || null,
    telefono: values.telefono?.trim() || null,
    comuna: values.comuna?.trim() || null,
    region: values.region || null,
  }
}

/** Ficha propia del lector, tal como la devuelve `GET /api/profile`. */
export type PerfilUI = {
  nombre: string
  bio: string | null
  telefono: string | null
  comuna: string | null
  region: string | null
  avatarUrl: string | null
  fechaCreacion: string
}

export type PublicacionListItem = {
  id: string
  titulo: string
  autor: string
  editorial: string
  volumen: number | null
  categoria: Categoria
  condicion: Condicion
  precio: number
  stock: number
  isbn: string | null
  descripcion?: string | null
  fotos: string[]
  estado: EstadoPublicacion
  rating: string | null
  ratingCount: number
  vendedorId: string
  vendedorNombre: string
  vendedorComuna?: string | null
  fechaPublicacion: string
}

/** Una valoración tal como la devuelve la API, con su autor ya resuelto. */
export type ReviewUI = {
  id: string
  publicacionId: string
  publicacionTitulo: string
  puntaje: number
  visible: boolean
  fechaCreacion: string
  editadoEn: string | null
  autor: { id: string; nombre: string; avatarUrl: string | null }
}

/** Resumen de la reputación de una publicación o de un vendedor. */
export type ReputacionUI = {
  promedio: number | null
  total: number
  distribucion: FilaEstrella[]
}

/** Nivel de coleccionista según cuántos ejemplares activos tiene publicados. */
export function nivelDePublicaciones(total: number): string {
  if (total <= 0) return "Nuevo en LEKTOR"
  if (total < 4) return "Coleccionista"
  if (total < 10) return "Biblioteca en casa"
  return "Referencia local"
}

/**
 * Página pública de un vendedor: su ficha, la reputación sobre todas sus
 * reseñas y sus ejemplares activos.
 */
export type PerfilVendedorUI = {
  vendedor: {
    id: string
    nombre: string
    avatarUrl: string | null
    bio: string | null
    comuna: string | null
    region: string | null
    fechaCreacion: string
    nivel: string
  }
  reputacion: ReputacionUI
  publicaciones: PublicacionListItem[]
}

/** Un mensaje del contacto previo, tal como lo devuelve la API. */
export type MensajeConversacionUI = {
  id: string
  mensaje: string
  fechaCreacion: string
  emisor: { id: string; nombre: string }
}

/**
 * Hilo del contacto previo: la conversación de un lector con el vendedor de
 * una publicación antes de comprarla. Solo la ven sus dos participantes.
 */
export type ConversacionDetalleUI = {
  id: string
  publicacionId: string
  publicacionTitulo: string
  contraparte: { id: string; nombre: string }
  rol: "comprador" | "vendedor"
  mensajes: MensajeConversacionUI[]
}

/** Una conversación en la lista del perfil, con su última noticia. */
export type ConversacionUI = {
  id: string
  publicacionId: string
  publicacionTitulo: string
  contraparte: { id: string; nombre: string }
  rol: "comprador" | "vendedor"
  ultimoMensaje: string | null
  actualizadoEn: string
}

export type Facetas = {
  precioMin: number
  precioMax: number
  totalActivos: number
  categorias: { value: Categoria; total: number }[]
  condiciones: { value: Condicion; total: number }[]
  comunas: { value: string; total: number }[]
  autores: { value: string; total: number }[]
  editoriales: { value: string; total: number }[]
}

export type Paginacion = {
  pagina: number
  porPagina: number
  total: number
  paginas: number
}

export type DatosDespachoUI = {
  nombreRecibe: string
  telefono: string
  metodoEntrega: MetodoEntrega
  direccion: string | null
  comuna: string
  region: string
  puntoRetiro: string | null
}

export type OrdenUI = {
  id: string
  publicacionId: string | null
  tituloSnapshot: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  envio: number
  total: number
  metodoPago: string
  estado: EstadoOrden
  reservaExpiraEn: string
  fechaCreacion: string
  /** Si el comprador ya valoró esta orden (una reseña por orden recibida). */
  valorada: boolean
  datosDespacho: DatosDespachoUI
  comprador: { id: string; nombre: string; telefono: string | null; comuna: string | null }
  vendedor: { id: string; nombre: string; telefono: string | null; comuna: string | null }
  contraparte: { id: string; nombre: string; telefono: string | null; comuna: string | null }
}

/**
 * Detalle de una orden tal como lo devuelve `GET /api/orders/[id]`. A diferencia
 * de la lista del perfil, acá sí vienen el correo y la región de las dos partes,
 * que es lo que el comprobante necesita para liberar el contacto.
 */
export type OrdenDetalleUI = Omit<OrdenUI, "comprador" | "vendedor" | "contraparte"> & {
  compradorId: string
  vendedorId: string
  comprador: ParteOrdenUI
  vendedor: ParteOrdenUI
  contraparte: ParteOrdenUI
  publicacion: PublicacionOrdenUI | null
}

export type ParteOrdenUI = {
  id: string
  nombre: string
  email: string
  telefono: string | null
  comuna: string | null
  region: string | null
}

/**
 * El endpoint devuelve la fila de la publicación tal cual. Acá van solo los
 * campos que el comprobante dibuja, para no prometer un listado que no trae.
 */
export type PublicacionOrdenUI = {
  id: string
  titulo: string
  autor: string
  editorial: string
  volumen: number | null
  categoria: Categoria
  condicion: Condicion
  precio: number
  isbn: string | null
  fotos: string[]
}

export type NotificacionUI = {
  id: string
  tipo: string
  titulo: string
  cuerpo: string | null
  leida: boolean
  fechaCreacion: string
}

export type LibroIsbn = {
  isbn: string
  titulo: string | null
  autor: string | null
  editorial: string | null
  anio: number | null
  paginas: number | null
  portadaUrl: string | null
  fuente?: string
  sinTraducir?: string[]
}

export type SesionUsuario = {
  id: string
  email: string
  nombre: string
  rol: "admin" | "lector"
  activo: boolean
  avatarUrl?: string | null
  telefono?: string | null
}
