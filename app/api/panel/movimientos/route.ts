import type { NextRequest } from "next/server"
import { fail, ok } from "@/lib/api"
import { movimientosPanel, registrarMovimiento, requirePanelUser } from "@/lib/panel"
import { panelMovimientoSchema, panelMovimientosQuerySchema } from "@/lib/catalog"

export async function GET(request: NextRequest) {
  try {
    await requirePanelUser()
    const params = request.nextUrl.searchParams
    const query = panelMovimientosQuerySchema.parse({
      q: params.get("q") ?? undefined,
      tipo: params.get("tipo") ?? undefined,
      publicacionId: params.get("publicacionId") ?? undefined,
      pagina: params.get("pagina") ?? undefined,
      porPagina: params.get("porPagina") ?? undefined,
    })
    return ok(await movimientosPanel(query))
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePanelUser()
    const data = panelMovimientoSchema.parse(await request.json())
    return ok(await registrarMovimiento(user, data), 201)
  } catch (error) {
    return fail(error)
  }
}
