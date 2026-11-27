import assert from "node:assert/strict"
import test from "node:test"
import { checkoutFormSchema, cuerpoDeOrden, datosDespachoSchema, orderCreateSchema } from "../lib/catalog"
import { COURIERS, DATOS_COURIER } from "../lib/couriers"

const despacho = {
  nombreRecibe: "Camila R.",
  telefono: "+56 9 1234 5678",
  metodoEntrega: "envio_domicilio" as const,
  courier: "blue_express" as const,
  direccion: "Avenida Providencia 123",
  comuna: "Providencia",
  region: "Región Metropolitana",
  puntoRetiro: "",
}

test("domicilio y retiro exigen un courier permitido en formulario y API", () => {
  for (const metodoEntrega of ["envio_domicilio", "retiro_punto"] as const) {
    const datos = { ...despacho, metodoEntrega, puntoRetiro: "Sucursal Centro, Avenida 123" }
    assert.equal(checkoutFormSchema.safeParse(datos).success, true)
    assert.equal(checkoutFormSchema.safeParse({ ...datos, courier: "" }).success, false)
    assert.equal(datosDespachoSchema.safeParse({ ...datos, courier: null }).success, false)
    assert.equal(datosDespachoSchema.safeParse({ ...datos, courier: undefined }).success, false)
    assert.equal(datosDespachoSchema.safeParse({ ...datos, courier: "inventado" }).success, false)
    for (const courier of COURIERS) {
      assert.equal(datosDespachoSchema.safeParse({ ...datos, courier }).success, true)
    }
  }
})

test("cuerpoDeOrden cumple el contrato y limpia datos que no corresponden al método", () => {
  for (const metodoEntrega of ["envio_domicilio", "retiro_punto", "coordinar"] as const) {
    const body = cuerpoDeOrden("f0000000-0000-4000-8000-000000000001", {
      ...despacho, metodoEntrega, puntoRetiro: "Sucursal Centro, Avenida 123",
    })
    assert.equal(orderCreateSchema.safeParse(body).success, true)
    if (metodoEntrega === "coordinar") {
      assert.equal(body.datosDespacho.courier, null)
      assert.equal(body.datosDespacho.direccion, null)
      assert.equal(body.datosDespacho.puntoRetiro, null)
    }
    if (metodoEntrega === "envio_domicilio") assert.equal(body.datosDespacho.puntoRetiro, null)
    if (metodoEntrega === "retiro_punto") assert.equal(body.datosDespacho.direccion, null)
  }
  assert.equal(checkoutFormSchema.safeParse({ ...despacho, metodoEntrega: "coordinar", courier: "" }).success, true)
  const coordinada = datosDespachoSchema.parse({ ...despacho, metodoEntrega: "coordinar" })
  assert.equal(coordinada.courier, null)
  assert.equal(coordinada.direccion, null)
  assert.equal(coordinada.puntoRetiro, null)
})

test("cada transportista tiene nombre y enlace HTTPS al buscador oficial", () => {
  for (const courier of COURIERS) {
    assert.ok(DATOS_COURIER[courier].nombre)
    assert.equal(new URL(DATOS_COURIER[courier].sucursales).protocol, "https:")
  }
})
