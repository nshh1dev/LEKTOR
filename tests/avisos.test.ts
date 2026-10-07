import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

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
    // Los que emiten las rutas de auth: `app/api/auth/{login,register,password}`.
    "email-exists",
    "inactive",
    "bad-credentials",
    "bad-password",
    "no-user",
  ]
  for (const motivo of conCopyPropio) {
    assert.ok(motivo in MOTIVO_FALLO, `falta copy propio para "${motivo}"`)
  }
})

test("el vocabulario no guarda motivos que el servidor ya no emite", () => {
  const retirados = [
    "sin-sesion",
    "sin-permiso",
    "sin-stock",
    // Se escribieron con otro nombre del que usan las rutas de auth.
    "email-duplicado",
    "cuenta-inactiva",
  ]
  for (const retirado of retirados) {
    assert.equal(retirado in MOTIVO_FALLO, false, `"${retirado}" quedó sin usar`)
  }
})

/**
 * Las rutas de auth escriben sus motivos a mano en `jsonError("motivo", ...)`.
 * Este guardián las lee del código para que ningún motivo nuevo llegue a la UI
 * sin copy: el síntoma es un `mensajeDeFallo` que cae al mensaje crudo del
 * servidor. `invalid` queda fuera a propósito: ahí el mensaje útil es el de Zod.
 */
test("ningún motivo que emiten las rutas de auth se queda sin copy", () => {
  const motivos = new Set<string>()
  const recorrer = (carpeta: string) => {
    for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
      const ruta = join(carpeta, entrada.name)
      if (entrada.isDirectory()) recorrer(ruta)
      else if (entrada.name === "route.ts") {
        const texto = readFileSync(ruta, "utf8")
        for (const coincidencia of texto.matchAll(/jsonError\(\s*"([a-z-]+)"/g)) {
          motivos.add(coincidencia[1])
        }
      }
    }
  }
  recorrer(join("app", "api", "auth"))

  // Si el patrón dejara de encontrar motivos, el test pasaría sin comprobar nada.
  assert.ok(motivos.size >= 6, `solo se leyeron ${motivos.size} motivos de auth: revisa el patrón`)
  const sinCopy = [...motivos].filter((motivo) => motivo !== "invalid" && !(motivo in MOTIVO_FALLO))
  assert.deepEqual(sinCopy, [], `motivos de auth sin copy propio: ${sinCopy.join(", ")}`)
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

test("api conserva la señal de cancelación de una consulta", async (t) => {
  const controller = new AbortController()
  t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.signal, controller.signal)
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    })
  })

  await api("/api/publications", { signal: controller.signal })
})
