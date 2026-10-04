import { requireSession } from "@/lib/auth"
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
    const { order, vendedor } = await createOrder(user, publicacionId, datosDespacho)
    return created({ order, vendedor })
  } catch (error) {
    return fail(error)
  }
}
