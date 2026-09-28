/**
 * Formato de lo que la gente escribe en los formularios. Son funciones puras, sin
 * React ni base de datos, para poder probarlas con el runner de `tests/`.
 *
 * La idea es que el campo muestre el dato ya lindo mientras se tipea ($15.000,
 * +56 9 1234 5678) y que el esquema acepte ese texto tal cual: formatear para leer
 * nunca puede cambiar el número que se guarda.
 */

/** El peso chileno no usa decimales, así que el precio es un entero de miles. */
const MAX_DIGITOS_PRECIO = 9
const MAX_DIGITOS_TELEFONO = 15

/** "15000", "$15.000" y "15.000" son el mismo precio; "1.5" o "12.34" no lo son. */
const PRECIO_PLAINO = /^-?\d+$/
const PRECIO_AGRUPADO = /^\$?\d{1,3}(\.\d{3})*$/

export function digitosDe(valor: string): string {
  return valor.replace(/[^0-9]/g, "")
}

/** 15000 → $15.000. Se agrupa al escribir, con el signo peso siempre a la vista. */
export function formatearPrecio(valor: string): string {
  const digitos = digitosDe(valor).slice(0, MAX_DIGITOS_PRECIO)
  if (digitos.length === 0) return ""
  return `$${digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

/**
 * Da el número que hay detrás de lo escrito. Un campo vacío devuelve NaN para que
 * el esquema lo rechace: `z.coerce.number()` convierte `""` y `null` en 0, y
 * publicaría un ejemplar gratis. Un valor que no parece un precio (1.5, "abc")
 * también se rechaza en vez de convertirse a la fuerza.
 */
export function precioANumero(valor: unknown): unknown {
  if (typeof valor === "number") return valor
  if (typeof valor !== "string") return Number.NaN
  const plano = valor.replace(/\s/g, "").replace(/^\$/, "")
  if (plano.length === 0) return Number.NaN
  if (!PRECIO_PLAINO.test(plano) && !PRECIO_AGRUPADO.test(valor.replace(/\s/g, ""))) return Number.NaN
  return Number(plano.replace(/\./g, ""))
}

/** Agrupa los dígitos de un celular o fijo chileno, con o sin código de país. */
function formatearNacional(digitos: string): string {
  if (digitos.length === 9 && digitos.startsWith("9")) {
    return `${digitos.slice(0, 1)} ${digitos.slice(1, 5)} ${digitos.slice(5)}`
  }
  if (digitos.length === 8 && digitos.startsWith("2")) {
    return `${digitos.slice(0, 1)} ${digitos.slice(1, 4)} ${digitos.slice(4)}`
  }
  return digitos
}

/**
 * 912345678 → 9 1234 5678 y 56912345678 → +56 9 1234 5678. Solo agrupa lo que es
 * reconocible como chileno: un número extranjero se deja con sus dígitos intactos
 * en vez de inventarle un formato.
 */
export function formatearTelefono(valor: string): string {
  const digitos = digitosDe(valor).slice(0, MAX_DIGITOS_TELEFONO)
  if (digitos.length === 0) return ""

  if (digitos.startsWith("56") && digitos.length > 9) {
    return `+56 ${formatearNacional(digitos.slice(2))}`
  }
  return formatearNacional(digitos)
}
