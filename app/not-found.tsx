import Link from "next/link"
import { BookOpen, Compass, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 md:px-8">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="size-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">LEKTOR</span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center md:px-8">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Compass className="size-6" />
        </div>
        <div className="space-y-2">
          <p className="font-mono text-sm text-muted-foreground">Error 404</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Esta página no está en la estantería
          </h1>
          <p className="text-muted-foreground">
            El enlace puede estar equivocado o la publicación que buscabas ya no está disponible.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href="/">Volver al catálogo</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <LayoutDashboard data-icon="inline-start" /> Ir al panel
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
