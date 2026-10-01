"use client"

import { useState } from "react"
import { LoaderCircle, Pencil, Star, Trash2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { MensajeError } from "@/components/marketplace/shared"
import { ConfirmarAccion } from "@/components/notificacion/confirmar-accion"
import { avisar } from "@/components/notificacion/avisar"
import { mensajeDeFallo } from "@/lib/avisos"
import { api } from "@/components/marketplace/api"
import { formatDateTime } from "@/lib/format"
import {
  PUNTAJE_MAXIMO,
  reviewSchema,
  reviewUpdateSchema,
  type ReputacionUI,
  type ReviewFormValues,
  type ReviewUI,
} from "@/lib/catalog"
import { cn } from "@/lib/utils"

const TAMANOS = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
} as const

type TamanoEstrella = keyof typeof TAMANOS

const ETIQUETAS_PUNTAJE = ["Mala", "Regular", "Corrigió bien", "Muy buena", "Excelente"]

type DatosPublicacion = { reviews: ReviewUI[]; reputacion: ReputacionUI }

/**
 * Las estrellas se pintan con un recorte sobre la misma forma: la de fondo va
 * al 25% de opacidad y la de encima se encoge al porcentaje que falta. Así se ve
 * la media estrella de verdad, sin dibujar iconos aparte.
 */
