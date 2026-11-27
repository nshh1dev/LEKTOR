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

/**
 * Ciudades principales por región, para el filtro de ubicación: una región se
 * elige y se despliegan las ciudades que importan de esa región, no las 346
 * comunas del catálogo. El orden define la prioridad visual: la capital va
 * primero y el resto siguen por importancia de ciudad.
 */
export const CIUDADES_PRINCIPALES: Record<Region, readonly string[]> = {
  "Región de Arica y Parinacota": ["Arica", "Putre"],
  "Región de Tarapacá": ["Iquique", "Alto Hospicio", "Pica"],
  "Región de Antofagasta": ["Antofagasta", "Calama", "Tocopilla"],
  "Región de Atacama": ["Copiapó", "Caldera", "Vallenar"],
  "Región de Coquimbo": ["La Serena", "Coquimbo", "Ovalle", "Illapel"],
  "Región de Valparaíso": ["Valparaíso", "Viña del Mar", "San Antonio", "Quilpué"],
  "Región Metropolitana": [
    "Santiago Centro", "Puente Alto", "Maipú", "La Florida", "Las Condes", "Providencia", "Ñuñoa",
  ],
  "Región del Libertador General Bernardo O'Higgins": ["Rancagua", "San Fernando", "Santa Cruz"],
  "Región del Maule": ["Talca", "Curicó", "Linares"],
  "Región del Ñuble": ["Chillán", "San Carlos", "Bulnes"],
  "Región del Biobío": ["Concepción", "Talcahuano", "Los Ángeles", "Coronel"],
  "Región de La Araucanía": ["Temuco", "Villarrica", "Angol", "Padre las Casas"],
  "Región de Los Ríos": ["Valdivia", "La Unión", "Río Bueno"],
  "Región de Los Lagos": ["Puerto Montt", "Osorno", "Ancud", "Castro"],
  "Región de Aysén del General Carlos Ibáñez del Campo": ["Coihaique", "Aysén", "Chile Chico"],
  "Región de Magallanes y de la Antártica Chilena": ["Punta Arenas", "Natales", "Cabo de Hornos"],
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

/** Clave indiferente a tildes, mayúsculas, espacios y puntuación: «Llay-Llay» = «llay llay». */
function claveDeComuna(valor: string): string {
  return normalizar(valor).replace(/[^a-z0-9]/g, "")
}

type ComunaIndexada = { comuna: string; region: Region | null }

function indexarComunas(): Map<string, ComunaIndexada> {
  const indice = new Map<string, ComunaIndexada>()
  for (const region of REGIONES) {
    for (const comuna of COMUNAS_POR_REGION[region]) {
      const clave = claveDeComuna(comuna)
      const previa = indice.get(clave)
      indice.set(clave, previa ? { comuna: previa.comuna, region: null } : { comuna, region })
    }
  }
  return indice
}

const INDICE_COMUNAS = indexarComunas()

/**
 * Cómo escribe otra fuente la misma comuna: OpenStreetMap dice «Santiago», «Coyhaique»,
 * «Puerto Natales» o «Llay-Llay» donde el catálogo dice «Santiago Centro», «Coihaique»,
 * «Natales» y «Llaillay». Sin esto, una dirección real queda sin comuna reconocida y su
 * región se pierde, que es lo que dejaba pasar sugerencias de otras regiones.
 */
export const EQUIVALENCIAS_COMUNA: Readonly<Record<string, string>> = {
  santiago: "Santiago Centro",
  coyhaique: "Coihaique",
  trehuaco: "Treguaco",
  lacalera: "Calera",
  llayllay: "Llaillay",
  paihuano: "Paiguano",
  aisen: "Aysén",
  puertoaysen: "Aysén",
  puertonatales: "Natales",
  sanvicentedetaguatagua: "San Vicente",
  sanjosedelamariquina: "Mariquina",
  elcarmenchillan: "El Carmen",
}

/** El nombre del catálogo para una comuna escrita como la escribe otra fuente, o null. */
export function comunaDelCatalogo(nombre: string): string | null {
  const clave = claveDeComuna(nombre)
  if (!clave) return null
  const directa = INDICE_COMUNAS.get(clave)
  if (directa) return directa.comuna
  const equivalente = EQUIVALENCIAS_COMUNA[clave]
  return equivalente ? INDICE_COMUNAS.get(claveDeComuna(equivalente))?.comuna ?? null : null
}

/** Las comunas de una región, como las presenta el índice del campo de comuna. */
export type GrupoComunas = {
  region: Region
  comunas: string[]
}

/**
 * El índice de comunas del campo. Con región elegida se abre el de esa región: son de 21 a
 * 58 comunas, no las 346 del país, y es lo que la persona está eligiendo. Sin región, se
 * muestran todas separadas por región, porque todavía no se sabe dónde está.
 *
 * Escrito algo, se filtra por ese texto —sin tildes ni mayúsculas—, se recortan los bloques
 * que quedan sin coincidencias y se limita el total. Con región elegida no se propone nada
 * de otras regiones: si lo escrito no está en la región que eligió, la lista queda vacía y
 * quien decide es la persona, cambiando la región.
 */
export function gruposComunas(
  texto: string,
  region: string | null | undefined,
  limite = 8,
): GrupoComunas[] {
  const busca = normalizar(texto)
  // Una región que no está en el catálogo no acota nada: se cae al país entero, que es mejor
  // que una lista vacía.
  const elegida = REGIONES.find((nombre) => nombre === region) ?? null
  const grupos = bloques(elegida ? [elegida] : REGIONES, busca)
  return busca === "" ? grupos : recortar(grupos, limite)
}

/** Un bloque por región, con sus comunas ya filtradas por el texto escrito. */
function bloques(regiones: readonly Region[], busca: string): GrupoComunas[] {
  const grupos: GrupoComunas[] = []
  for (const nombre of regiones) {
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
  return grupos
}

/** El país entero no cabe en una lista: se recorta el total y cada bloque se lleva lo que queda. */
function recortar(grupos: GrupoComunas[], limite: number): GrupoComunas[] {
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
  const canonica = comunaDelCatalogo(comuna)
  return canonica ? INDICE_COMUNAS.get(claveDeComuna(canonica))?.region ?? null : null
}
