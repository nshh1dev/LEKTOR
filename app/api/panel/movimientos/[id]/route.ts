import { eq } from "drizzle-orm"
import { db } from "@/db"
import { publications } from "@/db/schema"
import { ApiError } from "@/lib/auth"
import { fail, ok, requireId } from "@/lib/api"
import { movimientosDePublicacion, requirePanelUser } from "@/lib/panel"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePanelUser()
    const id = requireId((await params).id)

    const [publicacion] = await db
      .select({ id: publications.id })
      .from(publications)
      .where(eq(publications.id, id))
      .limit(1)
    if (!publicacion) throw new ApiError(404, "not-found", "Publicación no encontrada")

    return ok({ movimientos: await movimientosDePublicacion(id) })
  } catch (error) {
    return fail(error)
  }
}
