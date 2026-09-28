import { test } from "node:test"
import assert from "node:assert/strict"

import { formatIsbn, isValidIsbn, normalizeIsbn, toIsbn13 } from "@/lib/isbn"

test("normalizeIsbn quita guiones, espacios y sube la X", () => {
  assert.equal(normalizeIsbn("978-0-306-40615-7"), "9780306406157")
  assert.equal(normalizeIsbn(" 0-306-40615-2 "), "0306406152")
  assert.equal(normalizeIsbn("84-8008-4475-x"), "8480084475X")
  assert.equal(normalizeIsbn(""), "")
})

test("isValidIsbn acepta ISBN-10 e ISBN-13 válidos", () => {
  assert.equal(isValidIsbn("0-306-40615-2"), true)
  assert.equal(isValidIsbn("978-0-306-40615-7"), true)
  assert.equal(isValidIsbn("84-8008-447-2"), true)
  assert.equal(isValidIsbn("0-8044-2957-x"), true)
})

test("isValidIsbn rechaza dígitos de control incorrectos y longitudes inválidas", () => {
  assert.equal(isValidIsbn("0-306-40615-3"), false)
  assert.equal(isValidIsbn("978-0-306-40615-8"), false)
  assert.equal(isValidIsbn("9780306406"), false)
  assert.equal(isValidIsbn(""), false)
  assert.equal(isValidIsbn("abcdefghij"), false)
})

test("toIsbn13 convierte ISBN-10 y respeta el ISBN-13", () => {
  assert.equal(toIsbn13("0-306-40615-2"), "9780306406157")
  assert.equal(toIsbn13("84-8008-447-2"), "9788480084475")
  assert.equal(toIsbn13("978-0-306-40615-7"), "9780306406157")
  assert.equal(toIsbn13("9780306406158"), null)
  assert.equal(toIsbn13(""), null)
})

test("formatIsbn agrupa según el largo", () => {
  assert.equal(formatIsbn("9780306406157"), "978-0-3064-0615-7")
  assert.equal(formatIsbn("0306406152"), "0-3064-0615-2")
  assert.equal(formatIsbn("no-es-isbn"), "no-es-isbn")
})

test("formatIsbn agrupa también mientras se escribe", () => {
  // El prefijo 978/979 decide el formato, así un ISBN-13 a medio escribir no
  // aparece con los cortes de un ISBN-10.
  assert.equal(formatIsbn("9"), "9")
  assert.equal(formatIsbn("978"), "978")
  assert.equal(formatIsbn("9780"), "978-0")
  assert.equal(formatIsbn("97803"), "978-0-3")
  assert.equal(formatIsbn("97803064"), "978-0-3064")
  assert.equal(formatIsbn("978030640615"), "978-0-3064-0615")
  assert.equal(formatIsbn("9780306406157"), "978-0-3064-0615-7")
  // Escribir y borrar deja el mismo valor, sin guiones pegados.
  assert.equal(formatIsbn(formatIsbn("9780306406157").slice(0, -1)), "978-0-3064-0615")
  assert.equal(formatIsbn("0"), "0")
  assert.equal(formatIsbn("0306"), "0-306")
})
