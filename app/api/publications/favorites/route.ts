import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/db"
import { favorites, publications } from "@/db/schema"
import { requireSession } from "@/lib/auth"
import { fail, ok } from "@/lib/api"

const toggleSchema = z.object({
  publicationId: z.string().uuid("publicación inválida"),
})

export async function GET() {
  try {
    const user = await requireSession()
    const rows = await db
      .select({ publicationId: favorites.publicationId })
      .from(favorites)
      .where(eq(favorites.userId, user.id))
    return ok({ favoriteIds: rows.map((row) => row.publicationId) })
  } catch (error) {
    return fail(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession()
    const parsed = toggleSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      )
    }

    const { publicationId } = parsed.data
    const [publication] = await db
      .select({ id: publications.id })
      .from(publications)
      .where(inArray(publications.id, [publicationId]))
      .limit(1)
    if (!publication) {
      return NextResponse.json({ ok: false, error: "La publicación no existe" }, { status: 404 })
    }

    await db
      .insert(favorites)
      .values({ userId: user.id, publicationId })
      .onConflictDoNothing()
    return ok({ favorited: true })
  } catch (error) {
    return fail(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireSession()
    const { searchParams } = request.nextUrl
    const publicationId = searchParams.get("publicationId")
    if (!publicationId) {
      return NextResponse.json({ ok: false, error: "publicationId requerido" }, { status: 400 })
    }

    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.publicationId, publicationId)))
    return ok({ favorited: false })
  } catch (error) {
    return fail(error)
  }
}
