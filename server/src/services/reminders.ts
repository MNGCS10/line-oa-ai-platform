import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { appointments, lineUsers } from "../db/schema.js";
import { pushMessage } from "../line/client.js";
import { buildAppointmentFlexMessage } from "../line/flexBuilders.js";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const REMINDER_WINDOW_HOURS = [23, 25] as const; // "1 day before" with slack for a 30-min poll

/**
 * Spec step 4 of the customer journey: "ระบบยืนยันนัด + ส่ง reminder ล่วงหน้า 1 วัน".
 * Polls for appointments scheduled ~24h out that haven't been reminded yet and pushes
 * a reminder Flex message, since there's no external cron/queue in this deployment.
 */
export async function checkAndSendReminders(): Promise<void> {
  const now = Date.now();
  const windowStart = new Date(now + REMINDER_WINDOW_HOURS[0] * 60 * 60 * 1000);
  const windowEnd = new Date(now + REMINDER_WINDOW_HOURS[1] * 60 * 60 * 1000);

  const due = await db
    .select({ appointment: appointments, lineUserId: lineUsers.lineUserId })
    .from(appointments)
    .innerJoin(lineUsers, eq(appointments.lineUserId, lineUsers.id))
    .where(
      and(
        isNull(appointments.reminderSentAt),
        gte(appointments.scheduledAt, windowStart),
        lte(appointments.scheduledAt, windowEnd),
        eq(appointments.status, "confirmed"),
      ),
    );

  for (const row of due) {
    try {
      await pushMessage(row.lineUserId, [buildAppointmentFlexMessage(row.appointment)]);
      await db
        .update(appointments)
        .set({ reminderSentAt: new Date() })
        .where(eq(appointments.id, row.appointment.id));
    } catch (err) {
      console.error(`Failed to send reminder for appointment #${row.appointment.id}:`, err);
    }
  }
}

export function startReminderScheduler(): void {
  checkAndSendReminders().catch((err) => console.error("Initial reminder check failed:", err));
  setInterval(() => {
    checkAndSendReminders().catch((err) => console.error("Reminder check failed:", err));
  }, CHECK_INTERVAL_MS);
}
