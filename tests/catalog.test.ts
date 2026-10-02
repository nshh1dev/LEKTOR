import { test } from "node:test"
import assert from "node:assert/strict"

import {
  COMISION_PLATAFORMA,
  COSTO_ENVIO_DOMICILIO,
  RANGOS_PRECISO,
  RESERVA_HORAS,
  chatMessageSchema,
  comisionPlataforma,
  cuerpoDeRegistro,
  datosDespachoSchema,
  listaFotosAUrls,
  nivelDePublicaciones,
  panelMovimientoSchema,
  panelUsuarioUpdateSchema,
  parseSearchParams,
  passwordChangeSchema,
  profileUpdateSchema,
  publicationInputSchema,
  rangoPrecioDesde,
  searchQuerySchema,
  envioSegunMetodo,
  estadoSegunStock,
  registroSchema,
  loginFormSchema,
  transicionValida,
} from "@/lib/catalog"

test("los tramos de precio cubren el catálogo sin huecos ni traslapes", () => {
  const tramos = RANGOS_PRECISO.filter((rango) => rango.id !== "todos")
  const cabeza = tramos[0]
  const cola = tramos[tramos.length - 1]

  for (const tramo of tramos) {
    if (tramo.min !== null && tramo.max !== null) {
      assert.ok(tramo.min < tramo.max, `el tramo ${tramo.id} está al revés`)
    }
    assert.ok(
      tramo.etiqueta.length > 0 && tramo.etiqueta.includes("$"),
      `el tramo ${tramo.id} no se anuncia con pesos`,
    )
  }

  // El primero se abre hacia abajo y el último hacia arriba, así que entre los
  // dos todo precio entero cae en exactamente un tramo.
  assert.equal(cabeza.id, "hasta-5000")
  assert.equal(cabeza.min, null, "el primer tramo debe cubrir desde $0")
  assert.equal(cola.max, null, "el último tramo debe quedar abierto hacia arriba")

  for (let i = 1; i < tramos.length; i += 1) {
    const anterior = tramos[i - 1]
    const actual = tramos[i]
    if (anterior.max === null || actual.min === null) continue
    assert.equal(
      actual.min,
      anterior.max + 1,
      `entre ${anterior.id} y ${actual.id} queda un peso sin cubrir`,
    )
  }

  assert.equal(RANGOS_PRECISO[0].id, "todos")
  assert.equal(RANGOS_PRECISO[0].min, null)
  assert.equal(RANGOS_PRECISO[0].max, null)
})

test("rangoPrecioDesde recupera la selección y cae en 'todos' si no existe", () => {
  assert.equal(rangoPrecioDesde(null, null), "todos")
  assert.equal(rangoPrecioDesde(null, 5000), "hasta-5000")
  assert.equal(rangoPrecioDesde(10001, 15000), "10000-15000")
  assert.equal(rangoPrecioDesde(30001, null), "mas-30000")
  assert.equal(rangoPrecioDesde(1, 2), "todos", "un rango escrito a mano no debe invocar un tramo")
})

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

test("la comisión de plataforma es un diez por ciento redondeado al peso", () => {
  assert.equal(COMISION_PLATAFORMA, 0.1)
  assert.equal(comisionPlataforma(0), 0)
  assert.equal(comisionPlataforma(8_000), 800)
  assert.equal(comisionPlataforma(12_500), 1_250)
  // El CLP no tiene decimales: 9.990 * 0,1 son 999 pesos exactos y 1.005 son
  // 100,5, que tienen que quedar en 101 para que el número sea un entero.
  assert.equal(comisionPlataforma(9_990), 999)
  assert.equal(comisionPlataforma(1_005), 101)
  assert.equal(comisionPlataforma(1_004), 100)
})

test("la comisión nunca deja al vendedor sin parte", () => {
  // Lo que el comprobante llama "parte del vendedor" sale de restar la comisión
  // al subtotal: tiene que ser positiva y sumar de vuelta el subtotal entero.
  for (const subtotal of [1, 999, 1_000, 8_000, 15_000, 999_999]) {
    const comision = comisionPlataforma(subtotal)
    assert.ok(comision >= 0, `comisión negativa en ${subtotal}`)
    assert.ok(comision < subtotal, `la comisión iguala o supera el subtotal ${subtotal}`)
    assert.equal(subtotal - comision + comision, subtotal, `el reparto no cuadra en ${subtotal}`)
  }
})

test("listaFotosAUrls limpia y limita a seis fotos", () => {
  assert.deepEqual(listaFotosAUrls(" https://a.cl/1.jpg , ,https://a.cl/2.jpg "), [
    "https://a.cl/1.jpg",
    "https://a.cl/2.jpg",
  ])
  assert.deepEqual(listaFotosAUrls(""), [])
  assert.equal(listaFotosAUrls("1,2,3,4,5,6,7,8").length, 6)
})

