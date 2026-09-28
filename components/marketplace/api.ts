export class ApiFailure extends Error {
  campos?: Record<string, string[]>
  constructor(message: string, campos?: Record<string, string[]>) {
    super(message)
    this.campos = campos
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
  })
  const payload = (await response.json().catch(() => ({}))) as T & {
    error?: string
    fields?: Record<string, string[]>
  }
  if (!response.ok) {
    throw new ApiFailure(payload.error ?? "No se pudo completar la operación", payload.fields)
  }
  return payload
}
