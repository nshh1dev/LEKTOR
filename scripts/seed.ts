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

type DemoMensaje = { de: "comprador" | "vendedor"; texto: string }
type DemoConversacion = { titulo: string; compradorEmail: string; horas: number; mensajes: DemoMensaje[] }
type DemoChat = { titulo: string; estado: string; horas: number; mensajes: DemoMensaje[] }

// Guardas de idempotencia de los hilos privados: una conversación por
// publicación y comprador, un chat por orden.
const contactoIniciado = new Set<string>()
const chatIniciado = new Set<string>()

async function main() {
  const hash = (plain: string) => bcrypt.hashSync(plain, 10)

  const demoUsers = [
    { email: "admin@lektor.cl", password: "admin123", nombre: "Marcela R.", rol: "admin", activo: true, bio: "Administradora de la comunidad LEKTOR.", telefono: "+56911110001", comuna: "Providencia", region: "Región Metropolitana" },
    { email: "moderacion@lektor.cl", password: "admin123", nombre: "Rodrigo S.", rol: "admin", activo: true, bio: "Reviso reseñas y publicaciones del panel.", telefono: "+56911110002", comuna: "Ñuñoa", region: "Región Metropolitana" },
    { email: "otaku@lektor.cl", password: "otaku123", nombre: "OtakuStore99", rol: "lector", activo: true, bio: "Coleccionista de shonen y novelas negras.", telefono: "+56911110003", comuna: "Rancagua", region: "Región de O'Higgins" },
    { email: "nico@lektor.cl", password: "123456", nombre: "Nico R.", rol: "lector", activo: true, bio: "Busco tomos de Lauper y ediciones difíciles.", telefono: "+56911110004", comuna: "Concepción", region: "Región del Biobío" },
    { email: "camila@lektor.cl", password: "123456", nombre: "Camila V.", rol: "lector", activo: true, bio: "Comics de superhéroes, edición Chilean.", telefono: "+56911110005", comuna: "Las Condes", region: "Región Metropolitana" },
    { email: "felipe@lektor.cl", password: "123456", nombre: "Felipe M.", rol: "lector", activo: true, bio: "Literatura chilena y ficción traducida.", telefono: "+56911110006", comuna: "Viña del Mar", region: "Región de Valparaíso" },
    { email: "vale@lektor.cl", password: "123456", nombre: "Vale K.", rol: "lector", activo: true, bio: "Mangas seinen de los 2000.", telefono: "+56911110007", comuna: "Temuco", region: "Región de La Araucanía" },
    { email: "jorge@lektor.cl", password: "123456", nombre: "Jorge P.", rol: "lector", activo: true, bio: "Cómics clásicos en buen estado.", telefono: "+56911110008", comuna: "Antofagasta", region: "Región de Antofagasta" },
    { email: "fran@lektor.cl", password: "123456", nombre: "Fran S.", rol: "lector", activo: true, bio: "Fantasía épica y reediciones.", telefono: "+56911110009", comuna: "Punta Arenas", region: "Región de Magallanes" },
    { email: "tati@lektor.cl", password: "123456", nombre: "Tati L.", rol: "lector", activo: true, bio: "Shonen de Jump y tomo sueltos.", telefono: "+56911110010", comuna: "Maipú", region: "Región Metropolitana" },
    { email: "beto@lektor.cl", password: "123456", nombre: "Beto S.", rol: "lector", activo: true, bio: "Seinen oscuro y novelas coreanas.", telefono: "+56911110011", comuna: "Chillán", region: "Región del Ñuble" },
    { email: "cami@lektor.cl", password: "123456", nombre: "Cami P.", rol: "lector", activo: true, bio: "Cómics europeos y graphic novels.", telefono: "+56911110012", comuna: "Osorno", region: "Región de Los Lagos" },
    { email: "dani@lektor.cl", password: "123456", nombre: "Dani R.", rol: "lector", activo: true, bio: "Terror gráfico y antología ECC.", telefono: "+56911110013", comuna: "Copiapó", region: "Región de Atacama" },
    { email: "flopi@lektor.cl", password: "123456", nombre: "Flor A.", rol: "lector", activo: true, bio: "Novela chilena de Faulkner y Bolaño.", telefono: "+56911110014", comuna: "Puerto Montt", region: "Región de Los Lagos" },
    { email: "gabi@lektor.cl", password: "123456", nombre: "Gabi C.", rol: "lector", activo: true, bio: "Mangas de autor y seinen de nicho.", telefono: "+56911110015", comuna: "La Serena", region: "Región de Coquimbo" },
    { email: "heli@lektor.cl", password: "123456", nombre: "Heli V.", rol: "lector", activo: true, bio: "Libros de bolsillo y ciencia ficción.", telefono: "+56911110016", comuna: "Arica", region: "Región de Arica y Parinacota" },
    { email: "patrik@lektor.cl", password: "123456", nombre: "Patrik O.", rol: "lector", activo: true, bio: "Mangas de la Jump y shōnen clásico.", telefono: "+56911110017", comuna: "Curicó", region: "Región del Maule" },
    { email: "suspendido@lektor.cl", password: "123456", nombre: "Cuenta Suspendida", rol: "lector", activo: false, bio: "Cuenta dada de baja para probar el panel.", telefono: "+56911110018", comuna: "Rancagua", region: "Región de O'Higgins" },
  ]

  await db.insert(schema.users).values(
    demoUsers.map((u) => ({
      email: u.email,
      passwordHash: hash(u.password),
      nombre: u.nombre,
      rol: u.rol,
      activo: u.activo,
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
      activo: sql`excluded.activo`,
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
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "Fullmetal Alchemist Vol. 1",
      autor: "Hiromu Arakawa",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 8500,
      stock: 2,
      isbn: "9788415910157",
      descripcion: "Los hermanos Elric buscan la Piedra filosofal. Lomo limpio, sin leer.",
      vendedorEmail: "fran@lektor.cl",
    },
    {
      titulo: "My Hero Academia Vol. 1",
      autor: "Kohei Horikoshi",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 7900,
      stock: 3,
      isbn: "9788417334717",
      descripcion: "Deku entra a la academia de héroes. Edición reciente con lomo impecable.",
      vendedorEmail: "tati@lektor.cl",
    },
    {
      titulo: "Chainsaw Man Vol. 2",
      autor: "Tatsuki Fujimoto",
      editorial: "Ivrea",
      volumen: 2,
      categoria: "Mangas",
      condicion: "Usado - Muy buen estado",
      precio: 8900,
      stock: 1,
      isbn: "9788418334953",
      descripcion: "La cacería sigue en Denji. Leído una vez, páginas sin dobleces.",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Vinland Saga Vol. 1",
      autor: "Makoto Yukimura",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 15900,
      stock: 1,
      isbn: "9788416100934",
      descripcion: "Thorfinn y su camino por el amor de Canute. Serie histórica con acción.",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "Mob Psycho 100 Vol. 1",
      autor: "ONE / Umezawa",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 9900,
      stock: 2,
      isbn: "9788417865688",
      descripcion: "Shigeo Kageyama y sus poderes. Dibujos limpios, sin leer.",
      vendedorEmail: "felipe@lektor.cl",
    },
    {
      titulo: "Tokyo Ghoul Vol. 1",
      autor: "Sui Ishida",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Usado - Buen estado",
      precio: 7900,
      stock: 0,
      isbn: "9788416076265",
      descripcion: "Kaneki y los ghouls. Último ejemplar disponible, tapa con uso.",
      vendedorEmail: "nico@lektor.cl",
    },
    {
      titulo: "Blue Period Vol. 1",
      autor: "Tsubasa Yamaguchi",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 12900,
      stock: 1,
      isbn: "9788416000666",
      descripcion: "Tocar el arte cambia todo. Tomo grueso, tapa dura sin marcas.",
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "Dorohedoro Vol. 1",
      autor: "Q Hayashida",
      editorial: "Ivrea",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Usado - Muy buen estado",
      precio: 14900,
      stock: 1,
      isbn: "9788415936027",
      descripcion: "Nikaido y Shin en la Ciudad Hueca. Un poco de uso en el borde.",
      vendedorEmail: "otaku@lektor.cl",
    },
    {
      titulo: "Kingdom Vol. 1",
      autor: "Yoshiki Tanaka",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 11900,
      stock: 2,
      isbn: "9788416601194",
      descripcion: "Xin busca uneyns para unificar China. Épica histórica con acción.",
      vendedorEmail: "beto@lektor.cl",
    },
    {
      titulo: "Hunter x Hunter Vol. 1",
      autor: "Yoshihiro Togashi",
      editorial: "Panini",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Usado - Buen estado",
      precio: 8500,
      stock: 3,
      isbn: "9788415840565",
      descripcion: "Gon busca a su padre. Lomo con holgura, páginas completas.",
      vendedorEmail: "gabi@lektor.cl",
    },
    {
      titulo: "Fables Vol. 1",
      autor: "Bill Willingham",
      editorial: "ECC",
      volumen: 1,
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 13900,
      stock: 1,
      isbn: "9788499395868",
      descripcion: "Los personajes del Bosque de los Suspensos. Cómic de consumo.",
      vendedorEmail: "flopi@lektor.cl",
    },
    {
      titulo: "Maus: Un ratón bueno",
      autor: "Art Spiegelman",
      editorial: "Reservoir",
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 15900,
      stock: 1,
      isbn: "9789566145491",
      descripcion: "La historia de su padre entre el fasismo y la memoria. Tapa dura.",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Bone: Out from Boneville",
      autor: "Jeff Smith",
      editorial: "ECC",
      categoria: "Cómics",
      condicion: "Sellado",
      precio: 16900,
      stock: 1,
      isbn: "9788497598342",
      descripcion: "Bone llega a su valle. Tomo de la reimpresión en color.",
      vendedorEmail: "felipe@lektor.cl",
    },
    {
      titulo: "Hellblazer: El nombre de Dios",
      autor: "Garth Ennis",
      editorial: "ECC",
      categoria: "Cómics",
      condicion: "Usado - Buen estado",
      precio: 12900,
      stock: 1,
      isbn: "9788499623693",
      descripcion: "John Constantine contra Satán. Tapa con signos de lectura.",
      vendedorEmail: "dani@lektor.cl",
    },
    {
      titulo: "Ms. Marvel Vol. 1",
      autor: "G. Willow Wilson",
      editorial: "Marvel España",
      volumen: 1,
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 9900,
      stock: 2,
      isbn: "9788410470209",
      descripcion: "Kamala Khan se convierte en Ms. Marvel. Cómic fresco, sin leer.",
      vendedorEmail: "camila@lektor.cl",
    },
    {
      titulo: "Y: El último hombre",
      autor: "Brian K. Vaughan / Pia Guerra",
      editorial: "ECC",
      volumen: 1,
      categoria: "Cómics",
      condicion: "Como nuevo",
      precio: 17900,
      stock: 1,
      isbn: "9788497810216",
      descripcion: "El mundo sin hombres. Edición de tapa dura con lomo intacto.",
      vendedorEmail: "jorge@lektor.cl",
    },
    {
      titulo: "Preacher: Book One",
      autor: "Garth Ennis",
      editorial: "ECC",
      volumen: 1,
      categoria: "Cómics",
      condicion: "Usado - Muy buen estado",
      precio: 14900,
      stock: 1,
      isbn: "9788498959324",
      descripcion: "Jesse Custer busca a Dios. Lomo firme, páginas sin marcas.",
      vendedorEmail: "otaku@lektor.cl",
    },
    {
      titulo: "Blame! Vol. 1",
      autor: "Tsutomu Nihei",
      editorial: "ECC",
      volumen: 1,
      categoria: "Cómics",
      condicion: "Usado - Aceptable",
      precio: 21900,
      stock: 1,
      isbn: "9788499443151",
      descripcion: "Estructuras infinitas en un futuro hostil. Portada con roce.",
      vendedorEmail: "gabi@lektor.cl",
    },
    {
      titulo: "Ficciones",
      autor: "Jorge Luis Borges",
      editorial: "Debolsillo",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 9000,
      stock: 2,
      isbn: "9788499892198",
      descripcion: "Los cuentos de Borges en pocket. Tapa blanda sin marcas.",
      vendedorEmail: "vale@lektor.cl",
    },
    {
      titulo: "Pedro Páramo",
      autor: "Juan Rulfo",
      editorial: "Cátedra",
      categoria: "Libros",
      condicion: "Usado - Buen estado",
      precio: 8500,
      stock: 1,
      isbn: "9788493220180",
      descripcion: "Juan Preciado viaja a Comala. Ilustrada y de lectura muy cómoda.",
      vendedorEmail: "heli@lektor.cl",
    },
    {
      titulo: "Mujeres de ojos grandes",
      autor: "Ángeles Mastretta",
      editorial: "Punto de lectura",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 7900,
      stock: 2,
      isbn: "9788496361143",
      descripcion: "Cuentos de Mastretta en su mejor versión. Libro sin abrir.",
      vendedorEmail: "flopi@lektor.cl",
    },
    {
      titulo: "El hobbit",
      autor: "J.R.R. Tolkien",
      editorial: "Alianza",
      categoria: "Libros",
      condicion: "Usado - Muy buen estado",
      precio: 16900,
      stock: 1,
      isbn: "9788486299787",
      descripcion: "El viaje de Bilbo. Ilustrado clásico de Alianza, tapa sin roturas.",
      vendedorEmail: "cami@lektor.cl",
    },
    {
      titulo: "Neuromante",
      autor: "William Gibson",
      editorial: "Debolsillo",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 10900,
      stock: 2,
      isbn: "9788498925896",
      descripcion: "El wetware y el ciberspace. Ejemplar sin leer.",
      vendedorEmail: "fran@lektor.cl",
    },
    {
      titulo: "Los detectives salvajes",
      autor: "Roberto Bolaño",
      editorial: "Anagrama",
      categoria: "Libros",
      condicion: "Como nuevo",
      precio: 13900,
      stock: 1,
      isbn: "9788433997093",
      descripcion: "Poetas jóvenes y una mujer desaparecida. Crónica generacional.",
      vendedorEmail: "heli@lektor.cl",
    },
    {
      titulo: "El túnel",
      autor: "Ernesto Sabato",
      editorial: "Sudamericana",
      categoria: "Libros",
      condicion: "Usado - Aceptable",
      precio: 7900,
      stock: 0,
      isbn: "9789500717648",
      descripcion: "Último ejemplar: lomo con grietas y notas al margen de un dueño anterior.",
      vendedorEmail: "patrik@lektor.cl",
    },
    {
      titulo: "Yokohama Kaidashi Kikō",
      autor: "Hideki Ohwada",
      editorial: "Planeta Manga",
      volumen: 1,
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: 12900,
      stock: 1,
      isbn: "9788409500062",
      descripcion: "El autostopista y el café que vuela. El vendedor lo pausa mientras lo busca.",
      vendedorEmail: "tati@lektor.cl",
      pausada: true,
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
          vendedorId: byEmail[p.vendedorEmail]!.id,
          // La pausa se decide en el seed: el catálogo tiene que mostrar también
          // una publicación detenida y no solo las activas y las agotadas.
          estado: p.pausada ? "pausada" : p.stock > 0 ? "activa" : "agotada",
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
      {
        publication: catalogue.find((p) => p.titulo === "One Piece Vol. 1" && p.stock > 0),
        compradorEmail: "vale@lektor.cl",
        estado: "recibida",
        metodoEntrega: "envio_domicilio",
        direccion: "Calle Los Alerces 2210, Depto. 51",
        comuna: "Rancagua",
        region: "Región de O'Higgins",
        puntoRetiro: null,
        horas: 120,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Jujutsu Kaisen Vol. 1" && p.stock > 0),
        compradorEmail: "nico@lektor.cl",
        estado: "recibida",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Concepción",
        region: "Región del Biobío",
        puntoRetiro: "Biblioteca de Concepción",
        horas: 200,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Dune" && p.stock > 0),
        compradorEmail: "camila@lektor.cl",
        estado: "recibida",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Apoquindo 4500, Of. 1102",
        comuna: "Las Condes",
        region: "Región Metropolitana",
        puntoRetiro: null,
        horas: 260,
      },
      {
        publication: catalogue.find((p) => p.titulo === "El nombre del viento" && p.stock > 0),
        compradorEmail: "felipe@lektor.cl",
        estado: "recibida",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Viña del Mar",
        region: "Región de Valparaíso",
        puntoRetiro: "Puesto 14, Feria del Libro de Viña",
        horas: 320,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Death Note Vol. 1" && p.stock > 0),
        compradorEmail: "otaku@lektor.cl",
        estado: "recibida",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Brasil 1200, Depto. 33",
        comuna: "Rancagua",
        region: "Región de O'Higgins",
        puntoRetiro: null,
        horas: 400,
      },
      {
        publication: catalogue.find((p) => p.titulo === "1984" && p.stock > 0),
        compradorEmail: "jorge@lektor.cl",
        estado: "recibida",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Argentina 210, Of. 7",
        comuna: "Antofagasta",
        region: "Región de Antofagasta",
        puntoRetiro: null,
        horas: 460,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Vinland Saga Vol. 1" && p.stock > 0),
        compradorEmail: "flopi@lektor.cl",
        estado: "reservada",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Puerto Montt",
        region: "Región de Los Lagos",
        puntoRetiro: "Librería La Provechienta, Puerto Montt",
        horas: 1,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Naruto Vol. 1" && p.stock > 0),
        compradorEmail: "dani@lektor.cl",
        estado: "cancelada",
        motivoCancelacion: "El comprador no retiró el ejemplar a tiempo",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Copiapó 745, Depto. 12",
        comuna: "Copiapó",
        region: "Región de Atacama",
        puntoRetiro: null,
        horas: 60,
      },
      {
        publication: catalogue.find((p) => p.titulo === "El túnel" && p.stock > 0),
        compradorEmail: "heli@lektor.cl",
        estado: "cancelada",
        motivoCancelacion: "El comprador ya había encontrado otra copia",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. 18 de Septiembre 322, Of. 4",
        comuna: "Arica",
        region: "Región de Arica y Parinacota",
        puntoRetiro: null,
        horas: 6,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Blame! Vol. 1" && p.stock > 0),
        compradorEmail: "beto@lektor.cl",
        estado: "cancelada",
        motivoCancelacion: "El vendedor encontró su ejemplar en la bodega",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Chillán",
        region: "Región del Ñuble",
        puntoRetiro: "Punto 3, Feria de Chillán",
        horas: 10,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Berserk" && p.stock > 0),
        compradorEmail: "tati@lektor.cl",
        estado: "en_preparacion",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Temuco",
        region: "Región de La Araucanía",
        puntoRetiro: "Librería La Cordillera, Temuco",
        horas: 5,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Chainsaw Man Vol. 2" && p.stock > 0),
        compradorEmail: "beto@lektor.cl",
        estado: "en_preparacion",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Argentina 55, Depto. 903",
        comuna: "Chillán",
        region: "Región del Ñuble",
        puntoRetiro: null,
        horas: 8,
      },
      {
        publication: catalogue.find((p) => p.titulo === "The Sandman Vol. 1" && p.stock > 0),
        compradorEmail: "gabi@lektor.cl",
        estado: "despachada",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Recoleta 1290, Of. 55",
        comuna: "La Serena",
        region: "Región de Coquimbo",
        puntoRetiro: null,
        horas: 20,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Ms. Marvel Vol. 1" && p.stock > 0),
        compradorEmail: "gabi@lektor.cl",
        estado: "recibida",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Recoleta 1290, Of. 55",
        comuna: "La Serena",
        region: "Región de Coquimbo",
        puntoRetiro: null,
        horas: 80,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Maus: Un ratón bueno" && p.stock > 0),
        compradorEmail: "cami@lektor.cl",
        estado: "recibida",
        metodoEntrega: "envio_domicilio",
        direccion: "Av. Rodríguez 411, Depto. 2",
        comuna: "Osorno",
        region: "Región de Los Lagos",
        puntoRetiro: null,
        horas: 120,
      },
      {
        publication: catalogue.find((p) => p.titulo === "My Hero Academia Vol. 1" && p.stock > 0),
        compradorEmail: "heli@lektor.cl",
        estado: "recibida",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Arica",
        region: "Región de Arica y Parinacota",
        puntoRetiro: "Librería El Poeta, Arica",
        horas: 160,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Fullmetal Alchemist Vol. 1" && p.stock > 0),
        compradorEmail: "patrik@lektor.cl",
        estado: "recibida",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Curicó",
        region: "Región del Maule",
        puntoRetiro: "Librería El Lector, Curicó",
        horas: 200,
      },
      {
        publication: catalogue.find((p) => p.titulo === "Berserk" && p.stock > 0),
        compradorEmail: "tati@lektor.cl",
        estado: "recibida",
        metodoEntrega: "retiro_punto",
        direccion: null,
        comuna: "Temuco",
        region: "Región de La Araucanía",
        puntoRetiro: "Librería La Cordillera, Temuco",
        horas: 240,
      },
    ].filter((order) => order.publication && byEmail[order.compradorEmail])

    for (const order of demoOrders) {
      const publication = order.publication!
      const comprador = byEmail[order.compradorEmail]!
      const createdAt = new Date(Date.now() - order.horas * 60 * 60 * 1000)
      const envio = order.metodoEntrega === "retiro_punto" ? 0 : 3500

      const [ordenCreada] = await db
        .insert(schema.orders)
        .values({
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
      .returning({ id: schema.orders.id })

      const orderId = ordenCreada!.id

      await db.insert(schema.notifications).values({
        userId: publication.vendedorId,
        tipo: "nueva_orden",
        titulo: `Nueva orden por ${publication.titulo}`,
        cuerpo: `${comprador.nombre} reservó un ejemplar. Coordina la entrega usando ${comprador.telefono ?? "el teléfono registrado"}.`,
        datos: { orderId, publicacionId: publication.id, compradorId: comprador.id },
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

      if (order.estado === "cancelada") {
        await db.insert(schema.notifications).values({
          userId: comprador.id,
          tipo: "orden_cancelada",
          titulo: `Orden por ${publication.titulo}: Cancelada`,
          cuerpo: `${order.motivoCancelacion ?? "La orden se canceló."} El ejemplar volvió al catálogo.`,
          datos: { orderId, publicacionId: publication.id, vendedorId: publication.vendedorId },
        })
      }
    }
  }

  /**
   * Las valoraciones no se inventan: se escriben sobre órdenes que ya están
   * recibidas, que es la única forma de que la nota sea real. El guion va por
   * título de publicación y las notas mezclan estrellas altas con una baja, para
   * que las barras del resumen tengan algo que enseñar.
   */
  const [reviewCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.reviews)

  if (!reviewCount || reviewCount.total === 0) {
    const recibidas = await db
      .select({
        id: schema.orders.id,
        publicacionId: schema.orders.publicacionId,
        compradorId: schema.orders.compradorId,
        vendedorId: schema.orders.vendedorId,
        titulo: schema.orders.tituloSnapshot,
      })
      .from(schema.orders)
      .where(eq(schema.orders.estado, "recibida"))

    const guiones: Record<string, { puntaje: number }> = {
      "Hábitos Atómicos": { puntaje: 5 },
      "One Piece Vol. 1": { puntaje: 5 },
      "Jujutsu Kaisen Vol. 1": { puntaje: 4 },
      Dune: { puntaje: 5 },
      "El nombre del viento": { puntaje: 3 },
      "Death Note Vol. 1": { puntaje: 4 },
      "1984": { puntaje: 5 },
      "Ms. Marvel Vol. 1": { puntaje: 4 },
      "Maus: Un ratón bueno": { puntaje: 5 },
      "My Hero Academia Vol. 1": { puntaje: 5 },
      "Fullmetal Alchemist Vol. 1": { puntaje: 4 },
      "Berserk": { puntaje: 4 },
    }

    const nombrePorId = new Map(all.map((u) => [u.id, u.nombre]))

    for (const orden of recibidas) {
      const guion = guiones[orden.titulo]
      // Una orden puede quedar sin publicación si esta se borró: sin ella no hay
      // contra qué colgar la valoración.
      if (!guion || !orden.publicacionId) continue
      const [creada] = await db
        .insert(schema.reviews)
        .values({
          orderId: orden.id,
          autorId: orden.compradorId,
          publicacionId: orden.publicacionId,
          vendedorId: orden.vendedorId,
          puntaje: guion.puntaje,
        })
        .returning({ id: schema.reviews.id })

      const compradorNombre = nombrePorId.get(orden.compradorId) ?? "Un lector"

      await db.insert(schema.notifications).values({
        userId: orden.vendedorId,
        tipo: "nueva_valoracion",
        titulo: `${compradorNombre} valoración ${orden.titulo}`,
        cuerpo: `${guion.puntaje} de 5`,
        datos: { publicacionId: orden.publicacionId, reviewId: creada.id },
      })
    }

    await db.execute(sql`
      update publications
      set rating = (
            select round(avg(reviews.puntaje), 1)
            from reviews
            where reviews.publicacion_id = publications.id and reviews.visible
          ),
          rating_count = (
            select count(*)
            from reviews
            where reviews.publicacion_id = publications.id and reviews.visible
          )`)
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
        { titulo: "My Hero Academia Vol. 1", tipo: "entrada", cantidad: 3, horas: 26, motivo: "Ingreso desde bodega" },
        { titulo: "Dune", tipo: "salida", cantidad: 1, horas: 40, motivo: "Ejemplar vendido" },
        { titulo: "Vagabond Vol. 1", tipo: "salida", cantidad: 1, horas: 2, motivo: "Ejemplar reservado para venta" },
        { titulo: "Rayuela", tipo: "ajuste", cantidad: 1, horas: 18, motivo: "Inventario físico: un ejemplar menos" },
        { titulo: "Naruto Vol. 1", tipo: "salida", cantidad: 1, horas: 20, motivo: "Ejemplar reservado para venta" },
        { titulo: "Chainsaw Man Vol. 2", tipo: "salida", cantidad: 1, horas: 12, motivo: "Ejemplar reservado para venta" },
        { titulo: "The Sandman Vol. 1", tipo: "salida", cantidad: 1, horas: 22, motivo: "Ejemplar vendido" },
        { titulo: "Ms. Marvel Vol. 1", tipo: "salida", cantidad: 1, horas: 84, motivo: "Ejemplar vendido" },
        { titulo: "Maus: Un ratón bueno", tipo: "salida", cantidad: 1, horas: 124, motivo: "Ejemplar vendido" },
        { titulo: "My Hero Academia Vol. 1", tipo: "salida", cantidad: 1, horas: 164, motivo: "Ejemplar vendido" },
        { titulo: "Fullmetal Alchemist Vol. 1", tipo: "salida", cantidad: 1, horas: 204, motivo: "Ejemplar vendido" },
        { titulo: "Berserk", tipo: "salida", cantidad: 1, horas: 244, motivo: "Ejemplar vendido" },
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

  /**
   * Conversaciones previas y chat de órdenes: los dos hilos son privados y solo
   * los ven las personas de cada par, así que el seed los escribe con el mismo
   * par comprador/vendedor que usaría la aplicación. La conversación es única
   * por publicación y comprador, el chat por orden: se comprueba antes de
   * insertar para que volver a correr el seed no duplique mensajes.
   */
  const [mensajeCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.conversacionMensajes)

  if (!mensajeCount || mensajeCount.total === 0) {
    const publicacionesDemo = await db
      .select({
        id: schema.publications.id,
        titulo: schema.publications.titulo,
        vendedorId: schema.publications.vendedorId,
      })
      .from(schema.publications)

    const compradorPorPublicacion = new Map(publicacionesDemo.map((p) => [p.titulo, p.vendedorId]))
    const nombrePorUsuario = new Map(all.map((u) => [u.id, u.nombre]))

    const consultas: DemoConversacion[] = [
      {
        titulo: "Yokohama Kaidashi Kikō",
        compradorEmail: "flopi@lektor.cl",
        horas: 30,
        mensajes: [
          { de: "comprador", texto: "Hola, ¿el tomo viene con la contraportada original?" },
          { de: "vendedor", texto: "Sí, es la primera edición de Planeta, con contraportada." },
          { de: "comprador", texto: "Perfecto, lo compro entonces." },
        ],
      },
      {
        titulo: "Blame! Vol. 1",
        compradorEmail: "patrik@lektor.cl",
        horas: 8,
        mensajes: [
          { de: "comprador", texto: "¿Tienes el original en japonés o solo la traducción?" },
          { de: "vendedor", texto: "Solo la traducción, es la edición de ECC." },
        ],
      },
      {
        titulo: "Hunter x Hunter Vol. 1",
        compradorEmail: "cami@lektor.cl",
        horas: 4,
        mensajes: [
          { de: "comprador", texto: "¿Aceptas despacho a Osorno? El sistema me ordena por número." },
        ],
      },
    ]

    for (const consulta of consultas) {
      const vendedorId = compradorPorPublicacion.get(consulta.titulo)
      const comprador = byEmail[consulta.compradorEmail]
      const publicacion = publicacionesDemo.find((p) => p.titulo === consulta.titulo)

      if (!vendedorId || !comprador || !publicacion || vendedorId === comprador.id) continue
      if (contactoIniciado.has(`${publicacion.id}:${comprador.id}`)) continue

      const [conversacion] = await db
        .insert(schema.conversaciones)
        .values({
          publicacionId: publicacion.id,
          compradorId: comprador.id,
          vendedorId,
          actualizadoEn: new Date(Date.now() - (consulta.horas - 1) * 60 * 60 * 1000),
        })
        .returning({ id: schema.conversaciones.id })

      if (!conversacion) continue
      contactoIniciado.add(`${publicacion.id}:${comprador.id}`)

      for (const [indice, mensaje] of consulta.mensajes.entries()) {
        const emisor = mensaje.de === "comprador" ? comprador.id : vendedorId
        const fecha = new Date(Date.now() - (consulta.horas - indice) * 60 * 60 * 1000)

        await db.insert(schema.conversacionMensajes).values({
          conversacionId: conversacion.id,
          userId: emisor,
          mensaje: mensaje.texto,
          fechaCreacion: fecha,
        })

        // El aviso le llega a la otra persona, como en `lib/conversaciones.ts`.
        await db.insert(schema.notifications).values({
          userId: mensaje.de === "comprador" ? vendedorId : comprador.id,
          tipo: "contacto",
          titulo: `Nuevo mensaje por ${publicacion.titulo}`,
          cuerpo: `${nombrePorUsuario.get(emisor) ?? "Alguien"}: ${mensaje.texto.slice(0, 140)}`,
          datos: { conversacionId: conversacion.id, publicacionId: publicacion.id },
        })
      }
    }

    const ordenesParaChat = await db
      .select({
        id: schema.orders.id,
        titulo: schema.orders.tituloSnapshot,
        compradorId: schema.orders.compradorId,
        vendedorId: schema.orders.vendedorId,
        estado: schema.orders.estado,
      })
      .from(schema.orders)

    const chats: DemoChat[] = [
      {
        titulo: "Chainsaw Man Vol. 1",
        estado: "despachada",
        horas: 4,
        mensajes: [
          { de: "vendedor", texto: "Ya despaché el tomo por Chilexpress." },
          { de: "comprador", texto: "Buenísimo, ¿me mandas el número de seguimiento?" },
          { de: "vendedor", texto: "Sí, te lo mando ahora." },
        ],
      },
      {
        titulo: "Fullmetal Alchemist Vol. 1",
        estado: "recibida",
        horas: 40,
        mensajes: [
          { de: "vendedor", texto: "Te aviso que ya salió hacia tu dirección." },
          { de: "comprador", texto: "Recibido, gracias por el cuidado del tomo." },
        ],
      },
    ]

    for (const chat of chats) {
      const orden = ordenesParaChat.find((o) => o.titulo === chat.titulo && o.estado === chat.estado)
      if (!orden) continue
      if (chatIniciado.has(orden.id)) continue
      chatIniciado.add(orden.id)

      for (const [indice, mensaje] of chat.mensajes.entries()) {
        await db.insert(schema.chatMessages).values({
          orderId: orden.id,
          userId: mensaje.de === "comprador" ? orden.compradorId : orden.vendedorId,
          mensaje: mensaje.texto,
          fechaCreacion: new Date(Date.now() - (chat.horas - indice) * 60 * 60 * 1000),
        })
      }
    }
  }

  const [resumenReviews] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.reviews)

  const [resumenOrdenes] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.orders)

  const [resumenContactos] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.conversaciones)

  const [resumenChats] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.chatMessages)

  const [resumenMovimientos] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.stockMovements)

  console.log(
    "Seed OK:",
    demoUsers.length,
    "usuarios, catálogo con",
    seedPublications.length,
    "publicaciones (",
    freshPublications.length,
    "nuevas, ya existentes:",
    seedPublications.length - freshPublications.length,
    "), órdenes:",
    resumenOrdenes?.total ?? 0,
    ", valoraciones:",
    resumenReviews?.total ?? 0,
    ", contactos previos:",
    resumenContactos?.total ?? 0,
    ", mensajes de chat:",
    resumenChats?.total ?? 0,
    ", movimientos de stock:",
    resumenMovimientos?.total ?? 0,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })