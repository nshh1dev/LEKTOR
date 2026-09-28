import { LoaderCircle } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      Cargando…
    </div>
  )
}
