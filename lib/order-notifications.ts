import type { EstadoOrden } from "@/lib/catalog"

export function destinatarioCambioOrden({
  compradorId,
  vendedorId,
  actorId,
  siguiente,
}: {
  compradorId: string
  vendedorId: string
  actorId: string
  siguiente: EstadoOrden
}): string {
  if (siguiente === "recibida" || (siguiente === "cancelada" && actorId === compradorId)) {
    return vendedorId
  }
  return compradorId
}
