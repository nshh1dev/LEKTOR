type Ventana = {
  limite: number
  ventanaMs: number
}

type Estado = {
  conteo: number
  reiniciaEn: number
}

export type ResultadoLimite = {
  permitido: boolean
  restantes: number
  reintentarEnSegundos: number
}

const estados = new Map<string, Estado>()
let ultimaLimpieza = 0

function limpiar(ahora: number) {
  if (ahora - ultimaLimpieza < 60_000) return
  ultimaLimpieza = ahora
  for (const [clave, estado] of estados) {
    if (estado.reiniciaEn <= ahora) estados.delete(clave)
  }
}

export function rateLimit(clave: string, { limite, ventanaMs }: Ventana): ResultadoLimite {
  const ahora = Date.now()
  limpiar(ahora)
  const estado = estados.get(clave)
  if (!estado || estado.reiniciaEn <= ahora) {
    estados.set(clave, { conteo: 1, reiniciaEn: ahora + ventanaMs })
    return { permitido: true, restantes: limite - 1, reintentarEnSegundos: 0 }
  }
  if (estado.conteo >= limite) {
    return {
      permitido: false,
      restantes: 0,
      reintentarEnSegundos: Math.max(1, Math.ceil((estado.reiniciaEn - ahora) / 1000)),
    }
  }
  estado.conteo += 1
  return {
    permitido: true,
    restantes: limite - estado.conteo,
    reintentarEnSegundos: 0,
  }
}

export function olvidar(clave: string): void {
  estados.delete(clave)
}

export function limiteExcedido(reintentarEnSegundos: number): {
  reason: string
  mensaje: string
  status: number
  headers: Record<string, string>
} {
  const segundos = Math.max(1, Math.ceil(reintentarEnSegundos))
  const minutos = Math.ceil(segundos / 60)
  return {
    reason: "rate-limit",
    mensaje: `Demasiados intentos. Intenta nuevamente en ${minutos > 1 ? `${minutos} min` : `${segundos} s`}.`,
    status: 429,
    headers: { "Retry-After": String(segundos) },
  }
}
