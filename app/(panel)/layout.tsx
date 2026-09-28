import type React from "react"
import type { Metadata } from "next"
import { AdminShell } from "@/components/admin/admin-shell"
import { panelPageUser, toSesionUsuario } from "@/lib/panel"

export const metadata: Metadata = {
  title: "Panel · LEKTOR",
  robots: { index: false, follow: false },
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await panelPageUser()
  return <AdminShell user={toSesionUsuario(user)}>{children}</AdminShell>
}
