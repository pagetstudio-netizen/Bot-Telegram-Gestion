import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botWordFiltersTable = pgTable("bot_word_filters", {
  id: serial("id").primaryKey(),
  telegramGroupId: text("telegram_group_id").notNull(),
  word: text("word").notNull(),
  action: text("action").notNull().default("delete"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotWordFilterSchema = createInsertSchema(botWordFiltersTable).omit({ id: true, createdAt: true });
export type InsertBotWordFilter = z.infer<typeof insertBotWordFilterSchema>;
export type BotWordFilter = typeof botWordFiltersTable.$inferSelect;
