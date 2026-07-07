import { z } from "zod";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { setSetting, SETTINGS_KEYS } from "../services/settings.js";
import { notifyOwner } from "../services/notifyOwner.js";

export const systemRouter = router({
  setOwnerLineUserId: protectedProcedure
    .input(z.object({ lineUserId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await setSetting(SETTINGS_KEYS.OWNER_LINE_USER_ID, input.lineUserId);
      return { success: true };
    }),

  notifyOwner: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(2000) }))
    .mutation(async ({ input }) => {
      return notifyOwner([{ type: "text", text: input.message }]);
    }),
});