export function Estrellas({
  nota,
  tamano = "sm",
  className,
}: {
  nota: number
  tamano?: TamanoEstrella
  className?: string
}) {
  const acotada = Math.max(0, Math.min(PUNTAJE_MAXIMO, nota))
  return (
    <span className={cn("flex shrink-0", className)} aria-hidden>
      {Array.from({ length: PUNTAJE_MAXIMO }, (_, indice) => (
        <span key={indice} className="relative flex">
          <Star className={cn("shrink-0 text-oro/25", TAMANOS[tamano])} />
          <span
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${Math.max(0, Math.min(1, acotada - indice)) * 100}%` }}
          >
            <Star className={cn("shrink-0 fill-oro text-oro", TAMANOS[tamano])} />
          </span>
        </span>
      ))}
    </span>
  )
}

/** Promedio y cuántas personas valoraron. Sin nota no se muestra nada. */
export function ResumenEstrellas({
  reputacion,
  className,
}: {
  reputacion: ReputacionUI
  className?: string
}) {
  if (reputacion.promedio === null || reputacion.total === 0) return null
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <Estrellas nota={reputacion.promedio} />
      <span className="text-xs font-medium tabular-nums text-foreground">
        {reputacion.promedio.toFixed(1)}
      </span>
      <span className="text-xs text-muted-foreground">
        ({reputacion.total} {reputacion.total === 1 ? "valoración" : "valoraciones"})
      </span>
    </span>
  )
}

/**
 * El selector son radios de verdad escondidos tras la estrella: se elige con el
 * teclado, se anuncia como grupo y el lector de pantalla lee la etiqueta de cada
 * opción en vez de un número suelto.
 */
export function SelectorEstrellas({
  valor,
  onCambio,
  error,
  name = "puntaje",
}: {
  valor: number
  onCambio: (puntaje: number) => void
  error?: string
  /** Cada grupo necesita su propio nombre: si se repite, el navegador los
   *  junta en un solo grupo y editar una reseña desmarca el formulario de abajo. */
  name?: string
}) {
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-describedby={error ? `${name}-error` : undefined}
    >
      <legend className="rotulo text-[9px] text-muted-foreground">
        ¿Cómo te fue con el ejemplar?
      </legend>
      <div className="flex items-center gap-1">
        {Array.from({ length: PUNTAJE_MAXIMO }, (_, indice) => indice + 1).map((puntaje) => (
          <label key={puntaje} className="cursor-pointer p-0.5">
            <input
              type="radio"
              name={name}
              value={puntaje}
              checked={valor === puntaje}
              onChange={() => onCambio(puntaje)}
              className="peer sr-only"
            />
            <Star
              aria-hidden
              className={cn(
                "size-7 rounded-sm text-oro/25 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-oro peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
                valor >= puntaje && "fill-oro text-oro",
              )}
            />
            <span className="sr-only">
              {puntaje} de 5, {ETIQUETAS_PUNTAJE[puntaje - 1]}
            </span>
          </label>
        ))}
      </div>
      {error && <MensajeError campo={name} mensaje={error} />}
    </fieldset>
  )
}

/**
 * Las cinco barras del resumen. La cantidad va en números y no en el ancho
 * alone porque el porcentaje se redondea y dos reseñas sobre cien no se ven.
 */
export function BarrasEstrellas({
  reputacion,
  className,
}: {
  reputacion: ReputacionUI
  className?: string
}) {
  if (reputacion.total === 0) return null
  return (
    <div className={cn("flex w-full max-w-56 flex-col gap-1.5", className)}>
      {reputacion.distribucion.map((fila) => (
        <div key={fila.puntaje} className="flex items-center gap-2 text-[11px]">
          <span className="w-12 shrink-0 tabular-nums text-muted-foreground">{fila.puntaje} ★</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-oro/15">
            <span
              className="block h-full rounded-full bg-oro"
              style={{ width: `${fila.porcentaje}%` }}
            />
          </span>
          <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">
            {fila.cantidad}
          </span>
        </div>
      ))}
    </div>
  )
}

export function FormValoracion({
  publicacionId,
  onCreada,
}: {
  publicacionId: string
  onCreada: (datos: DatosPublicacion) => void
}) {
  const [enviando, setEnviando] = useState(false)
  const {
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { puntaje: 0 },
  })
  const puntaje = useWatch({ control, name: "puntaje" })

  const enviar = handleSubmit(async (datos) => {
    setEnviando(true)
    try {
      const respuesta = await api<DatosPublicacion>(
        `/api/publications/${publicacionId}/reviews`,
        { method: "POST", body: JSON.stringify(datos) },
      )
      onCreada(respuesta)
      reset({ puntaje: 0 })
      avisar.ok({
        titulo: "Valoración publicada",
        descripcion: "Gracias por contar cómo te fue con tu ejemplar.",
      })
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo publicar la valoración",
        descripcion: mensajeDeFallo(error, "Elige las estrellas que le das."),
      })
    } finally {
      setEnviando(false)
    }
  })

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <SelectorEstrellas
        valor={puntaje}
        onCambio={(elegido) => setValue("puntaje", elegido, { shouldValidate: true })}
        error={errors.puntaje?.message}
      />
      <Button type="submit" className="w-fit rounded-lg" disabled={enviando}>
        {enviando ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Star data-icon="inline-start" />
        )}
        Publicar valoración
      </Button>
    </form>
  )
}

/**
 * Una sola lista para la página de la publicación. Quien escribió puede editar
 * o borrar lo suyo y el vendedor responde una vez; las demás acciones solo le
 * salen a quien corresponde y el servidor las vuelve a comprobar.
 */
export function ListaValoraciones({
  reviews,
  yoId,
  onActualizado,
}: {
  reviews: ReviewUI[]
  yoId: string | null
  onActualizado: (datos: DatosPublicacion) => void
}) {
  const [editando, setEditando] = useState<string | null>(null)
  const [borrando, setBorrando] = useState<ReviewUI | null>(null)
  const [borrarAbierto, setBorrarAbierto] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const recargar = async (publicacionId: string) => {
    const datos = await api<DatosPublicacion>(`/api/publications/${publicacionId}/reviews`)
    onActualizado(datos)
  }

  const guardarEdicion = async (review: ReviewUI, valores: Partial<ReviewFormValues>) => {
    setOcupado(true)
    try {
      await api(`/api/reviews/${review.id}`, {
        method: "PATCH",
        body: JSON.stringify(valores),
      })
      await recargar(review.publicacionId)
      setEditando(null)
      avisar.ok({ titulo: "Valoración actualizada", descripcion: "El cambio ya está publicado." })
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo actualizar la valoración",
        descripcion: mensajeDeFallo(error, "Elige las estrellas e inténtalo otra vez."),
      })
    } finally {
      setOcupado(false)
    }
  }

  const confirmarBorrado = async () => {
    if (!borrando) return
    setOcupado(true)
    try {
      const respuesta = await api<{ reputacion: ReputacionUI }>(`/api/reviews/${borrando.id}`, {
        method: "DELETE",
      })
      onActualizado({
        reviews: reviews.filter((review) => review.id !== borrando.id),
        reputacion: respuesta.reputacion,
      })
      avisar.ok({
        titulo: "Valoración eliminada",
        descripcion: "Ya no aparece en esta publicación.",
      })
      setBorrando(null)
      setBorrarAbierto(false)
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo eliminar la valoración",
        descripcion: mensajeDeFallo(error, "Inténtalo otra vez en un momento."),
      })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {reviews.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Todavía no hay valoraciones. Solo pueden valorar quienes recibieron el ejemplar.
        </p>
      )}

      {reviews.map((review) => {
        const propia = review.autor.id === yoId
        return (
          <article key={review.id} className="flex flex-col gap-2 border-b border-border/50 pb-4 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {review.autor.nombre.slice(0, 1)}
              </span>
              <span className="text-sm font-medium">{review.autor.nombre}</span>
              <Estrellas nota={review.puntaje} />
              <span className="text-[11px] text-muted-foreground">
                {formatDateTime(review.fechaCreacion)}
              </span>
              {review.editadoEn && <span className="text-[11px] text-muted-foreground/70">editada</span>}
            </div>

            {editando === review.id ? (
              <FormEdicion
                ocupado={ocupado}
                onCancelar={() => setEditando(null)}
                onGuardar={(valores) => guardarEdicion(review, valores)}
              />
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              {propia && editando !== review.id && (
                <>
                  <BotonSutil onClick={() => setEditando(review.id)} disabled={ocupado}>
                    <Pencil data-icon="inline-start" /> Editar
                  </BotonSutil>
                  <BotonSutil
                    onClick={() => {
                      setBorrando(review)
                      setBorrarAbierto(true)
                    }}
                    disabled={ocupado}
                  >
                    <Trash2 data-icon="inline-start" /> Borrar
                  </BotonSutil>
                </>
              )}
            </div>
          </article>
        )
      })}

      <ConfirmarAccion
        abierto={borrarAbierto}
        tono="falla"
        titulo="¿Borrar esta valoración?"
        descripcion="Se elimina de la publicación y el promedio se recalcula sin ella. No se puede deshacer."
        confirmTexto="Borrar valoración"
        cargando={ocupado}
        onConfirmar={confirmarBorrado}
        onCerrar={() => {
          setBorrarAbierto(false)
          setBorrando(null)
        }}
      />
    </div>
  )
}

function BotonSutil({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-auto rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  )
}

function FormEdicion({
  ocupado,
  onGuardar,
  onCancelar,
}: {
  ocupado: boolean
  onGuardar: (valores: Partial<ReviewFormValues>) => void
  onCancelar: () => void
}) {
  const [puntaje, setPuntaje] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const confirmar = () => {
    const parsed = reviewUpdateSchema.safeParse({ puntaje })
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.puntaje?.[0] ?? "Revisa las estrellas")
      return
    }
    setError(null)
    onGuardar(parsed.data)
  }

  return (
    <div className="flex flex-col gap-3">
      <SelectorEstrellas
        valor={puntaje}
        onCambio={setPuntaje}
        error={error ?? undefined}
        name="puntaje-edicion"
      />
      <div className="flex gap-2">
        <Button size="sm" className="rounded-lg" onClick={confirmar} disabled={ocupado}>
          {ocupado && <LoaderCircle data-icon="inline-start" className="animate-spin" />}
          Guardar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-lg"
          onClick={onCancelar}
          disabled={ocupado}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
