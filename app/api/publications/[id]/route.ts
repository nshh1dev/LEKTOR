import { and, count, desc, eq, ne, sql } from "drizzle-orm"
import { db } from "@/db"
import { orders, publications, stockMovements, users } from "@/db/schema"
import { ApiError, getSession, requireSession } from "@/lib/auth"
import { fail, ok, requireId } from "@/lib/api"
import { estadoSegunStock, publicationUpdateSchema } from "@/lib/catalog"
import { normalizeIsbn } from "@/lib/isbn"
import { programarBarrido } from "@/lib/orders"

type Params = { params: Promise<{ id: string }> }

const detalleSelect = {
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
  descripcion: publications.descripcion,
  fotos: publications.fotos,
  estado: publications.estado,
  rating: publications.rating,
  ratingCount: publications.ratingCount,
  vendedorId: publications.vendedorId,
  fechaPublicacion: publications.fechaPublicacion,
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const id = requireId((await params).id)
    const session = await getSession()
    programarBarrido()

    const [row] = await db
      .select({
        ...detalleSelect,
        vendedor: {
          id: users.id,
          nombre: users.nombre,
          email: users.email,
          bio: users.bio,
          comuna: users.comuna,
          region: users.region,
          telefono: users.telefono,
          avatarUrl: users.avatarUrl,
          fechaCreacion: users.fechaCreacion,
        },
      })
      .from(publications)
      .innerJoin(users, eq(publications.vendedorId, users.id))
      .where(eq(publications.id, id))
      .limit(1)

    if (!row) throw new ApiError(404, "not-found", "Publicación no encontrada")
    if (row.estado !== "activa" && row.vendedorId !== session?.id && session?.rol !== "admin") {
      throw new ApiError(404, "not-found", "Publicación no disponible")
    }

    const [vendedorStats, relacionados] = await Promise.all([
      db
        .select({
          publicaciones: sql<number>`(select count(*)::int from publications p where p.vendedor_id = ${row.vendedorId})`,
          ventas: sql<number>`count(${orders.id}) filter (where ${orders.estado} = 'recibida')::int`,
        })
        .from(publications)
        .leftJoin(orders, eq(orders.publicacionId, publications.id))
        .where(eq(publications.vendedorId, row.vendedorId)),
      db
        .select({ ...detalleSelect, vendedorNombre: users.nombre })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(
          and(
            eq(publications.estado, "activa"),
            eq(publications.categoria, row.categoria),
            ne(publications.id, row.id),
          ),
        )
        .orderBy(desc(publications.fechaPublicacion))
        .limit(4),
    ])

    const { vendedor, ...publication } = row
    return ok({
      publication,
      vendedor: { ...vendedor, email: undefined, telefono: undefined, ...vendedorStats[0] },
      relacionados,
    })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)
    const data = publicationUpdateSchema.parse(await request.json())

    const publication = await db.transaction(async (tx) => {
      // El bloqueo de fila serializa las ediciones de stock contra las compras y
      // contra los movimientos de bodega, que también operan sobre la misma fila.
      const bloqueada = await tx.execute<{
        vendedorId: string
        stock: number
        estado: "activa" | "pausada" | "agotada"
      }>(sql`select vendedor_id as "vendedorId", stock, estado from publications where id = ${id} for update`)

      const actual = bloqueada.rows[0]
      if (!actual) throw new ApiError(404, "not-found", "Publicación no encontrada")
      if (actual.vendedorId !== user.id && user.rol !== "admin") {
        throw new ApiError(403, "forbidden", "No puedes editar una publicación de otro vendedor")
      }

      const stockFinal = data.stock ?? actual.stock
      const enPausa = data.estado ? data.estado === "pausada" : actual.estado === "pausada"
      const estado = estadoSegunStock(stockFinal, enPausa ? "pausada" : "activa")

      const cambios = {
        ...(data.titulo !== undefined ? { titulo: data.titulo } : {}),
        ...(data.autor !== undefined ? { autor: data.autor } : {}),
        ...(data.editorial !== undefined ? { editorial: data.editorial } : {}),
        ...(data.volumen !== undefined ? { volumen: data.volumen } : {}),
        ...(data.categoria !== undefined ? { categoria: data.categoria } : {}),
        ...(data.condicion !== undefined ? { condicion: data.condicion } : {}),
        ...(data.precio !== undefined ? { precio: data.precio } : {}),
        ...(data.isbn !== undefined ? { isbn: data.isbn ? normalizeIsbn(data.isbn) : null } : {}),
        ...(data.descripcion !== undefined ? { descripcion: data.descripcion || null } : {}),
        ...(data.fotos !== undefined ? { fotos: data.fotos } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
      }

      if (Object.keys(cambios).length === 0 && estado === actual.estado) {
        throw new ApiError(400, "sin-cambios", "No hay cambios que guardar")
      }

      const [updated] = await tx
        .update(publications)
        .set({ ...cambios, estado })
        .where(eq(publications.id, id))
        .returning(detalleSelect)

      if (!updated) throw new ApiError(404, "not-found", "Publicación no encontrada")

      // Toda variación de stock deja rastro en el libro de movimientos.
      if (data.stock !== undefined && data.stock !== actual.stock) {
        await tx.insert(stockMovements).values({
          publicacionId: id,
          usuarioId: user.id,
          tipo: "ajuste",
          cantidad: data.stock,
          stockAnterior: actual.stock,
          stockResultante: data.stock,
          motivo: "Ajuste desde la publicación",
        })
      }

      return updated
    })

    return ok({ publication })
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)

    const [existing] = await db
      .select({ vendedorId: publications.vendedorId })
      .from(publications)
      .where(eq(publications.id, id))
      .limit(1)
    if (!existing) throw new ApiError(404, "not-found", "Publicación no encontrada")
    if (existing.vendedorId !== user.id && user.rol !== "admin") {
      throw new ApiError(403, "forbidden", "No puedes eliminar una publicación de otro vendedor")
    }

    const [pendientes] = await db
      .select({ total: count() })
      .from(orders)
      .where(and(eq(orders.publicacionId, id), eq(orders.estado, "reservada")))
    if (pendientes && pendientes.total > 0) {
      throw new ApiError(
        409,
        "orden-activa",
        "No puedes eliminar la publicación mientras tenga reservas activas",
      )
    }

    await db.delete(publications).where(eq(publications.id, id))
    return ok({ eliminada: true })
  } catch (error) {
    return fail(error)
  }
}
