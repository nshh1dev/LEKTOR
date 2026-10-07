import assert from "node:assert/strict"
import { test } from "node:test"
import { destinatarioCambioOrden } from "../lib/order-notifications"

const participantes = { compradorId: "comprador", vendedorId: "vendedor" }

test("la cancelación del comprador avisa al vendedor, no a quien cancela", () => {
  assert.equal(destinatarioCambioOrden({ ...participantes, actorId: "comprador", siguiente: "cancelada" }), "vendedor")
})

test("la cancelación del vendedor avisa al comprador", () => {
  assert.equal(destinatarioCambioOrden({ ...participantes, actorId: "vendedor", siguiente: "cancelada" }), "comprador")
})

test("preparación y despacho conservan el aviso al comprador", () => {
  for (const siguiente of ["en_preparacion", "despachada"] as const) {
    assert.equal(destinatarioCambioOrden({ ...participantes, actorId: "vendedor", siguiente }), "comprador")
  }
})

test("la recepción avisa al vendedor", () => {
  assert.equal(destinatarioCambioOrden({ ...participantes, actorId: "comprador", siguiente: "recibida" }), "vendedor")
})

test("la intervención administrativa conserva los destinatarios existentes", () => {
  for (const siguiente of ["en_preparacion", "despachada", "cancelada"] as const) {
    assert.equal(destinatarioCambioOrden({ ...participantes, actorId: "administrador-externo", siguiente }), "comprador")
  }
  assert.equal(destinatarioCambioOrden({ ...participantes, actorId: "administrador-externo", siguiente: "recibida" }), "vendedor")
})
