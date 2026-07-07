import {
  mysqlTable,
  serial,
  varchar,
  text,
  int,
  boolean,
  timestamp,
  mysqlEnum,
  decimal,
  json,
  index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────
// Users & Identity
// ─────────────────────────────────────────────────────────────

/** Admin/dashboard operators (staff logging into the dashboard). */
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["owner", "admin", "staff"]).notNull().default("staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/** End customers identified via LINE Login/Messaging API. */
export const lineUsers = mysqlTable(
  "line_users",
  {
    id: serial("id").primaryKey(),
    lineUserId: varchar("line_user_id", { length: 64 }).notNull().unique(),
    displayName: varchar("display_name", { length: 255 }),
    pictureUrl: text("picture_url"),
    statusMessage: text("status_message"),
    isBlocked: boolean("is_blocked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    lineUserIdIdx: index("line_users_line_user_id_idx").on(t.lineUserId),
  }),
);

// ─────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────

export const chatSessions = mysqlTable(
  "chat_sessions",
  {
    id: serial("id").primaryKey(),
    lineUserId: int("line_user_id").notNull(),
    aiPaused: boolean("ai_paused").notNull().default(false),
    lastMessageAt: timestamp("last_message_at"),
    unreadCount: int("unread_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    lineUserIdIdx: index("chat_sessions_line_user_id_idx").on(t.lineUserId),
  }),
);

/** Groups messages into a logical conversation thread (mirrors 1 session : many conversations, e.g. per topic/day). */
export const conversations = mysqlTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    chatSessionId: int("chat_session_id").notNull(),
    title: varchar("title", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    chatSessionIdIdx: index("conversations_chat_session_id_idx").on(t.chatSessionId),
  }),
);

export const messages = mysqlTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    chatSessionId: int("chat_session_id").notNull(),
    conversationId: int("conversation_id"),
    senderType: mysqlEnum("sender_type", ["customer", "ai", "admin", "system"]).notNull(),
    senderUserId: int("sender_user_id"),
    contentType: mysqlEnum("content_type", [
      "text",
      "image",
      "sticker",
      "flex",
      "video",
      "audio",
      "file",
    ])
      .notNull()
      .default("text"),
    content: text("content").notNull(),
    mediaUrl: text("media_url"),
    lineMessageId: varchar("line_message_id", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    chatSessionIdIdx: index("messages_chat_session_id_idx").on(t.chatSessionId),
    createdAtIdx: index("messages_created_at_idx").on(t.createdAt),
  }),
);

// ─────────────────────────────────────────────────────────────
// Catalog
// ─────────────────────────────────────────────────────────────

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 120 }),
  priceLabel: varchar("price_label", { length: 120 }).notNull(),
  priceMin: decimal("price_min", { precision: 10, scale: 2 }),
  priceMax: decimal("price_max", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────────────────────
// Orders
// ─────────────────────────────────────────────────────────────

export const orders = mysqlTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    lineUserId: int("line_user_id").notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "preparing", "completed", "cancelled"])
      .notNull()
      .default("pending"),
    totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    lineUserIdIdx: index("orders_line_user_id_idx").on(t.lineUserId),
  }),
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: int("order_id").notNull(),
    productId: int("product_id"),
    productName: varchar("product_name", { length: 255 }).notNull(),
    quantity: int("quantity").notNull().default(1),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  },
  (t) => ({
    orderIdIdx: index("order_items_order_id_idx").on(t.orderId),
  }),
);

// ─────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────

export const appointments = mysqlTable(
  "appointments",
  {
    id: serial("id").primaryKey(),
    lineUserId: int("line_user_id").notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    patientAge: varchar("patient_age", { length: 60 }),
    serviceName: varchar("service_name", { length: 255 }),
    reason: text("reason"),
    scheduledAt: timestamp("scheduled_at").notNull(),
    status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled", "no_show"])
      .notNull()
      .default("pending"),
    reminderSentAt: timestamp("reminder_sent_at"),
    googleCalendarEventId: varchar("google_calendar_event_id", { length: 255 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => ({
    lineUserIdIdx: index("appointments_line_user_id_idx").on(t.lineUserId),
    scheduledAtIdx: index("appointments_scheduled_at_idx").on(t.scheduledAt),
  }),
);

// ─────────────────────────────────────────────────────────────
// AI Config
// ─────────────────────────────────────────────────────────────

export const aiProviders = mysqlTable("ai_providers", {
  id: serial("id").primaryKey(),
  kind: mysqlEnum("kind", ["anthropic", "openai", "google"]).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  apiKey: text("api_key").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiModels = mysqlTable("ai_models", {
  id: serial("id").primaryKey(),
  providerId: int("provider_id").notNull(),
  modelId: varchar("model_id", { length: 120 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  supportsVision: boolean("supports_vision").notNull().default(false),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────────────────────
// Business Configuration (Section 1 of spec → drives system prompt)
// ─────────────────────────────────────────────────────────────

export const companyInfo = mysqlTable("company_info", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  businessType: varchar("business_type", { length: 255 }).notNull(),
  businessHours: varchar("business_hours", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 60 }),
  lineOaId: varchar("line_oa_id", { length: 120 }),
  customerJourney: text("customer_journey"),
  aiPersonaName: varchar("ai_persona_name", { length: 120 }).notNull(),
  aiPersonaStyle: text("ai_persona_style").notNull(),
  aiPersonaLanguageNote: text("ai_persona_language_note"),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

/** Free-form key/value store for secrets & runtime config (LINE tokens, S3, defaults). Never hardcode these. */
export const systemSettings = mysqlTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 120 }).notNull().unique(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ─────────────────────────────────────────────────────────────
// Relations (for query ergonomics)
// ─────────────────────────────────────────────────────────────

export const lineUsersRelations = relations(lineUsers, ({ many }) => ({
  chatSessions: many(chatSessions),
  orders: many(orders),
  appointments: many(appointments),
}));

export const chatSessionsRelations = relations(chatSessions, ({ one, many }) => ({
  lineUser: one(lineUsers, { fields: [chatSessions.lineUserId], references: [lineUsers.id] }),
  messages: many(messages),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  chatSession: one(chatSessions, {
    fields: [conversations.chatSessionId],
    references: [chatSessions.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chatSession: one(chatSessions, {
    fields: [messages.chatSessionId],
    references: [chatSessions.id],
  }),
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  lineUser: one(lineUsers, { fields: [orders.lineUserId], references: [lineUsers.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  lineUser: one(lineUsers, { fields: [appointments.lineUserId], references: [lineUsers.id] }),
}));

export const aiModelsRelations = relations(aiModels, ({ one }) => ({
  provider: one(aiProviders, { fields: [aiModels.providerId], references: [aiProviders.id] }),
}));
