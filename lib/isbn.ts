export function normalizeIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "").toUpperCase()
}

function isValidIsbn10(value: string): boolean {
  if (value.length !== 10) return false
  let sum = 0
  for (let i = 0; i < 10; i += 1) {
    const char = value[i]
    const digit = char === "X" ? 10 : Number(char)
    if (Number.isNaN(digit)) return false
    sum += digit * (10 - i)
  }
  return sum % 11 === 0
}

function isValidIsbn13(value: string): boolean {
  if (value.length !== 13) return false
  let sum = 0
  for (let i = 0; i < 13; i += 1) {
    const digit = Number(value[i])
    if (Number.isNaN(digit)) return false
    sum += digit * (i % 2 === 0 ? 1 : 3)
  }
  return sum % 10 === 0
}

export function isValidIsbn(raw: string): boolean {
  const value = normalizeIsbn(raw)
  return isValidIsbn10(value) || isValidIsbn13(value)
}

export function toIsbn13(raw: string): string | null {
  const value = normalizeIsbn(raw)
  if (isValidIsbn13(value)) return value
  if (!isValidIsbn10(value)) return null
  const core = `978${value.slice(0, 9)}`
  let sum = 0
  for (let i = 0; i < 12; i += 1) {
    sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3)
  }
  const check = (10 - (sum % 10)) % 10
  return `${core}${check}`
}

/**
 * Agrupa el ISBN con guiones. Sirve tanto para mostrar uno completo como para
 * formatear mientras se escribe: los cortes de un ISBN-13 son 3-1-4-4-1 y los de
 * un ISBN-10 son 1-4-4-1. Se decide por el prefijo 978/979, que es el de todo
 * ISBN-13, para que un número a medio escribir ya salga con sus guiones.
 */
export function formatIsbn(raw: string): string {
  const value = normalizeIsbn(raw)
  if (value.length === 0) return raw.trim()

  const esTrece = value.length === 13 || value.length > 10 || value.startsWith("978") || value.startsWith("979")
  const cortes = esTrece ? [3, 4, 8, 12] : [1, 5, 9]

  let salida = ""
  let cursor = 0
  for (const corte of cortes) {
    if (cursor >= value.length) break
    const trozo = value.slice(cursor, corte)
    if (trozo.length === 0) break
    salida += (salida.length > 0 ? "-" : "") + trozo
    cursor = corte
  }
  if (cursor < value.length) salida += (salida.length > 0 ? "-" : "") + value.slice(cursor)
  return salida
}
