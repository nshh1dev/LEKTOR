import { getSession } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"

export async function GET() {
  try {
    const user = await getSession()
    if (!user) {
      return jsonError("no-session", "Debes iniciar sesión para continuar", 401)
    }
    return ok({ user })
  } catch (error) {
    return fail(error)
  }
}