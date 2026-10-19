import { isValidIsbn, normalizeIsbn } from "@/lib/isbn"

export function isbnDeCodigo(raw: string): string | null {
  if (!/^[\d\s-]+$/.test(raw)) return null
  const isbn = normalizeIsbn(raw)
  return /^97[89]\d{10}$/.test(isbn) && isValidIsbn(isbn) ? isbn : null
}

export function errorDeCamara(error: unknown): string {
  const nombre = error && typeof error === "object" && "name" in error ? error.name : null
  switch (nombre) {
    case "NotAllowedError":
    case "SecurityError":
      return "Permite el acceso a la cámara en los ajustes del sitio y vuelve a intentarlo."
    case "NotFoundError":
    case "OverconstrainedError":
      return "No encontramos una cámara disponible. Puedes escribir el ISBN a mano."
    case "NotReadableError":
    case "AbortError":
      return "La cámara está ocupada. Cierra otras aplicaciones que la usen y vuelve a intentarlo."
    default:
      return "No pudimos iniciar el escáner. Vuelve a intentarlo o escribe el ISBN a mano."
  }
}
