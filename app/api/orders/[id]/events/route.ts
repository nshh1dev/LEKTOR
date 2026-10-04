import { requireSession } from "@/lib/auth"
import { fail, ok } from "@/lib/api"
import { getOrderEvents } from "@/lib/orders"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession()
    const { id } = await context.params
    return ok({ events: await getOrderEvents(id, user) })
  } catch (error) {
    return fail(error)
  }
}