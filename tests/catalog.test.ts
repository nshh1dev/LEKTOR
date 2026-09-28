import { test } from "node:test"
import assert from "node:assert/strict"

import {
  COSTO_ENVIO_DOMICILIO,
  RESERVA_HORAS,
  chatMessageSchema,
  datosDespachoSchema,
  listaFotosAUrls,
  panelMovimientoSchema,
  panelUsuarioUpdateSchema,
  parseSearchParams,
  passwordChangeSchema,
  profileUpdateSchema,
  publicationInputSchema,
  searchQuerySchema,
  envioSegunMetodo,
  estadoSegunStock,
  registroSchema,
  transicionValida,
} from "@/lib/catalog"

test("la máquina de estados respeta las transiciones del dominio", () => {
  assert.equal(transicionValida("reservada", "en_preparacion"), true)
  assert.equal(transicionValida("reservada", "despachada"), true)
  assert.equal(transicionValida("reservada", "cancelada"), true)
  assert.equal(transicionValida("reservada", "recibida"), false)
  assert.equal(transicionValida("en_preparacion", "despachada"), true)
  assert.equal(transicionValida("en_preparacion", "recibida"), false)
  assert.equal(transicionValida("despachada", "recibida"), true)
  assert.equal(transicionValida("recibida", "cancelada"), false)
  assert.equal(transicionValida("cancelada", "reservada"), false)
  assert.equal(transicionValida("inventada" as never, "reservada"), false)
})

test("el costo de envío depende del método de entrega", () => {
  assert.equal(envioSegunMetodo("envio_domicilio"), COSTO_ENVIO_DOMICILIO)
  assert.equal(envioSegunMetodo("retiro_punto"), 0)
  assert.equal(envioSegunMetodo("coordinar"), 0)
  assert.equal(RESERVA_HORAS, 48)
})

test("listaFotosAUrls limpia y limita a seis fotos", () => {
  assert.deepEqual(listaFotosAUrls(" https://a.cl/1.jpg , ,https://a.cl/2.jpg "), [
    "https://a.cl/1.jpg",
    "https://a.cl/2.jpg",
  ])
  assert.deepEqual(listaFotosAUrls(""), [])
  assert.equal(listaFotosAUrls("1,2,3,4,5,6,7,8").length, 6)
})

test("publicationInputSchema valida el anuncio", () => {
  const valido = {
    titulo: "Chainsaw Man Vol. 1",
    autor: "Tatsuki Fujimoto",
    editorial: "Shueisha",
    volumen: 1,
    categoria: "Mangas",
    condicion: "Como nuevo",
    precio: 19990,
    stock: 2,
    isbn: "9780306406157",
  }
  assert.equal(publicationInputSchema.safeParse(valido).success, true)

  assert.equal(publicationInputSchema.safeParse({ ...valido, titulo: "  " }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...valido, precio: -1 }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...valido, stock: 0 }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...valido, categoria: "Revistas" }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...valido, condicion: "Roto" }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...valido, isbn: "123" }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...valido, fotos: ["no-es-url"] }).success, false)
  assert.equal(
    publicationInputSchema.safeParse({
      ...valido,
      fotos: ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg", "6.jpg", "7.jpg"],
    }).success,
    false,
  )
})

test("searchQuerySchema aplica valores por defecto y topes", () => {
  const base = searchQuerySchema.parse({})
  assert.equal(base.orden, "recientes")
  assert.equal(base.pagina, 1)
  assert.equal(base.porPagina, 12)
  assert.equal(base.categoria, undefined)

  assert.equal(searchQuerySchema.safeParse({ porPagina: 49 }).success, false)
  assert.equal(searchQuerySchema.safeParse({ pagina: 0 }).success, false)
  assert.equal(searchQuerySchema.safeParse({ orden: "barato" }).success, false)
  assert.equal(searchQuerySchema.safeParse({ vendedor: "no-uuid" }).success, false)
  assert.equal(
    searchQuerySchema.safeParse({ categoria: ["Mangas", "Cómics", "Libros", "Mangas"] }).success,
    false,
  )
  assert.equal(searchQuerySchema.parse({ precioMin: "5000", porPagina: "24" }).precioMin, 5000)
})

