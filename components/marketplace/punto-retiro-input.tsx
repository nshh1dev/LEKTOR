"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Aviso } from "@/components/notificacion/avisos"
import { api } from "@/components/marketplace/api"
import { type Courier, type PuntoRetiro } from "@/lib/couriers"

export function PuntoRetiroInput({ courier, comuna, region, seleccionado, onSeleccionar, onLimpiar, invalid }: {
  courier: Courier
  comuna: string
  region: string
  seleccionado: string
  invalid: boolean
  onSeleccionar: (punto: PuntoRetiro) => void
  onLimpiar: () => void
}) {
  const [busqueda, setBusqueda] = useState("")
  const [datos, setDatos] = useState<{ puntos: PuntoRetiro[]; total: number; fuente?: { consultadoEn: string } } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState(false)
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setCargando(true)
    setFallo(false)
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ courier, comuna, region, q: busqueda })
      void api<NonNullable<typeof datos>>(`/api/geo/puntos-retiro?${params}`, { signal: controller.signal })
        .then((respuesta) => { if (!controller.signal.aborted) setDatos(respuesta) })
        .catch(() => { if (!controller.signal.aborted) { setDatos(null); setFallo(true) } })
        .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [courier, comuna, region, busqueda, intento])

  return (
    <div className="flex flex-col gap-2">
      <Input id="puntoRetiroId" value={busqueda} placeholder="Buscar por nombre o dirección"
        aria-invalid={invalid} aria-describedby={invalid ? "puntoRetiroId-error punto-retiro-ayuda" : "punto-retiro-ayuda"}
        onChange={(evento) => { setBusqueda(evento.target.value); onLimpiar() }} />
      <p id="punto-retiro-ayuda" className="text-xs text-muted-foreground">
        Filtrado por la comuna y región de entrega indicadas abajo. Puedes cambiarlas para buscar en otro lugar.
        Los datos son una captura del catálogo oficial, no disponibilidad en tiempo real.
      </p>
      {seleccionado && <p className="rounded-lg border border-oro p-3 text-sm">Punto seleccionado: {seleccionado}</p>}
      <p role="status" className="text-xs text-muted-foreground">
        {cargando ? "Buscando puntos…" : fallo ? "Búsqueda no disponible" : `${datos?.total ?? 0} puntos encontrados${(datos?.total ?? 0) > 30 ? "; se muestran 30. Afina la búsqueda." : "."}`}
      </p>
      {fallo ? (
        <Aviso titulo="No pudimos cargar los puntos">
          Intenta cargar el catálogo otra vez.
          <Button type="button" variant="link" onClick={() => setIntento((n) => n + 1)}>Reintentar</Button>
        </Aviso>
      ) : !cargando && datos?.total === 0 ? (
        <p className="text-sm text-muted-foreground">No hay puntos en este filtro. Prueba otra comuna, otro transportista o envío a domicilio.</p>
      ) : null}
      {!cargando && !fallo && datos && datos.puntos.length > 0 ? (
        <ul aria-label="Puntos de retiro disponibles" className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {datos.puntos.map((punto) => (
            <li key={punto.id}>
              <button type="button" className="w-full cursor-pointer p-3 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-oro"
                onClick={() => onSeleccionar(punto)}>
                <span className="block font-medium">{punto.nombre}</span>
                <span className="block text-muted-foreground">{punto.direccion} · {punto.comuna}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {datos?.fuente && <p className="text-xs text-muted-foreground">Catálogo consultado el {datos.fuente.consultadoEn.slice(0, 10)}. Confirma horarios con el transportista.</p>}
    </div>
  )
}
