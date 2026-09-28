import { UsersView } from "@/components/panel/users-view"
import { adminPageUser } from "@/lib/panel"

export default async function UsuariosPage() {
  await adminPageUser()
  return <UsersView />
}
