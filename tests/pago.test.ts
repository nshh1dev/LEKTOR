import { test } from "node:test"
import assert from "node:assert/strict"

import {
  LARGO_TARJETA,
  detectarMarca,
  formatearCodigoSeguridad,
  formatearNumeroTarjeta,
  formatearVencimiento,
  luhnValido,
  soloDigitos,
  ultimosDigitos,
  vencimientoBienFormado,
  vencimientoEnVigencia,
} from "@/lib/pago"
import { pagoFormSchema } from "@/lib/catalog"

const TARJETA_VALIDA = "4111 1111 1111 1111"

test("el formateo agrupa el número en bloques de cuatro", () => {
  assert.equal(formatearNumeroTarjeta("4111111111111111"), TARJETA_VALIDA)
  assert.equal(formatearNumeroTarjeta("4111 1111 1111 1111"), TARJETA_VALIDA)
  assert.equal(formatearNumeroTarjeta("4111-1111-1111-1111"), TARJETA_VALIDA)
  assert.equal(formatearNumeroTarjeta("41111"), "4111 1")
  assert.equal(formatearNumeroTarjeta(""), "")
  assert.equal(formatearNumeroTarjeta("4111 1111 1111 1111 9999"), TARJETA_VALIDA)
  assert.equal(formatearNumeroTarjeta("abc"), "")
})

test("el vencimiento se completa con la barra al llegar a dos dígitos", () => {
  assert.equal(formatearVencimiento("1229"), "12/29")
  assert.equal(formatearVencimiento("12/29"), "12/29")
  assert.equal(formatearVencimiento("12"), "12")
  assert.equal(formatearVencimiento("1"), "1")
  assert.equal(formatearVencimiento("122025"), "12/20")
})

test("el código de seguridad se limita a cuatro dígitos", () => {
  assert.equal(formatearCodigoSeguridad("1a2b3"), "123")
  assert.equal(formatearCodigoSeguridad("12345"), "1234")
  assert.equal(formatearCodigoSeguridad("—"), "")
})

test("Luhn acepta números de prueba y rechaza los alterados", () => {
  assert.equal(luhnValido(TARJETA_VALIDA), true)
  assert.equal(luhnValido("5500005555555559"), true) // Mastercard de prueba
  assert.equal(luhnValido("378282246310005"), true) // American Express
  assert.equal(luhnValido("1234"), false)
  assert.equal(luhnValido("4111 1111 1111 1112"), false)
  assert.equal(luhnValido(""), false)
  assert.equal(luhnValido("abc"), false)
})

test("la marca se detecta por prefijo", () => {
  assert.equal(detectarMarca("4111111111111111"), "Visa")
  assert.equal(detectarMarca("5500005555555559"), "Mastercard")
  assert.equal(detectarMarca("2221000000000000"), "Mastercard")
  assert.equal(detectarMarca("378282246310005"), "American Express")
  assert.equal(detectarMarca("36227206271667"), "Diners Club")
  assert.equal(detectarMarca("9999999999999999"), null)
  assert.equal(detectarMarca("41"), null)
})

test("soloDigitos y ultimosDigitos limpian la entrada", () => {
  assert.equal(soloDigitos("4111-1111 1111/1111"), "4111111111111111")
  assert.equal(ultimosDigitos(TARJETA_VALIDA), "1111")
  assert.equal(ultimosDigitos("4111 1111 1111 0000", 4), "0000")
  assert.equal(ultimosDigitos("11", 4), "••11")
})

test("el vencimiento distingue formato, mes inválido y fecha pasada", () => {
  assert.equal(vencimientoBienFormado("12/29"), true)
  assert.equal(vencimientoBienFormado("12/2029"), true)
  assert.equal(vencimientoBienFormado("13/29"), false)
  assert.equal(vencimientoBienFormado("00/29"), false)
  assert.equal(vencimientoBienFormado("12/2"), false)
  assert.equal(vencimientoBienFormado(""), false)

  const ahora = new Date("2026-06-15T12:00:00Z")
  assert.equal(vencimientoEnVigencia("06/26", ahora), true, "vence a fin de mes")
  assert.equal(vencimientoEnVigencia("07/26", ahora), true)
  assert.equal(vencimientoEnVigencia("05/26", ahora), false, "el mes pasado ya no sirve")
  assert.equal(vencimientoEnVigencia("13/26", ahora), false)
})

test("pagoFormSchema acepta una tarjeta completa y formatea los campos", () => {
  const parsed = pagoFormSchema.parse({
    numeroTarjeta: "4111111111111111",
    nombreTitular: "  Ana Pérez  ",
    vencimiento: "1229",
    codigoSeguridad: "123",
  })
  assert.equal(parsed.numeroTarjeta, TARJETA_VALIDA)
  assert.equal(parsed.nombreTitular, "Ana Pérez")
  assert.equal(parsed.vencimiento, "12/29")
  assert.equal(parsed.codigoSeguridad, "123")
})

test("pagoFormSchema rechaza lo que no cumple el formato de la tarjeta", () => {
  const valido = {
    numeroTarjeta: TARJETA_VALIDA,
    nombreTitular: "Ana Pérez",
    vencimiento: "12/29",
    codigoSeguridad: "123",
  }
  const mensaje = (datos: Record<string, unknown>) => {
    const parsed = pagoFormSchema.safeParse(datos)
    assert.equal(parsed.success, false, `debería rechazar ${JSON.stringify(datos)}`)
    return parsed.error?.issues[0]?.message
  }

  assert.match(mensaje({ ...valido, numeroTarjeta: "4111 1111 1111" }) ?? "", /16 dígitos/)
  assert.match(mensaje({ ...valido, numeroTarjeta: "4111 1111 1111 1112" }) ?? "", /no es válido/)
  assert.match(mensaje({ ...valido, nombreTitular: "Ana" }) ?? "", /nombre del titular|tal como/)
  assert.match(mensaje({ ...valido, nombreTitular: "Ana4 Pérez" }) ?? "", /solo admite letras/)
  assert.match(mensaje({ ...valido, vencimiento: "13/29" }) ?? "", /MM\/AA/)
  assert.match(mensaje({ ...valido, vencimiento: "01/20" }) ?? "", /vencida/)
  assert.match(mensaje({ ...valido, codigoSeguridad: "12" }) ?? "", /3 o 4 dígitos/)

  for (const campo of Object.keys(valido)) {
    assert.equal(
      pagoFormSchema.safeParse({ ...valido, [campo]: "" }).success,
      false,
      `debería exigir ${campo}`,
    )
  }
})

test("el esquema no acepta más de 16 dígitos", () => {
  const numero = `411111111111111${LARGO_TARJETA - 15}`
  assert.equal(soloDigitos(formatearNumeroTarjeta(numero)).length, LARGO_TARJETA)
})
