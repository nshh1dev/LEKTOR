"use client"

import { useCallback, useMemo, useState, type ChangeEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Check, LoaderCircle, Search, X } from "lucide-react"
import { EscanerIsbn } from "@/components/escaner-isbn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { avisar } from "@/components/notificacion/avisar"
import { FaltanDatos } from "@/components/notificacion/avisos"
import { mensajeDeFallo, resumenFaltantes } from "@/lib/avisos"
import { CATEGORIAS, CONDICIONES, listaFotosAUrls, publicarFormSchema, type Categoria, type Condicion, type LibroIsbn, type PublicarFormValues } from "@/lib/catalog"
import { formatearPrecio, precioANumero } from "@/lib/entrada"
import { formatIsbn, isValidIsbn, normalizeIsbn } from "@/lib/isbn"
import { MensajeError, MensajeNoLatino } from "@/components/marketplace/shared"
import { api } from "@/components/marketplace/api"

type PublicarForm = Omit<PublicarFormValues, "precio"> & { precio: string }

const MAX_FOTO_BYTES = 5 * 1024 * 1024
const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"]

const ETIQUETAS_CAMPO: Record<string, string> = {
  titulo: "Título",
  autor: "Autor",
  editorial: "Editorial",
  volumen: "Volumen",
  precio: "Precio",
  stock: "Ejemplares",
  isbn: "ISBN",
  descripcion: "Descripción",
  fotos: "Fotos",
  condicion: "Condición física",
  categoria: "Categoría",
}

