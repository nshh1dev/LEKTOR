import "server-only"

import { after } from "next/server"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/db"
import { chatMessages, notifications, orderEvents, orders, publications, stockMovements, users } from "@/db/schema"
import {
  RESERVA_HORAS,
  envioSegunMetodo,
  transicionValida,
  type DatosDespacho,
  type EstadoOrden,
} from "@/lib/catalog"
import { ApiError, type SafeUser } from "@/lib/auth"
import { ESTADO_ORDEN_LABEL } from "@/lib/format"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

type EventoDeOrden = {
  ordenId: string
  actorId: string | null
  estadoAnterior: EstadoOrden
  estadoNuevo: EstadoOrden
  motivo?: string | null
  intervencionAdmin?: boolean
}

/**
 * Cada cambio de estado deja una fila. Sin esto, que la administración empuje una orden se
 * ve igual que si lo hizo el vendedor: el movimiento de stock y el aviso existen, pero
 * ninguno dice quién apretó. Un actor nulo es el barrido automático, no una persona.
 */
async function registrarEvento(tx: Tx, evento: EventoDeOrden) {
  await tx.insert(orderEvents).values({
    ordenId: evento.ordenId,
    actorId: evento.actorId,
    estadoAnterior: evento.estadoAnterior,
    estadoNuevo: evento.estadoNuevo,
    motivo: evento.motivo ?? null,
    intervencionAdmin: evento.intervencionAdmin ?? false,
  })
}

const compradorAlias = alias(users, "orden_comprador")
const vendedorAlias = alias(users, "orden_vendedor")

type LockedPublication = {
  id: string
  titulo: string
  precio: number
  stock: number
  estado: string
  vendedorId: string
}

const orderColumns = {
  id: orders.id,
  publicacionId: orders.publicacionId,
  tituloSnapshot: orders.tituloSnapshot,
  cantidad: orders.cantidad,
  precioUnitario: orders.precioUnitario,
  subtotal: orders.subtotal,
  envio: orders.envio,
  total: orders.total,
  metodoPago: orders.metodoPago,
  datosDespacho: orders.datosDespacho,
  estado: orders.estado,
  reservaExpiraEn: orders.reservaExpiraEn,
  fechaCreacion: orders.fechaCreacion,
  compradorId: orders.compradorId,
  vendedorId: orders.vendedorId,
  /** El comprador ya valoró esta orden: por eso cada compra recibida se puede
   *  marcar como valorada o no desde la propia tarjeta. La subconsulta está
   *  calificada y no multiplica agregados porque el enlace es 1:1 por orden. */
  valorada: sql<boolean>`exists(select 1 from reviews where reviews.order_id = ${orders.id})`,
}

