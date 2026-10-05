"use client"

import { useState } from "react"
import Link from "next/link"
import { BookMarked, LoaderCircle, PackageSearch, ScanBarcode, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EscanerIsbn } from "@/components/escaner-isbn"
import { Aviso } from "@/components/notificacion/avisos"
import { StockMovementDialog, type PublicacionMovible } from "@/components/panel/stock-movement-dialog"
import type { EstadoPublicacion, LibroIsbn } from "@/lib/catalog"
import { ESTADO_PUBLICACION_LABEL, formatCLP, formatDateTime } from "@/lib/format"
import { formatIsbn, isValidIsbn, normalizeIsbn } from "@/lib/isbn"
import { PanelApiError, panelGet } from "@/lib/panel-client"
import { cn } from "@/lib/utils"

type Listado = {
  id: string
  titulo: string
  autor: string
  editorial: string
  precio: number
  stock: number
  estado: EstadoPublicacion
  vendedor: string
  movimientos: number
  ultimoMovimiento: string | null
}

type RespuestaIsbn = { metadata: LibroIsbn | null; publicaciones: Listado[] }

export function ScannerView() {
  const [entrada, setEntrada] = useState("")
  const [isbn, setIsbn] = useState("")
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nota, setNota] = useState<string | null>(null)
  const [listados, setListados] = useState<Listado[]>([])
  const [metadata, setMetadata] = useState<LibroIsbn | null>(null)
  const [movimiento, setMovimiento] = useState<PublicacionMovible | null>(null)

  const consultar = async (valor: string) => {
    const limpio = normalizeIsbn(valor)
    if (!limpio || !isValidIsbn(limpio)) {
      setError("Ingresa un ISBN válido de 10 o 13 dígitos")
      return
    }
    setEntrada(formatIsbn(limpio))
    setIsbn(limpio)
    setBuscando(true)
    setError(null)
    setNota(null)
    setListados([])
    setMetadata(null)

    const [propio, externo] = await Promise.allSettled([
      panelGet<RespuestaIsbn>(`/api/panel/isbn?isbn=${limpio}`),
      panelGet<{ libro: LibroIsbn | null }>(`/api/isbn?isbn=${limpio}`),
    ])

    if (propio.status === "fulfilled") {
      setListados(propio.value.publicaciones)
      if (propio.value.metadata) setMetadata(propio.value.metadata)
    }
    if (externo.status === "fulfilled" && externo.value.libro) {
      setMetadata(externo.value.libro)
    }

    if (propio.status === "rejected" && externo.status === "rejected") {
      setError("No pudimos consultar el ISBN. Intenta de nuevo en un momento.")
    } else if (externo.status === "rejected") {
      // 404 significa que Open Library no tiene ficha; 502 que el servicio falló.
      const motivo = externo.reason
      const mensaje =
        motivo instanceof PanelApiError && motivo.status >= 500
          ? "Open Library no está respondiendo. Mostramos solo el catálogo interno de LEKTOR."
          : "Open Library no tiene ficha para este ISBN: mostramos solo el catálogo interno de LEKTOR."
      setNota(mensaje)
    }

    setBuscando(false)
  }

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Escáner</h1>
        <p className="text-sm text-muted-foreground">
          Lee el ISBN de un tomo para revisar su ficha y los exemplares publicados en LEKTOR
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <EscanerIsbn
          onDetectado={(valor) => void consultar(valor)}
          titulo="Escanear ISBN"
          detenido={buscando}
        />

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Búsqueda manual</CardTitle>
            <CardDescription>Escribe el ISBN si la cámara no está disponible</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={entrada}
                onChange={(evento) => setEntrada(formatIsbn(evento.target.value))}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") void consultar(entrada)
                }}
                placeholder="978-8-4160-9656-7"
                inputMode="numeric"
                className="font-mono"
                aria-label="ISBN para consultar"
              />
              <Button onClick={() => void consultar(entrada)} disabled={buscando}>
                {buscando ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Consultar
              </Button>
            </div>
            {error ? <Aviso tono="revisar" titulo={error} rotulo="Revisar ISBN" /> : null}
            {nota ? <Aviso tono="dato" titulo={nota} /> : null}
            {isbn && (
              <p className="font-mono text-xs text-muted-foreground">ISBN normalizado: {formatIsbn(isbn)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {buscando && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl lg:col-span-1" />
          <Skeleton className="h-40 rounded-xl lg:col-span-2" />
        </div>
      )}

      {isbn && !buscando && (
        <>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <BookMarked className="h-4 w-4" />
                Ficha del ejemplar
              </CardTitle>
              <CardDescription>Datos del ISBN consultado</CardDescription>
            </CardHeader>
            <CardContent>
              {metadata ? (
                <div className="grid gap-4 sm:grid-cols-[auto,1fr]">
                  {metadata.portadaUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={metadata.portadaUrl}
                      alt={`Portada de ${metadata.titulo ?? "ejemplar"}`}
                      className="h-40 w-28 rounded-lg object-cover ring-1 ring-border"
                    />
                  )}
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <Dato etiqueta="Título" valor={metadata.titulo} sinTraducir={metadata.sinTraducir?.includes("titulo")} />
                    <Dato etiqueta="Autoría" valor={metadata.autor} sinTraducir={metadata.sinTraducir?.includes("autor")} />
                    <Dato etiqueta="Editorial" valor={metadata.editorial} sinTraducir={metadata.sinTraducir?.includes("editorial")} />
                    <Dato etiqueta="Año" valor={metadata.anio ? String(metadata.anio) : null} />
                    <Dato etiqueta="Páginas" valor={metadata.paginas ? String(metadata.paginas) : null} />
                    <Dato
                      etiqueta="Fuente"
                      valor={
                        metadata.fuente === "cache"
                          ? "Caché interna"
                          : metadata.fuente === "google-books"
                            ? "Google Books"
                            : "Open Library"
                      }
                    />
                  </dl>
                </div>
              ) : (
                <p className="py-4 text-sm text-muted-foreground">
                  No hay ficha bibliográfica para este ISBN. Puedes registrar el movimiento de stock sobre las
                  publicaciones existentes.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <PackageSearch className="h-4 w-4" />
                Publicaciones con este ISBN
              </CardTitle>
              <CardDescription>
                {listados.length === 0
                  ? "Ningún vendedor publicó este ISBN en LEKTOR"
                  : `${listados.length} publicación(es) encontradas`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {listados.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <ScanBarcode className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Si el ISBN está correcto, ningún lector lo tiene publicado todavía.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href="/productos">Ir a publicaciones</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead scope="col">Publicación</TableHead>
                        <TableHead scope="col">Vendedor</TableHead>
                        <TableHead scope="col" className="text-right">Precio</TableHead>
                        <TableHead scope="col" className="text-right">Stock</TableHead>
                        <TableHead scope="col">Estado</TableHead>
                        <TableHead scope="col">Último movimiento</TableHead>
                        <TableHead scope="col" className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {listados.map((publicacion) => (
                        <TableRow key={publicacion.id}>
                          <TableCell>
                            <div className="font-medium">{publicacion.titulo}</div>
                            <div className="text-xs text-muted-foreground">
                              {publicacion.autor} · {publicacion.editorial}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{publicacion.vendedor}</TableCell>
                          <TableCell className="text-right font-mono">{formatCLP(publicacion.precio)}</TableCell>
                          <TableCell className="text-right font-mono">{publicacion.stock}</TableCell>
                          <TableCell>
                            <Badge variant={publicacion.estado === "activa" ? "default" : "secondary"}>
                              {ESTADO_PUBLICACION_LABEL[publicacion.estado]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {publicacion.ultimoMovimiento ? formatDateTime(publicacion.ultimoMovimiento) : "Sin movimientos"}
                            <div className="font-mono text-xs">{publicacion.movimientos} registrados</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setMovimiento({
                                  id: publicacion.id,
                                  titulo: publicacion.titulo,
                                  stock: publicacion.stock,
                                })
                              }
                            >
                              Stock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!isbn && (
        <p className={cn("text-xs text-muted-foreground", "print:hidden")}>
          El escáner usa la cámara del dispositivo y el lector nativo de códigos de barras. También puedes buscar por
          ISBN a mano.
        </p>
      )}

      <StockMovementDialog
        publicacion={movimiento}
        onCerrar={() => setMovimiento(null)}
        onGuardado={() => {
          setMovimiento(null)
          void consultar(isbn)
        }}
      />
    </main>
  )
}

function Dato({
  etiqueta,
  valor,
  sinTraducir,
}: {
  etiqueta: string
  valor: string | null | undefined
  sinTraducir?: boolean
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium">{valor ?? "—"}</dd>
      {sinTraducir ? (
        <p className="text-xs text-aviso-revisar animate-in fade-in slide-in-from-top-1 duration-300">
          No pudimos pasarlo al alfabeto latino: revisa este dato.
        </p>
      ) : null}
    </div>
  )
}
