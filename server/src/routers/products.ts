import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { products } from "../db/schema.js";

const productInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(120).optional(),
  priceLabel: z.string().min(1).max(120),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const productsRouter = router({
  list: publicProcedure.query(async () => {
    return db.select().from(products).orderBy(asc(products.sortOrder));
  }),

  create: protectedProcedure.input(productInput).mutation(async ({ input }) => {
    await db.insert(products).values({
      ...input,
      priceMin: input.priceMin?.toString(),
      priceMax: input.priceMax?.toString(),
    });
    return { success: true };
  }),

  update: protectedProcedure
    .input(productInput.partial().extend({ id: z.number() }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db
        .update(products)
        .set({
          ...rest,
          priceMin: rest.priceMin?.toString(),
          priceMax: rest.priceMax?.toString(),
        })
        .where(eq(products.id, id));
      return { success: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(products).where(eq(products.id, input.id));
    return { success: true };
  }),
});
