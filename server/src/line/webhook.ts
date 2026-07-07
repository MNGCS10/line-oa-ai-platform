import type { Request, Response } from "express";
import { verifyLineSignature } from "./verify.js";
import { getSetting, SETTINGS_KEYS } from "../services/settings.js";
import { handleIncomingLineMessage } from "../services/chatPipeline.js";

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string; type?: string };
  message?: {
    id: string;
    type: string;
    text?: string;
  };
}

export async function lineWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const channelSecret = await getSetting<string>(SETTINGS_KEYS.LINE_CHANNEL_SECRET);

  if (!channelSecret) {
    console.error("LINE channel secret not configured — rejecting webhook call.");
    res.status(503).json({ error: "LINE channel secret not configured" });
    return;
  }

  const signature = req.header("x-line-signature");
  if (!rawBody || !verifyLineSignature(rawBody, signature, channelSecret)) {
    res.status(401).json({ error: "invalid signature" });
    return;
  }

  // Acknowledge immediately — LINE requires a fast 200 response, actual processing continues async.
  res.status(200).json({ status: "ok" });

  const events: LineWebhookEvent[] = req.body?.events ?? [];
  for (const event of events) {
    void processEvent(event).catch((err) => console.error("Error processing LINE event:", err));
  }
}

async function processEvent(event: LineWebhookEvent): Promise<void> {
  if (event.type !== "message" || !event.source?.userId || !event.replyToken || !event.message) {
    return;
  }

  const { message } = event;
  if (message.type === "text") {
    await handleIncomingLineMessage({
      lineUserId: event.source.userId,
      replyToken: event.replyToken,
      text: message.text,
      lineMessageId: message.id,
    });
  } else if (message.type === "image") {
    await handleIncomingLineMessage({
      lineUserId: event.source.userId,
      replyToken: event.replyToken,
      imageMessageId: message.id,
      lineMessageId: message.id,
    });
  }
  // Other message types (sticker/video/audio/file) are intentionally not sent to the AI engine.
}
