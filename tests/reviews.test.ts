import { test } from "node:test"
import assert from "node:assert/strict"

import { distribucionDesde, reviewSchema, reviewUpdateSchema } from "@/lib/catalog"

test("la distribución sale de cinco a una estrella", () => {
  const filas = distribucionDesde([0, 0, 0, 0, 0])
  assert.deepEqual(
    filas.map((fila) => fila.puntaje),
    [5, 4, 3, 2, 1],
  )
})

test("sin reseñas todas las barras quedan en cero", () => {
  const filas = distribucionDesde([0, 0, 0, 0, 0])
  assert.equal(filas.length, 5)
  for (const fila of filas) {
    assert.equal(fila.cantidad, 0)
    assert.equal(fila.porcentaje, 0)
  }
})

test("una sola reseña de una estrella deja esa barra al cien", () => {
  const filas = distribucionDesde([1, 0, 0, 0, 0])
  const una = filas.find((fila) => fila.puntaje === 1)
  assert.equal(una?.cantidad, 1)
  assert.equal(una?.porcentaje, 100)
})

test("el conteo se reparte sobre el total de reseñas", () => {
  // El arreglo va de una a cinco estrellas: 2 de una, 1 de tres y 2 de cinco.
  const filas = distribucionDesde([2, 0, 1, 0, 2])
  const porPuntaje = new Map(filas.map((fila) => [fila.puntaje, fila.cantidad]))
  assert.equal(porPuntaje.get(1), 2)
  assert.equal(porPuntaje.get(2), 0)
  assert.equal(porPuntaje.get(3), 1)
  assert.equal(porPuntaje.get(5), 2)
  const una = filas.find((fila) => fila.puntaje === 1)
  assert.equal(una?.porcentaje, 40)
})

test("un conteo imposible no inventa reseñas ni rompe la barra", () => {
  const filas = distribucionDesde([-3, 0, 0, 0, 2])
  for (const fila of filas) {
    assert.ok(fila.cantidad >= 0)
    assert.ok(fila.porcentaje >= 0 && fila.porcentaje <= 100)
  }
  const una = filas.find((fila) => fila.puntaje === 1)
  const cinco = filas.find((fila) => fila.puntaje === 5)
  assert.equal(una?.cantidad, 0)
  assert.equal(cinco?.cantidad, 2)
  assert.equal(cinco?.porcentaje, 100)
})

test("un arreglo incompleto no rompe la distribución", () => {
  const filas = distribucionDesde([2])
  const uno = filas.find((fila) => fila.puntaje === 1)
  assert.equal(uno?.cantidad, 2)
  const cinco = filas.find((fila) => fila.puntaje === 5)
  assert.equal(cinco?.cantidad, 0)
})

test("una valoración válida pasa con su puntaje intacto", () => {
  const resultado = reviewSchema.parse({ puntaje: 4 })
  assert.equal(resultado.puntaje, 4)
})

test("el puntaje llega como número y no como texto", () => {
  assert.equal(reviewSchema.parse({ puntaje: 5 }).puntaje, 5)
  assert.equal(reviewSchema.safeParse({ puntaje: "5" }).success, false)
})

test("las estrellas se quedan entre una y cinco, sin decimales", () => {
  for (const puntaje of [0, 6, 2.5, -1]) {
    const resultado = reviewSchema.safeParse({ puntaje })
    assert.equal(resultado.success, false, `puntaje ${puntaje} debería rechazarse`)
  }
})

test("sin estrellas elegidas el formulario no avanza", () => {
  assert.equal(reviewSchema.safeParse({}).success, false)
})

test("el formulario acepta valorar una orden concreta en la compra recibida", () => {
  const ordenId = "9b6d1f5a-0000-4000-8000-000000000001"
  const resultado = reviewSchema.parse({ puntaje: 4, orderId: ordenId })
  assert.equal(resultado.puntaje, 4)
  assert.equal(resultado.orderId, ordenId)
})

test("el orderId que no parece un id se rechaza", () => {
  assert.equal(reviewSchema.safeParse({ puntaje: 4, orderId: "no-es-un-uuid" }).success, false)
})

test("el formulario ignora campos que ya no existen en la valoración", () => {
  const resultado = reviewSchema.safeParse({ puntaje: 3, comentario: "texto suelto" })
  assert.equal(resultado.success, true)
  assert.equal("comentario" in (resultado.data ?? {}), false)
})

test("editar acepta cambiar solo las estrellas", () => {
  assert.equal(reviewUpdateSchema.safeParse({ puntaje: 2 }).success, true)
})

test("editar sin cambios se rechaza en vez de tocar la base", () => {
  const resultado = reviewUpdateSchema.safeParse({})
  assert.equal(resultado.success, false)
})