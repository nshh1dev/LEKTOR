"use client"

import { useEffect, useId, useRef, useState } from "react"
import { MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { MIN_CARACTERES_DIRECCION, type SugerenciaDireccion } from "@/lib/geocodificacion"
import { cn } from "@/lib/utils"

const ESPERA_MS = 350

/**
 * Campo de dirección con autocompletado de OpenStreetMap. Mientras se escribe pide
 * coincidencias al servidor —con la región y la comuna elegidas como contexto— y las
 * muestra en el flujo del formulario, como el índice de comunas: dentro del checkout no
 * conviene una lista flotante. El servidor no devuelve direcciones de otra comuna ni de
 * otra región, así que si no hay coincidencias se dice, en vez de llenar la lista con
 * lugares donde nadie va a recibir el pedido. Sigue siendo texto libre: lo que el mapa no
 * tenga se escribe y se guarda igual.
 */
export function DireccionInput({
  id,
  value,
  onValueChange,
  onSugerencia,
  region,
  comuna,
  placeholder,
  invalid,
  describedBy,
  className,
}: {
  id: string
  value: string
  onValueChange: (valor: string) => void
  /** Se llama al elegir una coincidencia, para completar comuna y región si se conocen. */
  onSugerencia: (sugerencia: SugerenciaDireccion) => void
  region?: string | null
  comuna?: string | null
  placeholder?: string
  invalid?: boolean
  describedBy?: string
  className?: string
}) {
  const listaId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const elegida = useRef("")
  const turno = useRef(0)
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)
  const [buscando, setBuscando] = useState(false)
  const [sinResultados, setSinResultados] = useState(false)
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccion[]>([])

  const consulta = value.trim()
  const lugar = (comuna ?? "").trim() || (region ?? "").trim()

  useEffect(() => {
    const actual = ++turno.current
    const vigente = () => actual === turno.current

    if (
      !abierto ||
      consulta.length < MIN_CARACTERES_DIRECCION ||
      consulta === elegida.current
    ) {
      setSugerencias([])
      setBuscando(false)
      setSinResultados(false)
      return
    }

    const controlador = new AbortController()
    const temporizador = setTimeout(async () => {
      setBuscando(true)
      setSinResultados(false)
      try {
        const params = new URLSearchParams({ q: consulta })
        if (region) params.set("region", region)
        if (comuna) params.set("comuna", comuna)
        const respuesta = await fetch(`/api/geo/direcciones?${params.toString()}`, {
          signal: controlador.signal,
        })
        if (!respuesta.ok) {
          if (vigente()) setSugerencias([])
          return
        }
        const datos = (await respuesta.json()) as { sugerencias?: SugerenciaDireccion[] }
        if (vigente()) {
          const lista = datos.sugerencias ?? []
          setSugerencias(lista)
          setSinResultados(lista.length === 0)
          setActivo(-1)
        }
      } catch (error) {
        // Si se cancela por una tecla nueva no hay nada que avisar; si falla la red, el
        // campo sigue siendo texto libre y la lista se queda vacía.
        if ((error as Error).name !== "AbortError" && vigente()) setSugerencias([])
      } finally {
        if (vigente()) setBuscando(false)
      }
    }, ESPERA_MS)

    return () => {
      clearTimeout(temporizador)
      controlador.abort()
    }
  }, [abierto, consulta, region, comuna])

  const cerrar = () => {
    setAbierto(false)
    setActivo(-1)
  }

  const elegir = (sugerencia: SugerenciaDireccion) => {
    elegida.current = sugerencia.direccion
    onValueChange(sugerencia.direccion)
    onSugerencia(sugerencia)
    setSugerencias([])
    cerrar()
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!abierto || activo < 0) return
    document.getElementById(`${listaId}-${activo}`)?.scrollIntoView({ block: "nearest" })
  }, [abierto, activo, listaId])

  return (
    <>
      <Input
        aria-activedescendant={activo >= 0 ? `${listaId}-${activo}` : undefined}
        aria-autocomplete="list"
        aria-controls={listaId}
        aria-describedby={describedBy}
        aria-expanded={abierto && sugerencias.length > 0}
        aria-haspopup="listbox"
        aria-invalid={invalid ? true : undefined}
        autoComplete="off"
        className={className}
        id={id}
        onBlur={() => cerrar()}
        onChange={(event) => {
          onValueChange(event.target.value)
          setActivo(0)
          setAbierto(true)
        }}
        onClick={() => setAbierto(true)}
        onFocus={() => setAbierto(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            if (sugerencias.length === 0) return
            setAbierto(true)
            setActivo((indice) => {
              const paso = event.key === "ArrowDown" ? 1 : -1
              if (indice === -1) return paso === 1 ? 0 : sugerencias.length - 1
              return (indice + paso + sugerencias.length) % sugerencias.length
            })
            return
          }
          if (event.key === "Escape") {
            cerrar()
            return
          }
          if (event.key === "Enter") {
            if (abierto && activo >= 0 && sugerencias[activo]) {
              event.preventDefault()
              elegir(sugerencias[activo])
            }
            return
          }
          if (event.key === "Tab") cerrar()
        }}
        placeholder={placeholder}
        ref={inputRef}
        role="combobox"
        type="text"
        value={value}
      />
      {abierto && sugerencias.length > 0 ? (
        <div className="mt-2">
          <div className="scrollbar-fina max-h-72 overscroll-contain overflow-y-auto rounded-md border bg-popover p-1">
            <ul id={listaId} role="listbox" aria-label="Direcciones de OpenStreetMap">
              {sugerencias.map((sugerencia, indice) => (
                <li
                  aria-label={sugerencia.etiqueta}
                  aria-selected={indice === activo}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5",
                    indice === activo && "bg-accent text-accent-foreground",
                  )}
                  id={`${listaId}-${indice}`}
                  key={sugerencia.id}
                  onClick={() => elegir(sugerencia)}
                  onMouseDown={(event) => event.preventDefault()}
                  role="option"
                >
                  <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-oro" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {sugerencia.calle}
                      {sugerencia.numero ? ` ${sugerencia.numero}` : ""}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[sugerencia.comuna, sugerencia.region].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="px-1 pt-1 text-[0.625rem] text-muted-foreground">
            © OpenStreetMap contributors
          </p>
        </div>
      ) : null}
      {abierto && buscando ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Buscando direcciones…
        </p>
      ) : null}
      {abierto && !buscando && sinResultados ? (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {lugar
            ? `No encontramos direcciones en ${lugar}. Revisa ${(comuna ?? "").trim() ? "la comuna" : "la región"} o escríbela a mano.`
            : "No encontramos esa dirección. Puedes escribirla a mano."}
        </p>
      ) : null}
    </>
  )
}
