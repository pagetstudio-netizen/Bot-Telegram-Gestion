import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botUserSettingsTable = pgTable("bot_user_settings", {
  id: serial("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull().unique(),
  language: text("language").notNull().default("fr"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBotUserSettingsSchema = createInsertSchema(botUserSettingsTable).omit({ id: true, updatedAt: true });
export type InsertBotUserSettings = z.infer<typeof insertBotUserSettingsSchema>;
export type BotUserSettings = typeof botUserSettingsTable.$inferSelect;
