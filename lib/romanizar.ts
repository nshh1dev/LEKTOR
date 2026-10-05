import { consultarGoogleBooks } from "@/lib/google-books"

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

export async function buscarVersionLatina(isbn13: string): Promise<FichaLatina | null> {
  const ficha = await consultarGoogleBooks(isbn13)
  if (!ficha) return null
  return { titulo: ficha.titulo, autor: ficha.autor, editorial: ficha.editorial }
}