test("parseSearchParams acepta listas separadas por coma y repetidas", () => {
  const query = parseSearchParams(
    new URLSearchParams("q=berserk&categoria=Mangas,Cómics&categoria=Libros&precioMax=9000&pagina=2"),
  )
  assert.equal(query.q, "berserk")
  assert.deepEqual(query.categoria, ["Mangas", "Cómics", "Libros"])
  assert.equal(query.precioMax, 9000)
  assert.equal(query.pagina, 2)
  assert.equal(query.porPagina, 12)
  assert.throws(() => parseSearchParams(new URLSearchParams("categoria=Inventada")))
})

test("parseSearchParams acepta varias comunas y acota la lista", () => {
  const query = parseSearchParams(
    new URLSearchParams("comuna=Temuco,Viña del Mar&comuna=Antofagasta"),
  )
  assert.deepEqual(query.comuna, ["Temuco", "Viña del Mar", "Antofagasta"])
  assert.throws(() =>
    parseSearchParams(new URLSearchParams(`comuna=${Array(21).fill("X").join(",")}`)),
  )
})

test("datosDespachoSchema exige dirección y punto de retiro según el método", () => {
  const base = {
    nombreRecibe: "Ana Pérez",
    telefono: "+56 9 1234 5678",
    metodoEntrega: "envio_domicilio",
    direccion: "Av. Siempre Viva 742",
    comuna: "Valparaíso",
    region: "Región de Valparaíso",
    puntoRetiro: null,
  }
  assert.equal(datosDespachoSchema.safeParse(base).success, true)
  assert.equal(datosDespachoSchema.safeParse({ ...base, direccion: null }).success, false)
  assert.equal(datosDespachoSchema.safeParse({ ...base, telefono: "llamar al 123" }).success, false)
  assert.equal(datosDespachoSchema.safeParse({ ...base, nombreRecibe: "A" }).success, false)
  assert.equal(
    datosDespachoSchema.safeParse({ ...base, metodoEntrega: "retiro_punto", puntoRetiro: null })
      .success,
    false,
  )
  assert.equal(
    datosDespachoSchema.safeParse({ ...base, metodoEntrega: "retiro_punto", puntoRetiro: "Bóveda 3" })
      .success,
    true,
  )
})

test("panelMovimientoSchema valida el tipo y la cantidad", () => {
  const id = "590a83f0-a633-438f-922e-f621a8bec093"
  assert.equal(panelMovimientoSchema.safeParse({ publicacionId: id, tipo: "entrada", cantidad: 3 }).success, true)
  assert.equal(panelMovimientoSchema.safeParse({ publicacionId: id, tipo: "salida", cantidad: 1 }).success, true)
  assert.equal(panelMovimientoSchema.safeParse({ publicacionId: id, tipo: "ajuste", cantidad: 0 }).success, true)
  assert.equal(panelMovimientoSchema.safeParse({ publicacionId: id, tipo: "entrada", cantidad: 0 }).success, false)
  assert.equal(panelMovimientoSchema.safeParse({ publicacionId: id, tipo: "borrado", cantidad: 1 }).success, false)
  assert.equal(panelMovimientoSchema.safeParse({ publicacionId: id, tipo: "entrada", cantidad: 1000 }).success, false)
  assert.equal(panelMovimientoSchema.safeParse({ publicacionId: "x", tipo: "entrada", cantidad: 1 }).success, false)
})

