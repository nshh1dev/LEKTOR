import { test } from "node:test"
import assert from "node:assert/strict"

import { limiteExcedido, olvidar, rateLimit } from "@/lib/rate-limit-store"

const VENTANA_CINCO_MIN = { limite: 3, ventanaMs: 5 * 60_000 }

test("la ventana fija cuenta hasta el límite y luego bloquea", (t) => {
  t.mock.timers.enable({ apis: ["Date"] })
  const clave = "login:test-contable"

  const primero = rateLimit(clave, VENTANA_CINCO_MIN)
  assert.deepEqual(primero, { permitido: true, restantes: 2, reintentarEnSegundos: 0 })
  assert.equal(rateLimit(clave, VENTANA_CINCO_MIN).restantes, 1)

  const tercero = rateLimit(clave, VENTANA_CINCO_MIN)
  assert.equal(tercero.permitido, true)
  assert.equal(tercero.restantes, 0)

  const cuarto = rateLimit(clave, VENTANA_CINCO_MIN)
  assert.equal(cuarto.permitido, false)
  assert.equal(cuarto.restantes, 0)
  assert.equal(cuarto.reintentarEnSegundos, 300)
})

test("las claves son independientes", (t) => {
  t.mock.timers.enable({ apis: ["Date"] })
  const limite = { limite: 1, ventanaMs: 60_000 }
  assert.equal(rateLimit("login:a", limite).permitido, true)
  assert.equal(rateLimit("login:a", limite).permitido, false)
  assert.equal(rateLimit("login:b", limite).permitido, true)
})

test("olvidar reinicia el contador (tras un acceso correcto)", (t) => {
  t.mock.timers.enable({ apis: ["Date"] })
  const clave = "login:se-resetea"
  const limite = { limite: 2, ventanaMs: 60_000 }
  rateLimit(clave, limite)
  rateLimit(clave, limite)
  assert.equal(rateLimit(clave, limite).permitido, false)
  olvidar(clave)
  assert.equal(rateLimit(clave, limite).permitido, true)
})

test("la ventana expira y vuelve a admitir intentos", (t) => {
  t.mock.timers.enable({ apis: ["Date"] })
  const clave = "login:expira"
  const limite = { limite: 1, ventanaMs: 60_000 }
  assert.equal(rateLimit(clave, limite).permitido, true)
  t.mock.timers.tick(30_000)
  assert.equal(rateLimit(clave, limite).permitido, false)
  assert.equal(rateLimit(clave, limite).reintentarEnSegundos, 30)
  t.mock.timers.tick(31_000)
  assert.equal(rateLimit(clave, limite).permitido, true)
})

test("limiteExcedido responde 429 con Retry-After y mensaje en minutos", () => {
  const respuesta = limiteExcedido(300)
  assert.equal(respuesta.status, 429)
  assert.equal(respuesta.reason, "rate-limit")
  assert.equal(respuesta.headers["Retry-After"], "300")
  assert.equal(respuesta.mensaje, "Demasiados intentos. Intenta nuevamente en 5 min.")

  const unMinuto = limiteExcedido(60)
  assert.equal(unMinuto.mensaje, "Demasiados intentos. Intenta nuevamente en 60 s.")
  assert.equal(limiteExcedido(90).mensaje, "Demasiados intentos. Intenta nuevamente en 2 min.")

  const segundos = limiteExcedido(12)
  assert.equal(segundos.mensaje, "Demasiados intentos. Intenta nuevamente en 12 s.")
  assert.equal(segundos.headers["Retry-After"], "12")
  assert.equal(limiteExcedido(0).headers["Retry-After"], "1")
})
