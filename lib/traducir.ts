const TRADUCIR_URL = "https://translate.googleapis.com/translate_a/single"
const TIMEOUT_MS = 5000

export function urlTraduccion(texto: string, destino = "es"): string {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "auto",
    tl: destino,
    dt: "t",
    q: texto,
  })
  return `${TRADUCIR_URL}?${params.toString()}`
}

export async function traducirAlEspanol(texto: string | null): Promise<string | null> {
  if (!texto || !texto.trim()) return texto
  try {
    const response = await fetch(urlTraduccion(texto), {
      headers: { Accept: "application/json", "User-Agent": "LEKTOR/1.0 (marketplace de libros)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return texto

    const payload = (await response.json()) as unknown
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return texto

    const segmentos = (payload[0] as unknown[])
      .map((parte) => (Array.isArray(parte) && typeof parte[0] === "string" ? parte[0] : ""))
      .join("")
      .trim()

    return segmentos.length > 0 ? segmentos : texto
  } catch {
    return texto
  }
}
