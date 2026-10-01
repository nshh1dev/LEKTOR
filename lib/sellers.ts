import "server-only"

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { publications, users } from "@/db/schema"
import { ApiError } from "@/lib/auth"
import {
  nivelDePublicaciones,
  type Categoria,
  type Condicion,
  type EstadoPublicacion,
  type PerfilVendedorUI,
} from "@/lib/catalog"
import { reputacionDeVendedor } from "@/lib/reviews"

/**
 * Página pública de un vendedor. No requiere sesión: muestra la ficha, la
 * reputación sobre todas sus reseñas visibles y sus ejemplares activos. Si la
 * persona no existe, la ruta cae en 404.
 */
export async function perfilVendedor(vendedorId: string): Promise<PerfilVendedorUI> {
  const [vendedor] = await db
    .select({
      id: users.id,
      nombre: users.nombre,
      avatarUrl: users.avatarUrl,
      bio: users.bio,
      comuna: users.comuna,
      region: users.region,
      fechaCreacion: users.fechaCreacion,
    })
    .from(users)
    .where(eq(users.id, vendedorId))

  if (!vendedor) {
    throw new ApiError(404, "not-found", "Este vendedor ya no está en LEKTOR")
  }

  const [filasPublicaciones, reputacion] = await Promise.all([
    db
      .select({
        id: publications.id,
        titulo: publications.titulo,
        autor: publications.autor,
        editorial: publications.editorial,
        volumen: publications.volumen,
        categoria: publications.categoria,
        condicion: publications.condicion,
        precio: publications.precio,
        stock: publications.stock,
        isbn: publications.isbn,
        fotos: publications.fotos,
        estado: publications.estado,
        rating: publications.rating,
        ratingCount: publications.ratingCount,
        vendedorId: publications.vendedorId,
        vendedorNombre: users.nombre,
        vendedorComuna: users.comuna,
        fechaPublicacion: publications.fechaPublicacion,
      })
      .from(publications)
      .innerJoin(users, eq(publications.vendedorId, users.id))
      .where(and(eq(publications.vendedorId, vendedorId), eq(publications.estado, "activa")))
      .orderBy(desc(publications.fechaPublicacion))
      .limit(24),
    reputacionDeVendedor(vendedorId),
  ])

  const publicaciones = filasPublicaciones.map((fila) => ({
    ...fila,
    categoria: fila.categoria as Categoria,
    condicion: fila.condicion as Condicion,
    estado: fila.estado as EstadoPublicacion,
    fechaPublicacion: fila.fechaPublicacion.toISOString(),
  }))

  return {
    vendedor: {
      ...vendedor,
      fechaCreacion: vendedor.fechaCreacion.toISOString(),
      nivel: nivelDePublicaciones(publicaciones.length),
    },
    reputacion,
    publicaciones,
  }
}