import { REGIONES } from "@/lib/catalog"

/** Región tal como la nombra el catálogo, para no repetir la lista de 16 en otro lado. */
export type Region = (typeof REGIONES)[number]

/**
 * Las 346 comunas del país agrupadas por región. El campo de comuna del perfil, del
 * registro y del despacho es texto libre, así que este catálogo no obliga a nada: solo
 * sirve para sugerir y para deducir la región a partir de lo que la persona escribió.
 * Fuente: división territorial del INE, en orden alfabético.
 */
export const COMUNAS_POR_REGION: Record<Region, readonly string[]> = {
  "Región de Arica y Parinacota": [
    "Arica", "Camarones", "General Lagos", "Putre",
  ],
  "Región de Tarapacá": [
    "Alto Hospicio", "Camiña", "Colchane", "Huara", "Iquique", "Pica", "Pozo Almonte",
  ],
  "Región de Antofagasta": [
    "Antofagasta", "Calama", "María Elena", "Mejillones", "Ollagüe", "San Pedro de Atacama",
    "Sierra Gorda", "Taltal", "Tocopilla",
  ],
  "Región de Atacama": [
    "Alto del Carmen", "Caldera", "Chañaral", "Copiapó", "Diego de Almagro", "Freirina",
    "Huasco", "Tierra Amarilla", "Vallenar",
  ],
  "Región de Coquimbo": [
    "Andacollo", "Canela", "Combarbalá", "Coquimbo", "Illapel", "La Higuera", "La Serena",
    "Los Vilos", "Monte Patria", "Ovalle", "Paiguano", "Punitaqui", "Río Hurtado",
    "Salamanca", "Vicuña",
  ],
  "Región de Valparaíso": [
    "Algarrobo", "Cabildo", "Calera", "Calle Larga", "Cartagena", "Casablanca", "Catemu",
    "Concón", "El Quisco", "El Tabo", "Hijuelas", "Isla de Pascua", "Juan Fernández",
    "La Cruz", "La Ligua", "Limache", "Llaillay", "Los Andes", "Nogales", "Olmué",
    "Panquehue", "Papudo", "Petorca", "Puchuncaví", "Putaendo", "Quillota", "Quilpué",
    "Quintero", "Rinconada", "San Antonio", "San Esteban", "San Felipe", "Santa María",
    "Santo Domingo", "Valparaíso", "Villa Alemana", "Viña del Mar", "Zapallar",
  ],
  "Región Metropolitana": [
    "Alhué", "Buin", "Calera de Tango", "Cerrillos", "Cerro Navia", "Colina", "Conchalí",
    "Curacaví", "El Bosque", "El Monte", "Estación Central", "Huechuraba", "Independencia",
    "Isla de Maipo", "La Cisterna", "La Florida", "La Granja", "La Pintana", "La Reina",
    "Lampa", "Las Condes", "Lo Barnechea", "Lo Espejo", "Lo Prado", "Macul", "Maipú",
    "María Pinto", "Melipilla", "Ñuñoa", "Padre Hurtado", "Paine", "Pedro Aguirre Cerda",
    "Peñaflor", "Peñalolén", "Pirque", "Providencia", "Pudahuel", "Puente Alto",
    "Quilicura", "Quinta Normal", "Recoleta", "Renca", "San Bernardo", "San Joaquín",
    "San José de Maipo", "San Miguel", "San Pedro", "San Ramón", "Santiago Centro",
    "Talagante", "Tiltil", "Vitacura",
  ],
  "Región del Libertador General Bernardo O'Higgins": [
    "Chépica", "Chimbarongo", "Codegua", "Coinco", "Coltauco", "Doñihue", "Graneros",
    "La Estrella", "Las Cabras", "Litueche", "Lolol", "Machalí", "Malloa", "Marchihue",
    "Mostazal", "Nancagua", "Navidad", "Olivar", "Palmilla", "Paredones", "Peralillo",
    "Peumo", "Pichidegua", "Pichilemu", "Placilla", "Pumanque", "Quinta de Tilcoco",
    "Rancagua", "Rengo", "Requínoa", "San Fernando", "San Vicente", "Santa Cruz",
  ],
  "Región del Maule": [
    "Cauquenes", "Chanco", "Colbún", "Constitución", "Curepto", "Curicó", "Empedrado",
    "Hualañé", "Licantén", "Linares", "Longaví", "Maule", "Molina", "Parral", "Pelarco",
    "Pelluhue", "Pencahue", "Rauco", "Retiro", "Río Claro", "Romeral", "Sagrada Familia",
    "San Clemente", "San Javier", "San Rafael", "Talca", "Teno", "Vichuquén",
    "Villa Alegre", "Yerbas Buenas",
  ],
  "Región del Ñuble": [
    "Bulnes", "Chillán", "Chillán Viejo", "Cobquecura", "Coelemu", "Coihueco", "El Carmen",
    "Ninhue", "Ñiquén", "Pemuco", "Pinto", "Portezuelo", "Quillón", "Quirihue", "Ránquil",
    "San Carlos", "San Fabián", "San Ignacio", "San Nicolás", "Treguaco", "Yungay",
  ],
  "Región del Biobío": [
    "Alto Biobío", "Antuco", "Arauco", "Cabrero", "Cañete", "Chiguayante", "Concepción",
    "Contulmo", "Coronel", "Curanilahue", "Florida", "Hualpén", "Hualqui", "Laja", "Lebu",
    "Los Álamos", "Los Ángeles", "Lota", "Mulchén", "Nacimiento", "Negrete", "Penco",
    "Quilaco", "Quilleco", "San Pedro de la Paz", "San Rosendo", "Santa Bárbara",
    "Santa Juana", "Talcahuano", "Tirúa", "Tomé", "Tucapel", "Yumbel",
  ],
  "Región de La Araucanía": [
    "Angol", "Carahue", "Cholchol", "Collipulli", "Cunco", "Curacautín", "Curarrehue",
    "Ercilla", "Freire", "Galvarino", "Gorbea", "Lautaro", "Loncoche", "Lonquimay",
    "Los Sauces", "Lumaco", "Melipeuco", "Nueva Imperial", "Padre las Casas", "Perquenco",
    "Pitrufquén", "Pucón", "Purén", "Renaico", "Saavedra", "Temuco", "Teodoro Schmidt",
    "Toltén", "Traiguén", "Victoria", "Vilcún", "Villarrica",
  ],
  "Región de Los Ríos": [
    "Corral", "Futrono", "La Unión", "Lago Ranco", "Lanco", "Los Lagos", "Máfil",
    "Mariquina", "Paillaco", "Panguipulli", "Río Bueno", "Valdivia",
  ],
  "Región de Los Lagos": [
    "Ancud", "Calbuco", "Castro", "Chaitén", "Chonchi", "Cochamó", "Curaco de Vélez",
    "Dalcahue", "Fresia", "Frutillar", "Futaleufú", "Hualaihué", "Llanquihue",
    "Los Muermos", "Maullín", "Osorno", "Palena", "Puerto Montt", "Puerto Octay",
    "Puerto Varas", "Puqueldón", "Purranque", "Puyehue", "Queilén", "Quellón", "Quemchi",
    "Quinchao", "Río Negro", "San Juan de la Costa", "San Pablo",
  ],
  "Región de Aysén del General Carlos Ibáñez del Campo": [
    "Aysén", "Chile Chico", "Cisnes", "Cochrane", "Coihaique", "Guaitecas", "Lago Verde",
    "O’Higgins", "Río Ibáñez", "Tortel",
  ],
  "Región de Magallanes y de la Antártica Chilena": [
    "Antártica", "Cabo de Hornos", "Laguna Blanca", "Natales", "Porvenir", "Primavera",
    "Punta Arenas", "Río Verde", "San Gregorio", "Timaukel", "Torres del Paine",
  ],
}