test("panelUsuarioUpdateSchema exige rol o estado", () => {
  const id = "590a83f0-a633-438f-922e-f621a8bec093"
  assert.equal(panelUsuarioUpdateSchema.safeParse({ id }).success, false)
  assert.equal(panelUsuarioUpdateSchema.safeParse({ id, rol: "lector" }).success, true)
  assert.equal(panelUsuarioUpdateSchema.safeParse({ id, rol: "admin" }).success, true)
  assert.equal(panelUsuarioUpdateSchema.safeParse({ id, rol: "worker" }).success, false)
  assert.equal(panelUsuarioUpdateSchema.safeParse({ id, activo: false }).success, true)
  assert.equal(panelUsuarioUpdateSchema.safeParse({ id, rol: "super" }).success, false)
})

test("chatMessageSchema exige un mensaje utilizable", () => {
  assert.equal(chatMessageSchema.safeParse({ mensaje: "¿Te sirve mañana a las 18?" }).success, true)
  assert.equal(chatMessageSchema.safeParse({ mensaje: "  " }).success, false)
  assert.equal(chatMessageSchema.safeParse({}).success, false)
  assert.equal(chatMessageSchema.safeParse({ mensaje: "a".repeat(1001) }).success, false)
})

test("passwordChangeSchema exige una contraseña nueva y distinta", () => {
  assert.equal(
    passwordChangeSchema.safeParse({ currentPassword: "admin123", newPassword: "clave456" }).success,
    true,
  )
  assert.equal(
    passwordChangeSchema.safeParse({ currentPassword: "admin123", newPassword: "12345" }).success,
    false,
  )
  assert.equal(
    passwordChangeSchema.safeParse({ currentPassword: "admin123", newPassword: "admin123" }).success,
    false,
  )
  assert.equal(
    passwordChangeSchema.safeParse({ currentPassword: "", newPassword: "clave456" }).success,
    false,
  )
})

test("registroSchema exige todos los datos de contacto y la confirmación", () => {
  const valido = {
    nombre: "Ana Pérez",
    email: "Ana@LEKTOR.cl",
    password: "lektor123",
    confirmarPassword: "lektor123",
    telefono: "+56 9 1234 5678",
    comuna: "Viña del Mar",
    region: "Región de Valparaíso",
  }
  const parsed = registroSchema.safeParse(valido)
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.email, "ana@lektor.cl")
  }

  assert.equal(registroSchema.safeParse({ ...valido, confirmarPassword: "otra123" }).success, false)
  for (const campo of ["nombre", "email", "password", "confirmarPassword", "telefono", "comuna", "region"]) {
    const sinCampo: Record<string, unknown> = { ...valido }
    delete sinCampo[campo]
    assert.equal(registroSchema.safeParse(sinCampo).success, false, `debería exigir ${campo}`)
  }

  assert.equal(registroSchema.safeParse({ ...valido, telefono: "llamar al 123" }).success, false)
  assert.equal(registroSchema.safeParse({ ...valido, password: "12345" }).success, false)
  assert.equal(registroSchema.safeParse({ ...valido, email: "no-es-mail" }).success, false)
  assert.equal(registroSchema.safeParse({ ...valido, comuna: "X" }).success, false)
})

test("estadoSegunStock mantiene la pausa y deriva agotada o activa", () => {
  assert.equal(estadoSegunStock(0, "activa"), "agotada")
  assert.equal(estadoSegunStock(3, "activa"), "activa")
  assert.equal(estadoSegunStock(0, "pausada"), "pausada")
  assert.equal(estadoSegunStock(5, "pausada"), "pausada")
  assert.equal(estadoSegunStock(4, "agotada"), "activa")
})

test("profileUpdateSchema rechaza URLs y teléfonos inválidos", () => {
  assert.equal(profileUpdateSchema.safeParse({ nombre: "Ana", comuna: "Viña del Mar" }).success, true)
  assert.equal(profileUpdateSchema.safeParse({ avatarUrl: "no-es-url" }).success, false)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "llamar" }).success, false)
  assert.equal(profileUpdateSchema.safeParse({ nombre: "A" }).success, false)
})
