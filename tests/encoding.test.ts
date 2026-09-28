import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"

const CARPETAS = ["app", "components", "lib", "db", "scripts", "tests"]
const EXTENSIONES = new Set([".ts", ".tsx", ".css", ".mjs", ".json", ".md"])

const MARCA_MOJIBAKE = /[\u00c2\u00c3][\u0080-\u00ff\u0192\u02c6\u02dc\u0152\u0153\u0160\u0161\u017d\u017e\u2013\u2014\u2018\u2019\u201c\u201d\u2020\u2021\u2022\u2026\u20ac\u2030\u2039\u203a\u2122]/
// "â€”", "â€¦", "â€œ": UTF-8 leido como CP1252 y guardado como UTF-8
const MARCA_JAQUETA = /\u00e2[\u0080-\u00ff\u20ac\u2013\u2014\u2018\u2019\u201c\u201d\u2122\u0152\u0153\u0160\u017d\u017e]/

function archivosDe(carpeta: string): string[] {
  const encontrados: string[] = []
  for (const entrada of readdirSync(carpeta, { withFileTypes: true })) {
    if (entrada.name === "node_modules" || entrada.name.startsWith(".")) continue
    const ruta = join(carpeta, entrada.name)
    if (ruta.endsWith("encoding.test.ts")) continue
    if (entrada.isDirectory()) encontrados.push(...archivosDe(ruta))
    else if (EXTENSIONES.has(extname(entrada.name))) encontrados.push(ruta)
  }
  return encontrados
}

test("ningún archivo del proyecto tiene texto con doble codificación", () => {
  const ofensores: string[] = []
  for (const carpeta of CARPETAS) {
    for (const archivo of archivosDe(carpeta)) {
      const texto = readFileSync(archivo, "utf8")
      texto.split(/\r?\n/).forEach((linea, indice) => {
        if (MARCA_MOJIBAKE.test(linea) || MARCA_JAQUETA.test(linea)) {
          ofensores.push(`${archivo}:${indice + 1} ${linea.trim().slice(0, 80)}`)
        }
      })
    }
  }
  assert.deepEqual(ofensores, [], `texto corrupto detectado:\n${ofensores.join("\n")}`)
})

test("ningún archivo del proyecto contiene el carácter de reemplazo", () => {
  const ofensores: string[] = []
  for (const carpeta of CARPETAS) {
    for (const archivo of archivosDe(carpeta)) {
      if (readFileSync(archivo, "utf8").includes("\ufffd")) ofensores.push(archivo)
    }
  }
  assert.deepEqual(ofensores, [])
})

test("el texto en español conserva los acentos esperados", () => {
  const mercado = [join("components", "lektor-marketplace.tsx"), ...archivosDe(join("components", "marketplace"))]
    .map((archivo) => readFileSync(archivo, "utf8"))
    .join("\n")
  for (const frase of [
    "Más recientes",
    "Título (A-Z)",
    "Sesión cerrada",
    "edición física",
    "completar la operación",
    "Sesión iniciada",
    "Volver al catálogo",
    "Confirmar recepción",
    "Encuentra tu próxima historia",
    "Cerrar sesión",
    "Ingresa un número",
    "Ejemplar físico",
    "Reserva válida",
    "Iniciar Sesión",
    "Correo electrónico",
    "Código de orden",
    "Dirección completa",
    "Teléfono de contacto",
    "Condición física",
    "Categoría",
    "quedó reservado por ti",
    "Confirmar recepción",
  ]) {
    assert.ok(mercado.includes(frase), `falta "${frase}" en el marketplace`)
  }

  const reportes = readFileSync(join("components", "panel", "reports-view.tsx"), "utf8")
  assert.ok(reportes.includes("Últimos 7 días"))
  assert.ok(reportes.includes("Órdenes recibidas"))
})
