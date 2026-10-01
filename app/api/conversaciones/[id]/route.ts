import { requireSession } from "@/lib/auth"
import { created, fail, ok, requireId } from "@/lib/api"
import { chatMessageSchema } from "@/lib/catalog"
import { enviarMensaje, leerConversacion } from "@/lib/conversaciones"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)
    return ok({ conversacion: await leerConversacion(id, user) })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireSession()
    const id = requireId((await params).id)
    const { mensaje } = chatMessageSchema.parse(await request.json())
    return created({ mensaje: await enviarMensaje(id, user, mensaje) })
  } catch (error) {
    return fail(error)
  }
}