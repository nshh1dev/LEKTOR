import { REGIONES } from "@/lib/catalog"
import { regionDeComuna, type Region } from "@/lib/comunas"

const PHOTON_URL = "https://photon.komoot.io/api/"
const LIMITE_PHOTON = 15

/** Menos de cuatro letras devuelve medio país y no ayuda a nadie. */
export const MIN_CARACTERES_DIRECCION = 4
export const MAX_SUGERENCIAS = 6

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
 * cual están en OpenStreetMap, así que se consulta sin idioma y se acota al país.
 */
export function urlPhoton(texto: string): string {
  const params = new URLSearchParams({
    q: `${texto.trim()}, Chile`,
    limit: String(LIMITE_PHOTON),
  })
  return `${PHOTON_URL}?${params.toString()}`
}

function comunaDe(propiedades: PropiedadesPhoton): string | null {
  const candidatas = [propiedades.district, propiedades.city, propiedades.county]
  for (const candidata of candidatas) {
    const limpia = (candidata ?? "").replace(/^Provincia de\s+/i, "").trim()
    // La comuna que sirve es la que el catálogo reconoce: "Rancagua Sur" es un distrito
    // de OpenStreetMap, no una comuna, y la que vale es la ciudad que viene al lado.
    if (limpia && regionDeComuna(limpia)) return limpia
  }
  const referencia = (propiedades.district ?? propiedades.city ?? "").trim()
  return referencia || null
}

function regionDe(propiedades: PropiedadesPhoton, comuna: string | null): Region | null {
  const porComuna = comuna ? regionDeComuna(comuna) : null
  if (porComuna) return porComuna
  const estado = (propiedades.state ?? "").trim()
  return REGIONES.find((region) => region === estado) ?? null
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
 * es de Chile ni una calle, quita las repeticiones que trae el proveedor y, si ya hay una
 * región elegida, deja solo esa región: si no hay ninguna coincidencia ahí, cae a todo el
 * país para que la lista no quede muerta.
 */
export function normalizarSugerencias(
  payload: unknown,
  opciones: { region?: string | null; comuna?: string | null } = {},
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

  const regionElegida = (opciones.region ?? "").trim()
  const deLaRegion = regionElegida
    ? sugerencias.filter((sugerencia) => sugerencia.region === regionElegida)
    : []
  const base = deLaRegion.length > 0 ? deLaRegion : sugerencias

  const comunaElegida = normalizar(opciones.comuna ?? "")
  const ordenadas = comunaElegida
    ? [...base].sort(
        (a, b) =>
          Number(normalizar(b.comuna ?? "") === comunaElegida) -
          Number(normalizar(a.comuna ?? "") === comunaElegida),
      )
    : base

  return ordenadas.slice(0, MAX_SUGERENCIAS)
}