function sinTildes(valor: string): string {
  return valor.normalize("NFD").replace(/\p{Diacritic}/gu, "")
}

function normalizar(valor: string): string {
  return sinTildes(valor.trim().toLowerCase())
}

/** Orden alfabético del español, que "localeCompare" no hace solo. */
function comparar(a: string, b: string): number {
  return a.localeCompare(b, "es")
}

function indexarComunas(): Map<string, Region | null> {
  const indice = new Map<string, Region | null>()
  for (const region of REGIONES) {
    for (const comuna of COMUNAS_POR_REGION[region]) {
      const clave = normalizar(comuna)
      indice.set(clave, indice.has(clave) ? null : region)
    }
  }
  return indice
}

const INDICE_REGION_POR_COMUNA = indexarComunas()

/** Las comunas de una región, como las presenta el índice del campo de comuna. */
export type GrupoComunas = {
  region: Region
  comunas: string[]
}

/**
 * El índice de comunas del campo: todas las del país, separadas por región y con el
 * nombre de la región arriba de cada bloque. Escrito algo, se filtra por ese texto
 * —sin tildes ni mayúsculas— y se recortan los grupos que quedan sin coincidencias. Con
 * la región elegida, su grupo va primero: es el que se está eligiendo.
 */
export function gruposComunas(
  texto: string,
  region: string | null | undefined,
  limite = 8,
): GrupoComunas[] {
  const busca = normalizar(texto)
  const grupos: GrupoComunas[] = []

  for (const nombre of REGIONES) {
    const candidatas = COMUNAS_POR_REGION[nombre].filter(
      (comuna) => busca === "" || normalizar(comuna).includes(busca),
    )
    if (candidatas.length === 0) continue
    if (busca !== "") {
      candidatas.sort((a, b) => {
        const inicio = Number(normalizar(b).startsWith(busca)) - Number(normalizar(a).startsWith(busca))
        return inicio !== 0 ? inicio : comparar(a, b)
      })
    }
    grupos.push({ region: nombre, comunas: candidatas })
  }

  if (region) {
    const indice = grupos.findIndex((grupo) => grupo.region === region)
    if (indice > 0) grupos.unshift(...grupos.splice(indice, 1))
  }

  if (busca === "") return grupos

  // Con texto escrito el país entero no cabe en una lista: se recorta el total y cada
  // bloque se lleva lo que queda, para que el resultado de otra región no desaparezca.
  const recortados: GrupoComunas[] = []
  let restantes = limite
  for (const grupo of grupos) {
    if (restantes <= 0) break
    const comuna = grupo.comunas.slice(0, restantes)
    restantes -= comuna.length
    recortados.push({ region: grupo.region, comunas: comuna })
  }
  return recortados
}

/**
 * La región de una comuna, si el nombre la identifica de forma única. Si no está en el
 * catálogo o si el nombre se repite en dos regiones, devuelve null y se deja que la
 * persona elija: adivinar sería peor que no proponer nada.
 */
export function regionDeComuna(comuna: string): Region | null {
  if (!comuna.trim()) return null
  return INDICE_REGION_POR_COMUNA.get(normalizar(comuna)) ?? null
}
