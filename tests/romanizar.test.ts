import assert from "node:assert/strict"
import test from "node:test"
import { contieneNoLatino } from "../lib/romanizar"
import { urlGoogleBooks } from "../lib/google-books"

test("detecta escritura japonesa, coreana, china, cirílica y árabe", () => {
  assert.equal(contieneNoLatino("進撃の巨人"), true)
  assert.equal(contieneNoLatino("進撃のきょじん"), true)
  assert.equal(contieneNoLatino("왕년의 만화"), true)
  assert.equal(contieneNoLatino("斗罗大陆"), true)
  assert.equal(contieneNoLatino("Мастер и Маргарита"), true)
  assert.equal(contieneNoLatino("رواية عربية"), true)
})

test("no marca el texto latino, ni siquiera con tildes o eñes", () => {
  assert.equal(contieneNoLatino("Cien años de soledad"), false)
  assert.equal(contieneNoLatino("Viagem ao centro da Terra"), false)
  assert.equal(contieneNoLatino("Nausicaä of the Valley of the Wind"), false)
  assert.equal(contieneNoLatino(null), false)
  assert.equal(contieneNoLatino(""), false)
})

test("la URL de Google Books busca por ISBN en inglés", () => {
  const url = new URL(urlGoogleBooks("9784065127001"))
  assert.equal(url.searchParams.get("q"), "isbn:9784065127001")
  assert.equal(url.searchParams.get("langRestrict"), "en")
})
