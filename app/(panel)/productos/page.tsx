import { ProductsView } from "@/components/panel/products-view"
import { panelPageUser } from "@/lib/panel"

export default async function ProductosPage() {
  const user = await panelPageUser()
  return <ProductsView esAdmin={user.rol === "admin"} />
}
