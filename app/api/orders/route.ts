import { ApiError, requireSession } from "@/lib/auth"
import { puntoRetiroPorId } from "@/lib/puntos-retiro"
import { created, fail, ok } from "@/lib/api"
import { orderCreateSchema, misOrdenesQuerySchema } from "@/lib/catalog"
import { createOrder, listOrders, programarBarrido } from "@/lib/orders"

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    programarBarrido()
    const params = new URL(request.url).searchParams
    const { rol, pagina, porPagina } = misOrdenesQuerySchema.parse({
      rol: params.get("rol") ?? undefined,
      pagina: params.get("pagina") ?? undefined,
      porPagina: params.get("porPagina") ?? undefined,
    })
    const { ordenes, paginacion } = await listOrders(user.id, rol, pagina, porPagina)
    return ok({ orders: ordenes, paginacion })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    const { publicacionId, datosDespacho } = orderCreateSchema.parse(await request.json())
    if (datosDespacho.metodoEntrega === "retiro_punto") {
      const punto = datosDespacho.courier && datosDespacho.puntoRetiroId
        ? puntoRetiroPorId(datosDespacho.puntoRetiroId, datosDespacho.courier)
        : null
      if (!punto) throw new ApiError(400, "punto-retiro-invalido", "Selecciona un punto de retiro válido para el transportista")
      datosDespacho.puntoRetiro = `${punto.nombre} · ${punto.direccion}`
      datosDespacho.comuna = punto.comuna
      datosDespacho.region = punto.region
    }
    const { order, vendedor } = await createOrder(user, publicacionId, datosDespacho)
    return created({ order, vendedor })
  } catch (error) {
    return fail(error)
  }
}
