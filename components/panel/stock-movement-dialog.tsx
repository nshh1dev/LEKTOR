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
  const [cantidad, setCantidad] = useState(1)
  const [motivo, setMotivo] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)

  useEffect(() => {
    if (!publicacion) return
    setTipo("entrada")
    setCantidad(1)
    setMotivo("")
    setFallo(null)
  }, [publicacion])

  const guardar = async () => {
    if (!publicacion) return
    setEnviando(true)
    setFallo(null)
    try {
      const titulo = publicacion.titulo
      await panelEnviar("/api/panel/movimientos", "POST", {
        publicacionId: publicacion.id,
        tipo,
        cantidad,
        motivo: motivo.trim() || undefined,
      })
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
  const resultante =
    tipo === "entrada" ? base + cantidad : tipo === "salida" ? base - cantidad : cantidad
  const minimo = tipo === "ajuste" ? 0 : 1
  const esNumeroValido = Number.isInteger(cantidad) && cantidad >= minimo && cantidad <= 999
  const sinSalida = tipo === "salida" && cantidad > base

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
              type="number"
              min={minimo}
              max={999}
              step={1}
              value={cantidad}
              onChange={(evento) => setCantidad(Number(evento.target.value))}
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
                          minimo === 0
                            ? "El stock real debe ser un entero entre 0 y 999"
                            : "La cantidad debe ser un entero entre 1 y 999",
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
            className="rounded-xl bg-oro text-oro-foreground shadow-none hover:bg-oro/90"
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
