import assert from "node:assert/strict"
import test from "node:test"
import { buscarPuntosRetiro, puntoRetiroPorId, PUNTOS_RETIRO, FUENTES_RETIRO } from "../lib/puntos-retiro"
import { COURIERS_RETIRO } from "../lib/couriers"
import { COMUNAS_POR_REGION } from "../lib/comunas"
import { datosDespachoSchema } from "../lib/catalog"

test("el catálogo conserva códigos únicos y ubicaciones canónicas, sin datos personales", () => {
  assert.equal(new Set(PUNTOS_RETIRO.map((p) => p.id)).size, PUNTOS_RETIRO.length)
  for (const p of PUNTOS_RETIRO) {
    assert.ok(p.nombre && p.direccion)
    assert.ok(COMUNAS_POR_REGION[p.region as keyof typeof COMUNAS_POR_REGION]?.includes(p.comuna))
    assert.deepEqual(Object.keys(p).sort(), ["id", "courier", "nombre", "direccion", "comuna", "region"].sort())
  }
  for (const courier of COURIERS_RETIRO) {
    const puntos = PUNTOS_RETIRO.filter((p) => p.courier === courier)
    assert.ok(puntos.length > 500)
    assert.equal(new Set(puntos.map((p) => p.region)).size, 16)
    const fuente = FUENTES_RETIRO.find((f) => f.courier === courier)!
    assert.equal(fuente.incluidos, puntos.length)
    assert.equal(fuente.incluidos + fuente.excluidos, fuente.recibidos)
    assert.ok(Number.isFinite(Date.parse(fuente.consultadoEn)))
  }
})

test("la búsqueda acota transportista, comuna y región y limita las respuestas", () => {
  const r = buscarPuntosRetiro({ courier: "blue_express", comuna: "PROVIDENCIA" })
  assert.ok(r.total > 0)
  assert.ok(r.puntos.every((p) => p.courier === "blue_express" && p.comuna === "Providencia"))
  assert.ok(buscarPuntosRetiro({ courier: "blue_express" }).puntos.length <= 30)
  assert.equal(buscarPuntosRetiro({ courier: "correos_chile" }).total, 0)
  assert.equal(buscarPuntosRetiro({ courier: "starken", q: "xyz-no-existe" }).total, 0)
  assert.equal(buscarPuntosRetiro({ courier: "starken", comuna: "Providencia", region: "Región de Tarapacá" }).total, 0)
})

test("un código de otro courier o inventado no puede resolver una sucursal", () => {
  const punto = PUNTOS_RETIRO[0]
  assert.equal(puntoRetiroPorId(punto.id, punto.courier), punto)
  assert.equal(puntoRetiroPorId(punto.id, "correos_chile"), null)
  assert.equal(puntoRetiroPorId("blue_express:inexistente", "blue_express"), null)
})

test("retiro exige selección del catálogo y rechaza CorreosChile", () => {
  const base = {
    nombreRecibe: "Camila R.", telefono: "+56 9 1234 5678", metodoEntrega: "retiro_punto",
    courier: "starken", direccion: null, comuna: "Providencia", region: "Región Metropolitana",
    puntoRetiro: "Sucursal seleccionada", puntoRetiroId: "starken:123",
  }
  assert.equal(datosDespachoSchema.safeParse(base).success, true)
  assert.equal(datosDespachoSchema.safeParse({ ...base, puntoRetiroId: null }).success, false)
  assert.equal(datosDespachoSchema.safeParse({ ...base, courier: "correos_chile" }).success, false)
})
