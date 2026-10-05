import { test } from "node:test"
import assert from "node:assert/strict"

import { REGIONES } from "@/lib/catalog"
import { COMUNAS_POR_REGION, gruposComunas, regionDeComuna } from "@/lib/comunas"

test("el catálogo cubre las 16 regiones con las 346 comunas del país", () => {
  assert.deepEqual(Object.keys(COMUNAS_POR_REGION).sort(), [...REGIONES].sort())
  const total = REGIONES.reduce((suma, region) => suma + COMUNAS_POR_REGION[region].length, 0)
  assert.equal(total, 346)
  for (const region of REGIONES) assert.ok(COMUNAS_POR_REGION[region].length > 0, region)
})

test("ninguna comuna se repite entre regiones, así que siempre se sabe cuál es", () => {
  // La deduplicación es lo que permite deducir la región al elegir o escribir la comuna: si
  // un nombre se repitiera, el índice lo dejaría sin región en vez de elegir una al azar.
  for (const region of REGIONES) {
    for (const comuna of COMUNAS_POR_REGION[region]) {
      assert.equal(regionDeComuna(comuna), region, comuna)
    }
  }
})

test("el índice muestra todas las comunas del país separadas por región", () => {
  const grupos = gruposComunas("", null)
  assert.deepEqual(grupos.map((grupo) => grupo.region), [...REGIONES])
  const total = grupos.reduce((suma, grupo) => suma + grupo.comunas.length, 0)
  assert.equal(total, 346)
})

test("la región elegida acota el índice a sus propias comunas", () => {
  // Con la región ya decidida la lista es la de esa región: de 21 a 58 comunas, no las 346
  // del país, que obligaban a recorrer el país entero para llegar a la que se busca.
  const grupos = gruposComunas("", "Región del Ñuble")
  assert.equal(grupos.length, 1)
  assert.equal(grupos[0].region, "Región del Ñuble")
  assert.deepEqual(grupos[0].comunas, [...COMUNAS_POR_REGION["Región del Ñuble"]])
  assert.ok(grupos[0].comunas.includes("Chillán"))
  // Sin región elegida el índice es el del país entero, en el orden del catálogo.
  assert.equal(gruposComunas("", null)[0].region, REGIONES[0])
  assert.equal(gruposComunas("", "Región que no existe").length, 16)
})

test("escribir filtra por el texto sin depender de tildes ni mayúsculas", () => {
  assert.deepEqual(gruposComunas("NUNOA", null), [
    { region: "Región Metropolitana", comunas: ["Ñuñoa"] },
  ])
  assert.deepEqual(gruposComunas("vina del mar", null), [
    { region: "Región de Valparaíso", comunas: ["Viña del Mar"] },
  ])
})

test("los bloques que se quedan sin coincidencias no aparecen", () => {
  assert.deepEqual(gruposComunas("ñuble", null), [])
  assert.deepEqual(gruposComunas("NoExiste", "Región de Tarapacá"), [])
})

test("con región elegida, el índice no propone comunas de otras regiones", () => {
  // Con la región ya decidida la lista es una sola: si lo escrito no está en ella, la lista
  // queda vacía en vez de llenarse de bloques de otras regiones, y quien decide el cambio es
  // la persona, no el índice.
  assert.deepEqual(gruposComunas("Valparaíso", "Región Metropolitana"), [])
  assert.deepEqual(gruposComunas("lan", "Región del Libertador General Bernardo O'Higgins"), [])
  // Y si sí está en la región elegida, aparece solo esa.
  assert.deepEqual(gruposComunas("Maipú", "Región Metropolitana"), [
    { region: "Región Metropolitana", comunas: ["Maipú"] },
  ])
})

test("mientras se escribe recorta el total y pone primero lo que empieza por lo escrito", () => {
  const conTres = gruposComunas("a", null, 3)
  assert.equal(
    conTres.reduce((suma, grupo) => suma + grupo.comunas.length, 0),
    3,
  )
  // "Alhué" es la única comuna de la Metropolitana que empieza por "a"; el resto solo la
  // contiene, así que tiene que quedar detrás aunque se alfabetice antes.
  const Metropolitana = gruposComunas("a", "Región Metropolitana")
  assert.equal(Metropolitana[0].region, "Región Metropolitana")
  assert.equal(Metropolitana[0].comunas[0], "Alhué")
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