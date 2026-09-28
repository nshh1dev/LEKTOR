import { fail, ok } from "@/lib/api"
import { requirePanelUser, resumenPanel } from "@/lib/panel"

export async function GET() {
  try {
    await requirePanelUser()
    return ok(await resumenPanel())
  } catch (error) {
    return fail(error)
  }
}
