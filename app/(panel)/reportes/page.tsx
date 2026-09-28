import { ReportsView } from "@/components/panel/reports-view"
import { adminPageUser } from "@/lib/panel"

export default async function ReportesPage() {
  await adminPageUser()
  return <ReportsView />
}
