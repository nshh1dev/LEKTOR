import type { NextRequest } from "next/server"
import { fail, ok } from "@/lib/api"
import { requireAdminUser } from "@/lib/panel"
import { panelValoracionesQuerySchema } from "@/lib/catalog"
import { reviewsParaModerar } from "@/lib/reviews"

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser()
    const params = request.nextUrl.searchParams
    const query = panelValoracionesQuerySchema.parse({
      soloOcultas: params.get("soloOcultas") ?? undefined,
    })
    const reviews = await reviewsParaModerar(query.soloOcultas)
    return ok({ reviews })
  } catch (error) {
    return fail(error)
  }
}
