import { requireSession } from "@/lib/auth"
import { created, fail, ok } from "@/lib/api"
import { orderCreateSchema } from "@/lib/catalog"
import { createOrder, listOrders, programarBarrido } from "@/lib/orders"

export async function GET(request: Request) {
  try {
    const user = await requireSession()
    programarBarrido()
    const rol = new URL(request.url).searchParams.get("rol") === "vendedor" ? "vendedor" : "comprador"
    const orders = await listOrders(user.id, rol)
    return ok({ orders })
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
