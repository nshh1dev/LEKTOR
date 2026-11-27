export const COURIERS = ["blue_express", "chilexpress", "starken", "correos_chile"] as const
export type Courier = (typeof COURIERS)[number]
export const COURIERS_RETIRO = ["blue_express", "chilexpress", "starken"] as const

export type PuntoRetiro = {
  id: string
  courier: Courier
  nombre: string
  direccion: string
  comuna: string
  region: string
}

export const DATOS_COURIER: Record<Courier, { nombre: string; sucursales: string }> = {
  blue_express: { nombre: "Blue Express", sucursales: "https://www.blue.cl/lockers-puntos/encuentra-tu-punto" },
  chilexpress: { nombre: "Chilexpress", sucursales: "https://centrodeayuda.chilexpress.cl/sucursales" },
  starken: { nombre: "Starken", sucursales: "https://www.starken.cl/sucursales" },
  correos_chile: { nombre: "CorreosChile", sucursales: "https://www.correos.cl/sucursales" },
}
