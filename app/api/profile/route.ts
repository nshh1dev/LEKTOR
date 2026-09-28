import { count, eq } from "drizzle-orm"
import { db } from "@/db"
import { publications, users } from "@/db/schema"
import { ApiError, toSafeUser, requireSession } from "@/lib/auth"
import { fail, ok } from "@/lib/api"
import { profileUpdateSchema } from "@/lib/catalog"

export async function GET() {
  try {
    const user = await requireSession()
    const [perfil] = await db
      .select({
        id: users.id,
        nombre: users.nombre,
        email: users.email,
        rol: users.rol,
        bio: users.bio,
        telefono: users.telefono,
        comuna: users.comuna,
        region: users.region,
        avatarUrl: users.avatarUrl,
        fechaCreacion: users.fechaCreacion,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)

    const [publicacionesActivas] = await db
      .select({ total: count() })
      .from(publications)
      .where(eq(publications.vendedorId, user.id))

    return ok({
      perfil,
      esVendedor: (publicacionesActivas?.total ?? 0) > 0,
      publicaciones: publicacionesActivas?.total ?? 0,
    })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSession()
    const data = profileUpdateSchema.parse(await request.json())

    const [updated] = await db
      .update(users)
      .set({
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.bio !== undefined ? { bio: data.bio || null } : {}),
        ...(data.telefono !== undefined ? { telefono: data.telefono || null } : {}),
        ...(data.comuna !== undefined ? { comuna: data.comuna || null } : {}),
        ...(data.region !== undefined ? { region: data.region || null } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      })
      .where(eq(users.id, user.id))
      .returning()

    if (!updated) throw new ApiError(404, "not-found", "Cuenta no encontrada")
    return ok({ user: toSafeUser(updated) })
  } catch (error) {
    return fail(error)
  }
}
