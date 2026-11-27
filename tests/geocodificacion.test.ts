import { test } from "node:test"
import assert from "node:assert/strict"

import { MAX_SUGERENCIAS, normalizarSugerencias, urlPhoton } from "@/lib/geocodificacion"

type Props = Record<string, unknown>

function photon(...props: Props[]) {
  return { features: props.map((properties) => ({ properties })) }
}

const CASA_PROVIDENCIA = {
  osm_type: "W",
  osm_id: 1,
  type: "house",
  street: "Avenida Providencia",
  housenumber: "1234",
  city: "Santiago",
  district: "Providencia",
  state: "Región Metropolitana de Santiago",
  countrycode: "CL",
}

const CALLE_NUNOA = {
  osm_type: "W",
  osm_id: 2,
  type: "house",
  street: "Los Alerces",
  housenumber: "2210",
  city: "Santiago",
  district: "Ñuñoa",
  state: "Región Metropolitana de Santiago",
  countrycode: "CL",
}

const CALLE_RANCAGUA = {
  osm_type: "W",
  osm_id: 3,
  type: "street",
  name: "Calle del Estado",
  district: "Rancagua Sur",
  city: "Rancagua",
  state: "Región del Libertador General Bernardo O'Higgins",
  countrycode: "CL",
}

const CASA_SANTIAGO_CENTRO = {
  osm_type: "N",
  osm_id: 4,
  type: "house",
  street: "Ahumada",
  housenumber: "100",
  city: "Santiago",
  state: "Región Metropolitana de Santiago",
  countrycode: "CL",
}

test("la consulta a Photon se acota a Chile y no pide idioma", () => {
  // Photon solo acepta default, de, en y fr: `lang=es` responde 400.
  const url = urlPhoton("Avenida Providencia 1234")
  assert.ok(!url.includes("lang="))
  const params = new URL(url).searchParams
  assert.equal(params.get("q"), "Avenida Providencia 1234, Chile")
  assert.ok(Number(params.get("limit")) > MAX_SUGERENCIAS)
})

test("la consulta a Photon lleva la comuna —o la región— para priorizar ese lugar", () => {
  const conComuna = new URL(
    urlPhoton("Avenida Providencia 1234", { comuna: "Providencia", region: "Región Metropolitana" }),
  ).searchParams
  assert.equal(conComuna.get("q"), "Avenida Providencia 1234, Providencia, Chile")
  const soloRegion = new URL(
    urlPhoton("Avenida Providencia 1234", { region: "Región de Tarapacá" }),
  ).searchParams
  assert.equal(soloRegion.get("q"), "Avenida Providencia 1234, Región de Tarapacá, Chile")
})

test("una casa de Providencia se traduce a calle, número, comuna y región", () => {
  const [sugerencia] = normalizarSugerencias(photon(CASA_PROVIDENCIA))
  assert.deepEqual(sugerencia, {
    id: "W-1-0",
    etiqueta: "Avenida Providencia 1234 · Providencia, Región Metropolitana",
    direccion: "Avenida Providencia 1234",
    calle: "Avenida Providencia",
    numero: "1234",
    comuna: "Providencia",
    region: "Región Metropolitana",
  })
})

test("cuando la ciudad es Santiago, la comuna sale del distrito", () => {
  const [sugerencia] = normalizarSugerencias(photon(CALLE_NUNOA))
  assert.equal(sugerencia.comuna, "Ñuñoa")
  assert.equal(sugerencia.region, "Región Metropolitana")
  assert.equal(sugerencia.calle, "Los Alerces")
})

test("una calle sin número sigue sirviendo como sugerencia", () => {
  const [sugerencia] = normalizarSugerencias(photon(CALLE_RANCAGUA))
  assert.equal(sugerencia.etiqueta, "Calle del Estado · Rancagua, Región del Libertador General Bernardo O'Higgins")
  assert.equal(sugerencia.direccion, "Calle del Estado")
  assert.equal(sugerencia.numero, null)
  assert.equal(sugerencia.comuna, "Rancagua")
})

