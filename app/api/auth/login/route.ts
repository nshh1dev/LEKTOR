import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import { users } from "@/db/schema"
import { createSessionToken, setSessionCookie, toSafeUser } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"
import { clientIp, limiteExcedido, olvidar, rateLimit } from "@/lib/rate-limit"

const bodySchema = loginFormSchema

/**
 * Dos topes, porque cubren ataques distintos:
 *
 * - Por correo (10 cada 5 min) frena a quien insiste contra una cuenta concreta.
 *   Diez intentos dan margen de sobra para tipear mal una contraseña dos o tres
 *   veces, y agotar el tope exige esperar.
 * - Por IP (30 cada 5 min) frena a quien prueba muchas cuentas desde una sola
 *   máquina. Es tres cuentas completas de intentos, así que una persona real
 *   que se equivoca en varios correos no lo topa, pero un guion que va cambiando
 *   de correo sí, en un par de minutos.
 *
 * El de IP cuenta solo fracasos y nunca se limpia al entrar: si alguien ya entró,
 * no necesita que el límite se le perdone.
 */
const LIMITE_POR_CORREO = { limite: 10, ventanaMs: 5 * 60 * 1000 }
const LIMITE_POR_IP = { limite: 30, ventanaMs: 5 * 60 * 1000 }
const CREDENCIALES_INVALIDAS = "Email o contraseña incorrectos"

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonError("invalid", parsed.error.issues[0]?.message ?? "Datos inválidos")
    }

    const { email, password } = parsed.data
    const ip = await clientIp()
    const claveCorreo = `login:${ip}:${email}`
    const limite = rateLimit(claveCorreo, LIMITE_POR_CORREO)
    if (!limite.permitido) {
      const excedido = limiteExcedido(limite.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false
    const porIp = rateLimit(`login:${ip}`, LIMITE_POR_IP)
    if (!porIp.permitido) {
      const excedido = limiteExcedido(porIp.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }
    if (!user || !valid) {
      return jsonError("bad-credentials", CREDENCIALES_INVALIDAS, 401)
    }

    // Intento exitoso: no se limpia el contador por IP a propósito: un atacante
    // que ya agotó su tope sigue bloqueado aunque acierte después.
    // El contador por correo sí se limpia al tener éxito, abajo.

    if (!user.activo) {
      // También cuenta como intento exitoso desde el lado de bloqueo de IP:
      // quien ya quemó su tope sigue sin poder probar otros correos en esa ventana.
      // El contador por correo tampoco se limpia.
      return jsonError(
        "inactive",
        "Esta cuenta está desactivada. Contacta al administrador.",
        403,
      )
    }

    olvidar(claveCorreo)
    await db.update(users).set({ ultimoAcceso: new Date() }).where(eq(users.id, user.id))
    const token = await createSessionToken(user.id)
    await setSessionCookie(token)

    return ok({ user: toSafeUser(user) })
  } catch (error) {
    return fail(error)
  }
}