export async function createOrder(
  buyer: SafeUser,
  publicacionId: string,
  datosDespacho: DatosDespacho,
) {
  const envio = envioSegunMetodo(datosDespacho.metodoEntrega)

  return db.transaction(async (tx) => {
    const locked = await tx.execute<LockedPublication>(
      sql`select id, titulo, precio, stock, estado, vendedor_id as "vendedorId"
          from publications where id = ${publicacionId} for update`,
    )

    const publication = locked.rows[0]
    if (!publication) throw new ApiError(404, "not-found", "La publicación no existe")
    if (publication.vendedorId === buyer.id) {
      throw new ApiError(400, "own-publication", "No puedes comprar tu propia publicación")
    }
    if (publication.estado === "pausada") {
      throw new ApiError(409, "pausada", "El vendedor pausó esta publicación")
    }
    if (publication.stock <= 0 || publication.estado === "agotada") {
      throw new ApiError(409, "stock-insuficiente", "No quedan ejemplares disponibles")
    }

    const stockRestante = publication.stock - 1
    await tx
      .update(publications)
      .set({
        stock: stockRestante,
        estado: stockRestante === 0 ? "agotada" : publication.estado,
      })
      .where(eq(publications.id, publicacionId))

    const [order] = await tx
      .insert(orders)
      .values({
        compradorId: buyer.id,
        vendedorId: publication.vendedorId,
        publicacionId,
        tituloSnapshot: publication.titulo,
        cantidad: 1,
        precioUnitario: publication.precio,
        subtotal: publication.precio,
        envio,
        total: publication.precio + envio,
        metodoPago: "simulado",
        estado: "reservada",
        reservaExpiraEn: new Date(Date.now() + RESERVA_HORAS * 3_600_000),
        datosDespacho,
      })
      .returning(orderColumns)

    await tx.insert(notifications).values({
      userId: publication.vendedorId,
      tipo: "nueva_orden",
      titulo: `Nueva orden por ${publication.titulo}`,
      cuerpo: `${buyer.nombre} reservó un ejemplar. Entrega en ${datosDespacho.comuna}. Contacto: ${datosDespacho.telefono}.`,
      datos: { orderId: order.id, publicacionId, compradorId: buyer.id },
    })

    // La venta descuenta stock, así que también es un movimiento del inventario.
    await tx.insert(stockMovements).values({
      publicacionId,
      usuarioId: publication.vendedorId,
      tipo: "salida",
      cantidad: 1,
      stockAnterior: publication.stock,
      stockResultante: stockRestante,
      motivo: `Venta por orden ${order.id.slice(0, 8)}`,
    })

    const [seller] = await tx
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        telefono: users.telefono,
        comuna: users.comuna,
        region: users.region,
        fechaCreacion: users.fechaCreacion,
      })
      .from(users)
      .where(eq(users.id, publication.vendedorId))
      .limit(1)

    return { order, vendedor: seller ?? null }
  })
}

export async function listOrders(userId: string, rol: "comprador" | "vendedor") {
  return db
    .select({
      ...orderColumns,
      comprador: {
        id: compradorAlias.id,
        nombre: compradorAlias.nombre,
        telefono: compradorAlias.telefono,
        comuna: compradorAlias.comuna,
      },
      vendedor: {
        id: vendedorAlias.id,
        nombre: vendedorAlias.nombre,
        telefono: vendedorAlias.telefono,
        comuna: vendedorAlias.comuna,
      },
    })
    .from(orders)
    .innerJoin(compradorAlias, eq(orders.compradorId, compradorAlias.id))
    .innerJoin(vendedorAlias, eq(orders.vendedorId, vendedorAlias.id))
    .where(rol === "vendedor" ? eq(orders.vendedorId, userId) : eq(orders.compradorId, userId))
    .orderBy(desc(orders.fechaCreacion))
}

export async function getOrderForUser(id: string, user: SafeUser) {
  const [row] = await db
    .select({
      ...orderColumns,
      vendedor: {
        id: vendedorAlias.id,
        nombre: vendedorAlias.nombre,
        email: vendedorAlias.email,
        telefono: vendedorAlias.telefono,
        comuna: vendedorAlias.comuna,
        region: vendedorAlias.region,
      },
      comprador: {
        id: compradorAlias.id,
        nombre: compradorAlias.nombre,
        email: compradorAlias.email,
        telefono: compradorAlias.telefono,
        comuna: compradorAlias.comuna,
        region: compradorAlias.region,
      },
      publicacion: publications,
    })
    .from(orders)
    .innerJoin(vendedorAlias, eq(orders.vendedorId, vendedorAlias.id))
    .innerJoin(compradorAlias, eq(orders.compradorId, compradorAlias.id))
    .leftJoin(publications, eq(orders.publicacionId, publications.id))
    .where(eq(orders.id, id))
    .limit(1)

  if (!row) throw new ApiError(404, "not-found", "Orden no encontrada")
  const isBuyer = row.compradorId === user.id
  const isSeller = row.vendedorId === user.id
  if (!isBuyer && !isSeller && user.rol !== "admin") {
    throw new ApiError(403, "forbidden", "No tienes acceso a esta orden")
  }

  const { comprador, vendedor, publicacion, ...order } = row
  return { ...order, contraparte: isSeller ? comprador : vendedor, vendedor, comprador, publicacion }
}

