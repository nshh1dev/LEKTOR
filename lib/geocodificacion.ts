import { REGIONES } from "@/lib/catalog"
import { comunaDelCatalogo, regionDeComuna, type Region } from "@/lib/comunas"

const PHOTON_URL = "https://photon.komoot.io/api/"
const LIMITE_PHOTON = 15

/** Menos de cuatro letras devuelve medio país y no ayuda a nadie. */
export const MIN_CARACTERES_DIRECCION = 4
export const MAX_SUGERENCIAS = 6

export type ContextoDireccion = { comuna?: string | null; region?: string | null }

export type SugerenciaDireccion = {
  id: string
  /** Lo que se muestra en la lista: «Avenida Providencia 1234 · Providencia, Región Metropolitana». */
  etiqueta: string
  /** Lo que se escribe en el campo al elegirla: «Avenida Providencia 1234». */
  direccion: string
  calle: string
  numero: string | null
  comuna: string | null
  region: Region | null
}

type PropiedadesPhoton = {
  osm_type?: string
  osm_id?: number
  type?: string
  name?: string
  street?: string
  housenumber?: string
  city?: string
  district?: string
  county?: string
  state?: string
  countrycode?: string
}

type CaracteristicaPhoton = { properties?: PropiedadesPhoton }

/** Solo calles y números: una ciudad o una provincia no son una dirección de despacho. */
const TIPOS_DE_DIRECCION = new Set(["house", "street"])

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
}

/**
 * Photon no acepta `lang=es` (solo default, de, en y fr) y los nombres de Chile vienen tal
 * cual están en OpenStreetMap, así que se consulta sin idioma y se acota al país. La comuna
 * —o, si no hay, la región— entra en el texto para que el proveedor priorice ese lugar:
 * sin eso, una calle común devuelve homónimas de todo Chile y el filtro posterior las
 * descarta todas.
 */
export function urlPhoton(texto: string, contexto: ContextoDireccion = {}): string {
  const comuna = (contexto.comuna ?? "").trim()
  const region = (contexto.region ?? "").trim()
  const params = new URLSearchParams({
    q: [texto.trim(), comuna || region, "Chile"].filter(Boolean).join(", "),
    limit: String(LIMITE_PHOTON),
  })
  return `${PHOTON_URL}?${params.toString()}`
}

/**
 * La comuna que el catálogo reconoce, con su nombre canónico. El distrito es más preciso
 * que la ciudad —«Rancagua Sur» es un barrio y «Rancagua» la comuna—, así que se prueba
 * primero el distrito. La provincia nunca cuenta: `county` agrupa varias comunas.
 */
function comunaDe(propiedades: PropiedadesPhoton): string | null {
  for (const candidata of [propiedades.district, propiedades.city]) {
    const limpia = (candidata ?? "").trim()
    const reconocida = limpia ? comunaDelCatalogo(limpia) : null
    if (reconocida) return reconocida
  }
  const referencia = (propiedades.district ?? propiedades.city ?? "").trim()
  return referencia || null
}

function regionDe(propiedades: PropiedadesPhoton, comuna: string | null): Region | null {
  const porComuna = comuna ? regionDeComuna(comuna) : null
  if (porComuna) return porComuna
  const estado = normalizar(propiedades.state ?? "")
  if (!estado) return null
  // OpenStreetMap agrega o quita piezas del nombre: «Región Metropolitana de Santiago» y
  // «Región Aysén del General…» son las mismas regiones del catálogo.
  return (
    REGIONES.find((region) => normalizar(region) === estado) ??
    REGIONES.find((region) => estado.includes(normalizar(region.replace(/^Región (de |del )?/, "")))) ??
    null
  )
}

function etiquetaDe(
  calle: string,
  numero: string | null,
  comuna: string | null,
  region: Region | null,
): string {
  const via = [calle, numero].filter(Boolean).join(" ")
  const lugar = [comuna, region].filter(Boolean).join(", ")
  return [via, lugar].filter(Boolean).join(" · ")
}

function mapear(caracteristica: CaracteristicaPhoton, indice: number): SugerenciaDireccion | null {
  const propiedades = caracteristica.properties
  if (!propiedades || propiedades.countrycode !== "CL") return null
  if (!TIPOS_DE_DIRECCION.has(propiedades.type ?? "")) return null

  const nombre = (propiedades.name ?? "").trim()
  const calle = (propiedades.street ?? "").trim() || (propiedades.type === "street" ? nombre : "")
  if (!calle) return null

  const numero = (propiedades.housenumber ?? "").trim() || null
  const comuna = comunaDe(propiedades)
  const region = regionDe(propiedades, comuna)
  const id = [propiedades.osm_type ?? "n", propiedades.osm_id ?? indice, indice].join("-")

  return {
    id,
    etiqueta: etiquetaDe(calle, numero, comuna, region),
    direccion: [calle, numero].filter(Boolean).join(" "),
    calle,
    numero,
    comuna,
    region,
  }
}

/**
 * Convierte la respuesta de Photon en las sugerencias que ve la persona. Descarta lo que no
 * es de Chile ni una calle, quita las repeticiones que trae el proveedor y acota a la
 * ubicación elegida: solo la comuna si hay comuna, solo su región si no la hay. Nunca cae a
 * otras regiones ni a otras comunas: si no hay coincidencias, la lista queda vacía y quien
 * decide es la persona —cambiando la ubicación o escribiendo la dirección a mano—.
 */
export function normalizarSugerencias(
  payload: unknown,
  opciones: ContextoDireccion = {},
): SugerenciaDireccion[] {
  const caracteristicas = (payload as { features?: CaracteristicaPhoton[] } | null)?.features
  if (!Array.isArray(caracteristicas)) return []

  const vistas = new Set<string>()
  const sugerencias: SugerenciaDireccion[] = []
  for (const [indice, caracteristica] of caracteristicas.entries()) {
    const sugerencia = mapear(caracteristica, indice)
    if (!sugerencia) continue
    const clave = [sugerencia.calle, sugerencia.numero, sugerencia.comuna]
      .map((parte) => normalizar(parte ?? ""))
      .join("|")
    if (vistas.has(clave)) continue
    vistas.add(clave)
    sugerencias.push(sugerencia)
  }

  const comunaElegida = comunaDelCatalogo(opciones.comuna ?? "")
  // La comuna manda: si la región guardada no es la suya, la pareja está desalineada y se
  // filtra por la región de la comuna, que es el dato más específico.
  const regionElegida =
    (comunaElegida ? regionDeComuna(comunaElegida) : null) ??
    REGIONES.find((region) => region === (opciones.region ?? "").trim()) ??
    null

  return sugerencias
    .filter((sugerencia) => !regionElegida || sugerencia.region === regionElegida)
    .filter(
      (sugerencia) =>
        !comunaElegida ||
        (sugerencia.comuna !== null && comunaDelCatalogo(sugerencia.comuna) === comunaElegida),
    )
    .slice(0, MAX_SUGERENCIAS)
}
