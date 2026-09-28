import { requireSession } from "@/lib/auth"
import { fail, ok } from "@/lib/api"
import { notificationReadSchema } from "@/lib/catalog"
import { listNotifications, markNotificationsRead } from "@/lib/orders"

export async function GET() {
  try {
    const user = await requireSession()
    const notifications = await listNotifications(user.id)
    return ok({
      notifications,
      sinLeer: notifications.filter((item) => !item.leida).length,
    })
  } catch (error) {
    return fail(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSession()
    const payload = notificationReadSchema.parse(await request.json())

    if ("todas" in payload) {
      const notifications = await listNotifications(user.id)
      const ids = notifications.filter((item) => !item.leida).map((item) => item.id)
      const actualizadas = await markNotificationsRead(user.id, ids)
      return ok({ actualizadas })
    }

    const actualizadas = await markNotificationsRead(user.id, [payload.id])
    return ok({ actualizadas })
  } catch (error) {
    return fail(error)
  }
}
