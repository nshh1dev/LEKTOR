"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { REGIONES } from "@/lib/catalog"
import { regionDeComuna } from "@/lib/comunas"
import { cn } from "@/lib/utils"
import { ComunaInput } from "@/components/marketplace/comuna-input"
import { ETIQUETA_CAMPO, MensajeError } from "@/components/marketplace/shared"

/**
 * El par región + comuna que comparten el registro, el checkout y el perfil. La región va
 * primero y acota el índice del campo de comuna; si la comuna escrita identifica otra región,
 * la de arriba se corrige sola. Al cambiar de región, la comuna que no pertenece a la nueva
 * se limpia, para no guardar una pareja que el catálogo no reconoce.
 *
 * El `prefijo` arma los ids de los campos y de sus avisos: sin él quedan `region` y `comuna`,
 * que es lo que enlazan las anclas de `FaltanDatos`.
 */
export function CampoUbicacion({
  prefijo,
  region,
  comuna,
  onRegionChange,
  onComunaChange,
  errorRegion,
  errorComuna,
  lado = "bottom",
  className,
}: {
  prefijo?: string
  region: string
  comuna: string
  onRegionChange: (region: string) => void
  onComunaChange: (comuna: string) => void
  errorRegion?: string
  errorComuna?: string
  /** Lado del desplegable de región: dentro de un diálogo conviene que abra hacia arriba. */
  lado?: "top" | "bottom"
  className?: string
}) {
  const idRegion = prefijo ? `${prefijo}-region` : "region"
  const idComuna = prefijo ? `${prefijo}-comuna` : "comuna"

  const elegirRegion = (valor: string) => {
    const regionDeLaComuna = regionDeComuna(comuna)
    if (regionDeLaComuna && regionDeLaComuna !== valor) onComunaChange("")
    onRegionChange(valor)
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1.5">
        <Label className={ETIQUETA_CAMPO} htmlFor={idRegion}>Región</Label>
        <Select value={region} onValueChange={elegirRegion}>
          <SelectTrigger
            aria-describedby={errorRegion ? `${idRegion}-error` : undefined}
            aria-invalid={errorRegion ? true : undefined}
            className="w-full"
            id={idRegion}
          >
            <SelectValue placeholder="Selecciona tu región" />
          </SelectTrigger>
          <SelectContent
            align="start"
            className="w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]"
            side={lado}
            sideOffset={6}
          >
            {REGIONES.map((nombre) => (
              <SelectItem key={nombre} value={nombre}>
                {nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MensajeError campo={idRegion} mensaje={errorRegion} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className={ETIQUETA_CAMPO} htmlFor={idComuna}>Comuna</Label>
        <ComunaInput
          describedBy={errorComuna ? `${idComuna}-error` : undefined}
          id={idComuna}
          invalid={Boolean(errorComuna)}
          onRegionSugerida={onRegionChange}
          onValueChange={onComunaChange}
          placeholder={region ? "Providencia" : "Elige la región y busca tu comuna"}
          region={region}
          value={comuna}
        />
        <MensajeError campo={idComuna} mensaje={errorComuna} />
      </div>
    </div>
  )
}
