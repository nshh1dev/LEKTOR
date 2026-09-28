import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { destroySession, requireSession } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"
import { passwordChangeSchema } from "@/lib/catalog"
import { limiteExcedido, olvidar, rateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const user = await requireSession()
    const parsed = passwordChangeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonError("invalid", parsed.error.issues[0]?.message ?? "Datos inválidos")
    }
    const { currentPassword, newPassword } = parsed.data

    const clave = `password:${user.id}`
    const limite = rateLimit(clave, { limite: 5, ventanaMs: 15 * 60 * 1000 })
    if (!limite.permitido) {
      const excedido = limiteExcedido(limite.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }

    const [current] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
    if (!current) {
      return jsonError("no-user", "No existe una cuenta con ese id", 404)
    }

    const valid = await bcrypt.compare(currentPassword, current.passwordHash)
    if (!valid) {
      return jsonError("bad-password", "La contraseña actual es incorrecta", 401)
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id))
    olvidar(clave)
    await destroySession()
    return ok({ reautenticacion: true })
  } catch (error) {
    return fail(error)
  }
}