"use client"

import { useCallback, useEffect, useState } from "react"

export class PanelApiError extends Error {
  status: number
  reason: string

  constructor(status: number, reason: string, message: string) {
    super(message)
    this.status = status
    this.reason = reason
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init })
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    throw new PanelApiError(
      response.status,
      typeof data.reason === "string" ? data.reason : "error",
      typeof data.error === "string" ? data.error : "No se pudo completar la operación",
    )
  }
  return data as T
}

export function panelGet<T>(url: string): Promise<T> {
  return request<T>(url)
}

export function panelEnviar<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  return request<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export function usePanelQuery<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vivo = true
    setCargando(true)
    panelGet<T>(url)
      .then((respuesta) => {
        if (!vivo) return
        setData(respuesta)
        setError(null)
      })
      .catch((fallo: Error) => {
        if (vivo) setError(fallo.message)
      })
      .finally(() => {
        if (vivo) setCargando(false)
      })
    return () => {
      vivo = false
    }
  }, [url, version])

  const recargar = useCallback(() => setVersion((valor) => valor + 1), [])

  return { data, cargando, error, recargar }
}

export type MovimientoPanel = {
  id: string
  tipo: string
  cantidad: number
  stockAnterior: number
  stockResultante: number
  motivo: string | null
  fechaCreacion: string
  publicacion: { id: string; titulo: string }
  usuario: { id: string; nombre: string }
}

export type RespuestaMovimientos = {
  movimientos: MovimientoPanel[]
  paginacion: { pagina: number; porPagina: number; total: number; paginas: number }
}

export type FiltrosMovimientos = {
  q?: string
  tipo?: "todos" | "entrada" | "salida" | "ajuste"
  publicacionId?: string
  pagina?: number
  porPagina?: number
}

/** Arma la URL del historial respetando los mismos límites que valida el servidor. */
export function urlMovimientos(filtros: FiltrosMovimientos = {}): string {
  const params = new URLSearchParams()
  if (filtros.q?.trim()) params.set("q", filtros.q.trim())
  if (filtros.tipo && filtros.tipo !== "todos") params.set("tipo", filtros.tipo)
  if (filtros.publicacionId) params.set("publicacionId", filtros.publicacionId)
  if (filtros.pagina && filtros.pagina > 1) params.set("pagina", String(filtros.pagina))
  if (filtros.porPagina) params.set("porPagina", String(filtros.porPagina))
  const query = params.toString()
  return query ? `/api/panel/movimientos?${query}` : "/api/panel/movimientos"
}

export function usePanelMovimientos(filtros: FiltrosMovimientos = {}) {
  return usePanelQuery<RespuestaMovimientos>(urlMovimientos(filtros))
}
