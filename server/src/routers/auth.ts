import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { createSessionToken, verifyPassword } from "../services/auth.js";

const COOKIE_NAME = "session";
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => ctx.user),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
      }

      const token = createSessionToken({ userId: user.id, email: user.email, role: user.role });
      const isProd = process.env.NODE_ENV === "production";
      ctx.res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        // Client and server are deployed on different origins (e.g. Vercel + Railway) in
        // production, so the session cookie needs SameSite=None to be sent cross-site at
        // all — which browsers only allow when Secure is also set.
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        maxAge: COOKIE_MAX_AGE_MS,
      });

      return { id: user.id, email: user.email, name: user.name, role: user.role };
    }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    const isProd = process.env.NODE_ENV === "production";
    ctx.res.clearCookie(COOKIE_NAME, { sameSite: isProd ? "none" : "lax", secure: isProd });
    return { success: true };
  }),
});
