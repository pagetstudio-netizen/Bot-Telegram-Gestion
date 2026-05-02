import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botGroupsTable = pgTable("bot_groups", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  title: text("title").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  antiSpam: boolean("anti_spam").notNull().default(true),
  antiSpamAction: text("anti_spam_action").notNull().default("delete"),
  antiFlood: boolean("anti_flood").notNull().default(true),
  antiFloodAction: text("anti_flood_action").notNull().default("mute"),
  antiLinks: boolean("anti_links").notNull().default(false),
  antiLinksAction: text("anti_links_action").notNull().default("warn"),
  antiProfanity: boolean("anti_profanity").notNull().default(false),
  antiProfanityAction: text("anti_profanity_action").notNull().default("warn"),
  antiAdvertising: boolean("anti_advertising").notNull().default(false),
  antiAdvertisingAction: text("anti_advertising_action").notNull().default("warn"),
  requireVerification: boolean("require_verification").notNull().default(false),
  verificationTimeout: integer("verification_timeout").notNull().default(5),
  welcomeMessage: text("welcome_message"),
  rulesText: text("rules_text"),
  maxWarnings: integer("max_warnings").notNull().default(3),
  muteDuration: integer("mute_duration").notNull().default(300),
  floodLimit: integer("flood_limit").notNull().default(5),
  floodWindow: integer("flood_window").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotGroupSchema = createInsertSchema(botGroupsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBotGroup = z.infer<typeof insertBotGroupSchema>;
export type BotGroup = typeof botGroupsTable.$inferSelect;
