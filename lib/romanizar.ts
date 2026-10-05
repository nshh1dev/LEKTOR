const GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
const TIMEOUT_MS = 5000

// Rangos de escrituras distintas al alfabeto latino: kana y kanji, hangul, cirílico, árabe, hebreo.
const NO_LATINO = /[぀-ヿ㐀-䶿一-鿿가-힯Ѐ-ӿ؀-ۿ֐-׿]/

export function contieneNoLatino(texto: string | null | undefined): boolean {
  return typeof texto === "string" && NO_LATINO.test(texto)
}

export type FichaLatina = {
  titulo: string | null
  autor: string | null
  editorial: string | null
}

export function urlGoogleBooks(isbn13: string): string {
  const params = new URLSearchParams({ q: `isbn:${isbn13}`, langRestrict: "en", maxResults: "1" })
  return `${GOOGLE_BOOKS_URL}?${params.toString()}`
}

export async function buscarVersionLatina(isbn13: string): Promise<FichaLatina | null> {
  try {
    const response = await fetch(urlGoogleBooks(isbn13), {
      headers: { Accept: "application/json", "User-Agent": "LEKTOR/1.0 (marketplace de libros)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return null

    const payload = (await response.json()) as {
      items?: Array<{ volumeInfo?: { title?: string; authors?: string[]; publisher?: string } }>
    }
    const info = payload.items?.[0]?.volumeInfo
    if (!info) return null

    return {
      titulo: info.title?.slice(0, 255) ?? null,
      autor: info.authors?.slice(0, 3).join(", ").slice(0, 200) ?? null,
      editorial: info.publisher?.slice(0, 200) ?? null,
    }
  } catch {
    return null
  }
}
