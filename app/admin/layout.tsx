import { redirect } from "next/navigation"
import type React from "react"
import { AdminShell } from "@/components/admin/admin-shell"
import { panelPageUser, toSesionUsuario } from "@/lib/panel"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await panelPageUser()
  if (user.rol === "worker") redirect("/worker")
  return <AdminShell user={toSesionUsuario(user)}>{children}</AdminShell>
}
