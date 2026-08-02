import type { NotificationContext } from "./notification.service.js";
import { deliverPendingNotifications } from "./notification.service.js";
/** Called by the existing worker/scheduler when one is configured; no process-local cron is created. */
export async function runNotificationSchedule(context: NotificationContext) { return deliverPendingNotifications(context); }
