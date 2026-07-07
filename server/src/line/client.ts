import type { FlexMessagePayload } from "shared";
import { getSetting, SETTINGS_KEYS } from "../services/settings.js";

const LINE_API_BASE = "https://api.line.me/v2/bot";
const LINE_DATA_BASE = "https://api-data.line.me/v2/bot";

export type LineMessage =
  | { type: "text" | "image" | "sticker"; [key: string]: unknown }
  | FlexMessagePayload;

async function getAccessToken(): Promise<string> {
  const token = await getSetting<string>(SETTINGS_KEYS.LINE_CHANNEL_ACCESS_TOKEN);
  if (!token) {
    throw new Error(
      "LINE channel access token is not configured. Set it in Settings before sending messages.",
    );
  }
  return token;
}

async function lineFetch(url: string, init: RequestInit): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`LINE API error ${res.status}: ${body}`);
  }
  return res;
}

export async function replyMessage(replyToken: string, messages: LineMessage[]): Promise<void> {
  await lineFetch(`${LINE_API_BASE}/message/reply`, {
    method: "POST",
    body: JSON.stringify({ replyToken, messages }),
  });
}

export async function pushMessage(to: string, messages: LineMessage[]): Promise<void> {
  await lineFetch(`${LINE_API_BASE}/message/push`, {
    method: "POST",
    body: JSON.stringify({ to, messages }),
  });
}

export async function multicastMessage(to: string[], messages: LineMessage[]): Promise<void> {
  await lineFetch(`${LINE_API_BASE}/message/multicast`, {
    method: "POST",
    body: JSON.stringify({ to, messages }),
  });
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export async function getLineUserProfile(userId: string): Promise<LineUserProfile> {
  const res = await lineFetch(`${LINE_API_BASE}/profile/${userId}`, { method: "GET" });
  return (await res.json()) as LineUserProfile;
}

export async function downloadLineContent(messageId: string): Promise<Buffer> {
  const token = await getAccessToken();
  const res = await fetch(`${LINE_DATA_BASE}/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`LINE content download failed ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
