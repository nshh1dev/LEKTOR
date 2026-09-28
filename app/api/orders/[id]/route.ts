import { requireSession } from "@/lib/auth"
import { fail, ok, requireId } from "@/lib/api"
import { orderTransitionSchema } from "@/lib/catalog"
import { getOrderForUser, transitionOrder } from "@/lib/orders"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)
    const order = await getOrderForUser(id, user)
    return ok({ order })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)
    const { estado, motivo } = orderTransitionSchema.parse(await request.json())
    const order = await transitionOrder(id, user, estado, motivo)
    return ok({ order })
  } catch (error) {
    return fail(error)
  }
}
