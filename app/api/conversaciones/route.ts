import { requireSession } from "@/lib/auth"
import { created, fail, ok } from "@/lib/api"
import { abrirConversacionSchema } from "@/lib/catalog"
import { abrirConversacion, listarConversaciones } from "@/lib/conversaciones"

export async function GET() {
  try {
    const user = await requireSession()
    return ok({ conversaciones: await listarConversaciones(user) })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    const { publicacionId, mensaje } = abrirConversacionSchema.parse(await request.json())
    return created({ conversacion: await abrirConversacion(publicacionId, user, mensaje) })
  } catch (error) {
    return fail(error)
  }
}