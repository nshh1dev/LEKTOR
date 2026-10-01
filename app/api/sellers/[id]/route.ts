import { fail, ok, requireId } from "@/lib/api"
import { perfilVendedor } from "@/lib/sellers"

type Params = { params: Promise<{ id: string }> }

/** Página pública de un vendedor: ficha, reputación, ejemplares y reseñas. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const vendedorId = requireId((await params).id)
    return ok(await perfilVendedor(vendedorId))
  } catch (error) {
    return fail(error)
  }
}