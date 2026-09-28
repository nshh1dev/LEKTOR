import type { NextRequest } from "next/server"
import { fail, ok } from "@/lib/api"
import { requireAdminUser, reportePanel } from "@/lib/panel"
import { panelReportesQuerySchema } from "@/lib/catalog"

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser()
    const query = panelReportesQuerySchema.parse({
      dias: request.nextUrl.searchParams.get("dias") ?? undefined,
    })
    return ok(await reportePanel(query))
  } catch (error) {
    return fail(error)
  }
}
