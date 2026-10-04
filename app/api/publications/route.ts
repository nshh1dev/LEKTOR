import type { NextRequest } from "next/server"
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm"
import { db } from "@/db"
import { publications, users } from "@/db/schema"
import { getSession, requireSession } from "@/lib/auth"
import { fail, ok, created } from "@/lib/api"
import {
  publicationInputSchema,
  parseSearchParams,
  type SearchQuery,
} from "@/lib/catalog"
import { normalizeIsbn } from "@/lib/isbn"
import { programarBarrido } from "@/lib/orders"

const estadoActivo = eq(publications.estado, "activa")

const facetsQuery = db
  .select({
    precioMin: sql<number>`coalesce(min(${publications.precio}), 0)::int`,
    precioMax: sql<number>`coalesce(max(${publications.precio}), 0)::int`,
  })
  .from(publications)
  .where(estadoActivo)

const categoriasQuery = db
  .select({ value: publications.categoria, total: count() })
  .from(publications)
  .where(estadoActivo)
  .groupBy(publications.categoria)
  .orderBy(desc(count()))

const condicionesQuery = db
  .select({ value: publications.condicion, total: count() })
  .from(publications)
  .where(estadoActivo)
  .groupBy(publications.condicion)
  .orderBy(desc(count()))

// La lista de autores va en orden alfabético y sin tope corto: hay decenas de
// nombres distintos y a quien busca un autor lo busca por nombre, no por
// popularidad. Un tope como el de comuna dejaría fuera a la mayoría.
const autoresQuery = db
  .select({ value: publications.autor, total: count() })
  .from(publications)
  .where(estadoActivo)
  .groupBy(publications.autor)
  .orderBy(asc(publications.autor))
  .limit(200)

const editorialesQuery = db
  .select({ value: publications.editorial, total: count() })
  .from(publications)
  .where(estadoActivo)
  .groupBy(publications.editorial)
  .orderBy(desc(count()), asc(publications.editorial))
  .limit(200)

const comunaActiva = and(estadoActivo, sql`${users.comuna} is not null`, sql`${users.comuna} <> ''`)

const comunasQuery = db
  .select({ value: users.comuna, total: count() })
  .from(publications)
  .innerJoin(users, eq(publications.vendedorId, users.id))
  .where(comunaActiva)
  .groupBy(users.comuna)
  .orderBy(desc(count()), asc(users.comuna))
  .limit(24)

function buildFilters(query: SearchQuery, sessionUserId?: string) {
  const filters = []

  if (query.vendedor) {
    filters.push(eq(publications.vendedorId, query.vendedor))
    if (!sessionUserId || sessionUserId !== query.vendedor) filters.push(estadoActivo)
  } else {
    filters.push(estadoActivo)
  }

  if (query.q) {
    const pattern = `%${query.q.replace(/[\\%_]/g, (match) => `\\${match}`)}%`
    filters.push(
      or(
        ilike(publications.titulo, pattern),
        ilike(publications.autor, pattern),
        ilike(publications.editorial, pattern),
        ilike(publications.isbn, pattern),
      ),
    )
  }

  if (query.categoria?.length) filters.push(inArray(publications.categoria, query.categoria))
  if (query.condicion?.length) filters.push(inArray(publications.condicion, query.condicion))
  if (query.comuna?.length) filters.push(inArray(users.comuna, query.comuna))
  if (query.autor) filters.push(ilike(publications.autor, `%${query.autor}%`))
  if (query.editorial) filters.push(ilike(publications.editorial, `%${query.editorial}%`))
  if (query.precioMin !== undefined) filters.push(gte(publications.precio, query.precioMin))
  if (query.precioMax !== undefined) filters.push(lte(publications.precio, query.precioMax))
  if (query.disponible === "true") filters.push(sql`${publications.stock} > 0`)

  return filters
}

const ordenColumns = {
  recientes: desc(publications.fechaPublicacion),
  precio_asc: asc(publications.precio),
  precio_desc: desc(publications.precio),
  titulo: asc(publications.titulo),
} as const

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    programarBarrido()
    const query = parseSearchParams(request.nextUrl.searchParams)
    const filters = buildFilters(query, session?.id)

    const [rows, [conteo], [facetas], categorias, condiciones, comunas, autores, editoriales, [activos]] =
      await Promise.all([
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
        .where(and(...filters))
        .orderBy(ordenColumns[query.orden])
        .limit(query.porPagina)
        .offset((query.pagina - 1) * query.porPagina),
      db
        .select({ total: count() })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(and(...filters)),
      facetsQuery,
      categoriasQuery,
      condicionesQuery,
      comunasQuery,
      autoresQuery,
      editorialesQuery,
      db.select({ total: count() }).from(publications).where(estadoActivo),
    ])

    return ok({
      publications: rows,
      facetas: {
        precioMin: facetas.precioMin,
        precioMax: facetas.precioMax,
        totalActivos: activos.total,
        categorias,
        condiciones,
        comunas,
        autores,
        editoriales,
      },
      paginacion: {
        pagina: query.pagina,
        porPagina: query.porPagina,
        total: conteo.total,
        paginas: Math.max(1, Math.ceil(conteo.total / query.porPagina)),
      },
    })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    const data = publicationInputSchema.parse(await request.json())

    const [inserted] = await db
      .insert(publications)
      .values({
        titulo: data.titulo,
        autor: data.autor,
        editorial: data.editorial,
        volumen: data.volumen ?? null,
        categoria: data.categoria,
        condicion: data.condicion,
        precio: data.precio,
        stock: data.stock,
        isbn: data.isbn ? normalizeIsbn(data.isbn) : null,
        descripcion: data.descripcion || null,
        fotos: data.fotos ?? [],
        estado: data.stock > 0 ? "activa" : "agotada",
        vendedorId: user.id,
      })
      .returning()

    return created({ publication: inserted })
  } catch (error) {
    return fail(error)
  }
}
