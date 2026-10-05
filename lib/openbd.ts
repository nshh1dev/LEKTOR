import type { FichaLibro } from "@/lib/google-books"

const OPENBD_URL = "https://api.openbd.jp/v1/get"
const TIMEOUT_MS = 5000

export function urlOpenBd(isbn13: string): string {
  return `${OPENBD_URL}?isbn=${encodeURIComponent(isbn13)}`
}

export async function consultarOpenBd(isbn13: string): Promise<FichaLibro | null> {
  try {
    const response = await fetch(urlOpenBd(isbn13), {
      headers: { Accept: "application/json", "User-Agent": "LEKTOR/1.0 (marketplace de libros)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return null

    const payload = (await response.json()) as Array<{
      summary?: { title?: string; author?: string; publisher?: string; cover?: string; pubdate?: string }
    } | null>
    const summary = payload?.[0]?.summary
    if (!summary || !summary.title) return null

    const anio = summary.pubdate && /^\d{4}/.test(summary.pubdate) ? Number(summary.pubdate.slice(0, 4)) : null

    return {
      titulo: summary.title.slice(0, 255),
      autor: summary.author ? summary.author.slice(0, 200) : null,
      editorial: summary.publisher ? summary.publisher.slice(0, 200) : null,
      anio: anio && anio >= 1400 && anio <= new Date().getFullYear() + 1 ? anio : null,
      paginas: null,
      portadaUrl: summary.cover && summary.cover.length > 0 ? summary.cover : null,
    }
  } catch {
    return null
  }
}
