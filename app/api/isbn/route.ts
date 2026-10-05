import { eq } from "drizzle-orm"
import { db } from "@/db"
import { bookMetadata } from "@/db/schema"
import { ApiError, requireSession } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"
import { isValidIsbn, normalizeIsbn, toIsbn13 } from "@/lib/isbn"
import { clientIp, limiteExcedido, rateLimit } from "@/lib/rate-limit"
import { buscarVersionLatina, contieneNoLatino } from "@/lib/romanizar"
import { consultarGoogleBooks } from "@/lib/google-books"

const CACHE_DIAS = 30
const OPEN_LIBRARY_URL = "https://openlibrary.org/search.json"
const PORTADA_BASE = "https://covers.openlibrary.org/b/id"

type OpenLibraryDoc = {
  title?: string
  author_name?: string[]
  publisher?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  cover_i?: number
}

type Ficha = {
  titulo: string | null
  autor: string | null
  editorial: string | null
  anio: number | null
  paginas: number | null
  portadaUrl: string | null
}

function anioValido(anio: number | undefined): number | null {
  if (typeof anio !== "number" || !Number.isFinite(anio)) return null
  return anio >= 1400 && anio <= new Date().getFullYear() + 1 ? anio : null
}

async function consultarOpenLibrary(isbn13: string): Promise<Ficha | null> {
  const campos = "title,author_name,publisher,first_publish_year,number_of_pages_median,cover_i"
  const url = `${OPEN_LIBRARY_URL}?isbn=${isbn13}&fields=${campos}&limit=1`
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "LEKTOR/1.0 (marketplace de libros)" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  })
  if (!response.ok) {
    throw new ApiError(502, "openlibrary", "Open Library no respondió correctamente: intenta de nuevo")
  }

  const payload = (await response.json()) as { docs?: OpenLibraryDoc[] }
  const doc = payload.docs?.[0]
  if (!doc) return null

  return {
    titulo: doc.title?.slice(0, 255) ?? null,
    autor: doc.author_name?.slice(0, 3).join(", ").slice(0, 200) ?? null,
    editorial: doc.publisher?.[0]?.slice(0, 200) ?? null,
    anio: anioValido(doc.first_publish_year),
    paginas: typeof doc.number_of_pages_median === "number" ? doc.number_of_pages_median : null,
    portadaUrl: typeof doc.cover_i === "number" ? `${PORTADA_BASE}/${doc.cover_i}-L.jpg` : null,
  }
}

export async function GET(request: Request) {
  try {
    // Consultar Open Library consume un recurso externo, así que se exige sesión
    // y se limita por IP para que nadie la use como proxy.
    await requireSession()
    const ip = await clientIp()
    const limite = rateLimit(`isbn:${ip}`, { limite: 30, ventanaMs: 5 * 60 * 1000 })
    if (!limite.permitido) {
      const excedido = limiteExcedido(limite.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }

    const raw = new URL(request.url).searchParams.get("isbn") ?? ""
    const normalized = normalizeIsbn(raw)

    if (!isValidIsbn(normalized)) {
      throw new ApiError(400, "isbn-invalido", "El ISBN no es válido: revisa el dígito verificador")
    }

    const isbn = toIsbn13(normalized)
    if (!isbn) throw new ApiError(400, "isbn-invalido", "No se pudo normalizar el ISBN")

    const [cached] = await db
      .select()
      .from(bookMetadata)
      .where(eq(bookMetadata.isbn, isbn))
      .limit(1)

    // Cada campo que siga con escritura no latina se lista explícitamente.
    const camposNoLatinos = (b: { titulo: string | null; autor: string | null; editorial: string | null }) => {
      const faltantes: string[] = []
      if (contieneNoLatino(b.titulo)) faltantes.push("titulo")
      if (contieneNoLatino(b.autor)) faltantes.push("autor")
      if (contieneNoLatino(b.editorial)) faltantes.push("editorial")
      return faltantes
    }

    const cacheVigente =
      cached && Date.now() - cached.consultadoEn.getTime() < CACHE_DIAS * 86_400_000
    if (cacheVigente && cached.titulo) {
      return ok({
        libro: { ...cached, isbn, fuente: "cache" as const, sinTraducir: camposNoLatinos(cached) },
      })
    }

    const desdeOpenLibrary = await consultarOpenLibrary(isbn)
    const book = desdeOpenLibrary ?? (await consultarGoogleBooks(isbn))
    if (!book) {
      throw new ApiError(
        404,
        "sin-datos",
        "Ni Open Library ni Google Books tienen datos para este ISBN: completa la ficha a mano",
      )
    }
    const fuente: "openlibrary" | "google-books" = desdeOpenLibrary ? "openlibrary" : "google-books"

    // Si algún campo viene en una escritura no latina (japonés, chino, coreano,
    // cirílico, árabe...), se intenta traer la versión en alfabeto latino.
    const necesitaVersionLatina = [book.titulo, book.autor, book.editorial].some((campo) =>
      contieneNoLatino(campo),
    )
    if (necesitaVersionLatina) {
      const latina = await buscarVersionLatina(isbn)
      if (latina) {
        if (contieneNoLatino(book.titulo) && latina.titulo) book.titulo = latina.titulo
        if (contieneNoLatino(book.autor) && latina.autor) book.autor = latina.autor
        if (contieneNoLatino(book.editorial) && latina.editorial) book.editorial = latina.editorial
      }
    }
    const sinTraducir = camposNoLatinos(book)

    const registro = { ...book, isbn, consultadoEn: new Date() }

    await db
      .insert(bookMetadata)
      .values(registro)
      .onConflictDoUpdate({ target: bookMetadata.isbn, set: registro })

    return ok({ libro: { ...registro, fuente, sinTraducir } })
  } catch (error) {
    return fail(error)
  }
}
