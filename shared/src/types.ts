// Shared enum-like literal types used by both server (Drizzle schema / validation)
// and client (forms, badges, filters). Keep this file framework-agnostic.

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const MESSAGE_SENDER_TYPES = ["customer", "ai", "admin", "system"] as const;
export type MessageSenderType = (typeof MESSAGE_SENDER_TYPES)[number];

export const MESSAGE_CONTENT_TYPES = ["text", "image", "sticker", "flex", "video", "audio", "file"] as const;
export type MessageContentType = (typeof MESSAGE_CONTENT_TYPES)[number];

export const AI_PROVIDER_KINDS = ["anthropic", "openai", "google"] as const;
export type AiProviderKind = (typeof AI_PROVIDER_KINDS)[number];

export interface BusinessConfig {
  businessName: string;
  businessType: string;
  businessHours: string;
  address: string;
  phone: string;
  lineOaId: string;
  aiPersonaName: string;
  aiPersonaStyle: string;
  aiPersonaLanguageNote: string;
  customerJourney: string;
}

export interface ProductSummary {
  id: number;
  name: string;
  description: string | null;
  priceLabel: string;
  imageUrl: string | null;
}

export interface FlexMessagePayload {
  type: "flex";
  altText: string;
  contents: Record<string, unknown>;
}
