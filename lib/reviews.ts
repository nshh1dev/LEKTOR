import "server-only"

import { and, count, desc, eq, notExists, sql } from "drizzle-orm"
import { db } from "@/db"
import { notifications, orders, publications, reviews, users } from "@/db/schema"
import { distribucionDesde, type ReputacionUI } from "@/lib/catalog"
import { ApiError, type SafeUser } from "@/lib/auth"

const reviewColumns = {
  id: reviews.id,
  publicacionId: reviews.publicacionId,
  publicacionTitulo: publications.titulo,
  puntaje: reviews.puntaje,
  visible: reviews.visible,
  fechaCreacion: reviews.fechaCreacion,
  editadoEn: reviews.editadoEn,
}

const conAutor = {
  autor: { id: users.id, nombre: users.nombre, avatarUrl: users.avatarUrl },
}

/**
 * El promedio de una publicación se recalcula contra la tabla y nunca se suma ni
 * se resta sobre el valor guardado: redondear en cada cambio deriva con el
 * tiempo. Las reseñas ocultas por moderación salen del promedio, así que
 * retirar una reseña también recalcula.
 *
 * Las columnas de la subconsulta van calificadas porque el `update` y las
 * subconsultas comparten el alcance de la tabla en el SQL final.
 */
async function recalcularPromedio(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  publicacionId: string,
) {
  await tx.execute(sql`
    update publications
    set rating = (
          select round(avg(reviews.puntaje), 1)
          from reviews
          where reviews.publicacion_id = ${publicacionId} and reviews.visible
        ),
        rating_count = (
          select count(*)
          from reviews
          where reviews.publicacion_id = ${publicacionId} and reviews.visible
        )
    where publications.id = ${publicacionId}`)
}

/**
 * La única puerta de entrada a una valoración: una orden del mismo comprador,
 * sobre la misma publicación, ya recibida y todavía sin reseñar. Así nadie
 * publica estrellas sin haber recibido el ejemplar, y no se puede repetir la
 * compra para inflar la nota. Con un `orderId` la condición se cierra sobre esa
 * orden puntual (la de la tarjeta de la compra recibida) en vez de quedarse
 * con la más reciente.
 */
function condicionValoracion(compradorId: string, publicacionId: string, orderId?: string) {
  return and(
    eq(orders.compradorId, compradorId),
    eq(orders.publicacionId, publicacionId),
    eq(orders.estado, "recibida"),
    ...(orderId ? [eq(orders.id, orderId)] : []),
    notExists(db.select({ uno: sql`1` }).from(reviews).where(eq(reviews.orderId, orders.id))),
  )
}

export async function puedeValorar(userId: string, publicacionId: string) {
  const [algo] = await db
    .select({ uno: sql`1` })
    .from(orders)
    .where(condicionValoracion(userId, publicacionId))
    .limit(1)
  return Boolean(algo)
}

export async function crearReview(
  user: SafeUser,
  publicacionId: string,
  input: { puntaje: number; orderId?: string },
) {
  return db.transaction(async (tx) => {
    const [publicacion] = await tx
      .select({
        id: publications.id,
        titulo: publications.titulo,
        vendedorId: publications.vendedorId,
      })
      .from(publications)
      .where(eq(publications.id, publicacionId))
      .limit(1)

    if (!publicacion) throw new ApiError(404, "not-found", "La publicación no existe")
    if (publicacion.vendedorId === user.id) {
      throw new ApiError(400, "own-publication", "No puedes valorar tu propia publicación")
    }

    const [orden] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(condicionValoracion(user.id, publicacionId, input.orderId))
      .orderBy(desc(orders.fechaCreacion))
      .limit(1)

    if (!orden) {
      throw new ApiError(
        403,
        "sin-compra-verificada",
        "Solo puedes valorar un ejemplar que hayas recibido",
      )
    }

    const [creada] = await tx
      .insert(reviews)
      .values({
        orderId: orden.id,
        autorId: user.id,
        publicacionId,
        vendedorId: publicacion.vendedorId,
        puntaje: input.puntaje,
      })
      .returning({ id: reviews.id })

    await recalcularPromedio(tx, publicacionId)

    await tx.insert(notifications).values({
      userId: publicacion.vendedorId,
      tipo: "nueva_valoracion",
      titulo: `${user.nombre} valoró ${publicacion.titulo}`,
      cuerpo: `${input.puntaje} de 5`,
      datos: { publicacionId, reviewId: creada.id },
    })

    return creada
  })
}

async function reviewDe(reviewId: string) {
  const [review] = await db
    .select({
      id: reviews.id,
      autorId: reviews.autorId,
      publicacionId: reviews.publicacionId,
      vendedorId: reviews.vendedorId,
    })
    .from(reviews)
    .where(eq(reviews.id, reviewId))
    .limit(1)
  if (!review) throw new ApiError(404, "not-found", "La valoración no existe")
  return review
}

export async function editarReview(
  user: SafeUser,
  reviewId: string,
  input: { puntaje?: number },
) {
  return db.transaction(async (tx) => {
    const review = await reviewDe(reviewId)
    if (review.autorId !== user.id) {
      throw new ApiError(403, "forbidden", "Solo quien escribió la valoración puede editarla")
    }

    await tx
      .update(reviews)
      .set({ ...input, editadoEn: new Date() })
      .where(eq(reviews.id, reviewId))
    await recalcularPromedio(tx, review.publicacionId)

    const [editada] = await tx.select().from(reviews).where(eq(reviews.id, reviewId)).limit(1)
    return editada
  })
}

