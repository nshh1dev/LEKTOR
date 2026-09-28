import { test } from "node:test"
import assert from "node:assert/strict"

import { formatearPrecio, formatearTelefono, precioANumero } from "@/lib/entrada"

test("formatearPrecio agrupa los miles con signo peso", () => {
  assert.equal(formatearPrecio("15000"), "$15.000")
  assert.equal(formatearPrecio("1500"), "$1.500")
  assert.equal(formatearPrecio("999"), "$999")
  assert.equal(formatearPrecio("1000000"), "$1.000.000")
  assert.equal(formatearPrecio("$15.000"), "$15.000")
  assert.equal(formatearPrecio("15 000"), "$15.000")
})

test("formatearPrecio tolera el campo vacío y no inventa dígitos", () => {
  assert.equal(formatearPrecio(""), "")
  assert.equal(formatearPrecio("$"), "")
  assert.equal(formatearPrecio("   "), "")
  assert.equal(formatearPrecio("abc"), "")
})

test("formatearPrecio se puede escribir y borrar sin quedar pegado", () => {
  // El ciclo de teclear y backspace es el que rompe los formateadores ingenuos.
  assert.equal(formatearPrecio(formatearPrecio("15000").slice(0, -1)), "$1.500")
  assert.equal(formatearPrecio(formatearPrecio("15000").slice(0, -2)), "$150")
})

test("precioANumero entiende lo que la persona escribe", () => {
  assert.equal(precioANumero("15000"), 15000)
  assert.equal(precioANumero("15.000"), 15000)
  assert.equal(precioANumero("$15.000"), 15000)
  assert.equal(precioANumero(" 15.000 "), 15000)
  assert.equal(precioANumero("1.000.000"), 1000000)
  assert.equal(precioANumero(8000), 8000)
  assert.equal(precioANumero("-5"), -5)
})

test("precioANumero rechaza lo que no es un precio en vez de inventar un número", () => {
  // Un vacío tiene que fallar el esquema: coercionar a 0 publicaría a $0.
  assert.ok(Number.isNaN(precioANumero("") as number))
  assert.ok(Number.isNaN(precioANumero("   ") as number))
  assert.ok(Number.isNaN(precioANumero("abc") as number))
  assert.ok(Number.isNaN(precioANumero(null) as number))
  assert.ok(Number.isNaN(precioANumero(undefined) as number))
  // El punto solo sirve de separador de miles: "1.5" no son 15 pesos.
  assert.ok(Number.isNaN(precioANumero("1.5") as number))
  assert.ok(Number.isNaN(precioANumero("12.34") as number))
})

test("formatearTelefono agrupa el celular chileno", () => {
  assert.equal(formatearTelefono("912345678"), "9 1234 5678")
  assert.equal(formatearTelefono("+56912345678"), "+56 9 1234 5678")
  assert.equal(formatearTelefono("56912345678"), "+56 9 1234 5678")
  assert.equal(formatearTelefono("9 1234 5678"), "9 1234 5678")
})

test("formatearTelefono agrupa el fijo de Santiago", () => {
  assert.equal(formatearTelefono("22345678"), "2 234 5678")
  assert.equal(formatearTelefono("+5622345678"), "+56 2 234 5678")
})

test("formatearTelefono no inventa formato a un número extranjero", () => {
  assert.equal(formatearTelefono("14155552671"), "14155552671")
  assert.equal(formatearTelefono(""), "")
})

test("formatearTelefono aguanta teclear y borrar", () => {
  // Mientras no se llega a los nueve dígitos no se agrupa: un prefijo crudo es
  // preferible a inventarle un formato a un número que aún se está escribiendo.
  assert.equal(formatearTelefono("5"), "5")
  assert.equal(formatearTelefono("56"), "56")
  assert.equal(formatearTelefono("91234567"), "91234567")
  assert.equal(formatearTelefono(formatearTelefono("912345678").slice(0, -1)), "91234567")
})
