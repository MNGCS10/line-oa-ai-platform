import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { aiModels, aiProviders } from "../db/schema.js";
import { getSetting, SETTINGS_KEYS } from "../services/settings.js";

export interface ActiveAiConfig {
  provider: typeof aiProviders.$inferSelect;
  model: typeof aiModels.$inferSelect;
}

export async function getActiveAiConfig(): Promise<ActiveAiConfig | null> {
  const activeModelId = await getSetting<number>(SETTINGS_KEYS.ACTIVE_AI_MODEL_ID);

  const [model] = activeModelId
    ? await db.select().from(aiModels).where(eq(aiModels.id, activeModelId)).limit(1)
    : await db.select().from(aiModels).where(eq(aiModels.isDefault, true)).limit(1);

  if (!model) return null;

  const [provider] = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.id, model.providerId))
    .limit(1);

  if (!provider || !provider.isActive) return null;

  return { provider, model };
}

export function getAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}