/** Moderación del panel: ocultar saca la reseña del promedio sin borrarla. */
export async function moderarReview(reviewId: string, visible: boolean) {
  return db.transaction(async (tx) => {
    const review = await reviewDe(reviewId)
    await tx.update(reviews).set({ visible }).where(eq(reviews.id, reviewId))
    await recalcularPromedio(tx, review.publicacionId)
    return { visible, publicacionId: review.publicacionId }
  })
}

export async function eliminarReview(user: SafeUser, reviewId: string) {
  return db.transaction(async (tx) => {
    const review = await reviewDe(reviewId)
    if (review.autorId !== user.id) {
      throw new ApiError(403, "forbidden", "Solo quien escribió la valoración puede borrarla")
    }
    await tx.delete(reviews).where(eq(reviews.id, reviewId))
    await recalcularPromedio(tx, review.publicacionId)
    return { eliminada: true, publicacionId: review.publicacionId }
  })
}

/** Resumen de estrellas a partir del conteo agrupado, sin cargar cada reseña. */
function resumenDesdeConteos(filas: { puntaje: number; total: number }[]): ReputacionUI {
  const conteos = [0, 0, 0, 0, 0]
  let total = 0
  let suma = 0
  for (const fila of filas) {
    const indice = fila.puntaje - 1
    if (indice >= 0 && indice < 5) conteos[indice] = fila.total
    total += fila.total
    suma += fila.puntaje * fila.total
  }
  return {
    promedio: total === 0 ? null : Math.round((suma / total) * 10) / 10,
    total,
    distribucion: distribucionDesde(conteos),
  }
}

export async function reputacionDePublicacion(publicacionId: string): Promise<ReputacionUI> {
  const filas = await db
    .select({ puntaje: reviews.puntaje, total: count() })
    .from(reviews)
    .where(and(eq(reviews.publicacionId, publicacionId), eq(reviews.visible, true)))
    .groupBy(reviews.puntaje)
  return resumenDesdeConteos(filas)
}

/**
 * Reputación de un vendedor sobre todas sus reseñas, no sobre una publicación.
 * Cuenta solo las visibles, que es exactamente lo que ve la gente.
 */
export async function reputacionDeVendedor(vendedorId: string): Promise<ReputacionUI> {
  const filas = await db
    .select({ puntaje: reviews.puntaje, total: count() })
    .from(reviews)
    .where(and(eq(reviews.vendedorId, vendedorId), eq(reviews.visible, true)))
    .groupBy(reviews.puntaje)
  return resumenDesdeConteos(filas)
}

/** Lo que ve cualquiera en la página de la publicación. */
export async function reviewsDePublicacion(publicacionId: string) {
  const [lista, reputacion] = await Promise.all([
    listarReviews(publicacionId),
    reputacionDePublicacion(publicacionId),
  ])
  return { reviews: lista, reputacion }
}

export async function listarReviews(publicacionId: string, limite = 50) {
  return db
    .select({ ...reviewColumns, ...conAutor })
    .from(reviews)
    .innerJoin(publications, eq(reviews.publicacionId, publications.id))
    .innerJoin(users, eq(reviews.autorId, users.id))
    .where(and(eq(reviews.publicacionId, publicacionId), eq(reviews.visible, true)))
    .orderBy(desc(reviews.fechaCreacion))
    .limit(limite)
}

/** Reseñas que recibió un vendedor, para responderlas desde su perfil. Con
 *  `soloVisibles` se excluyen las que la moderación ocultó: es lo que ve
 *  cualquier persona que entra a la página pública del vendedor. */
export async function reviewsRecibidas(vendedorId: string, soloVisibles = false) {
  return db
    .select({ ...reviewColumns, ...conAutor })
    .from(reviews)
    .innerJoin(publications, eq(reviews.publicacionId, publications.id))
    .innerJoin(users, eq(reviews.autorId, users.id))
    .where(and(eq(reviews.vendedorId, vendedorId), soloVisibles ? eq(reviews.visible, true) : undefined))
    .orderBy(desc(reviews.fechaCreacion))
    .limit(50)
}

/** Todo lo escrito por una persona, para que vea y edite lo suyo. */
export async function reviewsEscritas(autorId: string) {
  return db
    .select({ ...reviewColumns, ...conAutor })
    .from(reviews)
    .innerJoin(publications, eq(reviews.publicacionId, publications.id))
    .innerJoin(users, eq(reviews.autorId, users.id))
    .where(eq(reviews.autorId, autorId))
    .orderBy(desc(reviews.fechaCreacion))
    .limit(50)
}

/** Reseñas para la cola de moderación del panel. */
export async function reviewsParaModerar(soloOcultas: boolean) {
  return db
    .select({ ...reviewColumns, ...conAutor })
    .from(reviews)
    .innerJoin(publications, eq(reviews.publicacionId, publications.id))
    .innerJoin(users, eq(reviews.autorId, users.id))
    .where(soloOcultas ? eq(reviews.visible, false) : undefined)
    .orderBy(desc(reviews.fechaCreacion))
    .limit(100)
}

/** Convierte las fechas a ISO para que la respuesta pase limpia por JSON. */
export function serializarReviews<T extends { fechaCreacion: Date; editadoEn: Date | null }>(lista: T[]) {
  return lista.map((fila) => ({
    ...fila,
    fechaCreacion: fila.fechaCreacion.toISOString(),
    editadoEn: fila.editadoEn ? fila.editadoEn.toISOString() : null,
  }))
}
