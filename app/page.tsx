import { and, count, desc, eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { publications, users } from "@/db/schema"
import { LektorMarketplace } from "@/components/lektor-marketplace"
import type { Facetas, Paginacion, PublicacionListItem } from "@/lib/catalog"

export const dynamic = "force-dynamic"

const POR_PAGINA = 12
const estadoVisible = and(eq(publications.estado, "activa"), eq(users.activo, true))

export default async function HomePage() {
  const [filas, [facetasPrecios], [activos], categorias, condiciones, comunas, autores, editoriales] =
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
        .where(estadoVisible)
        .orderBy(desc(publications.fechaPublicacion))
        .limit(POR_PAGINA),
      db
        .select({
          precioMin: sql<number>`coalesce(min(${publications.precio}), 0)::int`,
          precioMax: sql<number>`coalesce(max(${publications.precio}), 0)::int`,
        })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(estadoVisible),
      db
        .select({ total: count() })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(estadoVisible),
      db
        .select({ value: publications.categoria, total: count() })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(estadoVisible)
        .groupBy(publications.categoria)
        .orderBy(desc(count())),
      db
        .select({ value: publications.condicion, total: count() })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(estadoVisible)
        .groupBy(publications.condicion)
        .orderBy(desc(count())),
      db
        .select({ value: users.comuna, total: count() })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(
          and(
            estadoVisible,
            sql`${users.comuna} is not null`,
            sql`${users.comuna} <> ''`,
          ),
        )
        .groupBy(users.comuna)
        .orderBy(desc(count()), users.comuna)
        .limit(24),
      db
        .select({ value: publications.autor, total: count() })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(estadoVisible)
        .groupBy(publications.autor)
        .orderBy(publications.autor)
        .limit(200),
      db
        .select({ value: publications.editorial, total: count() })
        .from(publications)
        .innerJoin(users, eq(publications.vendedorId, users.id))
        .where(estadoVisible)
        .groupBy(publications.editorial)
        .orderBy(desc(count()), publications.editorial)
        .limit(200),
    ])

  const initialPublications: PublicacionListItem[] = filas.map((fila) => ({
    ...fila,
    categoria: fila.categoria as PublicacionListItem["categoria"],
    condicion: fila.condicion as PublicacionListItem["condicion"],
    estado: fila.estado as PublicacionListItem["estado"],
    fotos: Array.isArray(fila.fotos) ? (fila.fotos as unknown[]).map(String) : [],
    fechaPublicacion: new Date(fila.fechaPublicacion).toISOString(),
  }))

  const facetas: Facetas = {
    precioMin: facetasPrecios.precioMin,
    precioMax: facetasPrecios.precioMax,
    totalActivos: activos.total,
    categorias: categorias as Facetas["categorias"],
    condiciones: condiciones as Facetas["condiciones"],
    comunas: comunas as Facetas["comunas"],
    autores: autores as Facetas["autores"],
    editoriales: editoriales as Facetas["editoriales"],
  }

  const paginacion: Paginacion = {
    pagina: 1,
    porPagina: POR_PAGINA,
    total: activos.total,
    paginas: Math.max(1, Math.ceil(activos.total / POR_PAGINA)),
  }

  return (
    <LektorMarketplace
      initialPublications={initialPublications}
      initialFacetas={facetas}
      initialPaginacion={paginacion}
    />
  )
}
