import { ApiError, requireSession } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"
import { clientIp, limiteExcedido, rateLimit } from "@/lib/rate-limit"
import {
  MIN_CARACTERES_DIRECCION,
  normalizarSugerencias,
  urlPhoton,
  type SugerenciaDireccion,
} from "@/lib/geocodificacion"

const CACHE_MS = 10 * 60 * 1000
const MAX_CACHE = 200

type Entrada = { sugerencias: SugerenciaDireccion[]; expira: number }

const cache = new Map<string, Entrada>()

function leerCache(clave: string): SugerenciaDireccion[] | null {
  const entrada = cache.get(clave)
  if (!entrada) return null
  if (entrada.expira <= Date.now()) {
    cache.delete(clave)
    return null
  }
  return entrada.sugerencias
}

function guardarCache(clave: string, sugerencias: SugerenciaDireccion[]): void {
  if (cache.size >= MAX_CACHE) {
    const masVieja = cache.keys().next().value
    if (masVieja) cache.delete(masVieja)
  }
  cache.set(clave, { sugerencias, expira: Date.now() + CACHE_MS })
}

/**
 * Autocompletado de direcciones para el checkout. Consulta Photon (OpenStreetMap) por
 * detrás para no exponer al proveedor ni gastar una consulta por tecla: la respuesta se
 * cachea diez minutos y solo las consultas que salen a internet consumen el tope por IP.
 */
export async function GET(request: Request) {
  try {
    await requireSession()

    const params = new URL(request.url).searchParams
    const texto = (params.get("q") ?? "").trim().slice(0, 120)
    if (texto.length < MIN_CARACTERES_DIRECCION) return ok({ sugerencias: [] })

    const region = (params.get("region") ?? "").trim().slice(0, 80) || null
    const comuna = (params.get("comuna") ?? "").trim().slice(0, 80) || null
    const clave = `${texto.toLowerCase()}|${region ?? ""}|${comuna ?? ""}`

    const desdeCache = leerCache(clave)
    if (desdeCache) return ok({ sugerencias: desdeCache })

    const ip = await clientIp()
    const limite = rateLimit(`geo:${ip}`, { limite: 300, ventanaMs: 5 * 60 * 1000 })
    if (!limite.permitido) {
      const excedido = limiteExcedido(limite.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }

    const respuesta = await fetch(urlPhoton(texto), {
      headers: { Accept: "application/json", "User-Agent": "LEKTOR/1.0 (marketplace de libros)" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    })
    if (!respuesta.ok) {
      throw new ApiError(502, "geocodificador", "No pudimos buscar direcciones: escríbela a mano")
    }

    const sugerencias = normalizarSugerencias(await respuesta.json(), { region, comuna })
    guardarCache(clave, sugerencias)
    return ok({ sugerencias })
  } catch (error) {
    return fail(error)
  }
}
