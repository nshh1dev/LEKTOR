import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PuntoRetiroInput } from "../components/marketplace/punto-retiro-input"

const props = {
  courier: "starken" as const,
  comuna: "Providencia",
  region: "Región Metropolitana",
  invalid: false,
  onSeleccionar: () => {},
  onLimpiar: () => {},
}

test("el punto elegido aparece en el campo sin botón adicional ni resultados", () => {
  const html = renderToStaticMarkup(createElement(PuntoRetiroInput, {
    ...props, seleccionado: "Sucursal Centro · Avenida 123",
  }))
  assert.match(html, /value="Sucursal Centro · Avenida 123"/)
  assert.match(html, /readOnly=""/i)
  assert.doesNotMatch(html, /Cambiar punto/)
  assert.match(html, /Pulsa el campo para elegir otro/)
  assert.doesNotMatch(html, /Buscando puntos|puntos encontrados|Puntos de retiro disponibles/)
})

test("sin selección el campo permite buscar y no ofrece cambiar punto", () => {
  const html = renderToStaticMarkup(createElement(PuntoRetiroInput, { ...props, seleccionado: "" }))
  assert.match(html, /value=""/)
  assert.match(html, /Buscar por nombre o dirección/)
  assert.doesNotMatch(html, /readOnly|Cambiar punto/i)
})
