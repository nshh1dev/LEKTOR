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

export function formatIsbn(raw: string): string {
  const value = normalizeIsbn(raw)
  if (value.length === 13) return `${value.slice(0, 3)}-${value.slice(3, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12)}`
  if (value.length === 10) return `${value.slice(0, 1)}-${value.slice(1, 5)}-${value.slice(5, 9)}-${value.slice(9)}`
  return raw.trim()
}
