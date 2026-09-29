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
  assert.equal(formatearTelefono("+14155552671"), "14155552671")
  assert.equal(formatearTelefono("+442071234567"), "442071234567")
  assert.equal(formatearTelefono(""), "")
})

test("formatearTelefono no deja crecer un número que no existe", () => {
  // Un celular chileno son nueve dígitos: con el 56 no pasa de once.
  assert.equal(formatearTelefono("+569123213123213"), "+56 9 1232 1312")
  assert.equal(formatearTelefono("9123213123213"), "9 1232 1312")
  assert.equal(formatearTelefono("22345678999"), "2 234 5678")
  // E.164 tops at fifteen digits, the sign plus included.
  assert.equal(formatearTelefono("+1234567890123456789"), "123456789012345")
})

test("formatearTelefono agrupa también mientras se escribe", () => {
  assert.equal(formatearTelefono("91234"), "9 1234")
  assert.equal(formatearTelefono("912345"), "9 1234 5")
  assert.equal(formatearTelefono("2234"), "2 234")
  assert.equal(formatearTelefono("56912"), "+56 9 12")
})

test("formatearTelefono aguanta teclear y borrar", () => {
  // El ciclo de teclear y backspace es el que rompe los formateadores ingenuos.
  assert.equal(formatearTelefono("5"), "5")
  assert.equal(formatearTelefono("56"), "56")
  assert.equal(formatearTelefono("9 123"), "9 123")
  assert.equal(formatearTelefono(formatearTelefono("912345678").slice(0, -1)), "9 1234 567")
  assert.equal(formatearTelefono(formatearTelefono("+56912345678").slice(0, -1)), "+56 9 1234 567")
})
