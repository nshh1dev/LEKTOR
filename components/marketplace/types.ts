import { ORDENES_CATALOGO } from "@/lib/catalog"

export type Vista = "catalog" | "detail" | "sell" | "checkout" | "auth" | "profile"
export type OrdenCatalogo = (typeof ORDENES_CATALOGO)[number]
