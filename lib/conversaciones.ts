import "server-only"

import { and, asc, desc, eq, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { db } from "@/db"
import { conversaciones, conversacionMensajes, notifications, publications, users } from "@/db/schema"
import { ApiError, type SafeUser } from "@/lib/auth"
import type { ConversacionDetalleUI, ConversacionUI, MensajeConversacionUI } from "@/lib/catalog"

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

const compradorAlias = alias(users, "conversacion_comprador")
const vendedorAlias = alias(users, "conversacion_vendedor")

type FilaMensaje = {
  id: string
  mensaje: string
  fechaCreacion: Date
  emisor: { id: string; nombre: string }
}

function serializarMensajes(lista: FilaMensaje[]): MensajeConversacionUI[] {
  return lista.map((fila) => ({ ...fila, fechaCreacion: fila.fechaCreacion.toISOString() }))
}

function esParticipante(
  hilo: { compradorId: string; vendedorId: string },
  user: SafeUser,
): boolean {
  return hilo.compradorId === user.id || hilo.vendedorId === user.id
}

/**
 * Guarda un mensaje dentro del hilo y deja la noticia del "último mensaje" en la
 * conversación para que la lista del perfil se ordene por ese momento. La
 * notificación sale con tipo `contacto`; la ve solo el otro participante.
 */
async function insertarMensaje(
  tx: Tx,
  conversacionId: string,
  publicacionId: string,
  publicacionTitulo: string,
  user: SafeUser,
  receptorId: string,
  mensaje: string,
): Promise<MensajeConversacionUI> {
  const [nuevo] = await tx
    .insert(conversacionMensajes)
    .values({ conversacionId, userId: user.id, mensaje })
    .returning({
      id: conversacionMensajes.id,
      mensaje: conversacionMensajes.mensaje,
      fechaCreacion: conversacionMensajes.fechaCreacion,
    })

  await tx
    .update(conversaciones)
    .set({ actualizadoEn: nuevo!.fechaCreacion })
    .where(eq(conversaciones.id, conversacionId))

  await tx.insert(notifications).values({
    userId: receptorId,
    tipo: "contacto",
    titulo: `Nuevo mensaje por ${publicacionTitulo}`,
    cuerpo: `${user.nombre}: ${mensaje.slice(0, 140)}`,
    datos: { conversacionId, publicacionId },
  })

  return { ...nuevo!, fechaCreacion: nuevo!.fechaCreacion.toISOString(), emisor: { id: user.id, nombre: user.nombre } }
}

/**
 * Abre (o retoma) la conversación de una publicación: un lector le escribe al
 * vendedor antes de comprar. Una sola conversación por publicación y comprador,
 * así el hilo no se fragmenta. Es privado: solo las dos personas lo ven, igual
 * que el chat de la orden y al margen de la administración.
 */
export async function abrirConversacion(
  publicacionId: string,
  user: SafeUser,
  mensaje: string,
): Promise<ConversacionDetalleUI> {
  return db.transaction(async (tx) => {
    const [publicacion] = await tx
      .select({
        titulo: publications.titulo,
        vendedorId: publications.vendedorId,
        estado: publications.estado,
        vendedor: { id: vendedorAlias.id, nombre: vendedorAlias.nombre },
      })
      .from(publications)
      .leftJoin(vendedorAlias, eq(publications.vendedorId, vendedorAlias.id))
      .where(eq(publications.id, publicacionId))
      .limit(1)
    if (!publicacion) throw new ApiError(404, "not-found", "La publicación no existe")
    if (publicacion.vendedorId === user.id) {
      throw new ApiError(400, "auto-contacto", "No puedes escribirte a ti mismo")
    }
    if (publicacion.estado !== "activa") {
      throw new ApiError(409, "publicacion-inactiva", "Este ejemplar no está a la venta ahora mismo")
    }

    const [creada] = await tx
      .insert(conversaciones)
      .values({ publicacionId, compradorId: user.id, vendedorId: publicacion.vendedorId })
      .onConflictDoNothing()
      .returning({ id: conversaciones.id })
    const conversacionId =
      creada?.id ??
      (
        await tx
          .select({ id: conversaciones.id })
          .from(conversaciones)
          .where(
            and(
              eq(conversaciones.publicacionId, publicacionId),
              eq(conversaciones.compradorId, user.id),
            ),
          )
          .limit(1)
      )[0]!.id

    const mensajeNuevo = await insertarMensaje(
      tx,
      conversacionId,
      publicacionId,
      publicacion.titulo,
      user,
      publicacion.vendedorId,
      mensaje,
    )

    return {
      id: conversacionId,
      publicacionId,
      publicacionTitulo: publicacion.titulo,
      rol: "comprador",
      contraparte: {
        id: publicacion.vendedor!.id,
        nombre: publicacion.vendedor!.nombre,
      },
      mensajes: [mensajeNuevo],
    }
  })
}

/** El hilo completo de una conversación; solo la ven sus dos participantes. */
export async function leerConversacion(id: string, user: SafeUser): Promise<ConversacionDetalleUI> {
  const [hilo] = await db
    .select({
      id: conversaciones.id,
      publicacionId: conversaciones.publicacionId,
      compradorId: conversaciones.compradorId,
      vendedorId: conversaciones.vendedorId,
      publicacionTitulo: publications.titulo,
      comprador: { id: compradorAlias.id, nombre: compradorAlias.nombre },
      vendedor: { id: vendedorAlias.id, nombre: vendedorAlias.nombre },
    })
    .from(conversaciones)
    .innerJoin(publications, eq(conversaciones.publicacionId, publications.id))
    .innerJoin(compradorAlias, eq(conversaciones.compradorId, compradorAlias.id))
    .innerJoin(vendedorAlias, eq(conversaciones.vendedorId, vendedorAlias.id))
    .where(eq(conversaciones.id, id))
    .limit(1)
  if (!hilo) throw new ApiError(404, "not-found", "Conversación no encontrada")
  if (!esParticipante(hilo, user)) {
    throw new ApiError(403, "forbidden", "Este contacto es privado entre las dos personas")
  }

  const mensajes = await db
    .select({
      id: conversacionMensajes.id,
      mensaje: conversacionMensajes.mensaje,
      fechaCreacion: conversacionMensajes.fechaCreacion,
      emisor: { id: users.id, nombre: users.nombre },
    })
    .from(conversacionMensajes)
    .innerJoin(users, eq(conversacionMensajes.userId, users.id))
    .where(eq(conversacionMensajes.conversacionId, id))
    .orderBy(asc(conversacionMensajes.fechaCreacion))
    .limit(200)

  const esComprador = hilo.compradorId === user.id
  return {
    id,
    publicacionId: hilo.publicacionId,
    publicacionTitulo: hilo.publicacionTitulo,
    rol: esComprador ? "comprador" : "vendedor",
    contraparte: esComprador
      ? { id: hilo.vendedor.id, nombre: hilo.vendedor.nombre }
      : { id: hilo.comprador.id, nombre: hilo.comprador.nombre },
    mensajes: serializarMensajes(mensajes),
  }
}

/** Las conversaciones del usuario, como comprador o como vendedor, con su última noticia. */
export async function listarConversaciones(user: SafeUser): Promise<ConversacionUI[]> {
  const filas = await db
    .select({
      id: conversaciones.id,
      publicacionId: conversaciones.publicacionId,
      publicacionTitulo: publications.titulo,
      compradorId: conversaciones.compradorId,
      vendedorId: conversaciones.vendedorId,
      actualizadoEn: conversaciones.actualizadoEn,
      comprador: { id: compradorAlias.id, nombre: compradorAlias.nombre },
      vendedor: { id: vendedorAlias.id, nombre: vendedorAlias.nombre },
      ultimoMensaje: sql<string | null>`(
        select ${conversacionMensajes.mensaje} from ${conversacionMensajes}
        where ${conversacionMensajes.conversacionId} = ${conversaciones.id}
        order by ${conversacionMensajes.fechaCreacion} desc
        limit 1
      )`,
    })
    .from(conversaciones)
    .innerJoin(publications, eq(conversaciones.publicacionId, publications.id))
    .innerJoin(compradorAlias, eq(conversaciones.compradorId, compradorAlias.id))
    .innerJoin(vendedorAlias, eq(conversaciones.vendedorId, vendedorAlias.id))
    .where(or(eq(conversaciones.compradorId, user.id), eq(conversaciones.vendedorId, user.id)))
    .orderBy(desc(conversaciones.actualizadoEn))
    .limit(100)

  return filas.map((fila) => {
    const esComprador = fila.compradorId === user.id
    return {
      id: fila.id,
      publicacionId: fila.publicacionId,
      publicacionTitulo: fila.publicacionTitulo,
      rol: esComprador ? "comprador" : "vendedor",
      contraparte: esComprador ? fila.vendedor : fila.comprador,
      ultimoMensaje: fila.ultimoMensaje,
      actualizadoEn: fila.actualizadoEn.toISOString(),
    }
  })
}

/** Responder en una conversación existente; la guarda el único participante. */
export async function enviarMensaje(
  id: string,
  user: SafeUser,
  mensaje: string,
): Promise<MensajeConversacionUI> {
  return db.transaction(async (tx) => {
    const [hilo] = await tx
      .select({
        compradorId: conversaciones.compradorId,
        vendedorId: conversaciones.vendedorId,
        publicacionId: conversaciones.publicacionId,
        publicacionTitulo: publications.titulo,
      })
      .from(conversaciones)
      .innerJoin(publications, eq(conversaciones.publicacionId, publications.id))
      .where(eq(conversaciones.id, id))
      .limit(1)
    if (!hilo) throw new ApiError(404, "not-found", "Conversación no encontrada")
    if (!esParticipante(hilo, user)) {
      throw new ApiError(403, "forbidden", "Este contacto es privado entre las dos personas")
    }

    const receptorId = hilo.compradorId === user.id ? hilo.vendedorId : hilo.compradorId
    return insertarMensaje(
      tx,
      id,
      hilo.publicacionId,
      hilo.publicacionTitulo,
      user,
      receptorId,
      mensaje,
    )
  })
}