/**
 * Historial de cambios de estado de una orden. Solo lo ven el comprador, el vendedor y la
 * administración: es el mismo acceso que al detalle, y ahí se apoya para no duplicar reglas.
 */
export async function getOrderEvents(id: string, user: SafeUser) {
  await getOrderForUser(id, user)

  return db
    .select({
      id: orderEvents.id,
      estadoAnterior: orderEvents.estadoAnterior,
      estadoNuevo: orderEvents.estadoNuevo,
      motivo: orderEvents.motivo,
      intervencionAdmin: orderEvents.intervencionAdmin,
      fechaCreacion: orderEvents.fechaCreacion,
      actorId: orderEvents.actorId,
      actorNombre: users.nombre,
    })
    .from(orderEvents)
    .leftJoin(users, eq(orderEvents.actorId, users.id))
    .where(eq(orderEvents.ordenId, id))
    .orderBy(asc(orderEvents.fechaCreacion), asc(orderEvents.id))
}

export async function transitionOrder(
  id: string,
  user: SafeUser,
  siguiente: EstadoOrden,
  motivo?: string,
) {
  const resultado = await db.transaction(async (tx) => {
    const locked = await tx.execute<{ estado: EstadoOrden; reservaExpiraEn: Date | null }>(
      sql`select estado, reserva_expira_en as "reservaExpiraEn" from orders where id = ${id} for update`,
    )
    if (locked.rows.length === 0) throw new ApiError(404, "not-found", "Orden no encontrada")

    const [current] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1)
    const actual = locked.rows[0]

    const isBuyer = current.compradorId === user.id
    const isSeller = current.vendedorId === user.id
    const esOperador = user.rol === "admin"
    if (!isBuyer && !isSeller && !esOperador) {
      throw new ApiError(403, "forbidden", "No tienes acceso a esta orden")
    }
    // La administración puede empujar una orden, pero si no es parte de la operación su
    // cambio queda marcado como intervención para que la contraparte no lo crea suyo.
    const intervencion = esOperador && !isBuyer && !isSeller

    if (
      actual.estado === "reservada" &&
      actual.reservaExpiraEn &&
      new Date(actual.reservaExpiraEn).getTime() < Date.now()
    ) {
      await releaseStock(
        tx,
        current.publicacionId,
        current.vendedorId,
        `Reserva ${current.id.slice(0, 8)} vencida`,
      )
      await tx.update(orders).set({ estado: "cancelada" }).where(eq(orders.id, id))
      await registrarEvento(tx, {
        ordenId: id,
        actorId: user.id,
        estadoAnterior: actual.estado as EstadoOrden,
        estadoNuevo: "cancelada",
        motivo: `Reserva ${current.id.slice(0, 8)} vencida`,
        intervencionAdmin: intervencion,
      })
      await tx.insert(notifications).values({
        userId: current.compradorId,
        tipo: "orden_cancelada",
        titulo: "Reserva expirada",
        cuerpo: `La reserva de ${current.tituloSnapshot} venció y el ejemplar volvió al catálogo.`,
        datos: { orderId: id },
      })
      return { expirada: true as const }
    }

    const estadoActual = actual.estado
    if (!transicionValida(estadoActual, siguiente)) {
      throw new ApiError(
        409,
        "transicion-invalida",
        `No se puede pasar de ${ESTADO_ORDEN_LABEL[estadoActual] ?? estadoActual} a ${ESTADO_ORDEN_LABEL[siguiente]}`,
      )
    }

    if (user.rol !== "admin") {
      if ((siguiente === "en_preparacion" || siguiente === "despachada") && !isSeller) {
        throw new ApiError(403, "forbidden", "Solo el vendedor puede preparar o despachar la orden")
      }
      if (siguiente === "recibida" && !isBuyer) {
        throw new ApiError(403, "forbidden", "Solo el comprador puede confirmar la recepción")
      }
    }

    await tx.update(orders).set({ estado: siguiente }).where(eq(orders.id, id))

    await registrarEvento(tx, {
      ordenId: id,
      actorId: user.id,
      estadoAnterior: estadoActual,
      estadoNuevo: siguiente,
      motivo,
      intervencionAdmin: intervencion,
    })

    if (siguiente === "cancelada") {
      await releaseStock(
        tx,
        current.publicacionId,
        current.vendedorId,
        intervencion
          ? `Orden ${current.id.slice(0, 8)} cancelada por la administracion`
          : `Orden ${current.id.slice(0, 8)} cancelada`,
      )
    }

    const receiverId = siguiente === "recibida" ? current.vendedorId : current.compradorId
    await tx.insert(notifications).values({
      userId: receiverId,
      tipo: intervencion ? "orden_intervenida" : "orden_actualizada",
      titulo: intervencion
        ? `Orden por ${current.tituloSnapshot}: ${ESTADO_ORDEN_LABEL[siguiente]} (intervención del equipo)`
        : `Orden por ${current.tituloSnapshot}: ${ESTADO_ORDEN_LABEL[siguiente]}`,
      cuerpo: intervencion
        ? `El equipo de LEKTOR actualizó esta orden a ${ESTADO_ORDEN_LABEL[siguiente]?.toLowerCase() ?? siguiente}. ${motivo ?? "Si no estás de acuerdo, responde al vendedor por el chat de la orden."}`
        : (motivo ?? `La orden cambió de estado. Revisa el detalle para coordinar la entrega.`),
      datos: { orderId: id },
    })

    return { expirada: false as const, order: { ...current, estado: siguiente } }
  })

  if (resultado.expirada) {
    throw new ApiError(409, "reserva-expirada", "La reserva expiró y el ejemplar volvió al catálogo")
  }

  return resultado.order
}

