import type { NextRequest } from "next/server"
import { fail, ok } from "@/lib/api"
import { requirePanelUser, publicacionesPanel } from "@/lib/panel"
import { panelPublicacionesQuerySchema } from "@/lib/catalog"

export async function GET(request: NextRequest) {
  try {
    await requirePanelUser()
    const params = request.nextUrl.searchParams
    const query = panelPublicacionesQuerySchema.parse({
      q: params.get("q") ?? undefined,
      estado: params.get("estado") ?? undefined,
      categoria: params.get("categoria") ?? undefined,
      vendedorId: params.get("vendedorId") ?? undefined,
      orden: params.get("orden") ?? undefined,
      bajoMinimo: params.get("bajoMinimo") ?? undefined,
      pagina: params.get("pagina") ?? undefined,
      porPagina: params.get("porPagina") ?? undefined,
    })
    return ok(await publicacionesPanel(query))
  } catch (error) {
    return fail(error)
  }
}
