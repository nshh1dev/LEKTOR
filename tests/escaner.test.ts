import { test } from "node:test"
import assert from "node:assert/strict"
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from "@zxing/library"
import { errorDeCamara, isbnDeCodigo } from "@/lib/escaner"
import { argumentosDeDesarrollo } from "@/lib/desarrollo"

test("el escáner acepta ISBN-13 con prefijo de libro y dígito de control correcto", () => {
  assert.equal(isbnDeCodigo("9780306406157"), "9780306406157")
  assert.equal(isbnDeCodigo("978-0-306-40615-7"), "9780306406157")
  assert.equal(isbnDeCodigo("9791090636071"), "9791090636071")
})

test("el escáner ignora otros productos, lecturas parciales, QR e ISBN inválidos", () => {
  for (const codigo of ["4006381333931", "9780306406158", "0306406152", "978030", "", "https://lektor.cl/9780306406157"]) {
    assert.equal(isbnDeCodigo(codigo), null, codigo)
  }
})

test("ZXing reconoce un código de barras EAN-13 de libro sin BarcodeDetector", () => {
  const barras = [
    "00000000000", "101",
    "0111011", "0001001", "0100111", "0111101", "0100111", "0101111",
    "01010",
    "1011100", "1110010", "1010000", "1100110", "1001110", "1000100",
    "101", "00000000000",
  ].join("")
  const ancho = barras.length * 3
  const alto = 120
  const pixeles = new Uint8ClampedArray(ancho * alto)
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      pixeles[y * ancho + x] = barras[Math.floor(x / 3)] === "1" ? 0 : 255
    }
  }
  const lector = new MultiFormatReader()
  lector.setHints(new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]]]))
  const imagen = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(pixeles, ancho, alto)))
  const resultado = lector.decode(imagen)
  assert.equal(resultado.getBarcodeFormat(), BarcodeFormat.EAN_13)
  assert.equal(isbnDeCodigo(resultado.getText()), "9780306406157")
})

test("los errores de cámara distinguen permisos, dispositivo y cámara ocupada", () => {
  assert.match(errorDeCamara({ name: "NotAllowedError" }), /Permite el acceso/)
  assert.match(errorDeCamara({ name: "SecurityError" }), /Permite el acceso/)
  assert.match(errorDeCamara({ name: "NotFoundError" }), /No encontramos/)
  assert.match(errorDeCamara({ name: "OverconstrainedError" }), /No encontramos/)
  assert.match(errorDeCamara({ name: "NotReadableError" }), /ocupada/)
  assert.match(errorDeCamara({ name: "AbortError" }), /ocupada/)
  assert.match(errorDeCamara(null), /Vuelve a intentarlo/)
  assert.match(errorDeCamara(new Error("fallo")), /Vuelve a intentarlo/)
})

test("desarrollo usa Webpack por defecto y permite elegir Turbopack explícitamente", () => {
  assert.deepEqual(argumentosDeDesarrollo([], false), ["dev", "--webpack"])
  assert.deepEqual(argumentosDeDesarrollo(["--", "--port", "3001"], false), ["dev", "--webpack", "--port", "3001"])
  assert.deepEqual(argumentosDeDesarrollo(["--turbopack"], false), ["dev", "--turbopack"])
  assert.deepEqual(argumentosDeDesarrollo(["--webpack"], false), ["dev", "--webpack"])
})

test("desarrollo reutiliza el certificado confiable sin generar uno autofirmado nuevo", () => {
  assert.deepEqual(argumentosDeDesarrollo([], true), [
    "dev", "--webpack", "--experimental-https",
    "--experimental-https-key", ".certificates/localhost-key.pem",
    "--experimental-https-cert", ".certificates/localhost.pem",
  ])
})
