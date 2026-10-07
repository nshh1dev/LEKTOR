import { fail, ok, requireId } from "@/lib/api"
import { perfilVendedor } from "@/lib/sellers"
import { searchQuerySchema } from "@/lib/catalog"

type Params = { params: Promise<{ id: string }> }

/** Página pública de un vendedor: ficha, reputación, ejemplares y reseñas. */
export async function GET(request: Request, { params }: Params) {
  try {
    const vendedorId = requireId((await params).id)
    const pagina = searchQuerySchema.shape.pagina.parse(new URL(request.url).searchParams.get("pagina") ?? undefined)
    return ok(await perfilVendedor(vendedorId, pagina))
  } catch (error) {
    return fail(error)
  }
}