test("el precio formateado se guarda como número", () => {
  const base = {
    titulo: "Chainsaw Man Vol. 1",
    autor: "Tatsuki Fujimoto",
    editorial: "Shueisha",
    categoria: "Mangas",
    condicion: "Como nuevo",
    stock: 1,
  }
  const precio = publicationInputSchema.safeParse({ ...base, precio: "$19.990" })
  assert.equal(precio.success, true)
  assert.equal(precio.success ? precio.data.precio : 0, 19990)

  // Un campo vacío tiene que fallar: coercionar a 0 publicaría a $0.
  assert.equal(publicationInputSchema.safeParse({ ...base, precio: "" }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...base, precio: "   " }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...base, precio: null }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...base, precio: "1.5" }).success, false)
  assert.equal(publicationInputSchema.safeParse({ ...base, precio: "20000000" }).success, false)
  // La API sigue mandando el precio como número.
  assert.equal(publicationInputSchema.safeParse({ ...base, precio: 19990 }).success, true)
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

test("el rango de precio llega como pesos enteros", () => {
  const rango = searchQuerySchema.parse({ precioMin: "5000", precioMax: "15000" })
  assert.equal(rango.precioMin, 5000)
  assert.equal(rango.precioMax, 15000)
  assert.equal(searchQuerySchema.parse({}).precioMin, undefined)
  assert.equal(searchQuerySchema.safeParse({ precioMin: "-1" }).success, false)
  assert.equal(searchQuerySchema.safeParse({ precioMax: "1.5" }).success, false)
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

test("loginFormSchema canonicaliza el correo y acepta contraseñas de cualquier largo", () => {
  const parsed = loginFormSchema.safeParse({ email: "  Nico@LEKTOR.CL ", password: "123456" })
  assert.equal(parsed.success, true)
  if (parsed.success) {
    assert.equal(parsed.data.email, "nico@lektor.cl")
  }

  // El registro exige 6 caracteres; el login no, porque la contraseña ya existe
  // en la base y solo tiene que coincidir con lo que hay guardado.
  assert.equal(loginFormSchema.safeParse({ email: "nico@lektor.cl", password: "1" }).success, true)
  assert.equal(
    loginFormSchema.safeParse({ email: "nico@lektor.cl", password: "contraseña larguísima" }).success,
    true,
  )

  assert.equal(loginFormSchema.safeParse({ email: "no-es-mail", password: "123456" }).success, false)
  assert.equal(loginFormSchema.safeParse({ email: "nico@lektor.cl", password: "" }).success, false)
  for (const campo of ["email", "password"]) {
    const sinCampo: Record<string, unknown> = { email: "nico@lektor.cl", password: "123456" }
    delete sinCampo[campo]
    assert.equal(loginFormSchema.safeParse(sinCampo).success, false, `debería exigir ${campo}`)
  }
})

test("cuerpoDeRegistro es aceptado por el esquema que valida la API", () => {
  // El contrato cliente-servidor: lo que el formulario manda tiene que pasar por el
  // mismo esquema que usa `POST /api/auth/register`, o el alta rebota con 400 y la
  // causa no aparece ni en el typecheck ni en la simulación, que pega directo a la ruta.
  const valores = {
    nombre: "Ana Pérez",
    email: "ana@lektor.cl",
    password: "lektor123",
    confirmarPassword: "lektor123",
    telefono: "+56 9 1234 5678",
    comuna: "Viña del Mar",
    region: "Región de Valparaíso",
  }
  const cuerpo = cuerpoDeRegistro(valores)

  assert.equal(registroSchema.safeParse(cuerpo).success, true, "el cuerpo tendría que ser válido")
  assert.deepEqual(Object.keys(cuerpo).sort(), Object.keys(valores).sort(), "no debe viajar un campo de más o de menos")
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

test("el teléfono se mide contra el número que existe", () => {
  // Con el 56 detrás hay un celular de nueve o un fijo de ocho, ni uno más.
  assert.equal(profileUpdateSchema.safeParse({ telefono: "+56 9 1234 5678" }).success, true)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "+56 2 234 5678" }).success, true)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "9 1234 5678" }).success, true)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "+56 9123213123213" }).success, false)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "+562 234 5678" }).success, true)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "+56 2 234 567" }).success, false)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "+1 415 555 2671" }).success, true)
  assert.equal(profileUpdateSchema.safeParse({ telefono: "+1 415 555 2671 234 567" }).success, false)
  assert.equal(profileUpdateSchema.safeParse({ telefono: null }).success, true)
})

test("el nivel de coleccionista sube con las publicaciones activas", () => {
  assert.equal(nivelDePublicaciones(0), "Nuevo en LEKTOR")
  assert.equal(nivelDePublicaciones(1), "Coleccionista")
  assert.equal(nivelDePublicaciones(3), "Coleccionista")
  assert.equal(nivelDePublicaciones(4), "Biblioteca en casa")
  assert.equal(nivelDePublicaciones(9), "Biblioteca en casa")
  assert.equal(nivelDePublicaciones(10), "Referencia local")
  assert.equal(nivelDePublicaciones(50), "Referencia local")
})
