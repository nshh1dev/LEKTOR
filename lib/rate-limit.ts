import "server-only"

import { headers } from "next/headers"

import { limiteExcedido, olvidar, rateLimit } from "@/lib/rate-limit-store"
import type { ResultadoLimite } from "@/lib/rate-limit-store"

export { limiteExcedido, olvidar, rateLimit }
export type { ResultadoLimite }

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

function esIp(valor: string): boolean {
  if (IPV4.test(valor)) return true
  return /^[0-9a-f:]+$/i.test(valor) && valor.includes(":")
}

function primeraIp(valor: string | null | undefined): string | null {
  for (const parte of (valor ?? "").split(",")) {
    const candidata = parte.trim()
    if (candidata && esIp(candidata)) return candidata
  }
  return null
}

/**
 * Cabeceras que fija la plataforma cuando hay un proxy delante. Si no hay proxy que las
 * reescriba, cualquiera puede mandarlas, así que no se leen salvo que `TRUST_PROXY=1`
 * confirme que el despliegue está detrás de uno.
 */
const CABECERAS_DE_PLATAFORMA = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "fly-client-ip",
  "x-real-ip",
]

/**
 * Sin un proxy declarado no hay ninguna IP creíble: `x-forwarded-for` y `x-real-ip` las
 * elige el cliente, así que girar una de ellas dejaría sin efecto todos los topes. En ese
 * caso se devuelve una sola identidad y los límites por IP pasan a ser globales por
 * proceso, que es el intercambio correcto: peor un tope compartido que uno que no tope.
 */
export async function clientIp(): Promise<string> {
  const store = await headers()
  if (process.env.TRUST_PROXY !== "1") return "desconocido"
  for (const nombre of CABECERAS_DE_PLATAFORMA) {
    const ip = primeraIp(store.get(nombre))
    if (ip) return ip
  }
  return primeraIp(store.get("x-forwarded-for")) ?? "desconocido"
}
