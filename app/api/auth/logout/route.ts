import { destroySession } from "@/lib/auth"
import { fail, ok } from "@/lib/api"

export async function POST() {
  try {
    await destroySession()
    return ok()
  } catch (error) {
    return fail(error)
  }
}