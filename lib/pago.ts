/**
 * Dominio de la pasarela de pago: formato, detección de marca y vigencia de una
 * tarjeta. Son funciones puras, sin React ni base de datos, para poder probarlas
 * con el runner de `tests/`.
 */

export const LARGO_TARJETA = 16
export const LARGO_CODIGO_SEGURIDAD = 4

export const MARCAS_TARJETA = ["Visa", "Mastercard", "American Express", "Diners Club"] as const

export type MarcaTarjeta = (typeof MARCAS_TARJETA)[number]

export function soloDigitos(valor: string): string {
  return valor.replace(/[^0-9]/g, "")
}

/** Agrupa en bloques de cuatro mientras se escribe: 4111… → 4111 1111 1111 1111. */
export function formatearNumeroTarjeta(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, LARGO_TARJETA)
  return digitos.replace(/(.{4})/g, "$1 ").trim()
}

/** Inserta la barra al pasar de dos dígitos: 1229 → 12/29. */
export function formatearVencimiento(valor: string): string {
  const digitos = soloDigitos(valor).slice(0, 4)
  if (digitos.length <= 2) return digitos
  return `${digitos.slice(0, 2)}/${digitos.slice(2)}`
}

export function formatearCodigoSeguridad(valor: string): string {
  return soloDigitos(valor).slice(0, LARGO_CODIGO_SEGURIDAD)
}

/** Solo los últimos cuatro dígitos, para mostrar la tarjeta enmascarada. */
export function ultimosDigitos(valor: string, cantidad = 4): string {
  const digitos = soloDigitos(valor)
  return digitos.slice(-cantidad).padStart(cantidad, "•")
}

/**
 * Algoritmo de Luhn: duplica cada segundo dígito desde la derecha y suma. Da true
 * solo si el resultado es múltiplo de diez.
 */
export function luhnValido(numero: string): boolean {
  const digitos = soloDigitos(numero)
  if (digitos.length < 13) return false
  let suma = 0
  let duplicar = false
  for (let indice = digitos.length - 1; indice >= 0; indice -= 1) {
    let digito = Number(digitos.charAt(indice))
    if (duplicar) {
      digito *= 2
      if (digito > 9) digito -= 9
    }
    suma += digito
    duplicar = !duplicar
  }
  return suma % 10 === 0
}

export function detectarMarca(numero: string): MarcaTarjeta | null {
  const digitos = soloDigitos(numero)
  if (digitos.length < 4) return null
  if (digitos.startsWith("4")) return "Visa"
  if (/^5[1-5]/.test(digitos)) return "Mastercard"
  if (/^2[2-7]/.test(digitos)) return "Mastercard"
  if (/^3[47]/.test(digitos)) return "American Express"
  if (/^3[0689]/.test(digitos)) return "Diners Club"
  return null
}

/** Acepta MM/AA o MM/AAAA con un mes real. No mira si la tarjeta ya venció. */
export function vencimientoBienFormado(valor: string): boolean {
  const digitos = soloDigitos(valor)
  if (digitos.length !== 4 && digitos.length !== 6) return false
  const mes = Number(digitos.slice(0, 2))
  return mes >= 1 && mes <= 12
}

/** La tarjeta sigue vigente hasta el último día del mes que indica. */
export function vencimientoEnVigencia(valor: string, ahora: Date = new Date()): boolean {
  if (!vencimientoBienFormado(valor)) return false
  const digitos = soloDigitos(valor)
  const mes = Number(digitos.slice(0, 2))
  const anio =
    digitos.length === 4
      ? 2000 + Number(digitos.slice(2))
      : Number(digitos.slice(2))
  // `mes` es 1-12 y el mes de `Date.UTC` es 0-based: el índice `mes` ya es el
  // primer día del mes siguiente, es decir, el instante en que expira.
  const expira = new Date(Date.UTC(anio, mes, 1))
  return expira.getTime() > ahora.getTime()
}