async function releaseStock(
  tx: Tx,
  publicacionId: string | null,
  usuarioId: string,
  motivo: string,
) {
  if (!publicacionId) return

  const bloqueada = await tx.execute<{ stock: number }>(
    sql`select stock from publications where id = ${publicacionId} for update`,
  )
  const publicacion = bloqueada.rows[0]
  if (!publicacion) return

  const stockAnterior = publicacion.stock
  const stockResultante = stockAnterior + 1

  await tx.execute(sql`
    update publications
    set stock = stock + 1,
        estado = case when estado = 'agotada' then 'activa' else estado end
    where id = ${publicacionId}`)

  await tx.insert(stockMovements).values({
    publicacionId,
    usuarioId,
    tipo: "entrada",
    cantidad: 1,
    stockAnterior,
    stockResultante,
    motivo,
  })
}

/**
 * El chat solo existe dentro de una orden y únicamente lo ven sus dos participantes:
 * el comprador y el vendedor. Ni siquiera la administración entra, porque la
 * conversación es entre las dos personas de la compra.
 */
function esParticipante(order: { compradorId: string; vendedorId: string }, user: SafeUser): boolean {
  return order.compradorId === user.id || order.vendedorId === user.id
}

export async function leerChatDeOrden(id: string, user: SafeUser) {
  const [order] = await db
    .select({ compradorId: orders.compradorId, vendedorId: orders.vendedorId })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1)
  if (!order) throw new ApiError(404, "not-found", "Orden no encontrada")
  if (!esParticipante(order, user)) {
    throw new ApiError(403, "forbidden", "Este chat es entre el comprador y el vendedor")
  }

  return db
    .select({
      id: chatMessages.id,
      mensaje: chatMessages.mensaje,
      fechaCreacion: chatMessages.fechaCreacion,
      emisor: { id: users.id, nombre: users.nombre },
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .where(eq(chatMessages.orderId, id))
    .orderBy(asc(chatMessages.fechaCreacion))
    .limit(200)
}

export async function enviarMensajeDeOrden(id: string, user: SafeUser, mensaje: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ compradorId: orders.compradorId, vendedorId: orders.vendedorId, tituloSnapshot: orders.tituloSnapshot })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1)
    if (!order) throw new ApiError(404, "not-found", "Orden no encontrada")
    if (!esParticipante(order, user)) {
      throw new ApiError(403, "forbidden", "Este chat es entre el comprador y el vendedor")
    }

    const [mensajeNuevo] = await tx
      .insert(chatMessages)
      .values({ orderId: id, userId: user.id, mensaje })
      .returning({
        id: chatMessages.id,
        mensaje: chatMessages.mensaje,
        fechaCreacion: chatMessages.fechaCreacion,
      })

    const receptorId = order.compradorId === user.id ? order.vendedorId : order.compradorId
    await tx.insert(notifications).values({
      userId: receptorId,
      tipo: "mensaje_chat",
      titulo: `Nuevo mensaje por ${order.tituloSnapshot}`,
      cuerpo: `${user.nombre}: ${mensaje.slice(0, 140)}`,
      datos: { orderId: id },
    })

    return { ...mensajeNuevo!, emisor: { id: user.id, nombre: user.nombre } }
  })
}

