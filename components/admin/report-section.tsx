"use client"

import { useMemo, useState } from "react"
import { CalendarIcon, Download, FileText, ArrowDownToLine, ArrowUpFromLine } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { useInventoryStore } from "@/lib/store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function ReportSection() {
  const movements = useInventoryStore((s) => s.movements)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [generated, setGenerated] = useState<Date | null>(null)

  const filtered = useMemo(() => {
    if (!generated) return []
    const target = generated.toDateString()
    return movements.filter((m) => new Date(m.fecha).toDateString() === target)
  }, [movements, generated])

  function handleGenerate() {
    if (!date) {
      toast.error("Seleccione una fecha")
      return
    }
    setGenerated(new Date(date))
    toast.success("Reporte generado")
  }

  function handleExportCSV() {
    if (filtered.length === 0) {
      toast.error("No hay movimientos para exportar")
      return
    }
    const headers = ["SKU", "Producto", "Tipo", "Cantidad", "Fecha", "Hora", "Usuario"]
    const rows = filtered.map((m) => {
      const d = new Date(m.fecha)
      return [
        m.sku,
        `"${m.nombreProducto.replace(/"/g, '""')}"`,
        m.tipo,
        m.cantidad,
        d.toLocaleDateString("es-CL"),
        d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
        m.usuario,
      ].join(",")
    })
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-${format(generated ?? new Date(), "yyyy-MM-dd")}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("CSV exportado")
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Reporte sin papel
          </CardTitle>
          <CardDescription>
            Genere reportes diarios de movimientos. Exporte a CSV para auditoría sin imprimir un solo papel.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start gap-2 font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-4 w-4" />
                {date ? format(date, "d 'de' MMMM yyyy", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={handleGenerate}>Generar reporte</Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}>
            <Download className="mr-1.5 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!generated ? (
          <Empty className="border-2 border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>Sin reporte generado</EmptyTitle>
              <EmptyDescription>
                Seleccione una fecha y haga clic en "Generar reporte" para ver los movimientos del día.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty className="border-2 border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>Sin movimientos</EmptyTitle>
              <EmptyDescription>
                No se registraron movimientos el {format(generated, "d 'de' MMMM yyyy", { locale: es })}.
              </EmptyDescription>
              <EmptyContent>
                <p className="text-xs text-muted-foreground">Pruebe con otra fecha o genere movimientos desde la vista del bodeguero.</p>
              </EmptyContent>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Mostrando <strong className="text-foreground">{filtered.length}</strong> movimientos del{" "}
                <strong className="text-foreground capitalize">
                  {format(generated, "EEEE d 'de' MMMM yyyy", { locale: es })}
                </strong>
              </span>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.nombreProducto}</div>
                        <div className="font-mono text-xs text-muted-foreground">{m.sku}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1",
                            m.tipo === "entrada"
                              ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                              : "border-amber-500/30 text-amber-700 dark:text-amber-500",
                          )}
                        >
                          {m.tipo === "entrada" ? (
                            <ArrowDownToLine className="h-3 w-3" />
                          ) : (
                            <ArrowUpFromLine className="h-3 w-3" />
                          )}
                          {m.tipo === "entrada" ? "Entrada" : "Salida"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {m.cantidad}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {new Date(m.fecha).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-muted-foreground">{m.usuario}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
