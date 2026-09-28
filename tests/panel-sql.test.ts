import { test } from "node:test"
import assert from "node:assert/strict"

import { PgDialect } from "drizzle-orm/pg-core"

import { orders } from "@/db/schema"
import { ZONA_HORARIA } from "@/lib/format"
import { ZONA_SQL, diaLocal, inicioDiaSantiago } from "@/lib/panel-sql"

const dialect = new PgDialect()

function compilar(fragmento: ReturnType<typeof inicioDiaSantiago>) {
  return dialect.sqlToQuery(fragmento)
}

test("la zona horaria viaja como literal, nunca como parámetro bind", () => {
  // Regresión: `AT TIME ZONE $1` es inválido en Postgres. Si la zona se envía como
  // parámetro, el SQL compila pero Postgres rechaza la consulta (o, peor, devuelve
  // una fecha distinta) sin que el test de integración lo note a tiempo.
  const { sql: texto, params } = compilar(inicioDiaSantiago())

  assert.ok(
    texto.includes(`at time zone '${ZONA_HORARIA}'`),
    `esperaba la zona literal en el SQL, recibí: ${texto}`,
  )
  assert.equal(
    params.filter((valor) => valor === ZONA_HORARIA).length,
    0,
    "la zona horaria no debe aparecer como parámetro bind",
  )
})

test("el literal de ZONA_SQL no necesita comillas añadidas", () => {
  // `sql.raw` inserta el texto tal cual, así que el valor debe traer las suyas.
  const chunk = ZONA_SQL.queryChunks[0] as { value: string[] }
  assert.deepEqual(chunk.value, [`'${ZONA_HORARIA}'`])
})

test("inicioDiaSantiago sin días devuelve la medianoche local", () => {
  const { sql: texto, params } = compilar(inicioDiaSantiago())

  // El doble `at time zone` es intencional: convierte el timestamp sin zona que
  // devuelve `date_trunc` de vuelta a timestamptz.
  assert.equal(
    texto,
    `date_trunc('day', now() at time zone '${ZONA_HORARIA}') at time zone '${ZONA_HORARIA}'`,
  )
  assert.deepEqual(params, [])
})

test("inicioDiaSantiago descuenta días con un parámetro numérico", () => {
  const { sql: texto, params } = compilar(inicioDiaSantiago(30))

  assert.ok(texto.includes("interval '1 day'"), `faltaba el intervalo en: ${texto}`)
  assert.deepEqual(params, [30])
})

test("diaLocal proyecta la columna real a la fecha local", () => {
  const { sql: texto, params } = compilar(diaLocal(orders.fechaCreacion))

  assert.ok(texto.includes(`at time zone '${ZONA_HORARIA}'`), `faltaba la zona en: ${texto}`)
  assert.ok(texto.includes("::date"), `faltaba el cast a date en: ${texto}`)
  assert.ok(texto.includes("fecha_creacion"), `faltaba la columna en: ${texto}`)
  assert.equal(
    params.filter((valor) => valor === ZONA_HORARIA).length,
    0,
    "la zona horaria no debe aparecer como parámetro bind",
  )
})
