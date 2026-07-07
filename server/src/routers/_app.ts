import { router } from "../trpc/trpc.js";
import { authRouter } from "./auth.js";
import { dashboardRouter } from "./dashboard.js";
import { lineUsersRouter } from "./lineUsers.js";
import { chatSessionsRouter } from "./chatSessions.js";
import { productsRouter } from "./products.js";
import { ordersRouter } from "./orders.js";
import { appointmentsRouter } from "./appointments.js";
import { uploadRouter } from "./upload.js";
import { broadcastRouter } from "./broadcast.js";
import { settingsRouter } from "./settings.js";
import { systemRouter } from "./system.js";
import { liffRouter } from "./liff.js";

export const appRouter = router({
  auth: authRouter,
  dashboard: dashboardRouter,
  lineUsers: lineUsersRouter,
  chatSessions: chatSessionsRouter,
  products: productsRouter,
  orders: ordersRouter,
  appointments: appointmentsRouter,
  upload: uploadRouter,
  broadcast: broadcastRouter,
  settings: settingsRouter,
  system: systemRouter,
  liff: liffRouter,
});

export type AppRouter = typeof appRouter;
