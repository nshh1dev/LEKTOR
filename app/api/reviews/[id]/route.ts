import { fail, ok, requireId } from "@/lib/api"
import { requireSession } from "@/lib/auth"
import { reviewUpdateSchema } from "@/lib/catalog"
import { editarReview, eliminarReview, reputacionDePublicacion } from "@/lib/reviews"

type Params = { params: Promise<{ id: string }> }

/** Editar o borrar es cosa de quien escribió la reseña, y el servidor lo comprueba. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)
    const datos = reviewUpdateSchema.parse(await request.json())
    const review = await editarReview(user, id, datos)
    const reputacion = await reputacionDePublicacion(review.publicacionId)
    return ok({ review, reputacion })
  } catch (error) {
    return fail(error)
  }
}

/** Al borrar también sale el promedio recalculado para que la barra no quede vieja. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)
    const { publicacionId } = await eliminarReview(user, id)
    const reputacion = await reputacionDePublicacion(publicacionId)
    return ok({ eliminada: true, publicacionId, reputacion })
  } catch (error) {
    return fail(error)
  }
}
