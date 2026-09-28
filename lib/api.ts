import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { ApiError } from "@/lib/auth"

export function ok<T = Record<string, never>>(data?: T, status = 200): NextResponse {
  return NextResponse.json(data ?? {}, { status })
}

export function jsonError(
  reason: string,
  message: string,
  status = 400,
  headers?: HeadersInit,
): NextResponse {
  return NextResponse.json({ error: message, reason }, { status, headers })
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 })
}

export function fail(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Revisa los datos del formulario", fields: error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  if (error instanceof SyntaxError) {
    return jsonError("json-invalido", "El cuerpo de la solicitud no es JSON válido")
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, reason: error.reason }, { status: error.status })
  }
  console.error("[lektor-api]", error)
  return NextResponse.json({ error: "Ocurrió un error inesperado" }, { status: 500 })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function requireId(id: string): string {
  if (!UUID.test(id)) throw new ApiError(404, "not-found", "Recurso no encontrado")
  return id
}
