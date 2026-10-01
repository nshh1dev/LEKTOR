import { created, fail, ok, requireId } from "@/lib/api"
import { getSession, requireSession } from "@/lib/auth"
import { reviewSchema } from "@/lib/catalog"
import { crearReview, puedeValorar, reviewsDePublicacion } from "@/lib/reviews"

type Params = { params: Promise<{ id: string }> }

/**
 * Se lee sin sesión: las valoraciones son públicas y son justamente lo que hace
 * que alguien se atreva a comprar. Lo único personal que sale es si quien
 * pregunta puede valorar, y es `null` sin sesión para no alargar el caso anónimo.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const publicacionId = requireId((await params).id)
    const user = await getSession()
    const [datos, habilitada] = await Promise.all([
      reviewsDePublicacion(publicacionId),
      user ? puedeValorar(user.id, publicacionId) : Promise.resolve(null),
    ])
    return ok({ ...datos, puedeValorar: habilitada })
  } catch (error) {
    return fail(error)
  }
}

/** Tras valorar se devuelve la lista y el promedio ya recalculados, para que el
 * cliente no tenga que pedirlo aparte y la barra no quede desfasada. */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const publicacionId = requireId((await params).id)
    const datos = reviewSchema.parse(await request.json())
    const review = await crearReview(user, publicacionId, datos)
    const { reviews, reputacion } = await reviewsDePublicacion(publicacionId)
    return created({ review, reviews, reputacion })
  } catch (error) {
    return fail(error)
  }
}
