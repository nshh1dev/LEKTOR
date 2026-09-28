import type { NextRequest } from "next/server"
import { fail, ok } from "@/lib/api"
import { requirePanelUser, ordenesPanel } from "@/lib/panel"
import { panelOrdenesQuerySchema } from "@/lib/catalog"
import { programarBarrido } from "@/lib/orders"

export async function GET(request: NextRequest) {
  try {
    await requirePanelUser()
    programarBarrido()
    const params = request.nextUrl.searchParams
    const query = panelOrdenesQuerySchema.parse({
      q: params.get("q") ?? undefined,
      estado: params.get("estado") ?? undefined,
      pagina: params.get("pagina") ?? undefined,
      porPagina: params.get("porPagina") ?? undefined,
    })
    return ok(await ordenesPanel(query))
  } catch (error) {
    return fail(error)
  }
}
