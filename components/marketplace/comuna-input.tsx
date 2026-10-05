"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { buscarComunas, regionDeComuna, type Region } from "@/lib/comunas"
import { cn } from "@/lib/utils"

/**
 * Campo de comuna que sugiere las comunas de la región elegida y, si la persona escribe una
 * comuna sin región, deduce cuál es. El campo sigue siendo texto libre: el catálogo propone,
 * no bloquea, porque una comuna escrita a mano también tiene que servir.
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
  const [ancho, setAncho] = useState<number | undefined>(undefined)

  const sugerencias = useMemo(() => buscarComunas(value, region), [value, region])
  const haySugerencias = sugerencias.length > 0 || value.trim() !== ""

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
    if (!abierto) return
    setAncho(inputRef.current?.offsetWidth)
  }, [abierto])

  useEffect(() => {
    if (!abierto || activo < 0) return
    document.getElementById(`${listaId}-${activo}`)?.scrollIntoView({ block: "nearest" })
  }, [abierto, activo, listaId])

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverAnchor asChild>
        <Input
          aria-activedescendant={activo >= 0 ? `${listaId}-${activo}` : undefined}
          aria-autocomplete="list"
          aria-controls={listaId}
          aria-describedby={describedBy}
          aria-expanded={abierto}
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
          onFocus={() => setAbierto(haySugerencias)}
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
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="scrollbar-fina max-h-60 min-w-40 overflow-y-auto p-1"
        collisionPadding={12}
        onOpenAutoFocus={(event) => event.preventDefault()}
        side="bottom"
        sideOffset={6}
        style={{ width: ancho }}
      >
        {region ? <p className="rotulo truncate px-2 pt-1.5 pb-2">{region}</p> : null}
        <ul id={listaId} role="listbox" aria-label="Comunas">
          {sugerencias.map((comuna, indice) => (
            <li
              aria-selected={indice === activo}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
                indice === activo && "bg-accent text-accent-foreground",
              )}
              id={`${listaId}-${indice}`}
              key={comuna}
              onClick={() => elegir(comuna)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
            >
              <span className="min-w-0 flex-1 truncate">{comuna}</span>
              {comuna === value ? <Check className="size-3.5 shrink-0 text-oro" /> : null}
            </li>
          ))}
        </ul>
        {value.trim() !== "" && sugerencias.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No está en la lista: puedes dejarla escrita igual.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}