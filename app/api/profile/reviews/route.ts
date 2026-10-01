import { fail, ok } from "@/lib/api"
import { requireSession } from "@/lib/auth"
import { reviewsEscritas, reviewsRecibidas, serializarReviews } from "@/lib/reviews"

/** Lo que la persona escribió y lo que recibió, para su pestaña de reseñas. */
export async function GET() {
  try {
    const user = await requireSession()
    const [escritas, recibidas] = await Promise.all([
      reviewsEscritas(user.id),
      reviewsRecibidas(user.id),
    ])
    return ok({
      escritas: serializarReviews(escritas),
      recibidas: serializarReviews(recibidas),
    })
  } catch (error) {
    return fail(error)
  }
}