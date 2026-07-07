import { and, eq, gte, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { appointments, lineUsers, orders } from "../db/schema.js";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const dashboardRouter = router({
  stats: protectedProcedure.query(async () => {
    const todayStart = startOfToday();

    const [[newCustomers], [ordersToday], [salesToday], [upcomingAppointments]] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(lineUsers)
        .where(gte(lineUsers.createdAt, todayStart)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(gte(orders.createdAt, todayStart)),
      db
        .select({ total: sql<string>`coalesce(sum(${orders.totalAmount}), 0)` })
        .from(orders)
        .where(and(gte(orders.createdAt, todayStart), eq(orders.status, "completed"))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(gte(appointments.scheduledAt, todayStart)),
    ]);

    return {
      newCustomersToday: Number(newCustomers?.count ?? 0),
      ordersToday: Number(ordersToday?.count ?? 0),
      salesToday: Number(salesToday?.total ?? 0),
      upcomingAppointments: Number(upcomingAppointments?.count ?? 0),
    };
  }),
});
