import "server-only"

import { randomBytes } from "crypto"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { sessions, users, type User } from "@/db/schema"

export const SESSION_COOKIE = "lektor_session"
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24

export type SafeUser = Pick<User, "id" | "email" | "nombre" | "rol" | "activo" | "avatarUrl" | "telefono"> & {
  ultimoAcceso: string | null
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    activo: user.activo,
    avatarUrl: user.avatarUrl,
    telefono: user.telefono,
    ultimoAcceso: user.ultimoAcceso?.toISOString() ?? null,
  }
}

export async function createSessionToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex")
  await db.insert(sessions).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  })
  return token
}

/**
 * La cookie no lleva `expires` a propósito: es cookie de sesión y la termina el
 * navegador al cerrarse. La vigencia la decide la fila de `sessions`, que es lo
 * único que se puede renovar en cualquier contexto. Al revés —ponerle fecha y
 * depender de que el navegador la respete— obliga a reescribir la cookie cada
 * vez que la sesión se alarga, y esa escritura solo se puede hacer desde un Route
 * Handler o una Server Action, no desde `getSession()`, que también la llaman las
 * páginas del panel.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export async function getSession(): Promise<SafeUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1)
  if (!session) return null

  if (session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token))
    return null
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1)
  if (!user || !user.activo) return null

  if (session.expiresAt.getTime() - Date.now() < SESSION_DURATION_MS / 2) {
    // Se alarga solo en la base. La cookie no lleva fecha, así que no hay nada
    // que reescribir en el navegador: ponerla acá tiraría un error en cada
    // página del panel, porque las cookies solo se tocan desde un Route Handler.
    const nuevo = new Date(Date.now() + SESSION_DURATION_MS)
    await db
      .update(sessions)
      .set({ expiresAt: nuevo })
      .where(eq(sessions.token, token))
  }

  return toSafeUser(user)
}

export async function requireSession(): Promise<SafeUser> {
  const user = await getSession()
  if (!user) throw new ApiError(401, "no-session", "Debes iniciar sesión para continuar")
  return user
}

/** Borra la cookie. El `maxAge: 0` es lo que la invalida en el navegador. */
async function borrarCookieDeSesion(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token))
  }
  await borrarCookieDeSesion()
}

/**
 * Cierra todas las sesiones del usuario, no solo la de esta petición. Se usa al
 * cambiar la contraseña: si el motivo del cambio es que otra persona entró, dejar
 * vivas las sesiones anteriores sería volver a dejarle la puerta abierta. Cerrar
 * sesión (logout) sí es solo la de quien cierra.
 */
export async function destroySessionsOf(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
  await borrarCookieDeSesion()
}

export class ApiError extends Error {
  status: number
  reason: string
  constructor(status: number, reason: string, message: string) {
    super(message)
    this.status = status
    this.reason = reason
  }
}