import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { createSessionToken, setSessionCookie, toSafeUser } from "@/lib/auth"
import { fail, jsonError, ok } from "@/lib/api"
import { loginFormSchema } from "@/lib/catalog"
import { clientIp, limiteExcedido, olvidar, rateLimit } from "@/lib/rate-limit"

const bodySchema = loginFormSchema

/**
 * Dos topes, porque cubren ataques distintos:
 *
 * - Por correo (10 cada 5 min) frena a quien insiste contra una cuenta concreta.
 *   Diez intentos dan margen de sobra para tipear mal una contraseña dos o tres
 *   veces, y agotar el tope exige esperar.
 * - Por IP (60 cada 5 min) frena a quien prueba muchas cuentas desde una sola
 *   máquina. Es seis cuentas completas de intentos: por debajo de eso topa una
 *   persona que se equivoca en varios correos, y una familia o una oficina
 *   detrás de un mismo router comparte la IP sin enterarse. Igual sesenta intentos
 *   en cinco minutos no los hace nadie a mano, así que un guion que va cambiando
 *   de correo sigue topando, solo necesita el doble de margen.
 *
 * El de IP cuenta todos los intentos, no solo los fallidos, y nunca se limpia al
 * entrar: si alguien ya entró, no necesita que el límite se le perdone. Subir el
 * tope con las cuentas en vez de contar solo fracasos también deja pasar una
 * corrida completa de `pnpm simular`, que entra unas veinte veces desde la misma
 * IP.
 */
const LIMITE_POR_CORREO = { limite: 10, ventanaMs: 5 * 60 * 1000 }
const LIMITE_POR_IP = { limite: 60, ventanaMs: 5 * 60 * 1000 }
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
    // El contador va antes de validar a propósito, para que un intento exitoso
    // también lo consuma: si el tope ya está quemado, acertar la clave tampoco
    // abre la puerta.
    const porIp = rateLimit(`login:${ip}`, LIMITE_POR_IP)
    if (!porIp.permitido) {
      const excedido = limiteExcedido(porIp.reintentarEnSegundos)
      return jsonError(excedido.reason, excedido.mensaje, excedido.status, excedido.headers)
    }
    if (!user || !valid) {
      return jsonError("bad-credentials", CREDENCIALES_INVALIDAS, 401)
    }

    // El contador por correo sí se limpia al entrar: el que se equivoca con una
    // contraseña y después acierta no sigue penado. El de IP no, a propósito.

    if (!user.activo) {
      // Una cuenta desactivada tampoco limpia nada: quien ya quemó su tope sigue
      // sin poder probar otros correos en esa ventana.
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