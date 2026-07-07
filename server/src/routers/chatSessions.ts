import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { chatSessions, lineUsers, messages } from "../db/schema.js";
import { pushMessage } from "../line/client.js";

export const chatSessionsRouter = router({
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: chatSessions.id,
        aiPaused: chatSessions.aiPaused,
        lastMessageAt: chatSessions.lastMessageAt,
        unreadCount: chatSessions.unreadCount,
        lineUser: {
          id: lineUsers.id,
          lineUserId: lineUsers.lineUserId,
          displayName: lineUsers.displayName,
          pictureUrl: lineUsers.pictureUrl,
        },
      })
      .from(chatSessions)
      .innerJoin(lineUsers, eq(chatSessions.lineUserId, lineUsers.id))
      .orderBy(desc(chatSessions.lastMessageAt));
  }),

  getMessages: protectedProcedure
    .input(z.object({ chatSessionId: z.number(), limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(messages)
        .where(eq(messages.chatSessionId, input.chatSessionId))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);

      await db
        .update(chatSessions)
        .set({ unreadCount: 0 })
        .where(eq(chatSessions.id, input.chatSessionId));

      return rows.reverse();
    }),

  pauseAI: protectedProcedure
    .input(z.object({ chatSessionId: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(chatSessions).set({ aiPaused: true }).where(eq(chatSessions.id, input.chatSessionId));
      return { success: true };
    }),

  resumeAI: protectedProcedure
    .input(z.object({ chatSessionId: z.number() }))
    .mutation(async ({ input }) => {
      await db.update(chatSessions).set({ aiPaused: false }).where(eq(chatSessions.id, input.chatSessionId));
      return { success: true };
    }),

  sendMessage: protectedProcedure
    .input(z.object({ chatSessionId: z.number(), text: z.string().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db
        .select({ lineUserId: lineUsers.lineUserId })
        .from(chatSessions)
        .innerJoin(lineUsers, eq(chatSessions.lineUserId, lineUsers.id))
        .where(eq(chatSessions.id, input.chatSessionId))
        .limit(1);

      if (!session) throw new Error("Chat session not found");

      await pushMessage(session.lineUserId, [{ type: "text", text: input.text }]);

      await db.insert(messages).values({
        chatSessionId: input.chatSessionId,
        senderType: "admin",
        senderUserId: ctx.user.userId,
        contentType: "text",
        content: input.text,
      });

      return { success: true };
    }),
});
