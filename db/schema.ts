import {
  pgTable,
  index,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    nombre: varchar("nombre", { length: 120 }).notNull(),
    rol: varchar("rol", { length: 20 }).notNull().default("lector"),
    activo: boolean("activo").notNull().default(true),
    avatarUrl: text("avatar_url"),
    bio: varchar("bio", { length: 300 }),
    telefono: varchar("telefono", { length: 30 }),
    comuna: varchar("comuna", { length: 80 }),
    region: varchar("region", { length: 80 }),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
    ultimoAcceso: timestamp("ultimo_acceso", { withTimezone: true }),
  },
  (table) => [index("users_email_idx").on(table.email), index("users_rol_idx").on(table.rol)],
)

export const publications = pgTable(
  "publications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    titulo: varchar("titulo", { length: 255 }).notNull(),
    autor: varchar("autor", { length: 200 }).notNull(),
    editorial: varchar("editorial", { length: 200 }).notNull(),
    volumen: integer("volumen"),
    categoria: varchar("categoria", { length: 50 }).notNull(),
    condicion: varchar("condicion", { length: 60 }).notNull(),
    precio: integer("precio").notNull(),
    stock: integer("stock").notNull().default(1),
    isbn: varchar("isbn", { length: 20 }),
    descripcion: text("descripcion"),
    fotos: jsonb("fotos").$type<string[]>().notNull().default([]),
    estado: varchar("estado", { length: 20 }).notNull().default("activa"),
    rating: numeric("rating", { precision: 2, scale: 1 }),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fechaPublicacion: timestamp("fecha_publicacion", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("publications_titulo_idx").on(table.titulo),
    index("publications_categoria_idx").on(table.categoria),
    index("publications_editorial_idx").on(table.editorial),
    index("publications_precio_idx").on(table.precio),
    index("publications_vendedor_idx").on(table.vendedorId),
    index("publications_estado_idx").on(table.estado),
    index("publications_categoria_precio_idx").on(table.categoria, table.precio),
    index("publications_isbn_idx").on(table.isbn),
  ],
)

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    compradorId: uuid("comprador_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vendedorId: uuid("vendedor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicacionId: uuid("publicacion_id").references(() => publications.id, {
      onDelete: "set null",
    }),
    tituloSnapshot: varchar("titulo_snapshot", { length: 255 }).notNull().default(""),
    cantidad: integer("cantidad").notNull().default(1),
    precioUnitario: integer("precio_unitario").notNull().default(0),
    subtotal: integer("subtotal").notNull(),
    envio: integer("envio").notNull().default(0),
    total: integer("total").notNull(),
    metodoPago: varchar("metodo_pago", { length: 40 }).notNull().default("simulado"),
    datosDespacho: jsonb("datos_despacho").$type<{
      nombreRecibe: string
      telefono: string
      metodoEntrega: string
      direccion: string | null
      comuna: string
      region: string
      puntoRetiro: string | null
    }>(),
    estado: varchar("estado", { length: 20 }).notNull().default("reservada"),
    reservaExpiraEn: timestamp("reserva_expira_en", { withTimezone: true })
      .notNull()
      .defaultNow(),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_comprador_idx").on(table.compradorId),
    index("orders_vendedor_idx").on(table.vendedorId),
    index("orders_estado_idx").on(table.estado),
    index("orders_reserva_idx").on(table.estado, table.reservaExpiraEn),
  ],
)

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    publicacionId: uuid("publicacion_id")
      .notNull()
      .references(() => publications.id, { onDelete: "cascade" }),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 20 }).notNull().default("entrada"),
    cantidad: integer("cantidad").notNull(),
    stockAnterior: integer("stock_anterior").notNull(),
    stockResultante: integer("stock_resultante").notNull(),
    motivo: varchar("motivo", { length: 200 }),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stock_movements_publicacion_idx").on(table.publicacionId),
    index("stock_movements_fecha_idx").on(table.fechaCreacion),
    index("stock_movements_usuario_idx").on(table.usuarioId),
  ],
)

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tipo: varchar("tipo", { length: 40 }).notNull(),
    titulo: varchar("titulo", { length: 160 }).notNull(),
    cuerpo: text("cuerpo"),
    datos: jsonb("datos").$type<Record<string, unknown>>().notNull().default({}),
    leida: boolean("leida").notNull().default(false),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_fecha_idx").on(table.userId, table.fechaCreacion),
    index("notifications_user_leida_idx").on(table.userId, table.leida),
  ],
)

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mensaje: text("mensaje").notNull(),
    fechaCreacion: timestamp("fecha_creacion", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chat_messages_orden_fecha_idx").on(table.orderId, table.fechaCreacion),
    index("chat_messages_usuario_idx").on(table.userId),
  ],
)

export const bookMetadata = pgTable("book_metadata", {
  isbn: varchar("isbn", { length: 20 }).primaryKey(),
  titulo: varchar("titulo", { length: 255 }),
  autor: varchar("autor", { length: 200 }),
  editorial: varchar("editorial", { length: 200 }),
  anio: integer("anio"),
  paginas: integer("paginas"),
  portadaUrl: text("portada_url"),
  consultadoEn: timestamp("consultado_en", { withTimezone: true }).notNull().defaultNow(),
})

export const sessions = pgTable(
  "sessions",
  {
    token: varchar("token", { length: 128 }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Publication = typeof publications.$inferSelect
export type NewPublication = typeof publications.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type StockMovement = typeof stockMovements.$inferSelect
export type NewStockMovement = typeof stockMovements.$inferInsert
export type BookMetadata = typeof bookMetadata.$inferSelect
export type Session = typeof sessions.$inferSelect
export type ChatMessage = typeof chatMessages.$inferSelect
export type NewChatMessage = typeof chatMessages.$inferInsert
