import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { users } from "@/db/schema"
import { createSessionToken, setSessionCookie, toSafeUser } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"
import { clientIp, limiteExcedido, olvidar, rateLimit } from "@/lib/rate-limit"

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
})

const LIMITE = { limite: 10, ventanaMs: 5 * 60 * 1000 }
const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos"

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonError("invalid", parsed.error.issues[0]?.message ?? "Datos inválidos")
    }

    const { email, password } = parsed.data
    const ip = await clientIp()
    const clave = `login:${ip}:${email}`
    const limite = rateLimit(clave, LIMITE)
    if (!limite.permitido) {
      const excedido = limiteExcedido(limite.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !valid) {
      return jsonError("bad-credentials", CREDENCIALES_INVALIDAS, 401)
    }

    if (!user.activo) {
      return jsonError(
        "inactive",
        "Esta cuenta está desactivada. Contacta al administrador.",
        403,
      )
    }

    olvidar(clave)
    await db.update(users).set({ ultimoAcceso: new Date() }).where(eq(users.id, user.id))
    const token = await createSessionToken(user.id)
    await setSessionCookie(token)

    return ok({ user: toSafeUser(user) })
  } catch (error) {
    return fail(error)
  }
}