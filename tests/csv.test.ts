import assert from "node:assert/strict"
import { test } from "node:test"
import { escaparCampoCSV, generarCSV } from "../lib/format"

test("escapa las comillas internas de un campo CSV", () => {
  assert.equal(escaparCampoCSV('Libro "Especial"'), '"Libro ""Especial"""')
})

test("conserva comas dentro de una celda", () => {
  assert.equal(escaparCampoCSV("Manga, edición especial"), '"Manga, edición especial"')
})

test("conserva saltos de línea dentro de una celda entrecomillada", () => {
  assert.equal(escaparCampoCSV("Tomo uno\nEdición revisada"), '"Tomo uno\nEdición revisada"')
})

test("genera filas CSV con CRLF y texto español", () => {
  assert.equal(generarCSV([["Publicación", "Total"], ["Cómic, edición n.º 2", 15000]]), '"Publicación","Total"\r\n"Cómic, edición n.º 2","15000"')
})
