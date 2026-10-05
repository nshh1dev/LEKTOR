"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { gruposComunas, regionDeComuna, type Region } from "@/lib/comunas"
import { cn } from "@/lib/utils"

/**
 * Campo de comuna con el índice del país: al abrirlo se ven todas las comunas separadas
 * por región, con la de la región elegida arriba. Al elegir una, o al salir del campo con
 * una comuna escrita, la región se completa sola. El campo sigue siendo texto libre: el
 * catálogo propone, no bloquea, porque una comuna escrita a mano también tiene que servir.
 *
 * El índice va en el flujo del formulario y no en un popover portalizado: dentro de un
 * diálogo modal, la lista flotante queda fuera del área que el diálogo deja desplazar y
 * la rueda no la mueve. Aquí es un scroll común del diálogo, sin capas ni medidas.
 */
export function ComunaInput({
  id,
  value,
  onValueChange,
  region,
  onRegionSugerida,
  placeholder,
  invalid,
  describedBy,
  className,
}: {
  id: string
  value: string
  onValueChange: (valor: string) => void
  region: string | null | undefined
  /** Se llama cuando la comuna escrita pertenece a otra región, para que se pueda completar. */
  onRegionSugerida?: (region: Region) => void
  placeholder?: string
  invalid?: boolean
  describedBy?: string
  className?: string
}) {
  const listaId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)

  const grupos = useMemo(() => gruposComunas(value, region), [value, region])
  // El teclado recorre el índice aplanado y la vista lo muestra por regiones: la posición
  // de cada comuna es su número en esa lista, que es lo que lleva `aria-activedescendant`.
  const bloques = useMemo(() => {
    let siguiente = 0
    return grupos.map((grupo) => ({
      region: grupo.region,
      comunas: grupo.comunas.map((comuna) => ({ comuna, posicion: siguiente++ })),
    }))
  }, [grupos])
  const opciones = useMemo(
    () => bloques.flatMap((bloque) => bloque.comunas.map((item) => item.comuna)),
    [bloques],
  )

  const avisarRegion = (comuna: string) => {
    const hallada = regionDeComuna(comuna)
    if (hallada && hallada !== region) onRegionSugerida?.(hallada)
  }

  const cerrar = () => {
    setAbierto(false)
    setActivo(-1)
  }

  const elegir = (comuna: string) => {
    onValueChange(comuna)
    avisarRegion(comuna)
    cerrar()
    // El foco se queda en el campo: si se pierde, se corta la escritura a media palabra.
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
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-invalid={invalid ? true : undefined}
        autoComplete="off"
        className={className}
        id={id}
        onBlur={() => {
          cerrar()
          avisarRegion(value)
        }}
        onChange={(event) => {
          onValueChange(event.target.value)
          setActivo(0)
          setAbierto(true)
        }}
        onClick={() => setAbierto((estado) => !estado)}
        onFocus={(event) => {
          // Solo con el teclado: con el mouse el clic abre el índice por su cuenta.
          if (event.target.matches(":focus-visible")) setAbierto(true)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault()
            if (opciones.length === 0) return
            setAbierto(true)
            setActivo((indice) => {
              const paso = event.key === "ArrowDown" ? 1 : -1
              if (indice === -1) return paso === 1 ? 0 : opciones.length - 1
              return (indice + paso + opciones.length) % opciones.length
            })
            return
          }
          if (event.key === "Escape") {
            cerrar()
            return
          }
          if (event.key === "Enter") {
            if (abierto && activo >= 0 && opciones[activo]) {
              event.preventDefault()
              elegir(opciones[activo])
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
      {abierto ? (
        <div className="scrollbar-fina mt-2 max-h-72 overflow-y-auto rounded-md border bg-popover p-1">
          <ul id={listaId} role="listbox" aria-label="Comunas de Chile">
            {bloques.map((bloque) => (
              <li key={bloque.region} role="group" aria-labelledby={`${listaId}-${bloque.region}`}>
                <p
                  id={`${listaId}-${bloque.region}`}
                  className={cn(
                    "rotulo sticky top-0 z-10 bg-popover px-2 pt-2.5 pb-1.5",
                    bloque.region === region && "text-oro",
                  )}
                >
                  {bloque.region}
                </p>
                {bloque.comunas.map(({ comuna, posicion }) => (
                  <div
                    aria-selected={posicion === activo}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                      posicion === activo && "bg-accent text-accent-foreground",
                    )}
                    id={`${listaId}-${posicion}`}
                    key={comuna}
                    onClick={() => elegir(comuna)}
                    onMouseDown={(event) => event.preventDefault()}
                    role="option"
                  >
                    <span className="min-w-0 flex-1 truncate">{comuna}</span>
                    {comuna === value ? <Check className="size-3.5 shrink-0 text-oro" /> : null}
                  </div>
                ))}
              </li>
            ))}
          </ul>
          {value.trim() !== "" && grupos.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No está en la lista: puedes dejarla escrita igual.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}