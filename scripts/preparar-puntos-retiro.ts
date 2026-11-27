import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { COMUNAS_POR_REGION } from "../lib/comunas"

const carpeta = process.argv[2] ?? ".next/courier-source-audit-data"
const normalizar = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "")
const comunas = new Map(Object.entries(COMUNAS_POR_REGION).flatMap(([region, nombres]) =>
  nombres.map((comuna) => [normalizar(comuna), { comuna, region }] as const)))
const equivalencias: Record<string, string> = {
  santiago: "Santiago Centro", coyhaique: "Coihaique", trehuaco: "Treguaco",
  lacalera: "Calera", llayllay: "Llaillay", paihuano: "Paiguano", aisen: "Aysén",
  puertonatales: "Natales", puertoaysen: "Aysén", sanvicentedetaguatagua: "San Vicente",
  sanjosedelamariquina: "Mariquina", elcarmenchillan: "El Carmen",
}
type Entrada = { id: string; nombre: string; direccion: string; comuna: string; region: string; pickup?: boolean; dropoff?: boolean }
const fuentes = [
  { courier: "blue_express", archivo: "blue-retiro-normalizado.json", filtro: "active, pickupAvailability=true y servicio 24 (Retiro de paquete)" },
  { courier: "starken", archivo: "starken-puntos-normalizado.json", filtro: "Solo puntos con pickup y dropoff habilitados; se excluyen puntos de servicio único" },
  { courier: "chilexpress", archivo: "chilexpress-retiro-normalizado.json", filtro: "Servicio 22 (Entrega de encomiendas) habilitado; 344 opciones del selector consultadas" },
]
const puntos: { id: string; courier: string; nombre: string; direccion: string; comuna: string; region: string }[] = []
const metadatos = []
for (const fuente of fuentes) {
  const datos = JSON.parse(readFileSync(`${carpeta}/${fuente.archivo}`, "utf8"))
  if (fuente.courier === "chilexpress" && !datos.completoRespectoAlSelector) throw new Error("Extracción de Chilexpress incompleta")
  let excluidos = 0
  for (const p of datos.puntos as Entrada[]) {
    if (fuente.courier === "starken" && !(p.pickup && p.dropoff)) { excluidos++; continue }
    const clave = normalizar(p.comuna)
    const ubicacion = comunas.get(normalizar(equivalencias[clave] ?? p.comuna))
    if (!ubicacion || !p.nombre.trim() || !p.direccion.trim()) { excluidos++; continue }
    puntos.push({
      id: `${fuente.courier}:${p.id}`, courier: fuente.courier,
      nombre: p.nombre.trim(), direccion: p.direccion.trim(), ...ubicacion,
    })
  }
  metadatos.push({
    courier: fuente.courier, url: datos.fuente, consultadoEn: datos.obtenidoEn,
    filtro: fuente.filtro, recibidos: datos.puntos.length, excluidos,
    incluidos: puntos.filter((p) => p.courier === fuente.courier).length,
  })
}
if (new Set(puntos.map((p) => p.id)).size !== puntos.length) throw new Error("Códigos duplicados")
mkdirSync("data", { recursive: true })
writeFileSync("data/puntos-retiro.json", JSON.stringify({ fuentes: metadatos, puntos }) + "\n", "utf8")
console.log(JSON.stringify(metadatos, null, 2))
