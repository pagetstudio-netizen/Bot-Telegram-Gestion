import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botWarningsTable = pgTable("bot_warnings", {
  id: serial("id").primaryKey(),
  telegramGroupId: text("telegram_group_id").notNull(),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  firstName: text("first_name"),
  reason: text("reason"),
  warnedByUserId: text("warned_by_user_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBotWarningSchema = createInsertSchema(botWarningsTable).omit({ id: true, createdAt: true });
export type InsertBotWarning = z.infer<typeof insertBotWarningSchema>;
export type BotWarning = typeof botWarningsTable.$inferSelect;
