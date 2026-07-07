import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { lineUsers } from "../db/schema.js";

export const lineUsersRouter = router({
  list: protectedProcedure.query(async () => {
    return db.select().from(lineUsers).orderBy(desc(lineUsers.updatedAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [user] = await db.select().from(lineUsers).where(eq(lineUsers.id, input.id)).limit(1);
      return user ?? null;
    }),
});
