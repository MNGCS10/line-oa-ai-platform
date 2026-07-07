import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { lineUsers } from "../db/schema.js";
import { multicastMessage } from "../line/client.js";
import type { LineMessage } from "../line/client.js";

function buildMessages(text: string, imageUrl?: string): LineMessage[] {
  const out: LineMessage[] = [];
  if (imageUrl) {
    out.push({ type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl });
  }
  out.push({ type: "text", text });
  return out;
}

export const broadcastRouter = router({
  getContacts: protectedProcedure.query(async () => {
    return db
      .select({
        id: lineUsers.id,
        lineUserId: lineUsers.lineUserId,
        displayName: lineUsers.displayName,
        pictureUrl: lineUsers.pictureUrl,
      })
      .from(lineUsers)
      .where(eq(lineUsers.isBlocked, false));
  }),

  sendToAll: protectedProcedure
    .input(z.object({ text: z.string().min(1).max(2000), imageUrl: z.string().url().optional() }))
    .mutation(async ({ input }) => {
      const contacts = await db
        .select({ lineUserId: lineUsers.lineUserId })
        .from(lineUsers)
        .where(eq(lineUsers.isBlocked, false));

      const ids = contacts.map((c) => c.lineUserId);
      await sendInBatches(ids, buildMessages(input.text, input.imageUrl));
      return { sentTo: ids.length };
    }),

  sendToSelected: protectedProcedure
    .input(
      z.object({
        lineUserIds: z.array(z.number()).min(1),
        text: z.string().min(1).max(2000),
        imageUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const contacts = await db
        .select({ lineUserId: lineUsers.lineUserId })
        .from(lineUsers)
        .where(inArray(lineUsers.id, input.lineUserIds));

      const ids = contacts.map((c) => c.lineUserId);
      await sendInBatches(ids, buildMessages(input.text, input.imageUrl));
      return { sentTo: ids.length };
    }),
});

async function sendInBatches(lineUserIds: string[], messages: LineMessage[]): Promise<void> {
  const BATCH_SIZE = 500; // LINE multicast limit
  for (let i = 0; i < lineUserIds.length; i += BATCH_SIZE) {
    const batch = lineUserIds.slice(i, i + BATCH_SIZE);
    if (batch.length > 0) await multicastMessage(batch, messages);
  }
}
