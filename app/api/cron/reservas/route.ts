import { fail, jsonError, ok } from "@/lib/api"
import { sweepExpiredReservations } from "@/lib/orders"

export async function GET(request: Request) {
  try {
    // Sin secreto configurado el endpoint queda cerrado: si se dejara abierto,
    // cualquiera podría disparar el barrido de reservas.
    const secreto = process.env.CRON_SECRET
    if (!secreto) {
      return jsonError(
        "sin-configuracion",
        "CRON_SECRET no está configurado en el servidor",
        503,
      )
    }

    const enviado = request.headers.get("authorization")
    if (enviado !== `Bearer ${secreto}`) {
      return jsonError("no-autorizado", "Falta el encabezado Authorization con el secreto del cron", 401)
    }

    const canceladas = await sweepExpiredReservations()
    return ok({ canceladas })
  } catch (error) {
    return fail(error)
  }
}
