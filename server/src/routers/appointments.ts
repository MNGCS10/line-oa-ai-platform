import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, publicProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { appointments } from "../db/schema.js";
import { APPOINTMENT_STATUSES } from "shared";
import { verifyLiffIdToken } from "../line/liff.js";
import { upsertLineUser } from "../services/lineUsers.js";
import { pushMessage } from "../line/client.js";
import { buildAppointmentFlexMessage } from "../line/flexBuilders.js";
import { notifyOwner } from "../services/notifyOwner.js";

export const appointmentsRouter = router({
  list: protectedProcedure.query(async () => {
    return db.select().from(appointments).orderBy(asc(appointments.scheduledAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        lineUserId: z.number(),
        customerName: z.string().min(1).max(255),
        patientAge: z.string().max(60).optional(),
        serviceName: z.string().max(255).optional(),
        reason: z.string().max(2000).optional(),
        scheduledAt: z.coerce.date(),
      }),
    )
    .mutation(async ({ input }) => {
      const [result] = await db.insert(appointments).values(input);
      return { id: result.insertId };
    }),

  /**
   * Booking endpoint for the customer-facing LIFF form (spec step 3: "กรอกฟอร์ม LIFF").
   * Unlike `create`, this is public and identifies the customer from a LIFF ID token
   * verified server-side against LINE — never from a client-supplied lineUserId.
   */
  createPublic: publicProcedure
    .input(
      z.object({
        idToken: z.string().min(1),
        customerName: z.string().min(1).max(255),
        patientAge: z.string().max(60).optional(),
        serviceName: z.string().max(255).optional(),
        reason: z.string().max(2000).optional(),
        scheduledAt: z.coerce.date(),
      }),
    )
    .mutation(async ({ input }) => {
      let payload;
      try {
        payload = await verifyLiffIdToken(input.idToken);
      } catch (err) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: (err as Error).message });
      }

      const lineUser = await upsertLineUser(payload.sub, payload.name);

      const [result] = await db.insert(appointments).values({
        lineUserId: lineUser.id,
        customerName: input.customerName,
        patientAge: input.patientAge,
        serviceName: input.serviceName,
        reason: input.reason,
        scheduledAt: input.scheduledAt,
      });

      const [created] = await db.select().from(appointments).where(eq(appointments.id, result.insertId)).limit(1);

      const confirmation = buildAppointmentFlexMessage(created);
      await pushMessage(payload.sub, [confirmation]).catch((err) =>
        console.error("Failed to push appointment confirmation:", err),
      );

      await notifyOwner([
        {
          type: "text",
          text: `มีนัดหมายใหม่จาก ${input.customerName}${input.serviceName ? ` (${input.serviceName})` : ""} — ${new Date(
            input.scheduledAt,
          ).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`,
        },
      ]).catch((err) => console.error("Failed to notify owner of new appointment:", err));

      return { id: result.insertId };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(APPOINTMENT_STATUSES) }))
    .mutation(async ({ input }) => {
      await db.update(appointments).set({ status: input.status }).where(eq(appointments.id, input.id));
      return { success: true };
    }),
});