export function PublicarView({
  onVolver,
  onPublicado,
}: {
  onVolver: () => void
  onPublicado: () => void
}) {
  const [modo, setModo] = useState<"escaner" | "manual">("escaner")
  const [buscando, setBuscando] = useState(false)
  const [libro, setLibro] = useState<LibroIsbn | null>(null)
  const [portadaOpenLibrary, setPortadaOpenLibrary] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    reset,
    formState: { errors },
  } = useForm<PublicarForm>({
    resolver: zodResolver(publicarFormSchema),
    defaultValues: {
      titulo: "",
      autor: "",
      editorial: "",
      volumen: "",
      categoria: "Mangas",
      condicion: "Como nuevo",
      precio: "",
      stock: 1,
      isbn: "",
      descripcion: "",
      fotos: "",
    },
  })

  const isbnActual = useWatch({ control, name: "isbn" })
  const precioActual = useWatch({ control, name: "precio" })

  const valorFotos = useWatch({ control, name: "fotos" })
  const fotosActuales = useMemo(() => listaFotosAUrls(valorFotos ?? ""), [valorFotos])
  const [subiendo, setSubiendo] = useState(false)

  const onSeleccionarArchivos = useCallback(
    async (evento: ChangeEvent<HTMLInputElement>) => {
      const archivos = Array.from(evento.target.files ?? [])
      evento.target.value = ""
      if (archivos.length === 0 || subiendo) return

      const restantes = 6 - fotosActuales.length
      if (restantes <= 0) {
        avisar.falla({
          titulo: "Límite de fotos alcanzado",
          descripcion: "Cada publicación admite hasta 6 fotos. Quita alguna antes de subir otra.",
        })
        return
      }

      const eleccion = archivos.slice(0, restantes)
      const invalidas = eleccion.filter((archivo) => archivo.size > MAX_FOTO_BYTES || !TIPOS_FOTO.includes(archivo.type))
      if (invalidas.length > 0) {
        avisar.revisar({
          titulo: "Alguna imagen no cumple los requisitos",
          descripcion: "Cada foto debe ser JPG, PNG o WebP y pesar 5 MB o menos.",
        })
        return
      }

      const form = new FormData()
      eleccion.forEach((archivo) => form.append("archivos", archivo))
      setSubiendo(true)
      try {
        const respuesta = await fetch("/api/uploads", { method: "POST", body: form })
        const payload = (await respuesta.json().catch(() => ({}))) as { urls?: string[]; error?: string }
        if (!respuesta.ok || !payload.urls) {
          throw new Error(payload.error ?? "No se pudieron subir las imágenes")
        }
        const actuales = listaFotosAUrls(getValues("fotos") ?? "")
        setValue("fotos", [...actuales, ...payload.urls].slice(0, 6).join(", "), { shouldValidate: true })
        avisar.ok({
          titulo: `${payload.urls.length} foto${payload.urls.length > 1 ? "s" : ""} subida${payload.urls.length > 1 ? "s" : ""}`,
          descripcion: "Se agregó a la ficha del ejemplar.",
        })
      } catch (error) {
        avisar.falla({
          titulo: "No se pudieron subir las fotos",
          descripcion: mensajeDeFallo(error, "Revisa que cada imagen sea JPG, PNG o WebP y que pese menos de 5 MB."),
        })
      } finally {
        setSubiendo(false)
      }
    },
    [fotosActuales.length, getValues, setValue, subiendo],
  )

  const quitarFoto = useCallback(
    (url: string) => {
      const restantes = listaFotosAUrls(getValues("fotos") ?? "").filter((actual) => actual !== url)
      setValue("fotos", restantes.join(", "), { shouldValidate: true })
    },
    [getValues, setValue],
  )

  // Sin `useMemo` a propósito: ver la nota en `checkout-view.tsx`. Memoizar
  // sobre el Proxy de `errors` dejaba la publicación marcada como incompleta
  // después de corregir el campo.
  const faltan = resumenFaltantes(errors, ETIQUETAS_CAMPO, {
    titulo: "titulo",
    autor: "autor",
    editorial: "editorial",
    volumen: "volumen",
    precio: "precio",
    stock: "stock",
    isbn: "isbn",
    fotos: "fotos",
  })

  const consultarIsbn = useCallback(
    async (valor: string) => {
      const limpio = normalizeIsbn(valor)
      if (!limpio) return
      if (!isValidIsbn(limpio)) {
        avisar.falla({
          titulo: "Ese ISBN no es válido",
          descripcion: "Revisa el dígito verificador: un número mal tipeado no encuentra el libro.",
          referencia: `ISBN ${limpio}`,
          accion: { etiqueta: "Corregir el ISBN", alPulsar: () => document.getElementById("isbn")?.focus() },
        })
        return
      }
      setBuscando(true)
      try {
        const data = await api<{ libro: LibroIsbn }>(`/api/isbn?isbn=${limpio}`)
        setLibro(data.libro)
        setPortadaOpenLibrary(data.libro.portadaUrl)
        setValue("isbn", limpio, { shouldValidate: true })
        if (data.libro.titulo) setValue("titulo", data.libro.titulo, { shouldValidate: true })
        if (data.libro.autor) setValue("autor", data.libro.autor, { shouldValidate: true })
        if (data.libro.editorial) setValue("editorial", data.libro.editorial, { shouldValidate: true })
        if (data.libro.portadaUrl) {
          const actuales = getValues("fotos")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
          if (actuales.length === 0) setValue("fotos", data.libro.portadaUrl ?? "", { shouldValidate: true })
        }
        avisar.ok({
          titulo:
            data.libro.fuente === "google-books"
              ? "Datos encontrados en Google Books"
              : data.libro.fuente === "openbd"
                ? "Datos encontrados en OpenBD"
                : "Datos encontrados en Open Library",
          descripcion: "Revisa y completa la condición física antes de publicar.",
          referencia: `ISBN ${limpio}`,
        })
      } catch (error) {
        setLibro(null)
        avisar.revisar({
          titulo: "Open Library no tiene ficha para este ISBN",
          descripcion: mensajeDeFallo(error, "Puedes escribir el título y el autor a mano."),
          referencia: `ISBN ${limpio}`,
          accion: { etiqueta: "Completar a mano", alPulsar: () => setModo("manual") },
        })
      } finally {
        setBuscando(false)
      }
    },
    [getValues, setValue],
  )

  const onSubmit = handleSubmit(async (values) => {
    setEnviando(true)
    try {
      const payload = {
        titulo: values.titulo,
        autor: values.autor,
        editorial: values.editorial,
        volumen: values.volumen ? Number(values.volumen) : null,
        categoria: values.categoria,
        condicion: values.condicion,
        precio: precioANumero(values.precio),
        stock: Number(values.stock),
        isbn: values.isbn ? normalizeIsbn(values.isbn) : "",
        descripcion: values.descripcion,
        fotos: listaFotosAUrls(values.fotos),
      }
      await api("/api/publications", { method: "POST", body: JSON.stringify(payload) })
      avisar.ok({
        titulo: "Ejemplar publicado",
        descripcion: "Ya aparece en el catálogo con tu nombre como vendedor.",
        referencia: values.titulo,
      })
      reset()
      setLibro(null)
      setPortadaOpenLibrary(null)
      onPublicado()
    } catch (error) {
      avisar.falla({
        titulo: "No se pudo publicar el ejemplar",
        descripcion: mensajeDeFallo(error, "Revisa la ficha e inténtalo otra vez."),
        referencia: values.titulo || values.isbn || undefined,
        duracion: 8000,
      })
    } finally {
      setEnviando(false)
    }
  })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <button
        type="button"
        onClick={onVolver}
        className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al catálogo
      </button>

      <div>
        <Badge variant="secondary" className="mb-3 rounded-full">
          Para lectores
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Publicar un nuevo ejemplar</h1>
        <p className="mt-2 text-muted-foreground">
          Escanea el ISBN y dejamos los datos listos. Tu, decides el estado fisico y el precio.
        </p>
      </div>

      <div className="flex gap-2 rounded-xl bg-muted/50 p-1">
        <Button
          type="button"
          variant={modo === "escaner" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => setModo("escaner")}
        >
          Escanear ISBN
        </Button>
        <Button
          type="button"
          variant={modo === "manual" ? "default" : "ghost"}
          className="flex-1"
          onClick={() => setModo("manual")}
        >
          Ingreso Manual
        </Button>
      </div>

      {modo === "escaner" && (
        <div className="flex flex-col gap-3">
          <EscanerIsbn onDetectado={(valor) => void consultarIsbn(valor)} />
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="isbn">ISBN</Label>
              <Input
                id="isbn"
                inputMode="numeric"
                placeholder="978-8-4160-9656-7"
                className="font-mono"
                value={isbnActual}
                onChange={(event) => setValue("isbn", formatIsbn(event.target.value), { shouldValidate: true })}
                aria-invalid={errors.isbn ? true : undefined}
                aria-describedby={errors.isbn ? "isbn-error" : undefined}
              />
              <MensajeError campo="isbn" className="mt-1" mensaje={errors.isbn?.message} />
            </div>
            <Button type="button" variant="outline" className="rounded-xl" disabled={buscando} onClick={() => void consultarIsbn(getValues("isbn"))}>
              {buscando ? <LoaderCircle className="size-4 animate-spin" /> : <Search />}
              Buscar
            </Button>
          </div>
          {libro && (
            <Card className="rounded-xl bg-muted/50 shadow-none">
              <CardContent className="flex flex-col gap-2 p-4 text-sm">
                <p className="font-semibold">{libro.titulo}</p>
                <p className="text-muted-foreground">
                    {[libro.autor, libro.editorial, libro.anio, libro.paginas ? `${libro.paginas} páginas` : null]
                      .filter(Boolean)
                      .join(" · ")}
                </p>
                {portadaOpenLibrary && (
                  <p className="text-xs text-muted-foreground">
                    Se agregó la portada de Open Library como primera foto referencial.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Card className="rounded-2xl border-0 shadow-sm ring-1 ring-border/60">
          <CardHeader>
            <CardTitle>Datos del ejemplar</CardTitle>
            <CardDescription>
              {modo === "manual" && "Completa la ficha a mano. "}
              El titulo, autor y editorial son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input aria-invalid={errors.titulo ? true : undefined} aria-describedby={errors.titulo ? "titulo-error" : undefined} id="titulo" placeholder="Chainsaw Man Vol. 1" {...register("titulo")} />
              <MensajeError campo="titulo" mensaje={errors.titulo?.message} />
              <MensajeNoLatino campo="titulo" mostrar={!!libro?.sinTraducir?.includes("titulo")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="autor">Autor</Label>
                <Input aria-invalid={errors.autor ? true : undefined} aria-describedby={errors.autor ? "autor-error" : undefined} id="autor" placeholder="Tatsuki Fujimoto" {...register("autor")} />
                <MensajeError campo="autor" mensaje={errors.autor?.message} />
                <MensajeNoLatino campo="autor" mostrar={!!libro?.sinTraducir?.includes("autor")} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="editorial">Editorial</Label>
                <Input aria-invalid={errors.editorial ? true : undefined} aria-describedby={errors.editorial ? "editorial-error" : undefined} id="editorial" placeholder="Ivrea" {...register("editorial")} />
                <MensajeError campo="editorial" mensaje={errors.editorial?.message} />
                <MensajeNoLatino campo="editorial" mostrar={!!libro?.sinTraducir?.includes("editorial")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select onValueChange={(value) => setValue("categoria", value as Categoria, { shouldValidate: true })} defaultValue="Mangas">
                  <SelectTrigger id="categoria" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="condicion">Condición física</Label>
                <Select onValueChange={(value) => setValue("condicion", value as Condicion, { shouldValidate: true })} defaultValue="Como nuevo">
                  <SelectTrigger id="condicion" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDICIONES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="volumen">Volumen</Label>
                <Input aria-invalid={errors.volumen ? true : undefined} aria-describedby={errors.volumen ? "volumen-error" : undefined} id="volumen" inputMode="numeric" placeholder="1" {...register("volumen")} />
                <MensajeError campo="volumen" mensaje={errors.volumen?.message} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="precio">Precio (CLP)</Label>
                <Input
                  aria-invalid={errors.precio ? true : undefined}
                  aria-describedby={errors.precio ? "precio-error" : undefined}
                  id="precio"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="$15.000"
                  className="font-mono"
                  value={precioActual ?? ""}
                  onChange={(event) => setValue("precio", formatearPrecio(event.target.value), { shouldValidate: true })}
                />
                <MensajeError campo="precio" mensaje={errors.precio?.message} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="stock">Ejemplares</Label>
                <Input aria-invalid={errors.stock ? true : undefined} aria-describedby={errors.stock ? "stock-error" : undefined} id="stock" type="number" min={1} {...register("stock", { valueAsNumber: true })} />
                <MensajeError campo="stock" mensaje={errors.stock?.message} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="fotos">Fotos (URLs separadas por coma)</Label>
              <Input aria-invalid={errors.fotos ? true : undefined} aria-describedby={errors.fotos ? "fotos-error" : undefined} id="fotos" placeholder="https://.../portada.jpg, https://.../detalle.jpg" {...register("fotos")} />
              <p className="text-xs text-muted-foreground">
                Hasta 6 fotos. Muestra el estado real del ejemplar: es lo que compra la gente.
              </p>
              <MensajeError campo="fotos" mensaje={errors.fotos?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="archivos">Subir fotos desde el PC</Label>
              <Input
                id="archivos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="cursor-pointer"
                onChange={onSeleccionarArchivos}
                disabled={subiendo}
              />
              <p className="text-xs text-muted-foreground">
                {subiendo
                  ? "Subiendo imágenes..."
                  : "JPG, PNG o WebP, hasta 5 MB por imagen. Se suman a las fotos de arriba hasta llegar a 6."}
              </p>
              {fotosActuales.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {fotosActuales.map((url) => (
                    <div key={url} className="group relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-border/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Quitar esta foto"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => quitarFoto(url)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea aria-invalid={errors.descripcion ? true : undefined} aria-describedby={errors.descripcion ? "descripcion-error" : undefined} id="descripcion" rows={4} placeholder="Lomo con leves marcas de uso, paginas limpias, sin anotaciones..." {...register("descripcion")} />
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            {faltan.length > 0 ? (
              <FaltanDatos
                titulo="La ficha todavía no está lista"
                datos={faltan}
              />
            ) : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={onVolver}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90" disabled={enviando}>
                {enviando ? <LoaderCircle className="size-4 animate-spin" /> : <Check />}
                Publicar
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