export async function sweepExpiredReservations() {
  return db.transaction(async (tx) => {
    const locked = await tx.execute<{
      id: string
      publicacionId: string | null
      compradorId: string
      vendedorId: string
      tituloSnapshot: string
    }>(sql`
      select id, publicacion_id as "publicacionId", comprador_id as "compradorId",
             vendedor_id as "vendedorId", titulo_snapshot as "tituloSnapshot"
      from orders
      where estado = 'reservada' and reserva_expira_en < now()
      order by reserva_expira_en
      limit 50
      for update skip locked`)

    for (const order of locked.rows) {
      await releaseStock(
        tx,
        order.publicacionId,
        order.vendedorId,
        `Reserva ${order.id.slice(0, 8)} vencida`,
      )
      await tx.update(orders).set({ estado: "cancelada" }).where(eq(orders.id, order.id))
      await registrarEvento(tx, {
        ordenId: order.id,
        actorId: null,
        estadoAnterior: "reservada",
        estadoNuevo: "cancelada",
        motivo: `Reserva ${order.id.slice(0, 8)} vencida`,
      })
      await tx.insert(notifications).values({
        userId: order.compradorId,
        tipo: "orden_cancelada",
        titulo: "Reserva expirada",
        cuerpo: `La reserva de ${order.tituloSnapshot} venció y el ejemplar volvió al catálogo.`,
        datos: { orderId: order.id },
      })
    }

    return locked.rows.length
  })
}

let ultimoBarrido = 0
const INTERVALO_BARRIDO_MS = 60_000

/**
 * Encola el barrido para que corra después de responder. Así la petición no paga el
 * costo del UPDATE y sigue siendo cierto que el barrido nunca rompe la respuesta.
 */
export function programarBarrido(): void {
  after(() => barridoPerezoso())
}

/**
 * Vence reservas de forma diferida al servir tráfico normal, para que el catálogo
 * recupere ejemplares sin depender de un planificador externo. Nunca debe romper
 * la petición que la dispara: si falla, se registra y se sigue.
 */
export async function barridoPerezoso(): Promise<void> {
  if (Date.now() - ultimoBarrido < INTERVALO_BARRIDO_MS) return
  try {
    await sweepExpiredReservations()
    // La marca se actualiza al terminar para que un fallo no congele el barrido
    // durante el intervalo completo.
    ultimoBarrido = Date.now()
  } catch (error) {
    console.error("[lektor-orders] no se pudieron barrer las reservas vencidas", error)
  }
}

export async function listNotifications(userId: string) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.fechaCreacion))
    .limit(30)
}

export async function markNotificationsRead(userId: string, ids: string[]) {
  if (ids.length === 0) return 0
  const updated = await db
    .update(notifications)
    .set({ leida: true })
    .where(and(eq(notifications.userId, userId), inArray(notifications.id, ids)))
    .returning({ id: notifications.id })
  return updated.length
}
