const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
const TIMEOUT_MS = 5000

export type FichaLibro = {
  titulo: string | null
  autor: string | null
  editorial: string | null
  anio: number | null
  paginas: number | null
  portadaUrl: string | null
}

export function urlGoogleBooks(isbn13: string): string {
  const params = new URLSearchParams({ q: `isbn:${isbn13}`, langRestrict: "en", maxResults: "1" })
  return `${GOOGLE_BOOKS_URL}?${params.toString()}`
}

function anioDe(fecha: string | undefined): number | null {
  if (!fecha) return null
  const anio = Number(fecha.slice(0, 4))
  return Number.isFinite(anio) && anio >= 1400 && anio <= new Date().getFullYear() + 1 ? anio : null
}

export async function consultarGoogleBooks(isbn13: string): Promise<FichaLibro | null> {
  try {
    const response = await fetch(urlGoogleBooks(isbn13), {
      headers: { Accept: "application/json", "User-Agent": "LEKTOR/1.0 (marketplace de libros)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return null

    const payload = (await response.json()) as {
      items?: Array<{
        volumeInfo?: {
          title?: string
          authors?: string[]
          publisher?: string
          publishedDate?: string
          pageCount?: number
          imageLinks?: { thumbnail?: string }
        }
      }>
    }
    const info = payload.items?.[0]?.volumeInfo
    if (!info || !info.title) return null

    const portada = info.imageLinks?.thumbnail?.replace(/^http:/, "https:") ?? null

    return {
      titulo: info.title.slice(0, 255),
      autor: info.authors?.slice(0, 3).join(", ").slice(0, 200) ?? null,
      editorial: info.publisher?.slice(0, 200) ?? null,
      anio: anioDe(info.publishedDate),
      paginas: typeof info.pageCount === "number" && info.pageCount > 0 ? info.pageCount : null,
      portadaUrl: portada,
    }
  } catch {
    return null
  }
}
