import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { orderItems, orders } from "../db/schema.js";
import { ORDER_STATUSES } from "shared";

export const ordersRouter = router({
  list: protectedProcedure.query(async () => {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const [order] = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
    return { order, items };
  }),

  create: protectedProcedure
    .input(
      z.object({
        lineUserId: z.number(),
        notes: z.string().max(2000).optional(),
        items: z
          .array(
            z.object({
              productId: z.number().optional(),
              productName: z.string().min(1),
              quantity: z.number().int().positive().default(1),
              unitPrice: z.number().nonnegative(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const totalAmount = input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      const [result] = await db.insert(orders).values({
        lineUserId: input.lineUserId,
        notes: input.notes,
        totalAmount: totalAmount.toString(),
      });

      const orderId = result.insertId;
      await db.insert(orderItems).values(
        input.items.map((item) => ({
          orderId,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
        })),
      );

      return { id: orderId };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(ORDER_STATUSES) }))
    .mutation(async ({ input }) => {
      await db.update(orders).set({ status: input.status }).where(eq(orders.id, input.id));
      return { success: true };
    }),
});
