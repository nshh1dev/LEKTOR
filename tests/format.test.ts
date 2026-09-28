import { test } from "node:test"
import assert from "node:assert/strict"

import { ESTADOS_ORDEN, ESTADOS_PUBLICACION, METODOS_ENTREGA } from "@/lib/catalog"
import {
  ESTADO_ORDEN_BADGE,
  ESTADO_ORDEN_LABEL,
  ESTADO_PUBLICACION_LABEL,
  METODO_ENTREGA_LABEL,
  coverLabel,
  formatCLP,
  formatDate,
  formatDateTime,
  ordenCode,
  tiempoRestante,
  claveDiaSantiago,
} from "@/lib/format"

test("formatCLP formatea pesos sin decimales", () => {
  assert.match(formatCLP(19990), /19\.990/)
  assert.match(formatCLP(0), /0/)
  assert.doesNotMatch(formatCLP(19990), /[.,]\d{2}\b/)
})

test("formatDate y formatDateTime incluyen el año", () => {
  assert.match(formatDate("2026-06-15T12:00:00.000Z"), /2026/)
  assert.match(formatDate(new Date("2026-06-15T12:00:00.000Z")), /2026/)
  assert.match(formatDateTime("2026-06-15T12:00:00.000Z"), /2026/)
})

test("coverLabel usa las dos primeras palabras y recorta títulos largos", () => {
  assert.equal(coverLabel("Bola de Dracón: El inicio"), "BOLA DE")
  assert.equal(coverLabel("One Piece Vol. 1"), "ONE PIECE")
  assert.equal(coverLabel("Los investigates Salvajes"), "LOS")
  assert.equal(coverLabel("Cien años — soledad"), "CIEN AÑOS")
  assert.equal(coverLabel(""), "LEKTOR")
})

test("tiempoRestante formatea minutos, horas y días", () => {
  const desdeAhora = (ms: number) => new Date(Date.now() + ms).toISOString()
  assert.equal(tiempoRestante(desdeAhora(-1_000)), "expirada")
  assert.equal(tiempoRestante(desdeAhora(30 * 60_000)), "30 min")
  assert.equal(tiempoRestante(desdeAhora(2 * 3_600_000 + 5 * 60_000)), "2 h 5 min")
  assert.equal(tiempoRestante(desdeAhora(3_600_000)), "1 h")
  assert.equal(tiempoRestante(desdeAhora(30 * 3_600_000)), "1 día")
  assert.equal(tiempoRestante(desdeAhora(50 * 3_600_000)), "2 días")
})

test("ordenCode deriva un código legible del identificador", () => {
  assert.equal(ordenCode("590a83f0-a633-438f-922e-f621a8bec093"), "LK-590A83")
})

test("claveDiaSantiago usa el día local de Chile, no el de UTC", () => {
  // 03:30 UTC ya es la tarde anterior en Santiago (UTC-3/-4).
  assert.equal(claveDiaSantiago(new Date("2026-06-15T03:30:00.000Z")), "2026-06-14")
  assert.equal(claveDiaSantiago(new Date("2026-06-15T12:00:00.000Z")), "2026-06-15")
  assert.equal(claveDiaSantiago(new Date("2026-06-15T23:30:00.000Z")), "2026-06-15")
  assert.equal(claveDiaSantiago(new Date("2026-01-15T02:00:00.000Z")), "2026-01-14")
  assert.match(claveDiaSantiago(new Date()), /^\d{4}-\d{2}-\d{2}$/)
})

test("cada estado y método tiene etiqueta y estilo", () => {
  for (const estado of ESTADOS_ORDEN) {
    assert.ok(ESTADO_ORDEN_LABEL[estado], `falta etiqueta de ${estado}`)
    assert.ok(ESTADO_ORDEN_BADGE[estado], `falta badge de ${estado}`)
  }
  for (const estado of ESTADOS_PUBLICACION) {
    assert.ok(ESTADO_PUBLICACION_LABEL[estado], `falta etiqueta de ${estado}`)
  }
  for (const metodo of METODOS_ENTREGA) {
    assert.ok(METODO_ENTREGA_LABEL[metodo], `falta etiqueta de ${metodo}`)
  }
})
