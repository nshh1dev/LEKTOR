import assert from "node:assert/strict"
import test from "node:test"
import { urlTraduccion } from "../lib/traducir"

test("la URL apunta al español y conserva el texto a traducir", () => {
  const url = new URL(urlTraduccion("The Hobbit"))
  assert.equal(url.searchParams.get("tl"), "es")
  assert.equal(url.searchParams.get("sl"), "auto")
  assert.equal(url.searchParams.get("q"), "The Hobbit")
  assert.equal(url.searchParams.get("client"), "gtx")
})

test("el texto con espacios y tildes viaja bien codificado", () => {
  const url = new URL(urlTraduccion("Cien años de soledad: edición revisada"))
  assert.equal(url.searchParams.get("q"), "Cien años de soledad: edición revisada")
})
