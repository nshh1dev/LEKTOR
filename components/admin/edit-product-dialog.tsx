"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
import { useInventoryStore, type Product } from "@/lib/store"
import { toast } from "sonner"

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const updateProduct = useInventoryStore((s) => s.updateProduct)
  const [stockMinimo, setStockMinimo] = useState("")
  const [proveedor, setProveedor] = useState("")

  useEffect(() => {
    if (product) {
      setStockMinimo(String(product.stockMinimo))
      setProveedor(product.proveedor)
    }
  }, [product])

  function handleSave() {
    if (!product) return
    const min = Number.parseInt(stockMinimo, 10)
    if (Number.isNaN(min) || min < 0) {
      toast.error("Stock mínimo debe ser un número válido")
      return
    }
    if (!proveedor.trim()) {
      toast.error("El proveedor no puede estar vacío")
      return
    }
    updateProduct(product.sku, { stockMinimo: min, proveedor: proveedor.trim() })
    toast.success(`Producto ${product.sku} actualizado`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogDescription>
            {product ? (
              <>
                <span className="font-mono">{product.sku}</span> · {product.nombre}
              </>
            ) : (
              "Modificar stock mínimo y proveedor."
            )}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="stock-minimo">Stock mínimo</FieldLabel>
            <Input
              id="stock-minimo"
              type="number"
              min={0}
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              inputMode="numeric"
            />
            <FieldDescription>
              Cuando el stock actual baje a este valor, se mostrará una alerta.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="proveedor">Proveedor</FieldLabel>
            <Input
              id="proveedor"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              placeholder="Ej. Doite, Shimano..."
            />
          </Field>
        </FieldGroup>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
