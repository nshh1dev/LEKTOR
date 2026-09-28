"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { BookOpen } from "lucide-react"
import { coverTone, type PublicacionListItem } from "@/lib/catalog"
import { coverLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type DatosPortada = Pick<PublicacionListItem, "titulo" | "categoria" | "editorial">

const SIZES: Record<"normal" | "grande", string> = {
  normal: "(max-width: 640px) 45vw, (max-width: 1536px) 26vw, 300px",
  grande: "(max-width: 768px) 92vw, 420px",
}

export function Portada({
  publicacion,
  foto,
  grande = false,
  className,
}: {
  publicacion: DatosPortada
  foto?: string
  grande?: boolean
  className?: string
}) {
  const [rota, setRota] = useState<string | null>(null)
  const [cargada, setCargada] = useState<string | null>(null)
  const referencia = useRef<HTMLImageElement>(null)
  const url = foto && foto !== rota ? foto : null
  const lista = url !== null && cargada === url
  const sizes = SIZES[grande ? "grande" : "normal"]

  useEffect(() => {
    if (referencia.current?.complete) setCargada(url)
  }, [url])

  return (
    <div
      className={cn(
        "@container relative aspect-[2/3] w-full overflow-hidden bg-neutral-900 dark:bg-neutral-950",
        className,
      )}
      aria-label={url ? undefined : `Portada de ${publicacion.titulo}`}
    >
      {url ? (
        <>
          <Image
            src={url}
            alt=""
            fill
            sizes={sizes}
            unoptimized
            className={cn(
              "-z-10 scale-[1.4] object-cover blur-2xl brightness-[0.4] saturate-[0.15]",
              "transition-opacity duration-500 ease-out",
              lista ? "opacity-75" : "opacity-0",
            )}
            onLoad={() => setCargada(url)}
            onError={() => setRota(url)}
          />
          <Image
            ref={referencia}
            src={url}
            alt={publicacion.titulo}
            fill
            sizes={sizes}
            unoptimized
            className={cn(
              "object-contain p-[2%] drop-shadow-[0_16px_34px_rgba(0,0,0,0.55)]",
              "transition-[opacity,filter,transform] duration-300 ease-out group-hover:scale-[1.035]",
              lista ? "opacity-100 blur-0" : "opacity-0 blur-md",
            )}
            onLoad={() => setCargada(url)}
            onError={() => setRota(url)}
          />
          <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/25 via-transparent to-black/10" />
        </>
      ) : (
        <Placa publicacion={publicacion} />
      )}
    </div>
  )
}

function Placa({ publicacion }: { publicacion: DatosPortada }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-[7%]">
      <div
        className={cn(
          "@container relative flex aspect-[2/3] h-full max-w-full flex-col justify-between overflow-hidden",
          "rounded-md bg-linear-to-br p-[9%] ring-1 ring-inset ring-oro/20",
          coverTone(publicacion.categoria, true),
        )}
      >
        <div className="flex items-center justify-between text-[5.5cqw] font-medium tracking-[0.2em] text-white/55">
          <span>LEKTOR</span>
          <BookOpen className="size-[6.5cqw]" />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 font-serif text-[15cqw] font-semibold leading-[0.9] tracking-tight text-white/90">
            {coverLabel(publicacion.titulo)}
          </p>
          <p className="mt-[5cqw] line-clamp-2 text-[5.5cqw] font-medium uppercase leading-tight tracking-[0.16em] text-white/45">
            {publicacion.editorial} · edición física
          </p>
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-linear-to-r from-black/55 to-transparent" />
      </div>
    </div>
  )
}
