import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers/_app.js";
import { createContext } from "./trpc/context.js";
import { lineWebhookHandler } from "./line/webhook.js";
import { LOCAL_UPLOAD_DIR } from "./services/upload.js";
import { startReminderScheduler } from "./services/reminders.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());

// LINE webhook needs the raw request body to verify the HMAC signature, so it's
// registered before the generic json() body parser (which would otherwise consume it).
app.post(
  "/api/webhook/line",
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
  (req, res) => {
    void lineWebhookHandler(req, res);
  },
);

app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(LOCAL_UPLOAD_DIR));

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  startReminderScheduler();
});
