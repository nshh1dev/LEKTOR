import "dotenv/config"

import bcrypt from "bcryptjs"
import { eq, isNotNull, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "../db/schema"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema })

function corregirIsbn(isbn: string): string {
  const digitos = isbn.replace(/[^0-9Xx]/g, "").toUpperCase()
  if (digitos.length !== 13) return isbn
  const base = digitos.slice(0, 12)
  let suma = 0
  for (let i = 0; i < 12; i += 1) suma += Number(base[i]) * (i % 2 === 0 ? 1 : 3)
  return base + String((10 - (suma % 10)) % 10)
}

async function main() {
  const hash = (plain: string) => bcrypt.hashSync(plain, 10)

  const demoUsers = [
    { email: "admin@lektor.cl", password: "admin123", nombre: "Marcela R.", rol: "admin", bio: "Administradora de la comunidad LEKTOR.", telefono: "+56911110001", comuna: "Providencia", region: "Región Metropolitana" },
    { email: "otaku@lektor.cl", password: "otaku123", nombre: "OtakuStore99", rol: "lector", bio: "Coleccionista de shonen y novelas negras.", telefono: "+56911110003", comuna: "Rancagua", region: "Región de O'Higgins" },
    { email: "nico@lektor.cl", password: "123456", nombre: "Nico R.", rol: "lector", bio: "Busco tomos de Lauper y ediciones difíciles.", telefono: "+56911110004", comuna: "Concepción", region: "Región del Biobío" },
    { email: "camila@lektor.cl", password: "123456", nombre: "Camila V.", rol: "lector", bio: "Comics de superhéroes, edición Chilean.", telefono: "+56911110005", comuna: "Las Condes", region: "Región Metropolitana" },
    { email: "felipe@lektor.cl", password: "123456", nombre: "Felipe M.", rol: "lector", bio: "Literatura chilena y ficción traducida.", telefono: "+56911110006", comuna: "Viña del Mar", region: "Región de Valparaíso" },
    { email: "vale@lektor.cl", password: "123456", nombre: "Vale K.", rol: "lector", bio: "Mangas seinen de los 2000.", telefono: "+56911110007", comuna: "Temuco", region: "Región de La Araucanía" },
    { email: "jorge@lektor.cl", password: "123456", nombre: "Jorge P.", rol: "lector", bio: "Cómics clásicos en buen estado.", telefono: "+56911110008", comuna: "Antofagasta", region: "Región de Antofagasta" },
    { email: "fran@lektor.cl", password: "123456", nombre: "Fran S.", rol: "lector", bio: "Fantasía épica y reediciones.", telefono: "+56911110009", comuna: "Punta Arenas", region: "Región de Magallanes" },
  ]

  await db.insert(schema.users).values(
    demoUsers.map((u) => ({
      email: u.email,
      passwordHash: hash(u.password),
      nombre: u.nombre,
      rol: u.rol,
      activo: true,
      bio: u.bio,
      telefono: u.telefono,
      comuna: u.comuna,
      region: u.region,
    })),
  ).onConflictDoUpdate({
    target: schema.users.email,
    set: {
      nombre: sql`excluded.nombre`,
      bio: sql`excluded.bio`,
      telefono: sql`excluded.telefono`,
      comuna: sql`excluded.comuna`,
      region: sql`excluded.region`,
    },
  })

  await db.execute(sql`delete from users where email like '%@tienda.cl'`)
  // El rol de bodeguero ya no existe: se van sus filas heredadas y las cuentas
  // que dejó la simulación, para que el panel muestre solo el equipo real.
  await db.execute(sql`delete from users where rol = 'worker'`)
  await db.execute(sql`delete from users where email like '%@sim.cl'`)

  const all = await db.select().from(schema.users)
  const byEmail = Object.fromEntries(all.map((u) => [u.email, u]))

  const seedPublications = [
    {
      titulo: "Vagabond Vol. 1",
      autor: "Takehiko Inoue",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Usado - Buen estado",
      precio: 8000,
      stock: 2,
      isbn: "9788420673219",
      descripcion: "Musashi Miyamoto comienza su camino del espadachín. Lomo intacto y páginas limpias.",
      rating: "4.9",
      vendedorEmail: "nico@lektor.cl",
    },
    {
      titulo: "Batman: The Long Halloween",
      autor: "Jeph Loeb",
      editorial: "ECC",
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 15000,
      stock: 1,
      isbn: "9788468802383",
      descripcion: "El caso de Holiday golpea Gotham. Edición cuidada, sin anotaciones.",
      rating: "5.0",
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "Hábitos Atómicos",
      autor: "James Clear",
      editorial: "Planeta",
      categoria: "Libros",
      condicion: "Sellado",
      precio: 10000,
      stock: 0,
      isbn: "9788412103966",
      descripcion: "Cómo formar buenos hábitos y romper malos. Ejemplar sellado, sin abrir.",
      rating: "4.8",
      vendedorEmail: "felipe@lektor.cl",
    },
    {
      titulo: "Chainsaw Man Vol. 1",
      autor: "Tatsuki Fujimoto",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 9500,
      stock: 2,
      isbn: "9788418334946",
      descripcion: "Denji y Pochita, el cazador demoníaco. Lectura única o para coleccionar.",
      rating: "4.9",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Watchmen",
      autor: "Alan Moore",
      editorial: "Norma",
      categoria: "Cómics",
      condicion: "Usado - Buen estado",
      precio: 12000,
      stock: 1,
      isbn: "9788498473857",
      descripcion: "El clásico de Moore y Gibbons. Tapa con señales leves de uso.",
      rating: "4.7",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "El nombre del viento",
      autor: "Patrick Rothfuss",
      editorial: "Plaza & Janés",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 11000,
      stock: 2,
      isbn: "9788402425601",
      descripcion: "La crónica del Kvothe. Edición con sobrecubierta excelente.",
      rating: "4.9",
      vendedorEmail: "fran@lektor.cl",
    },
    {
      titulo: "One Piece Vol. 1",
      autor: "Eiichiro Oda",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 7900,
      stock: 3,
      isbn: "9788418640020",
      descripcion: "El inicio de la gran aventura de Monkey D. Luffy por el Gran Line. Edición shonen a todo color de sobretapa.",
      rating: "5.0",
      vendedorEmail: "otaku@lektor.cl",
    },
    {
      titulo: "Naruto Vol. 1",
      autor: "Masashi Kishimoto",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Usado - Muy buen estado",
      precio: 6500,
      stock: 2,
      isbn: "9788467803009",
      descripcion: "Naruto Uzumaki sueña con ser Hokage. Casi sin uso, páginas impecables y tapas como nuevas.",
      rating: "4.8",
      vendedorEmail: "nico@lektor.cl",
    },
    {
      titulo: "Attack on Titan Vol. 1",
      autor: "Hajime Isayama",
      editorial: "Planeta",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 9900,
      stock: 1,
      isbn: "9788468420229",
      descripcion: "El muro María cae y la humanidad lucha por sobrevivir. Ejemplar sellado.",
      rating: "4.9",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Death Note Vol. 1",
      autor: "Tsugumi Ohba",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 8900,
      stock: 2,
      isbn: "9788468702340",
      descripcion: "Light Yagami encuentra la Death Note. Edición cuidada para coleccionistas.",
      rating: "4.9",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "Jujutsu Kaisen Vol. 1",
      autor: "Gege Akutami",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 8900,
      stock: 3,
      isbn: "9788418045450",
      descripcion: "Yuji Itadori ingresa al mundo de las maldiciones. Lomo impecable, sin dobleces.",
      rating: "4.9",
      vendedorEmail: "fran@lektor.cl",
    },
    {
      titulo: "Berserk",
      autor: "Kentaro Miura",
      editorial: "Panini",
      categoria: "Mangas",
      condicion: "Usado - Buen estado",
      precio: 18000,
      stock: 1,
      isbn: "9788418540023",
      descripcion: "Guts, el guerrero negro. Tomo grueso estilo kanzenban, tapa dura con rayas leves.",
      rating: "5.0",
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "Demon Slayer: Kimetsu no Yaiba Vol. 1",
      autor: "Koyoharu Gotouge",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 7900,
      stock: 2,
      isbn: "9788417883065",
      descripcion: "Tanjiro y Nezuko, los cazademonios. Edición reciente sin leer.",
      rating: "4.8",
      vendedorEmail: "otaku@lektor.cl",
    },
    {
      titulo: "One Punch Man Vol. 1",
      autor: "ONE y Yusuke Murata",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Sellado",
      precio: 8900,
      stock: 2,
      isbn: "9788490328977",
      descripcion: "Saitama quiere un rival a su altura. Tomo sellado en su plástico.",
      rating: "4.7",
      vendedorEmail: "felipe@lektor.cl",
    },
    {
      titulo: "Spy x Family Vol. 1",
      autor: "Tatsuya Endo",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 8900,
      stock: 3,
      isbn: "9788419065178",
      descripcion: "La familia Forger y su misión imposible. Adorable y adictivo, sin leer.",
      rating: "4.9",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Saga Vol. 1",
      autor: "Brian K. Vaughan",
      editorial: "Norma",
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 14000,
      stock: 1,
      isbn: "9788468417871",
      descripcion: "La epopeya de Alana y Marko entre dos galaxias en guerra. Edición completa.",
      rating: "4.9",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "V de Vendetta",
      autor: "Alan Moore",
      editorial: "ECC",
      categoria: "Cómics",
      condicion: "Usado - Buen estado",
      precio: 13000,
      stock: 1,
      isbn: "9788490249806",
      descripcion: "La distopía totalitaria de Moore y Lloyd. Tapas con sello de uso, interior limpio.",
      rating: "4.9",
      vendedorEmail: "nico@lektor.cl",
    },
    {
      titulo: "The Sandman Vol. 1",
      autor: "Neil Gaiman",
      editorial: "ECC",
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 19000,
      stock: 1,
      isbn: "9788490247052",
      descripcion: "El señor de los sueños despierta tras 70 años. Tapa dura sin marcas.",
      rating: "5.0",
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "The Killing Joke",
      autor: "Alan Moore",
      editorial: "ECC",
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 11000,
      stock: 2,
      isbn: "9788498850037",
      descripcion: "El origen del Joker y un día negro para Barbara Gordon. Edición de lujo.",
      rating: "4.8",
      vendedorEmail: "otaku@lektor.cl",
    },
    {
      titulo: "Superman: Red Son",
      autor: "Mark Millar",
      editorial: "ECC",
      categoria: "Cómics",
      condicion: "Sellado",
      precio: 14000,
      stock: 1,
      isbn: "9788468471503",
      descripcion: "¿Y si la nave de Superman hubiera aterrizado en la URSS? Tomo sellado.",
      rating: "4.7",
      vendedorEmail: "fran@lektor.cl",
    },
    {
      titulo: "X-Men: Dios ama, el hombre mata",
      autor: "Chris Claremont",
      editorial: "Marvel España",
      categoria: "Cómics",
      condicion: "Usado - Con mucho uso",
      precio: 16000,
      stock: 1,
      isbn: "9788490887626",
      descripcion: "El alegato clásico de los mutantes. Tomo leído muchas veces, con las esquinas redondeadas y el lomo cedido.",
      rating: "4.8",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "Ultimate Spider-Man Vol. 1",
      autor: "Brian Michael Bendis",
      editorial: "Panini",
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 9500,
      stock: 2,
      isbn: "9788468491120",
      descripcion: "Peter Parker desde cero en el universo Ultimate. Lomo sin abrir.",
      rating: "4.8",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Star Wars: Darth Vader",
      autor: "Kieron Gillen",
      editorial: "Planeta",
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 10500,
      stock: 1,
      isbn: "9788468451919",
      descripcion: "El lado oscuro visto desde Darth Vader tras una Nueva Esperanza. Edición española.",
      rating: "4.7",
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "Cien años de soledad",
      autor: "Gabriel García Márquez",
      editorial: "Sudamericana",
      categoria: "Libros",
      condicion: "Usado - Aceptable",
      precio: 14000,
      stock: 1,
      isbn: "9789500705890",
      descripcion: "La saga de los Buendía en Macondo. Toda la familia leyéndolo le pasó por encima.",
      rating: "5.0",
      vendedorEmail: "felipe@lektor.cl",
    },
    {
      titulo: "1984",
      autor: "George Orwell",
      editorial: "Penguin Random House",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 12000,
      stock: 2,
      isbn: "9788499890400",
      descripcion: "El gran hermano te observa. Portada dura sin leer.",
      rating: "4.9",
      vendedorEmail: "nico@lektor.cl",
    },
    {
      titulo: "Harry Potter y la piedra filosofal",
      autor: "J.K. Rowling",
      editorial: "Salamandra",
      categoria: "Libros",
      condicion: "Usado - Buen estado",
      precio: 15000,
      stock: 1,
      isbn: "9788478884452",
      descripcion: "El primer año de Harry en Hogwarts. Conserva la sobrecubierta original.",
      rating: "4.9",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "El señor de los anillos: La comunidad del anillo",
      autor: "J.R.R. Tolkien",
      editorial: "Minotauro",
      categoria: "Libros",
      condicion: "Usado - Con anotaciones",
      precio: 19000,
      stock: 1,
      isbn: "9788445000994",
      descripcion: "Frodo y la Compañía se ponen en camino. Anotado por un lector anterior, con el mapa intacto.",
      rating: "5.0",
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "Dune",
      autor: "Frank Herbert",
      editorial: "Debolsillo",
      categoria: "Libros",
      condicion: "Sellado",
      precio: 16000,
      stock: 2,
      isbn: "9788427224610",
      descripcion: "En Arrakis la especia fluye y las casas nobles guerrean. Ejemplar sellado.",
      rating: "4.8",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "Fundación",
      autor: "Isaac Asimov",
      editorial: "Debolsillo",
      categoria: "Libros",
      condicion: "Usado - Buen estado",
      precio: 11000,
      stock: 1,
      isbn: "9788497598960",
      descripcion: "La psicohistoria de Hari Seldon y el futuro del Imperio. Interior impecable.",
      rating: "4.8",
      vendedorEmail: "fran@lektor.cl",
    },
    {
      titulo: "Ready Player One",
      autor: "Ernest Cline",
      editorial: "Fantacys",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 9000,
      stock: 2,
      isbn: "9788494630887",
      descripcion: "La caza del huevo de Pascua en OASIS. Una sola lectura, impecable.",
      rating: "4.6",
      vendedorEmail: "otaku@lektor.cl",
    },
    {
      titulo: "Sapiens: De animales a dioses",
      autor: "Yuval Noah Harari",
      editorial: "Debate",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 18000,
      stock: 1,
      isbn: "9788499926222",
      descripcion: "La breve historia de la humanidad. Portada rústica sin marcas.",
      rating: "4.7",
      vendedorEmail: "felipe@lektor.cl",
    },
    {
      titulo: "La sombra del viento",
      autor: "Carlos Ruiz Zafón",
      editorial: "Planeta",
      categoria: "Libros",
      condicion: "Usado - Buen estado",
      precio: 13000,
      stock: 1,
      isbn: "9788408014703",
      descripcion: "El cementerio de los libros olvidados. Portada con leve desgaste en puntas.",
      rating: "4.9",
      vendedorEmail: "nico@lektor.cl",
    },
    {
      titulo: "El Principito",
      autor: "Antoine de Saint-Exupéry",
      editorial: "Salamandra",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 9000,
      stock: 2,
      isbn: "9789878000070",
      descripcion: "La historia más tierna del planeta B-612. Edición con las ilustraciones del autor.",
      rating: "4.9",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Game of Thrones: Juego de tronos",
      autor: "George R.R. Martin",
      editorial: "Gigamesh",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 22000,
      stock: 1,
      isbn: "9788496208489",
      descripcion: "El invierno se acerca y los Stark pagan el precio. Tapas duras sin uso.",
      rating: "4.8",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "El alquimista",
      autor: "Paulo Coelho",
      editorial: "Planeta",
      categoria: "Libros",
      condicion: "Usado - Buen estado",
      precio: 8000,
      stock: 2,
      isbn: "9788408136905",
      descripcion: "Santiago y su leyenda personal. Buen estado de conservación.",
      rating: "4.5",
      vendedorEmail: "fran@lektor.cl",
    },
    {
      titulo: "Rayuela",
      autor: "Julio Cortázar",
      editorial: "Alfaguara",
      categoria: "Libros",
      condicion: "Sellado",
      precio: 16000,
      stock: 1,
      isbn: "9789505117530",
      descripcion: "El tablero de la Maga y Oliveira. Edición conmemorativa sellada.",
      rating: "4.7",
      vendedorEmail: "camila@lektor.cl",
    },
  ]

  const alreadyPublished = new Set(
    (await db.select({ titulo: schema.publications.titulo }).from(schema.publications)).map((p) =>
      p.titulo.toLowerCase(),
    ),
  )

  const freshPublications = seedPublications.filter(
    (p) => !alreadyPublished.has(p.titulo.toLowerCase()),
  )

  const insertable = freshPublications.filter((p) => byEmail[p.vendedorEmail]?.id)

  if (insertable.length > 0) {
    await db
      .insert(schema.publications)
      .values(
        insertable.map((p) => ({
          titulo: p.titulo,
          autor: p.autor,
          editorial: p.editorial,
          volumen: p.volumen ?? null,
          categoria: p.categoria,
          condicion: p.condicion,
          precio: p.precio,
          stock: p.stock,
          isbn: corregirIsbn(p.isbn),
          descripcion: p.descripcion,
          fotos: [],
          rating: p.rating,
          vendedorId: byEmail[p.vendedorEmail]!.id,
          estado: p.stock > 0 ? "activa" : "agotada",
        })),
      )
  }

  await db.execute(
    sql`update publications set estado = 'agotada' where stock = 0 and estado <> 'agotada'`,
  )

  const conIsbn = await db
    .select({ id: schema.publications.id, isbn: schema.publications.isbn })
    .from(schema.publications)
    .where(isNotNull(schema.publications.isbn))

  for (const row of conIsbn) {
    if (!row.isbn) continue
    const corregido = corregirIsbn(row.isbn)
    if (corregido === row.isbn) continue
    await db
      .update(schema.publications)
      .set({ isbn: corregido })
      .where(eq(schema.publications.id, row.id))
  }

  const [orderCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.orders)

  if (!orderCount || orderCount.total === 0) {
    const catalogue = await db
      .select({
        id: schema.publications.id,
        titulo: schema.publications.titulo,
        precio: schema.publications.precio,
        stock: schema.publications.stock,
        vendedorId: schema.publications.vendedorId,
      })
      .from(schema.publications)

    const demoOrders = [
      {
        publication: catalogue.find((p) => p.titulo === "Chainsaw Man Vol. 1" && p.stock > 0),
        compradorEmail: "otaku@lektor.cl",
        estado: "despachada",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Providencia 1234, Of. 302",
        comuna: "Providencia",
        region: "Región Metropolitana",
        puntoRetiro: null,
        horas: 26,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Vagabond Vol. 1" && p.stock > 0),
        compradorEmail: "felipe@lektor.cl",
        estado: "reservada",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Viña del Mar",
        region: "Región de Valparaíso",
        puntoRetiro: "Bluexpress Viña del Mar",
        horas: 2,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Hábitos Atómicos"),
        compradorEmail: "vale@lektor.cl",
        estado: "recibida",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Vitacura",
        region: "Región Metropolitana",
        puntoRetiro: "Librería Qué Leo, Vitacura",
        horas: 44,
      },
    ].filter((order) => order.publication && byEmail[order.compradorEmail])

    for (const order of demoOrders) {
      const publication = order.publication!
      const comprador = byEmail[order.compradorEmail]!
      const createdAt = new Date(Date.now() - order.horas * 60 * 60 * 1000)
      const envio = order.metodoEntrega === "retiro_punto" ? 0 : 3500

      await db.insert(schema.orders).values({
        compradorId: comprador.id,
        vendedorId: publication.vendedorId,
        publicacionId: publication.id,
        tituloSnapshot: publication.titulo,
        cantidad: 1,
        precioUnitario: publication.precio,
        subtotal: publication.precio,
        envio,
        total: publication.precio + envio,
        metodoPago: "simulado",
        estado: order.estado,
        reservaExpiraEn: new Date(createdAt.getTime() + 48 * 60 * 60 * 1000),
        fechaCreacion: createdAt,
        datosDespacho: {
          nombreRecibe: comprador.nombre,
          telefono: comprador.telefono ?? "+56900000000",
          metodoEntrega: order.metodoEntrega,
          direccion: order.direccion,
          comuna: order.comuna,
          region: order.region,
          puntoRetiro: order.puntoRetiro,
        },
      })

      await db.insert(schema.notifications).values({
        userId: publication.vendedorId,
        tipo: "nueva_orden",
        titulo: `Nueva orden por ${publication.titulo}`,
        cuerpo: `${comprador.nombre} reservó un ejemplar. Coordina la entrega usando ${comprador.telefono ?? "el teléfono registrado"}.`,
        datos: { publicacionId: publication.id, compradorId: comprador.id },
      })

      if (order.estado === "recibida") {
        await db.insert(schema.notifications).values({
          userId: comprador.id,
          tipo: "orden_actualizada",
          titulo: `Orden por ${publication.titulo}: Recibida`,
          cuerpo: "Confirmaste la recepción del ejemplar. ¡Gracias por cerrar la compra!",
          datos: { publicacionId: publication.id, vendedorId: publication.vendedorId },
        })
      }
    }
  }

  const [movementCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.stockMovements)

  if (!movementCount || movementCount.total === 0) {
    const forMovements = await db
      .select({
        id: schema.publications.id,
        titulo: schema.publications.titulo,
        stock: schema.publications.stock,
      })
      .from(schema.publications)
    const staff = byEmail["admin@lektor.cl"]

    if (staff) {
      type DemoMovimiento = {
        titulo: string
        tipo: "entrada" | "salida" | "ajuste"
        cantidad: number
        horas: number
        motivo: string
      }

      const historia: DemoMovimiento[] = [
        { titulo: "Vagabond Vol. 1", tipo: "entrada", cantidad: 2, horas: 96, motivo: "Recepción de compra" },
        { titulo: "Chainsaw Man Vol. 1", tipo: "entrada", cantidad: 2, horas: 72, motivo: "Ingreso desde bodega" },
        { titulo: "El Principito", tipo: "entrada", cantidad: 2, horas: 60, motivo: "Devolución de lector" },
        { titulo: "Rayuela", tipo: "entrada", cantidad: 2, horas: 30, motivo: "Ingreso desde bodega" },
        { titulo: "Hábitos Atómicos", tipo: "salida", cantidad: 1, horas: 40, motivo: "Ejemplar vendido" },
        { titulo: "Vagabond Vol. 1", tipo: "salida", cantidad: 1, horas: 2, motivo: "Ejemplar reservado para venta" },
        { titulo: "Rayuela", tipo: "ajuste", cantidad: 1, horas: 18, motivo: "Inventario físico: un ejemplar menos" },
      ]

      const netoPorPublicacion = new Map<string, number>()
      for (const mov of historia) {
        const actual = netoPorPublicacion.get(mov.titulo) ?? 0
        const delta = mov.tipo === "entrada" ? mov.cantidad : mov.tipo === "salida" ? -mov.cantidad : 0
        netoPorPublicacion.set(mov.titulo, actual + delta)
      }

      const stockInicial = new Map<string, number>()
      for (const publicacion of forMovements) {
        const neto = netoPorPublicacion.get(publicacion.titulo) ?? 0
        if (neto !== 0) stockInicial.set(publicacion.titulo, Math.max(0, publicacion.stock - neto))
      }

      const running = new Map(stockInicial)
      const demoMovements = [...historia]
        .sort((a, b) => b.horas - a.horas)
        .map((mov) => {
          const publicacion = forMovements.find((p) => p.titulo === mov.titulo)
          if (!publicacion) return null

          const anterior = running.get(publicacion.titulo) ?? publicacion.stock
          const resultante =
            mov.tipo === "entrada" ? anterior + mov.cantidad : mov.tipo === "salida" ? Math.max(0, anterior - mov.cantidad) : mov.cantidad
          running.set(publicacion.titulo, resultante)

          return {
            publicacionId: publicacion.id,
            usuarioId: staff.id,
            tipo: mov.tipo,
            cantidad: mov.cantidad,
            stockAnterior: anterior,
            stockResultante: resultante,
            motivo: mov.motivo,
            fechaCreacion: new Date(Date.now() - mov.horas * 60 * 60 * 1000),
          }
        })
        .filter((mov): mov is NonNullable<typeof mov> => mov !== null)

      if (demoMovements.length > 0) {
        await db.insert(schema.stockMovements).values(demoMovements)
      }
    }
  }

  console.log(
    "Seed OK:",
    demoUsers.length,
    "usuarios, catálogo con",
    seedPublications.length,
    "publicaciones (",
    freshPublications.length,
    "nuevas, ya existentes:",
    seedPublications.length - freshPublications.length,
    ")",
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })