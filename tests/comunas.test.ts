import { test } from "node:test"
import assert from "node:assert/strict"

import { REGIONES } from "@/lib/catalog"
import { COMUNAS_POR_REGION, buscarComunas, regionDeComuna } from "@/lib/comunas"

test("el catálogo cubre las 16 regiones con las 346 comunas del país", () => {
  assert.deepEqual(Object.keys(COMUNAS_POR_REGION).sort(), [...REGIONES].sort())
  const total = REGIONES.reduce((suma, region) => suma + COMUNAS_POR_REGION[region].length, 0)
  assert.equal(total, 346)
  for (const region of REGIONES) assert.ok(COMUNAS_POR_REGION[region].length > 0, region)
})

test("ninguna comuna se repite entre regiones, así que siempre se sabe cuál es", () => {
  // La deduplicación es lo que permite deducir la región al escribir la comuna: si un
  // nombre se repitiera, el índice lo dejaría sin región en vez de elegir una al azar.
  for (const region of REGIONES) {
    for (const comuna of COMUNAS_POR_REGION[region]) {
      assert.equal(regionDeComuna(comuna), region, comuna)
    }
  }
})

test("buscarComunas filtra por lo escrito sin depender de tildes ni mayúsculas", () => {
  assert.deepEqual(buscarComunas("nunoa", "Región Metropolitana"), ["Ñuñoa"])
  assert.deepEqual(buscarComunas("VINA DEL MAR", "Región de Valparaíso"), ["Viña del Mar"])
  assert.deepEqual(buscarComunas("  tiltil  ", "Región Metropolitana"), ["Tiltil"])
})

test("con región elegida solo ofrece las comunas de esa región", () => {
  const resultado = buscarComunas("p", "Región Metropolitana")
  assert.ok(resultado.includes("Providencia"))
  // Mismo prefijo, otras regiones: la lista tiene que quedar filtrada.
  assert.ok(!resultado.includes("Punta Arenas"))
  assert.ok(!resultado.includes("Pozo Almonte"))
})

test("sin región no tira la lista entera del país, pero sí busca en ella", () => {
  // Con el campo vacío y sin región no hay nada que ofrecer: son 346 nombres de golpe.
  assert.deepEqual(buscarComunas("", null), [])
  assert.deepEqual(buscarComunas("   ", ""), [])
  // Escrito algo, sí se busca en todo el país, que es el caso de quien no elige región.
  assert.ok(buscarComunas("ñu", null).includes("Ñuñoa"))
})

test("con la región elegida y el campo vacío ofrece todas sus comunas para elegir a dedo", () => {
  assert.deepEqual(buscarComunas("", "Región de Arica y Parinacota"), [
    "Arica",
    "Camarones",
    "General Lagos",
    "Putre",
  ])
})

test("mientras se escribe limita las sugerencias y pone primero las que empiezan por eso", () => {
  assert.equal(buscarComunas("a", "Región Metropolitana", 3).length, 3)
  // "Alhué" es la única que empieza por "a"; el resto solo la contiene.
  assert.equal(buscarComunas("a", "Región Metropolitana")[0], "Alhué")
})

test("una comuna que no existe no rompe la búsqueda", () => {
  assert.deepEqual(buscarComunas("zzz", null), [])
  assert.deepEqual(buscarComunas("zzz", "Región de Tarapacá"), [])
})

test("regionDeComuna deduce la región de una comuna escrita a mano", () => {
  assert.equal(regionDeComuna("vina del mar"), "Región de Valparaíso")
  assert.equal(regionDeComuna("  PUDAHUEL "), "Región Metropolitana")
  assert.equal(regionDeComuna("Ollagüe"), "Región de Antofagasta")
  assert.equal(regionDeComuna("Paiguano"), "Región de Coquimbo")
})

test("regionDeComuna no adivina cuando no puede saberlo", () => {
  assert.equal(regionDeComuna("NoExiste"), null)
  assert.equal(regionDeComuna(""), null)
  assert.equal(regionDeComuna("   "), null)
  // Un nombre a medias no completa la región: "San Pedro de Atacama" es Antofagasta, pero
  // "San Pedro" también es una comuna de la Metropolitana y "San Pedro de la Paz" del
  // Biobío, así que solo el nombre completo resuelve.
  assert.equal(regionDeComuna("San Pedro de"), null)
})