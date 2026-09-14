"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useInventoryStore, type Product } from "@/lib/store"

const PAGE_SIZE = 5

type FormState = {
  sku: string
  nombre: string
  stockActual: number
  stockMinimo: number
  proveedor: string
}

type StockFilter = "todos" | "sin-stock" | "bajo-minimo" | "ok"

const emptyForm: FormState = { sku: "", nombre: "", stockActual: 0, stockMinimo: 0, proveedor: "" }

export function ProductsView() {
  const products = useInventoryStore((s) => s.products)
  const addProduct = useInventoryStore((s) => s.addProduct)
  const updateProduct = useInventoryStore((s) => s.updateProduct)
  const deleteProduct = useInventoryStore((s) => s.deleteProduct)

  const [search, setSearch] = useState("")
  const [stockFilter, setStockFilter] = useState<StockFilter>("todos")
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return products.filter((p) => {
      const matchesSearch =
        !q ||
        p.sku.toLowerCase().includes(q) ||
        p.nombre.toLowerCase().includes(q) ||
        p.proveedor.toLowerCase().includes(q)
      const matchesStock = stockFilter === "todos" || stockStatus(p).key === stockFilter
      return matchesSearch && matchesStock
    })
  }, [products, search, stockFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({ ...p })
    setOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) {
      updateProduct(editing.sku, {
        nombre: form.nombre,
        stockActual: Number(form.stockActual),
        stockMinimo: Number(form.stockMinimo),
        proveedor: form.proveedor,
      })
      toast({ title: "Producto actualizado", description: form.nombre })
      setOpen(false)
      return
    }
    const result = addProduct({
      sku: form.sku.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      stockActual: Number(form.stockActual),
      stockMinimo: Number(form.stockMinimo),
      proveedor: form.proveedor.trim(),
    })
    if (!result.ok) {
      toast({ title: "No se pudo crear", description: result.message, variant: "destructive" })
      return
    }
    toast({ title: "Producto creado", description: form.nombre })
    setOpen(false)
  }

  const handleDelete = (sku: string, nombre: string) => {
    deleteProduct(sku)
    toast({ title: "Producto eliminado", description: nombre })
  }

  const stockStatus = (p: Product) => {
    if (p.stockActual === 0)
      return { key: "sin-stock" as StockFilter, label: "Sin stock", variant: "destructive" as const }
    if (p.stockActual <= p.stockMinimo)
      return { key: "bajo-minimo" as StockFilter, label: "Bajo mínimo", variant: "secondary" as const }
    return { key: "ok" as StockFilter, label: "OK", variant: "default" as const }
  }

  return (
    <main className="flex-1 space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Productos</h1>
          <p className="text-sm text-muted-foreground">Gestión del catálogo y niveles de stock</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
                <DialogDescription>
                  {editing
                    ? "Actualiza los datos del producto en el catálogo"
                    : "Completa la información para crear un nuevo SKU"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="CARP01"
                    disabled={!!editing}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Carpa Iglú 4 Personas"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stockActual">Stock actual</Label>
                    <Input
                      id="stockActual"
                      type="number"
                      min={0}
                      value={form.stockActual}
                      onChange={(e) => setForm({ ...form, stockActual: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stockMinimo">Stock mínimo</Label>
                    <Input
                      id="stockMinimo"
                      type="number"
                      min={0}
                      value={form.stockMinimo}
                      onChange={(e) => setForm({ ...form, stockMinimo: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Input
                    id="proveedor"
                    value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                    placeholder="Doite"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editing ? "Guardar cambios" : "Crear producto"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catálogo</CardTitle>
          <CardDescription>{filtered.length} productos</CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU, nombre o proveedor..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={stockFilter}
              onValueChange={(value: StockFilter) => {
                setStockFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[190px]">
                <SelectValue placeholder="Estado de stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="sin-stock">Sin stock</SelectItem>
                <SelectItem value="bajo-minimo">Bajo mínimo</SelectItem>
                <SelectItem value="ok">OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((p) => {
                    const status = stockStatus(p)
                    return (
                      <TableRow key={p.sku}>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="text-muted-foreground">{p.proveedor}</TableCell>
                        <TableCell className="text-right font-mono">{p.stockActual}</TableCell>
                        <TableCell className="text-right font-mono">{p.stockMinimo}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Eliminar</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminará <strong>{p.nombre}</strong> ({p.sku}) del catálogo. Esta acción no se
                                    puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(p.sku, p.nombre)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setPage((p) => Math.max(1, p - 1))
                    }}
                    aria-disabled={currentPage === 1}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      href="#"
                      isActive={currentPage === i + 1}
                      onClick={(e) => {
                        e.preventDefault()
                        setPage(i + 1)
                      }}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setPage((p) => Math.min(totalPages, p + 1))
                    }}
                    aria-disabled={currentPage === totalPages}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
