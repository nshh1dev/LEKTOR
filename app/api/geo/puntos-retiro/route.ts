import { z } from "zod"
import { ok, fail } from "@/lib/api"
import { COURIERS_RETIRO } from "@/lib/couriers"
import { buscarPuntosRetiro, FUENTES_RETIRO } from "@/lib/puntos-retiro"

const consultaSchema = z.object({
  courier: z.enum(COURIERS_RETIRO),
  q: z.string().trim().max(100).default(""),
  comuna: z.string().trim().max(80).default(""),
  region: z.string().trim().max(80).default(""),
})

export function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const consulta = consultaSchema.parse(Object.fromEntries(params))
    return ok({
      ...buscarPuntosRetiro(consulta),
      fuente: FUENTES_RETIRO.find((fuente) => fuente.courier === consulta.courier),
    })
  } catch (error) {
    return fail(error)
  }
}
