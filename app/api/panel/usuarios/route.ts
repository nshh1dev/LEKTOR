import { fail, ok } from "@/lib/api"
import { panelUsuariosQuerySchema, panelUsuarioUpdateSchema } from "@/lib/catalog"
import { actualizarUsuarioPanel, requireAdminUser, usuariosPanel } from "@/lib/panel"

export async function GET(request: Request) {
  try {
    await requireAdminUser()
    const filtros = panelUsuariosQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    return ok(await usuariosPanel(filtros))
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdminUser()
    const data = panelUsuarioUpdateSchema.parse(await request.json())
    const usuario = await actualizarUsuarioPanel(admin, data)
    return ok({ usuario })
  } catch (error) {
    return fail(error)
  }
}
