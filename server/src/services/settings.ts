import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { systemSettings } from "../db/schema.js";

/**
 * Runtime secrets/config live only in the `system_settings` table (never hardcoded/env
 * for per-tenant values), per spec rule: "LINE token ห้าม hardcode".
 */
export const SETTINGS_KEYS = {
  LINE_CHANNEL_ACCESS_TOKEN: "line_channel_access_token",
  LINE_CHANNEL_SECRET: "line_channel_secret",
  ACTIVE_AI_MODEL_ID: "active_ai_model_id",
  S3_CONFIG: "s3_config",
  LIFF_ID: "liff_id",
  LIFF_CHANNEL_ID: "liff_channel_id",
  OWNER_LINE_USER_ID: "owner_line_user_id",
} as const;

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
}

const cache = new Map<string, { value: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 10_000;

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const [row] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);

  const value = (row?.value ?? null) as T | null;
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db
    .insert(systemSettings)
    .values({ key, value: value as object })
    .onDuplicateKeyUpdate({ set: { value: value as object } });
  cache.delete(key);
}

export async function getAllSettingsMasked(): Promise<Record<string, unknown>> {
  const rows = await db.select().from(systemSettings);
  const out: Record<string, unknown> = {};
  for (const row of rows) {
    out[row.key] = maskSecret(row.key, row.value);
  }
  return out;
}

function maskSecret(key: string, value: unknown): unknown {
  const secretKeys: string[] = [
    SETTINGS_KEYS.LINE_CHANNEL_ACCESS_TOKEN,
    SETTINGS_KEYS.LINE_CHANNEL_SECRET,
  ];
  if (secretKeys.includes(key) && typeof value === "string" && value.length > 8) {
    return `${value.slice(0, 4)}${"*".repeat(Math.max(value.length - 8, 4))}${value.slice(-4)}`;
  }
  if (key === SETTINGS_KEYS.S3_CONFIG && value && typeof value === "object") {
    const v = value as S3Config;
    return { ...v, secretAccessKey: v.secretAccessKey ? "********" : "" };
  }
  return value;
}
