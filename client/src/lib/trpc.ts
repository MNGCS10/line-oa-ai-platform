import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";
import type { AppRouter } from "server/src/routers/_app";

export const trpc = createTRPCReact<AppRouter>();
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Falls back to a relative path (works when client and server share an origin, e.g. local
// dev via the Vite proxy). In production the client is typically hosted separately from the
// API (e.g. Vercel + Railway), so VITE_API_URL should point at the full API origin there.
const API_URL = `${import.meta.env.VITE_API_URL ?? ""}/api/trpc`;

export function makeTrpcClient() {
  return trpc.createClient({
    transformer: superjson,
    links: [
      httpBatchLink({
        url: API_URL,
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
