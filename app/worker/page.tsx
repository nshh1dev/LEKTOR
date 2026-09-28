import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { AdminShell } from "@/components/admin/admin-shell"
import { WorkerView } from "@/components/worker/worker-view"
import { panelPageUser, toSesionUsuario } from "@/lib/panel"

export const metadata: Metadata = {
  title: "Bodega · LEKTOR",
  robots: { index: false, follow: false },
}

export default async function WorkerPage() {
  const user = await panelPageUser()
  if (user.rol === "lector") redirect("/")
  return (
    <AdminShell user={toSesionUsuario(user)}>
      <WorkerView />
    </AdminShell>
  )
}
