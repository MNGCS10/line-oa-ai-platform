import { z } from "zod";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { uploadProductImage } from "../services/upload.js";

export const uploadRouter = router({
  productImage: protectedProcedure
    .input(
      z.object({
        base64Data: z.string().min(1),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await uploadProductImage(input.base64Data, input.mimeType);
      return result;
    }),
});
