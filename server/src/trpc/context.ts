import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { verifySessionToken } from "../services/auth.js";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const token = req.cookies?.session as string | undefined;
  const user = token ? verifySessionToken(token) : null;
  return { req, res, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
