import { test } from "node:test"
import assert from "node:assert/strict"

import { MOTIVO_FALLO, mensajeDeFallo } from "@/lib/avisos"
import { ApiFailure, api } from "@/components/marketplace/api"

const RESPALDO = "Revisa tu conexión e inténtalo otra vez."

test("con un motivo conocido gana el copy del motivo, no el del servidor", () => {
  const fallo = { reason: "stock-insuficiente", message: "No quedan ejemplares disponibles" }
  assert.equal(mensajeDeFallo(fallo, RESPALDO), MOTIVO_FALLO["stock-insuficiente"])
})

test("con un motivo desconocido cae al mensaje del servidor", () => {
  const fallo = { reason: "isbn-invalido", message: "El ISBN no es válido" }
  assert.equal(mensajeDeFallo(fallo, RESPALDO), "El ISBN no es válido")
})

test("sin motivo ni mensaje útil devuelve el respaldo", () => {
  assert.equal(mensajeDeFallo({ reason: 42, message: "   " }, RESPALDO), RESPALDO)
  assert.equal(mensajeDeFallo(null, RESPALDO), RESPALDO)
  assert.equal(mensajeDeFallo("texto suelto", RESPALDO), RESPALDO)
  assert.equal(mensajeDeFallo(undefined, RESPALDO), RESPALDO)
})

test("un motivo vacío no pisa el mensaje del servidor", () => {
  assert.equal(mensajeDeFallo({ reason: "", message: "Algo falló" }, RESPALDO), "Algo falló")
})

test("el vocabulario cubre los motivos que el servidor emite", () => {
  const conCopyPropio = [
    "no-session",
    "forbidden",
    "stock-insuficiente",
    "not-found",
    "rate-limit",
    "orden-activa",
    "ultimo-admin",
    "mismo-usuario",
    "email-duplicado",
    "cuenta-inactiva",
  ]
  for (const motivo of conCopyPropio) {
    assert.ok(motivo in MOTIVO_FALLO, `falta copy propio para "${motivo}"`)
  }
})

test("el vocabulario no guarda motivos que el servidor ya no emite", () => {
  for (const retirado of ["sin-sesion", "sin-permiso", "sin-stock"]) {
    assert.equal(retirado in MOTIVO_FALLO, false, `"${retirado}" quedó sin usar`)
  }
})

test("api propaga el motivo del servidor hasta el aviso", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response(
      JSON.stringify({ error: "No quedan ejemplares disponibles", reason: "stock-insuficiente" }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    ),
  )

  await assert.rejects(
    () => api("/api/orders", { method: "POST", body: "{}" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiFailure)
      assert.equal(error.reason, "stock-insuficiente")
      assert.equal(mensajeDeFallo(error, RESPALDO), MOTIVO_FALLO["stock-insuficiente"])
      return true
    },
  )
})

test("api también lleva los errores de campo de validación", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response(
      JSON.stringify({
        error: "Revisa los datos del formulario",
        fields: { email: ["Email no válido"] },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    ),
  )

  await assert.rejects(
    () => api("/api/auth/register", { method: "POST", body: "{}" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiFailure)
      assert.deepEqual(error.campos, { email: ["Email no válido"] })
      assert.equal(error.reason, undefined)
      return true
    },
  )
})

test("sin cuerpo JSON la llamada igual falla con el respaldo", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("", { status: 500 }))

  await assert.rejects(
    () => api("/api/publications"),
    (error: unknown) => {
      assert.ok(error instanceof ApiFailure)
      assert.equal(error.message, "No se pudo completar la operación")
      return true
    },
  )
})
