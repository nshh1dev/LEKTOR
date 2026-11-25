import assert from "node:assert/strict"
import test from "node:test"
import { saludoDeInicio } from "../lib/auth-copy"

test("saludoDeInicio agrega un punto sin duplicarlo si el nombre ya tiene puntuación final", () => {
  assert.equal(
    saludoDeInicio("Marcela R."),
    "Hola de nuevo, Marcela R. Tu estantería te estaba esperando.",
  )
  assert.equal(
    saludoDeInicio("Lucía"),
    "Hola de nuevo, Lucía. Tu estantería te estaba esperando.",
  )
  assert.equal(
    saludoDeInicio("Equipo!"),
    "Hola de nuevo, Equipo. Tu estantería te estaba esperando.",
  )
})
