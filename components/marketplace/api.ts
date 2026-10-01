export class ApiFailure extends Error {
  campos?: Record<string, string[]>
  /** Motivo de negocio del servidor, para que `mensajeDeFallo` use su propio copy. */
  reason?: string
  constructor(message: string, campos?: Record<string, string[]>, reason?: string) {
    super(message)
    this.campos = campos
    this.reason = reason
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  })
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string
    reason?: string
    fields?: Record<string, string[]>
  }
  if (!response.ok) {
    throw new ApiFailure(
      payload.error ?? "No se pudo completar la operación",
      payload.fields,
      payload.reason,
    )
  }
  return payload
}
