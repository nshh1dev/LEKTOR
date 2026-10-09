"use client"

import { useEffect, useState } from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { avisar } from "@/components/notificacion/avisar"
import { Aviso, FaltanDatos } from "@/components/notificacion/avisos"
import { mensajeDeFallo } from "@/lib/avisos"
import { panelEnviar } from "@/lib/panel-client"
import { cantidadMovimientoCampoSchema, cuerpoDeMovimiento } from "@/lib/catalog"

export type PublicacionMovible = {
  id: string
  titulo: string
  stock: number
}

export function StockMovementDialog({
  publicacion,
  onCerrar,
  onGuardado,
}: {
  publicacion: PublicacionMovible | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [tipo, setTipo] = useState<"entrada" | "salida" | "ajuste">("entrada")
  const [cantidad, setCantidad] = useState("1")
  const [motivo, setMotivo] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    if (!publicacion) return
    setTipo("entrada")
    setCantidad("1")
    setMotivo("")
    setFallo(null)
  }, [publicacion])

  const guardar = async () => {
    if (!publicacion) return
    const cantidadParseada = cantidadMovimientoCampoSchema.safeParse(cantidad)
    if (!cantidadParseada.success) {
      setFallo(cantidadParseada.error.issues[0]?.message ?? "Revisa la cantidad")
      return
    }
    if (tipo !== "ajuste" && cantidadParseada.data < 1) {
      setFallo("Ingresa al menos un ejemplar")
      return
    }
    setEnviando(true)
    setFallo(null)
    try {
      const titulo = publicacion.titulo
      await panelEnviar("/api/panel/movimientos", "POST", cuerpoDeMovimiento({
        publicacionId: publicacion.id,
        tipo,
        cantidad: cantidadParseada.data,
        motivo: motivo.trim() || undefined,
      }))
      avisar.ok({
        titulo: "Movimiento registrado",
        descripcion:
          tipo === "entrada"
            ? `Sumaste ${cantidad} ejemplar(es).`
            : tipo === "salida"
              ? `Retiraste ${cantidad} ejemplar(es) del catálogo.`
              : `El stock quedó fijado en ${cantidad}.`,
        referencia: titulo,
      })
      onGuardado()
    } catch (error) {
      setFallo(mensajeDeFallo(error, "No se pudo registrar el movimiento"))
    } finally {
      setEnviando(false)
    }
  }

  const base = publicacion?.stock ?? 0
  const cantidadParseada = cantidadMovimientoCampoSchema.safeParse(cantidad)
  const cantidadNumero = cantidadParseada.success ? cantidadParseada.data : 0
  const resultante =
    tipo === "entrada" ? base + cantidadNumero : tipo === "salida" ? base - cantidadNumero : cantidadNumero
  const minimo = tipo === "ajuste" ? 0 : 1
  const esNumeroValido = cantidadParseada.success && cantidadNumero >= minimo
  const sinSalida = tipo === "salida" && cantidadNumero > base

  return (
    <Dialog open={Boolean(publicacion)} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajuste de stock</DialogTitle>
          <DialogDescription>
            {publicacion?.titulo} · stock actual {base}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo-movimiento">Movimiento</Label>
            <Select value={tipo} onValueChange={(valor) => setTipo(valor as typeof tipo)}>
              <SelectTrigger id="tipo-movimiento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada (ingreso de ejemplares)</SelectItem>
                <SelectItem value="salida">Salida (retiro o devolución)</SelectItem>
                <SelectItem value="ajuste">Ajuste (fijar stock real)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cantidad-movimiento">{tipo === "ajuste" ? "Stock real en bodega" : "Cantidad"}</Label>
            <Input
              id="cantidad-movimiento"
              type="text"
              inputMode="numeric"
              min={minimo}
              max={999}
              step={1}
              value={cantidad}
              onChange={(evento) => {
                setCantidad(evento.target.value)
                setFallo(null)
              }}
            />
            <p className="text-xs text-muted-foreground">
              Stock resultante:{" "}
              <span className="font-mono">{esNumeroValido ? resultante : "—"}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo-movimiento">Motivo</Label>
            <Input
              id="motivo-movimiento"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              placeholder="Inventario físico, devolución, ingreso de compra…"
              maxLength={200}
            />
          </div>

          {!esNumeroValido || sinSalida ? (
            <FaltanDatos
              titulo="Revisa la cantidad antes de registrar"
              datos={[
                ...(!esNumeroValido
                  ? [
                      {
                        campo: "cantidad",
                        etiqueta: "Cantidad",
                        ancla: "cantidad-movimiento",
                        mensaje:
                          cantidadParseada.success
                            ? "El stock real debe ser un entero entre 0 y 999"
                            : cantidadParseada.error.issues[0]?.message ?? "Ingresa una cantidad válida",
                      },
                    ]
                  : []),
                ...(sinSalida
                  ? [
                      {
                        campo: "cantidad",
                        etiqueta: "Quedan solo " + base + " ejemplar(es)",
                        ancla: "cantidad-movimiento",
                        mensaje: "Baja la cantidad o cambia el movimiento",
                      },
                    ]
                  : []),
              ]}
              vivo={false}
            />
          ) : null}

          {fallo ? <Aviso tono="falla" titulo={fallo} /> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            className="rounded-xl bg-acento text-acento-foreground shadow-none hover:bg-acento/90"
            onClick={() => void guardar()}
            disabled={enviando || !esNumeroValido || sinSalida}
          >
            {enviando && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Registrar movimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
