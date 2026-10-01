import { fail, ok, requireId } from "@/lib/api"
import { requireAdminUser } from "@/lib/panel"
import { moderarReviewSchema } from "@/lib/catalog"
import { moderarReview, reputacionDePublicacion } from "@/lib/reviews"

type Params = { params: Promise<{ id: string }> }

/** Ocultar una reseña la saca del promedio sin borrarla, para poder revisarla después. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminUser()
    const id = requireId((await params).id)
    const { visible } = moderarReviewSchema.parse(await request.json())
    const { publicacionId } = await moderarReview(id, visible)
    const reputacion = await reputacionDePublicacion(publicacionId)
    return ok({ visible, reputacion })
  } catch (error) {
    return fail(error)
  }
}
