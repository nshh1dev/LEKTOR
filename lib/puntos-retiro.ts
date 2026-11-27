import catalogo from "@/data/puntos-retiro.json"
import { type Courier, type PuntoRetiro } from "@/lib/couriers"

export const PUNTOS_RETIRO = catalogo.puntos as PuntoRetiro[]
export const FUENTES_RETIRO = catalogo.fuentes
const porId = new Map(PUNTOS_RETIRO.map((punto) => [punto.id, punto]))
const normalizar = (valor: string) => valor.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase()

export function puntoRetiroPorId(id: string, courier: Courier): PuntoRetiro | null {
  const punto = porId.get(id)
  return punto?.courier === courier ? punto : null
}

export function buscarPuntosRetiro({ courier, q = "", comuna = "", region = "" }: {
  courier: Courier; q?: string; comuna?: string; region?: string
}) {
  const palabras = normalizar(q).split(/\s+/).filter(Boolean)
  const resultados = PUNTOS_RETIRO.filter((punto) =>
    punto.courier === courier &&
    (!comuna || normalizar(punto.comuna) === normalizar(comuna)) &&
    (!region || normalizar(punto.region) === normalizar(region)) &&
    palabras.every((palabra) => normalizar(`${punto.nombre} ${punto.direccion} ${punto.comuna}`).includes(palabra)))
  return { puntos: resultados.slice(0, 30), total: resultados.length }
}
