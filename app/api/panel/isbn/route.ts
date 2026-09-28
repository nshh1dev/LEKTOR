import type { NextRequest } from "next/server"
import { fail, jsonError, ok } from "@/lib/api"
import { buscarPorIsbn, requirePanelUser } from "@/lib/panel"
import { normalizeIsbn, isValidIsbn } from "@/lib/isbn"

export async function GET(request: NextRequest) {
  try {
    await requirePanelUser()
    const isbn = normalizeIsbn(request.nextUrl.searchParams.get("isbn") ?? "")
    if (!isbn || !isValidIsbn(isbn)) {
      return jsonError("isbn-invalido", "Ingresa un ISBN válido (10 o 13 dígitos)", 400)
    }
    return ok(await buscarPorIsbn(isbn))
  } catch (error) {
    return fail(error)
  }
}
