import { desc, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { chatSessions, messages } from "../db/schema.js";
import { downloadLineContent, pushMessage, replyMessage, type LineMessage } from "../line/client.js";
import { bufferMessage, type BufferedItem } from "../ai/messageBuffer.js";
import { trimConversationHistory, type HistoryMessage } from "../ai/history.js";
import { generateSystemPrompt } from "../ai/systemPrompt.js";
import { invokeLLM } from "../ai/invoke.js";
import { upsertLineUser } from "./lineUsers.js";

/** Most recent reply token per chat session — used when the buffered AI reply finally fires. */
const latestReplyToken = new Map<number, string>();
/** LINE's own userId string per internal chat session id, for push fallback. */
const sessionLineUserId = new Map<number, string>();

interface IncomingLineEvent {
  lineUserId: string;
  replyToken: string;
  text?: string;
  imageMessageId?: string;
  lineMessageId?: string;
}

async function getOrCreateChatSession(lineUserPk: number): Promise<typeof chatSessions.$inferSelect> {
  const [existing] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.lineUserId, lineUserPk))
    .limit(1);
  if (existing) return existing;

  await db.insert(chatSessions).values({ lineUserId: lineUserPk });
  const [created] = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.lineUserId, lineUserPk))
    .limit(1);
  return created;
}

export async function handleIncomingLineMessage(event: IncomingLineEvent): Promise<void> {
  const lineUser = await upsertLineUser(event.lineUserId);
  const session = await getOrCreateChatSession(lineUser.id);

  latestReplyToken.set(session.id, event.replyToken);
  sessionLineUserId.set(session.id, event.lineUserId);

  let imageBase64: string | undefined;
  let imageMediaType: string | undefined;
  let storedContentType: "text" | "image" = "text";
  let storedContent = event.text ?? "";

  if (event.imageMessageId) {
    try {
      const buf = await downloadLineContent(event.imageMessageId);
      imageBase64 = buf.toString("base64");
      imageMediaType = "image/jpeg";
      storedContentType = "image";
      storedContent = event.text ?? "[รูปภาพจากลูกค้า]";
    } catch (err) {
      console.error("Failed to download LINE image content:", err);
      storedContent = "[รูปภาพจากลูกค้า — ดาวน์โหลดไม่สำเร็จ]";
    }
  }

  await db.insert(messages).values({
    chatSessionId: session.id,
    senderType: "customer",
    contentType: storedContentType,
    content: storedContent,
    lineMessageId: event.lineMessageId,
  });

  await db
    .update(chatSessions)
    .set({ lastMessageAt: new Date(), unreadCount: session.unreadCount + 1 })
    .where(eq(chatSessions.id, session.id));

  if (session.aiPaused) {
    // Human operator has taken over this session — no AI reply.
    return;
  }

  const bufferedItem: BufferedItem = { text: storedContent, imageBase64, imageMediaType };
  bufferMessage(session.id, bufferedItem, (items) => flushAiReply(session.id, items));
}

async function flushAiReply(chatSessionId: number, items: BufferedItem[]): Promise<void> {
  try {
    // All buffered items were already persisted as individual message rows by
    // handleIncomingLineMessage before buffering started, so the DB tail already
    // reflects the combined customer turn — just pull it back out and re-attach
    // any image bytes (not persisted to the DB) for the vision-capable call.
    const imageItem = items.find((i) => i.imageBase64);

    const recentRows = await db
      .select()
      .from(messages)
      .where(eq(messages.chatSessionId, chatSessionId))
      .orderBy(desc(messages.createdAt))
      .limit(40);

    const chronological = recentRows.reverse();
    const history: HistoryMessage[] = trimConversationHistory(
      chronological.map((m) => ({
        role: m.senderType === "customer" ? "user" : "assistant",
        content: m.content,
      })),
    );

    if (imageItem && history.length > 0) {
      const lastUserIdx = [...history].reverse().findIndex((m) => m.role === "user");
      if (lastUserIdx !== -1) {
        const idx = history.length - 1 - lastUserIdx;
        history[idx] = {
          ...history[idx],
          imageBase64: imageItem.imageBase64,
          imageMediaType: imageItem.imageMediaType,
        };
      }
    }

    const systemPrompt = await generateSystemPrompt();
    const result = await invokeLLM(systemPrompt, history);

    await db.insert(messages).values({
      chatSessionId,
      senderType: "ai",
      contentType: "text",
      content: result.text,
    });

    const lineMessages: LineMessage[] = [{ type: "text", text: result.text }];
    const replyToken = latestReplyToken.get(chatSessionId);
    const lineUserId = sessionLineUserId.get(chatSessionId);

    try {
      if (replyToken) {
        await replyMessage(replyToken, lineMessages);
      } else if (lineUserId) {
        await pushMessage(lineUserId, lineMessages);
      }
    } catch (err) {
      // Reply token may have expired while we were buffering/thinking — fall back to push.
      if (lineUserId) {
        await pushMessage(lineUserId, lineMessages).catch((pushErr) =>
          console.error("Fallback push message failed:", pushErr),
        );
      } else {
        console.error("Failed to deliver AI reply:", err);
      }
    }
  } catch (err) {
    console.error("AI reply pipeline failed:", err);
  }
}
