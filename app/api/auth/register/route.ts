import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { createSessionToken, setSessionCookie, toSafeUser } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"
import { registroSchema } from "@/lib/catalog"
import { clientIp, limiteExcedido, rateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const parsed = registroSchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonError("invalid", parsed.error.issues[0]?.message ?? "Datos inválidos")
    }

    const { nombre, email, password, telefono, comuna, region } = parsed.data
    const ip = await clientIp()
    const limite = rateLimit(`registro:${ip}`, { limite: 5, ventanaMs: 60 * 60 * 1000 })
    if (!limite.permitido) {
      const excedido = limiteExcedido(limite.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    if (existing) {
      return jsonError("email-exists", "Ya existe una cuenta con ese email", 409)
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const [user] = await db
      .insert(users)
      .values({ nombre, email, passwordHash, telefono, comuna, region, rol: "lector", activo: true })
      .returning()

    const token = await createSessionToken(user.id)
    await setSessionCookie(token)
    return ok({ user: toSafeUser(user) }, 201)
  } catch (error) {
    return fail(error)
  }
}
