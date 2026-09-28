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

export async function clientIp(): Promise<string> {
  const store = await headers()
  // Solo los encabezados que fija la plataforma se consideran confiables; x-forwarded-for
  // es controlado por el cliente y se usa únicamente como último recurso.
  const confiables = [
    store.get("x-vercel-forwarded-for"),
    store.get("cf-connecting-ip"),
    store.get("fly-client-ip"),
    store.get("x-real-ip"),
  ]
  for (const valor of confiables) {
    const ip = primeraIp(valor)
    if (ip) return ip
  }
  return primeraIp(store.get("x-forwarded-for")) ?? "desconocido"
}