test("descarta lo que no es una dirección de Chile", () => {
  const sugerencias = normalizarSugerencias(
    photon(
      { ...CASA_PROVIDENCIA, countrycode: "AR" },
      { ...CASA_PROVIDENCIA, type: "city" },
      { ...CASA_PROVIDENCIA, street: "", name: "", housenumber: undefined },
    ),
  )
  assert.deepEqual(sugerencias, [])
})

test("quita las repeticiones que trae el proveedor", () => {
  const sugerencias = normalizarSugerencias(
    photon(CASA_PROVIDENCIA, { ...CASA_PROVIDENCIA, osm_id: 30 }, { ...CASA_PROVIDENCIA, osm_id: 31 }),
  )
  assert.equal(sugerencias.length, 1)
})

test("con región elegida se deja solo esa región", () => {
  const sugerencias = normalizarSugerencias(photon(CASA_PROVIDENCIA, CALLE_RANCAGUA), {
    region: "Región del Libertador General Bernardo O'Higgins",
  })
  assert.deepEqual(sugerencias.map((s) => s.comuna), ["Rancagua"])
})

test("si la región elegida no tiene coincidencias, la lista queda vacía", () => {
  const sugerencias = normalizarSugerencias(photon(CASA_PROVIDENCIA, CALLE_RANCAGUA), {
    region: "Región de Tarapacá",
  })
  assert.deepEqual(sugerencias, [])
})

test("una región que no está en el catálogo no acota nada", () => {
  const sugerencias = normalizarSugerencias(photon(CASA_PROVIDENCIA, CALLE_RANCAGUA), {
    region: "Región que no existe",
  })
  assert.equal(sugerencias.length, 2)
})

test("con comuna elegida se descarta otra comuna de la misma región", () => {
  const sugerencias = normalizarSugerencias(photon(CASA_PROVIDENCIA, CALLE_NUNOA), {
    region: "Región Metropolitana",
    comuna: "Ñuñoa",
  })
  assert.deepEqual(sugerencias.map((s) => s.comuna), ["Ñuñoa"])
  assert.deepEqual(
    normalizarSugerencias(photon(CASA_PROVIDENCIA, CALLE_NUNOA), { comuna: "Providencia" }).map(
      (s) => s.comuna,
    ),
    ["Providencia"],
  )
})

test("si la región guardada no es la de la comuna, manda la comuna", () => {
  const sugerencias = normalizarSugerencias(photon(CASA_PROVIDENCIA), {
    region: "Región de Tarapacá",
    comuna: "Providencia",
  })
  assert.equal(sugerencias.length, 1)
})

test("el centro de Santiago se compara contra la comuna del catálogo", () => {
  // OpenStreetMap dice «Santiago» y el catálogo «Santiago Centro»; sin equivalencia la
  // sugerencia quedaba sin región y se colaba en el filtro.
  const [sugerencia] = normalizarSugerencias(photon(CASA_SANTIAGO_CENTRO), {
    comuna: "Santiago Centro",
  })
  assert.equal(sugerencia.comuna, "Santiago Centro")
  assert.equal(sugerencia.region, "Región Metropolitana")
  assert.equal(sugerencia.etiqueta, "Ahumada 100 · Santiago Centro, Región Metropolitana")
})

test("nunca devuelve más sugerencias que el tope", () => {
  const muchas = Array.from({ length: 12 }, (_, indice) => ({
    ...CASA_PROVIDENCIA,
    osm_id: 100 + indice,
    street: `Calle ${indice}`,
  }))
  assert.equal(normalizarSugerencias(photon(...muchas)).length, MAX_SUGERENCIAS)
})

test("una respuesta rota no rompe el campo", () => {
  assert.deepEqual(normalizarSugerencias(null), [])
  assert.deepEqual(normalizarSugerencias({ features: "nada" }), [])
  assert.deepEqual(normalizarSugerencias(photon()), [])
})
