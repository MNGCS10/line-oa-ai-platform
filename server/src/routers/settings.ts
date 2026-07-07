import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db } from "../db/client.js";
import { aiModels, aiProviders, companyInfo } from "../db/schema.js";
import { getAllSettingsMasked, setSetting, SETTINGS_KEYS } from "../services/settings.js";
import { AI_PROVIDER_KINDS } from "shared";

export const settingsRouter = router({
  get: protectedProcedure.query(async () => {
    const [company] = await db.select().from(companyInfo).limit(1);
    const providers = await db.select().from(aiProviders);
    const models = await db.select().from(aiModels);
    const system = await getAllSettingsMasked();
    return { company: company ?? null, providers, models, system };
  }),

  updateCompanyInfo: protectedProcedure
    .input(
      z.object({
        businessName: z.string().min(1).max(255),
        businessType: z.string().min(1).max(255),
        businessHours: z.string().min(1).max(255),
        address: z.string().min(1),
        phone: z.string().max(60).optional(),
        lineOaId: z.string().max(120).optional(),
        customerJourney: z.string().optional(),
        aiPersonaName: z.string().min(1).max(120),
        aiPersonaStyle: z.string().min(1),
        aiPersonaLanguageNote: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [existing] = await db.select().from(companyInfo).limit(1);
      if (existing) {
        await db.update(companyInfo).set(input).where(eq(companyInfo.id, existing.id));
      } else {
        await db.insert(companyInfo).values(input);
      }
      return { success: true };
    }),

  updateLineCredentials: protectedProcedure
    .input(z.object({ channelAccessToken: z.string().min(1), channelSecret: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await setSetting(SETTINGS_KEYS.LINE_CHANNEL_ACCESS_TOKEN, input.channelAccessToken);
      await setSetting(SETTINGS_KEYS.LINE_CHANNEL_SECRET, input.channelSecret);
      return { success: true };
    }),

  upsertAiProvider: protectedProcedure
    .input(
      z.object({
        kind: z.enum(AI_PROVIDER_KINDS),
        label: z.string().min(1).max(120),
        apiKey: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const [result] = await db.insert(aiProviders).values(input);
      return { id: result.insertId };
    }),

  upsertAiModel: protectedProcedure
    .input(
      z.object({
        providerId: z.number(),
        modelId: z.string().min(1).max(120),
        label: z.string().min(1).max(120),
        supportsVision: z.boolean().default(false),
        isDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.isDefault) {
        await db.update(aiModels).set({ isDefault: false });
      }
      const [result] = await db.insert(aiModels).values(input);
      return { id: result.insertId };
    }),

  setActiveAiModel: protectedProcedure
    .input(z.object({ modelId: z.number() }))
    .mutation(async ({ input }) => {
      await setSetting(SETTINGS_KEYS.ACTIVE_AI_MODEL_ID, input.modelId);
      return { success: true };
    }),

  updateS3Config: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().optional(),
        region: z.string().min(1),
        bucket: z.string().min(1),
        accessKeyId: z.string().min(1),
        secretAccessKey: z.string().min(1),
        publicBaseUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      await setSetting(SETTINGS_KEYS.S3_CONFIG, input);
      return { success: true };
    }),

  updateLiffConfig: protectedProcedure
    .input(z.object({ liffId: z.string().min(1), liffChannelId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await setSetting(SETTINGS_KEYS.LIFF_ID, input.liffId);
      await setSetting(SETTINGS_KEYS.LIFF_CHANNEL_ID, input.liffChannelId);
      return { success: true };
    }),
});
