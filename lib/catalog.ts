import { z } from "zod"
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

export const publicationInputSchema = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio").max(255),
  autor: z.string().trim().min(1, "El autor es obligatorio").max(200),
  editorial: z.string().trim().min(1, "La editorial es obligatoria").max(200),
  volumen: z.coerce.number().int().min(1, "El volumen debe ser un número").max(999).nullable().optional(),
  categoria: z.enum(CATEGORIAS, { message: "Elige una categoría" }),
  condicion: z.enum(CONDICIONES, { message: "Elige la condición física" }),
  precio: z.coerce.number().int().min(0, "El precio no puede ser negativo").max(10000000),
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
  editorial: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  autor: z.string().trim().max(200).optional(),
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
    editorial: repeated("editorial"),
    autor: params.get("autor") ?? undefined,
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

/** Campos comunes al formulario de checkout y al contrato de la API. */
const camposDespacho = {
  nombreRecibe: z
    .string({ required_error: "Indica quién recibe el ejemplar" })
    .trim()
    .min(2, "Indica quién recibe el ejemplar")
    .max(120),
  telefono: z
    .string({ required_error: "Indica un teléfono de contacto" })
    .trim()
    .min(6, "Indica un teléfono de contacto")
    .max(30)
    .regex(/^[0-9+\-\s()]+$/, "El teléfono solo admite números"),
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

const telefonoObligatorio = z
  .string({ required_error: "Indica un teléfono de contacto" })
  .trim()
  .min(6, "Indica un teléfono de contacto")
  .max(30)
  .regex(/^[0-9+\-\s()]+$/, "El teléfono solo admite números")

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

export const profileUpdateSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es demasiado corto").max(120).optional(),
  bio: z.string().trim().max(300).nullable().optional(),
  telefono: z
    .string()
    .trim()
    .max(30)
    .regex(/^[0-9+\-\s()]+$/, "El teléfono solo admite números")
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
  precio: z.coerce.number().int().min(0, "El precio no puede ser negativo").max(10000000),
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

export const perfilFormSchema = profileUpdateSchema.extend({
  nombre: z.string().trim().min(2, "El nombre es demasiado corto").max(120),
})

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
  vendedorId: string
  vendedorNombre: string
  vendedorComuna?: string | null
  fechaPublicacion: string
  esFavorito?: boolean
}

export type Facetas = {
  precioMin: number
  precioMax: number
  totalActivos: number
  categorias: { value: Categoria; total: number }[]
  editoriales: { value: string; total: number }[]
  condiciones: { value: Condicion; total: number }[]
  comunas: { value: string; total: number }[]
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
  datosDespacho: DatosDespachoUI
  comprador: { id: string; nombre: string; telefono: string | null; comuna: string | null }
  vendedor: { id: string; nombre: string; telefono: string | null; comuna: string | null }
  contraparte: { id: string; nombre: string; telefono: string | null; comuna: string | null }
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
}

export type SesionUsuario = {
  id: string
  email: string
  nombre: string
  rol: "admin" | "lector"
  activo: boolean
  avatarUrl?: string | null
}
